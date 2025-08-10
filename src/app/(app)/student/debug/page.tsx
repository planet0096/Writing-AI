
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

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

export default function StudentDebugPage() {
    const { user, assignedTrainerId } = useAuth();
    const [results, setResults] = useState<Record<string, TestResult>>({
        ownProfile: { status: 'idle', error: null },
        assignedTrainerProfile: { status: 'idle', error: null },
        assignedTests: { status: 'idle', error: null },
        mySubmissions: { status: 'idle', error: null },
        creditHistory: { status: 'idle', error: null },
        notifications: { status: 'idle', error: null },
    });

    const runTest = async (testName: string, testFn: () => Promise<any>, expectFail = false) => {
        setResults(prev => ({ ...prev, [testName]: { status: 'running', error: null } }));
        try {
            await testFn();
            if (expectFail) {
                 setResults(prev => ({ ...prev, [testName]: { status: 'error', error: 'This query was expected to fail, but it succeeded. This is a potential security issue.' } }));
            } else {
                setResults(prev => ({ ...prev, [testName]: { status: 'success', error: null } }));
            }
        } catch (error: any) {
             if (expectFail) {
                 setResults(prev => ({ ...prev, [testName]: { status: 'success', error: null } }));
             } else {
                console.error(`STUDENT DEBUGGER [${testName}]:`, error);
                setResults(prev => ({ ...prev, [testName]: { status: 'error', error: error.message } }));
             }
        }
    };

    const testOwnProfileQuery = () => {
        if (!user) return Promise.reject("Not authenticated");
        return getDoc(doc(db, 'users', user.uid));
    };

    const testAssignedTrainerProfileQuery = () => {
        if (!user || !assignedTrainerId) return Promise.reject("Not authenticated or no trainer assigned");
        return getDoc(doc(db, 'users', assignedTrainerId));
    };
    
    const testAssignedTestsQuery = () => {
        if (!user) return Promise.reject("Not authenticated");
        if (!assignedTrainerId) return Promise.reject("No trainer assigned");
        const testsQuery = query(collection(db, 'tests'), where('trainerId', '==', assignedTrainerId));
        return getDocs(testsQuery);
    };

    const testMySubmissionsQuery = () => {
        if (!user) return Promise.reject("Not authenticated");
        const submissionsQuery = query(collection(db, 'submissions'), where('studentId', '==', user.uid));
        return getDocs(submissionsQuery);
    };
    
    const testCreditHistoryQuery = () => {
        if (!user) return Promise.reject("Not authenticated");
        const creditsQuery = query(collection(db, 'users', user.uid, 'credit_transactions'));
        return getDocs(creditsQuery);
    };
    
    const testNotificationsQuery = () => {
        if (!user) return Promise.reject("Not authenticated");
        const notificationsQuery = query(collection(db, 'notifications'), where('recipientId', '==', user.uid));
        return getDocs(notificationsQuery);
    };


    const tests = [
        { name: 'Own Profile Query', key: 'ownProfile', fn: testOwnProfileQuery, description: "Fetches your own user document. (Used in all pages)" },
        { name: 'Assigned Trainer Profile Query', key: 'assignedTrainerProfile', fn: testAssignedTrainerProfileQuery, description: "Fetches your trainer's public profile. (Used in 'My Tests')" },
        { name: 'Assigned Tests Query', key: 'assignedTests', fn: testAssignedTestsQuery, description: "Fetches tests from your assigned trainer. (Used in 'My Tests')" },
        { name: 'My Submissions Query', key: 'mySubmissions', fn: testMySubmissionsQuery, description: "Fetches all your past submissions. (Used in 'My Submissions')" },
        { name: 'Credit History Query', key: 'creditHistory', fn: testCreditHistoryQuery, description: "Fetches your credit purchase and spend history. (Used in 'My Credits')" },
        { name: 'Notifications Query', key: 'notifications', fn: testNotificationsQuery, description: "Checks if a student can list their own notifications. This should succeed." },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-slate-800">Student Firestore Rules Debugger</h1>
                <p className="text-sm text-slate-600">
                    If you are having trouble loading data, run these tests to identify which Firestore queries are failing due to permission errors.
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
                                     <p className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded-md font-mono">
                                        <b>Error Details:</b> {results[test.key].error}
                                     </p>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <StatusIndicator status={results[test.key].status} />
                                <Button 
                                    onClick={() => runTest(test.key, test.fn, (test as any).expectFail)} 
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
