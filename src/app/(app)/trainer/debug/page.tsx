
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, collectionGroup, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

type TestStatus = 'idle' | 'running' | 'success' | 'error';

interface TestResult {
    status: TestStatus;
    error: string | null;
}

const StatusIndicator = ({ status }: { status: TestStatus }) => {
    switch (status) {
        case 'running':
            return <Loader className="h-5 w-5 animate-spin text-muted-foreground" />;
        case 'success':
            return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'error':
            return <XCircle className="h-5 w-5 text-red-500" />;
        default:
            return null;
    }
}

export default function DebugPage() {
    const { user } = useAuth();
    const [results, setResults] = useState<Record<string, TestResult>>({
        students: { status: 'idle', error: null },
        submissions: { status: 'idle', error: null },
        sales: { status: 'idle', error: null },
        notifications: { status: 'idle', error: null },
    });

    const runTest = async (testName: string, testFn: () => Promise<any>) => {
        setResults(prev => ({ ...prev, [testName]: { status: 'running', error: null } }));
        try {
            await testFn();
            setResults(prev => ({ ...prev, [testName]: { status: 'success', error: null } }));
        } catch (error: any) {
            console.error(`DEBUG: Firestore query failed for [${testName}]`, error);
            setResults(prev => ({ ...prev, [testName]: { status: 'error', error: error.message } }));
        }
    };

    const testStudentsQuery = () => {
        if (!user) return Promise.reject("Not authenticated");
        const studentsQuery = query(collection(db, 'users'), where('assignedTrainerId', '==', user.uid));
        return getDocs(studentsQuery);
    };
    
    const testSubmissionsQuery = () => {
        if (!user) return Promise.reject("Not authenticated");
        // This query mimics the one on the submissions page, including multiple 'where' clauses.
        const submissionsQuery = query(
            collection(db, 'submissions'), 
            where('trainerId', '==', user.uid),
            where('status', '==', 'submitted')
        );
        return getDocs(submissionsQuery);
    };

    const testSalesQuery = () => {
        if (!user) return Promise.reject("Not authenticated");
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const salesQuery = query(
            collectionGroup(db, 'credit_transactions'),
            where('trainerId', '==', user.uid),
            where('type', '==', 'purchase'),
            where('createdAt', '>=', Timestamp.fromDate(startOfMonth))
        );
        return getDocs(salesQuery);
    };
    
    const testNotificationsQuery = () => {
        if (!user) return Promise.reject("Not authenticated");
        const notificationsQuery = query(
            collection(db, 'notifications'), 
            where('recipientId', '==', user.uid),
            where('type', '==', 'manual_payment_proof')
        );
        return getDocs(notificationsQuery);
    };


    const tests = [
        { name: 'Students Query', key: 'students', fn: testStudentsQuery, description: "Fetches all students assigned to you. (Used in Student Management)" },
        { name: 'Submissions Query', key: 'submissions', fn: testSubmissionsQuery, description: "Fetches pending submissions. (Used in Submissions Page & Dashboard Stats)" },
        { name: 'Sales Query (Collection Group)', key: 'sales', fn: testSalesQuery, description: "Fetches sales data across all users. (Used in Sales Dashboard)" },
        { name: 'Notifications Query', key: 'notifications', fn: testNotificationsQuery, description: "Fetches your unread notifications. (Used in Header & Dashboard)" },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-slate-800">Firestore Rules Debugger</h1>
                <p className="text-sm text-slate-600">
                    Run these tests to identify which Firestore queries are failing due to permission errors. Check the browser's developer console for detailed error messages.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Query Tests</CardTitle>
                    <CardDescription>Click each button to run the corresponding query against your Firestore security rules.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {tests.map(test => (
                        <div key={test.key} className="p-4 border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex-grow">
                                <h3 className="font-semibold">{test.name}</h3>
                                <p className="text-sm text-muted-foreground">{test.description}</p>
                                {results[test.key].status === 'error' && (
                                     <p className="text-xs text-red-600 mt-1 break-all">Error: {results[test.key].error}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <StatusIndicator status={results[test.key].status} />
                                <Button 
                                    onClick={() => runTest(test.key, test.fn)} 
                                    disabled={results[test.key].status === 'running'}
                                    variant="outline"
                                >
                                    Run Test
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
