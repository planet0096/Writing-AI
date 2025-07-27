
"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, onSnapshot, getDoc, runTransaction, serverTimestamp, orderBy, limit, startAfter, getCountFromServer, Unsubscribe, Query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ArrowLeft, ChevronLeft, ChevronRight, Coins } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Student {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  credits: number;
}

interface Transaction {
  id: string;
  type: 'purchase' | 'spend' | 'adjustment';
  amount: number;
  description: string;
  balance_after: number;
  createdAt: { toDate: () => Date };
}

const adjustmentSchema = z.object({
    amount: z.coerce.number().int().refine(val => val !== 0, { message: "Amount cannot be zero." }),
    reason: z.string().min(3, { message: "A reason is required." }),
});

const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export default function StudentDetailsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const studentId = params.id as string;
    const { toast } = useToast();

    const [student, setStudent] = useState<Student | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdjusting, setIsAdjusting] = useState(false);
    
    const [filterType, setFilterType] = useState('all');
    const [pagination, setPagination] = useState({
        lastVisible: null as any,
        currentPage: 1,
        totalPages: 1,
        pageSize: 10,
    });
    
    const { register, handleSubmit, formState: { errors }, reset } = useForm<{ amount: number; reason: string }>({
        resolver: zodResolver(adjustmentSchema)
    });

    useEffect(() => {
        if (!user || !studentId) return;

        const studentRef = doc(db, 'users', studentId);
        const unsubscribeStudent = onSnapshot(studentRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().assignedTrainerId === user.uid) {
                setStudent({ id: docSnap.id, ...docSnap.data() } as Student);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Student not found or not assigned to you.' });
                router.push('/trainer/students');
            }
            setIsLoading(false);
        });

        return () => unsubscribeStudent();
    }, [user, studentId, router, toast]);

    const fetchTransactions = useCallback(async (page = 1, lastVisible = null) => {
        if (!studentId) return;

        let baseQuery: Query = collection(db, 'users', studentId, 'credit_transactions');
        let countQuery: Query = collection(db, 'users', studentId, 'credit_transactions');
        
        if (filterType !== 'all') {
            baseQuery = query(baseQuery, where('type', '==', filterType));
            countQuery = query(countQuery, where('type', '==', filterType));
        }
        
        const totalSnapshot = await getCountFromServer(countQuery);
        const totalDocs = totalSnapshot.data().count;
        setPagination(prev => ({ ...prev, totalPages: Math.ceil(totalDocs / prev.pageSize) }));

        let finalQuery = query(baseQuery, orderBy('createdAt', 'desc'), limit(pagination.pageSize));
        if (page > 1 && lastVisible) {
            finalQuery = query(finalQuery, startAfter(lastVisible));
        }

        const transSnapshot = await getDocs(finalQuery);
        const lastDoc = transSnapshot.docs[transSnapshot.docs.length - 1];
        setPagination(prev => ({ ...prev, lastVisible: lastDoc, currentPage: page }));
        
        const transData = transSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
        setTransactions(transData);

    }, [studentId, filterType, pagination.pageSize]);
    
    useEffect(() => {
       fetchTransactions(1, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterType, fetchTransactions]);

    const handleCreditAdjustment = async (data: { amount: number; reason: string }) => {
        if (!student || !user) return;
        setIsAdjusting(true);
        
        try {
            const studentRef = doc(db, 'users', student.id);
            await runTransaction(db, async (transaction) => {
                const studentSnap = await transaction.get(studentRef);
                if (!studentSnap.exists()) throw new Error("Student not found.");
                
                const currentCredits = studentSnap.data().credits || 0;
                const newBalance = currentCredits + data.amount;

                transaction.update(studentRef, { credits: newBalance });

                const logRef = collection(db, 'users', student.id, 'credit_transactions');
                transaction.set(doc(logRef), {
                    type: 'adjustment',
                    amount: data.amount,
                    description: `Manual adjustment: ${data.reason}`,
                    balance_after: newBalance,
                    createdAt: serverTimestamp(),
                    trainerId: user.uid,
                    studentId: student.id,
                });
            });

            toast({ title: 'Success', description: 'Credits adjusted successfully.' });
            reset({amount: 0, reason: ""});
            fetchTransactions(1, null); // Refresh transactions
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsAdjusting(false);
        }
    };
    
    const handlePageChange = (newPage: number) => {
        if (newPage > pagination.currentPage) {
            fetchTransactions(newPage, pagination.lastVisible);
        } else {
            toast({title: "Notice", description: "Navigating to the first page. Previous page navigation coming soon."})
            fetchTransactions(1, null);
        }
    };

    if (isLoading) {
        return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
    }

    if (!student) {
        return <div className="p-8 text-center">Student not found.</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <Button variant="outline" size="sm" onClick={() => router.push('/trainer/students')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Students
            </Button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="items-center text-center">
                            <Avatar className="w-24 h-24 mb-4">
                                <AvatarImage src={student.photoURL} />
                                <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                            </Avatar>
                            <CardTitle>{student.name}</CardTitle>
                            <CardDescription>{student.email}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <div className="text-sm text-slate-500">Current Balance</div>
                            <div className="text-4xl font-bold text-slate-800 flex items-center justify-center gap-2">
                                <Coins className="text-amber-500"/>
                                {student.credits}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Adjust Credits</CardTitle>
                            <CardDescription>Manually add or remove credits.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(handleCreditAdjustment)} className="space-y-4">
                                <div>
                                    <label htmlFor="amount" className="block text-sm font-medium text-slate-700">Amount</label>
                                    <Input id="amount" type="number" {...register("amount")} placeholder="e.g., 50 or -10" />
                                    {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
                                </div>
                                <div>
                                    <label htmlFor="reason" className="block text-sm font-medium text-slate-700">Reason</label>
                                    <Input id="reason" type="text" {...register("reason")} placeholder="e.g., Refund for test" />
                                    {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
                                </div>
                                <Button type="submit" disabled={isAdjusting} className="w-full">
                                    {isAdjusting ? 'Processing...' : 'Apply Adjustment'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
                
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Credit Transaction History</CardTitle>
                                    <CardDescription>A log of all credit changes for this student.</CardDescription>
                                </div>
                                 <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Transactions</SelectItem>
                                        <SelectItem value="purchase">Purchases</SelectItem>
                                        <SelectItem value="spend">Spending</SelectItem>
                                        <SelectItem value="adjustment">Adjustments</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead className="text-right">Balance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.length > 0 ? transactions.map(t => (
                                            <TableRow key={t.id}>
                                                <TableCell className="text-xs text-slate-500">{format(t.createdAt.toDate(), 'PPp')}</TableCell>
                                                <TableCell className="text-sm">{t.description}</TableCell>
                                                <TableCell className={`text-right font-semibold ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {t.amount > 0 ? `+${t.amount}` : t.amount}
                                                </TableCell>
                                                <TableCell className="text-right">{t.balance_after}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center h-24">No transactions found.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                              <div className="flex items-center justify-between pt-4">
                                <Button variant="outline" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1}>
                                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {pagination.currentPage} of {pagination.totalPages}
                                </span>
                                <Button variant="outline" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage >= pagination.totalPages}>
                                    Next <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
