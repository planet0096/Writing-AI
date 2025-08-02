
"use client";

import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, Query, startAfter, limit,getCountFromServer } from 'firebase/firestore';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { SubmissionsTable } from '@/components/submissions-table';
import { SubmissionsFilterBar } from '@/components/submissions-filter-bar';
import { Skeleton } from '@/components/ui/skeleton';

export interface Submission {
  id: string;
  testId: string;
  studentId: string;
  studentName?: string;
  testTitle?: string;
  submittedAt: { toDate: () => Date };
  status: 'submitted' | 'completed';
  evaluationType?: 'ai' | 'manual';
  hasUnreadMessages?: boolean;
}

export interface Student {
    id: string;
    name: string;
}

export default function TrainerSubmissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    status: 'all',
    student: 'all',
    evaluationType: 'all',
    search: '',
    needsAttention: false,
  });

  const [pagination, setPagination] = useState({
    lastVisible: null as any,
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
  });

  const fetchStudents = useCallback(async () => {
      if (!user) return;
      try {
        const studentsQuery = query(collection(db, 'users'), where('assignedTrainerId', '==', user.uid));
        const studentsSnapshot = await getDocs(studentsQuery);
        setStudents(studentsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name || `Student ${doc.id.substring(0,5)}` })));
      } catch (error) {
        console.error("Error fetching students:", error);
      }
  }, [user]);

  const fetchSubmissions = useCallback(async (page = 1, lastVisible = null) => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Base Query
      let baseQuery: Query = query(collection(db, 'submissions'), where('trainerId', '==', user.uid));
      let countQuery: Query = query(collection(db, 'submissions'), where('trainerId', '==', user.uid));

      // Apply Filters
      if (filters.status !== 'all') {
        baseQuery = query(baseQuery, where('status', '==', filters.status));
        countQuery = query(countQuery, where('status', '==', filters.status));
      }
      if (filters.student !== 'all') {
        baseQuery = query(baseQuery, where('studentId', '==', filters.student));
        countQuery = query(countQuery, where('studentId', '==', filters.student));
      }
       if (filters.evaluationType !== 'all') {
        baseQuery = query(baseQuery, where('evaluationType', '==', filters.evaluationType));
        countQuery = query(countQuery, where('evaluationType', '==', filters.evaluationType));
      }
      
      // We can't combine text search with other where clauses easily in Firestore.
      // We will fetch and then filter by title client-side for simplicity.

      // Get total count for pagination
      const totalSnapshot = await getCountFromServer(countQuery);
      const totalSubmissions = totalSnapshot.data().count;
      setPagination(prev => ({ ...prev, totalPages: Math.ceil(totalSubmissions / prev.pageSize) }));
      
      // Construct final query with ordering and pagination
      let finalQuery = query(baseQuery, orderBy('submittedAt', 'desc'), limit(pagination.pageSize));
      if(page > 1 && lastVisible) {
          finalQuery = query(finalQuery, startAfter(lastVisible));
      }

      const subsSnapshot = await getDocs(finalQuery);
      const lastDoc = subsSnapshot.docs[subsSnapshot.docs.length - 1];
      setPagination(prev => ({...prev, lastVisible: lastDoc, currentPage: page}));

      // Map data and enrich it
       const submissionsData = await Promise.all(
        subsSnapshot.docs.map(async (subDoc) => {
          const data = subDoc.data() as Submission;
          const student = students.find(s => s.id === data.studentId);
          
          // Basic check for unread messages (can be optimized with a dedicated field)
           const unreadMessagesQuery = query(
              collection(db, 'submissions', subDoc.id, 'feedback_thread'), 
              where('isRead', '==', false),
              where('authorRole', '==', 'student')
            );
          const unreadSnapshot = await getDocs(unreadMessagesQuery);

          const testSnap = await getDoc(doc(db, 'tests', data.testId));

          return {
            id: subDoc.id,
            ...data,
            studentName: student?.name || 'Unknown Student',
            testTitle: testSnap.exists() ? testSnap.data().title : 'Unknown Test',
            hasUnreadMessages: !unreadSnapshot.empty,
          };
        })
      );
      
      // Client-side search filtering
      const filteredSubmissions = filters.search
        ? submissionsData.filter(s => s.testTitle?.toLowerCase().includes(filters.search.toLowerCase()))
        : submissionsData;

      setSubmissions(filteredSubmissions as Submission[]);

    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast({ variant: 'destructive', title: "Error", description: "Failed to load submissions."});
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters, students, toast, pagination.pageSize]);

  useEffect(() => {
    if(!authLoading && user) {
        fetchStudents().then(() => {
            fetchSubmissions();
        });
    }
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, filters]);
  
  const handlePageChange = (newPage: number) => {
    if (newPage > pagination.currentPage) {
        fetchSubmissions(newPage, pagination.lastVisible);
    } else {
       // Going back requires re-querying from the start, which is complex.
       // For this implementation, we'll reset to the first page for simplicity when going back.
       toast({title: "Notice", description: "Navigating to the first page. Previous page navigation coming soon."})
       fetchSubmissions(1, null);
    }
  };


  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900">Student Submissions</h1>
            <p className="text-sm text-slate-500">Review, filter, and evaluate submissions from your students.</p>
        </div>
        
        <SubmissionsFilterBar 
            students={students}
            filters={filters}
            onFiltersChange={setFilters}
            onNeedsAttentionToggle={(checked) => {
                 setFilters(prev => ({ ...prev, needsAttention: checked, status: checked ? 'submitted' : 'all' }));
            }}
        />

        {isLoading ? (
            <div className="space-y-4">
               <Skeleton className="h-24 w-full" />
               <Skeleton className="h-24 w-full" />
               <Skeleton className="h-24 w-full" />
            </div>
        ) : (
             <SubmissionsTable 
                submissions={submissions}
                role="trainer"
                pagination={pagination}
                onPageChange={handlePageChange}
            />
        )}
    </div>
  );
}

    