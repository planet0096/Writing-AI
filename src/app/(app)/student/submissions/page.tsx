
"use client";

import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Submission {
  id: string;
  testId: string;
  testTitle?: string;
  submittedAt: { toDate: () => Date };
  status: 'submitted' | 'completed';
  evaluationType?: 'ai' | 'manual';
}

export default function StudentSubmissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchSubmissions = async () => {
      try {
        const subsQuery = query(
          collection(db, 'submissions'),
          where('studentId', '==', user.uid),
          orderBy('submittedAt', 'desc')
        );
        const subsSnapshot = await getDocs(subsQuery);

        const submissionsData = await Promise.all(
          subsSnapshot.docs.map(async (subDoc) => {
            const data = subDoc.data() as Submission;
            const testRef = doc(db, 'tests', data.testId);
            const testSnap = await getDoc(testRef);
            return {
              id: subDoc.id,
              ...data,
              testTitle: testSnap.exists() ? testSnap.data().title : 'Unknown Test',
            };
          })
        );
        
        setSubmissions(submissionsData as Submission[]);

      } catch (error) {
        console.error("Error fetching submissions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [user, authLoading]);

  const getStatusBadge = (status: string, type?: string) => {
    if (status === 'completed') {
      return <Badge variant="success">Completed</Badge>;
    }
    if (type === 'ai') {
        return <Badge variant="warning">Processing (AI)</Badge>;
    }
    return <Badge variant="secondary">Pending (Trainer)</Badge>;
  };
  
  const renderSkeleton = () => (
    <Card>
      <CardContent className="p-6 flex justify-between items-center">
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-24" />
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">My Submissions</h1>
        <p className="text-sm text-slate-600">Track the status and feedback for all your practice tests.</p>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {renderSkeleton()}
          {renderSkeleton()}
        </div>
      ) : submissions.length > 0 ? (
        <div className="space-y-4">
          {submissions.map(sub => (
            <Card key={sub.id}>
              <CardContent className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex-grow">
                  <h2 className="font-semibold text-lg text-slate-800">{sub.testTitle}</h2>
                  <p className="text-sm text-slate-500">
                    Submitted {formatDistanceToNow(sub.submittedAt.toDate(), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusBadge(sub.status, sub.evaluationType)}
                  <Button asChild disabled={sub.status !== 'completed'}>
                    <Link href={`/submissions/${sub.id}`}>
                      View Feedback <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-dashed border-2 rounded-xl">
          <FileText className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-xl font-semibold text-slate-700">No Submissions Yet</h2>
          <p className="text-slate-500 mt-2 text-sm">
            Once you take a test, your submissions will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
