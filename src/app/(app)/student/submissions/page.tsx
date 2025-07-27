
"use client";

import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, Query, startAfter, limit, getCountFromServer } from 'firebase/firestore';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { SubmissionsTable } from '@/components/submissions-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface Submission {
  id: string;
  testId: string;
  studentId: string;
  testTitle?: string;
  submittedAt: { toDate: () => Date };
  status: 'submitted' | 'completed';
  evaluationType?: 'ai' | 'manual';
  hasUnreadMessages?: boolean;
}

export default function StudentSubmissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    status: 'all',
    evaluationType: 'all',
  });

  const [pagination, setPagination] = useState({
    lastVisible: null as any,
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
  });


  const fetchSubmissions = useCallback(async (page = 1, lastVisible = null) => {
    if (!user) return;
    setIsLoading(true);

    try {
      let baseQuery: Query = query(collection(db, 'submissions'), where('studentId', '==', user.uid));
      let countQuery: Query = query(collection(db, 'submissions'), where('studentId', '==', user.uid));
      
      if (filters.status !== 'all') {
          baseQuery = query(baseQuery, where('status', '==', filters.status));
          countQuery = query(countQuery, where('status', '==', filters.status));
      }
      if (filters.evaluationType !== 'all') {
          baseQuery = query(baseQuery, where('evaluationType', '==', filters.evaluationType));
          countQuery = query(countQuery, where('evaluationType', '==', filters.evaluationType));
      }
      
      const totalSnapshot = await getCountFromServer(countQuery);
      const totalSubmissions = totalSnapshot.data().count;
      setPagination(prev => ({ ...prev, totalPages: Math.ceil(totalSubmissions / prev.pageSize) }));
      
      let finalQuery = query(baseQuery, orderBy('submittedAt', 'desc'), limit(pagination.pageSize));
      if(page > 1 && lastVisible) {
          finalQuery = query(finalQuery, startAfter(lastVisible));
      }

      const subsSnapshot = await getDocs(finalQuery);
      const lastDoc = subsSnapshot.docs[subsSnapshot.docs.length - 1];
      setPagination(prev => ({...prev, lastVisible: lastDoc, currentPage: page}));

      const submissionsData = await Promise.all(
        subsSnapshot.docs.map(async (subDoc) => {
          const data = subDoc.data() as Submission;
          
          const unreadMessagesQuery = query(
            collection(db, 'submissions', subDoc.id, 'feedback_thread'), 
            where('isRead', '==', false),
            where('authorRole', '==', 'trainer')
          );
          const unreadSnapshot = await getDocs(unreadMessagesQuery);
          
          const testRef = doc(db, 'tests', data.testId);
          const testSnap = await getDoc(testRef);
          
          return {
            id: subDoc.id,
            ...data,
            testTitle: testSnap.exists() ? testSnap.data().title : 'Unknown Test',
            hasUnreadMessages: !unreadSnapshot.empty,
          };
        })
      );
      
      setSubmissions(submissionsData as Submission[]);

    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast({ variant: 'destructive', title: "Error", description: "Failed to load submissions."});
    } finally {
      setIsLoading(false);
    }
  }, [user, filters, toast, pagination.pageSize]);

  useEffect(() => {
    if (!authLoading && user) {
        fetchSubmissions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, filters]);
  
  const handlePageChange = (newPage: number) => {
    if (newPage > pagination.currentPage) {
        fetchSubmissions(newPage, pagination.lastVisible);
    } else {
       toast({title: "Notice", description: "Navigating to the first page. Previous page navigation coming soon."})
       fetchSubmissions(1, null);
    }
  };


  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
       <div>
            <h1 className="text-2xl font-bold text-slate-800">My Submissions</h1>
            <p className="text-sm text-slate-600">Track the status and feedback for all your practice tests.</p>
       </div>
      
       <Card>
        <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Status</label>
                    <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({...prev, status: value}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="completed">Reviewed</SelectItem>
                            <SelectItem value="submitted">Under Review</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Evaluation Method</label>
                    <Select value={filters.evaluationType} onValueChange={(value) => setFilters(prev => ({...prev, evaluationType: value}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="ai">AI</SelectItem>
                            <SelectItem value="manual">Trainer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardContent>
       </Card>

      {isLoading ? (
        <div className="space-y-4">
           <Skeleton className="h-24 w-full" />
           <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <SubmissionsTable 
            submissions={submissions}
            role="student"
            pagination={pagination}
            onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

