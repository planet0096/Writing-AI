
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, onSnapshot, orderBy, limit, startAfter, getCountFromServer, Query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Coins } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

interface Transaction {
  id: string;
  type: 'purchase' | 'spend' | 'adjustment';
  amount: number;
  description: string;
  balance_after: number;
  createdAt: { toDate: () => Date };
}

export default function StudentCreditsPage() {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [currentCredits, setCurrentCredits] = useState(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [filterType, setFilterType] = useState('all');
    const [pagination, setPagination] = useState({
        lastVisible: null as any,
        currentPage: 1,
        totalPages: 1,
        pageSize: 10,
    });

    useEffect(() => {
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                setCurrentCredits(docSnap.data().credits || 0);
            }
            setIsLoading(false);
        });

        return () => unsubscribeUser();
    }, [user]);

    const fetchTransactions = useCallback(async (page = 1, lastVisible = null) => {
        if (!user) return;
        setIsLoading(true);

        let baseQuery: Query = collection(db, 'users', user.uid, 'credit_transactions');
        let countQuery: Query = collection(db, 'users', user.uid, 'credit_transactions');
        
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
        setIsLoading(false);

    }, [user, filterType, pagination.pageSize]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchTransactions(1, null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading, filterType]);

    const handlePageChange = (newPage: number) => {
        if (newPage > pagination.currentPage) {
            fetchTransactions(newPage, pagination.lastVisible);
        } else {
            toast({title: "Notice", description: "Navigating to the first page. Previous page navigation coming soon."})
            fetchTransactions(1, null);
        }
    };
    
    if (authLoading) {
        return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">My Credits</h1>
            
            <Card className="bg-indigo-600/5 dark:bg-indigo-500/10 border-indigo-600/20">
                <CardHeader>
                    <CardTitle className="text-indigo-800 dark:text-indigo-200">Your Credit Balance</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="text-5xl font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-3">
                        <Coins className="h-10 w-10 text-amber-500" />
                        {isLoading ? <Skeleton className="w-24 h-12" /> : currentCredits}
                    </div>
                    <Button asChild>
                        <Link href="/student/plans">Purchase More Credits</Link>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Transaction History</CardTitle>
                            <CardDescription>A log of all your credit changes.</CardDescription>
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
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={4}><Skeleton className="h-24 w-full"/></TableCell></TableRow>
                                ) : transactions.length > 0 ? transactions.map(t => (
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
    );
}
