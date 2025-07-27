
"use client";

import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import TiptapEditor from '@/components/tiptap-editor';
import { formatDistanceToNow } from 'date-fns';

interface Submission {
  id: string;
  testId: string;
  studentId: string;
  studentName?: string;
  studentAnswer: string;
  submittedAt: { toDate: () => Date };
}

export default function TrainerSubmissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchSubmissions = async () => {
      try {
        const subsQuery = query(
          collection(db, 'submissions'),
          where('trainerId', '==', user.uid),
          where('evaluationType', '==', 'manual'),
          where('status', '==', 'submitted'),
          orderBy('submittedAt', 'desc')
        );
        const subsSnapshot = await getDocs(subsQuery);

        const submissionsData = await Promise.all(
          subsSnapshot.docs.map(async (subDoc) => {
            const data = subDoc.data() as Submission;
            const userRef = doc(db, 'users', data.studentId);
            const userSnap = await getDoc(userRef);
            return {
              id: subDoc.id,
              ...data,
              studentName: userSnap.exists() ? userSnap.data().name : 'Unknown Student',
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

  const handleProvideFeedback = (submission: Submission) => {
    setSelectedSubmission(submission);
    setFeedback('');
  };
  
  const handleFeedbackSubmit = async () => {
      if(!selectedSubmission || !feedback) return;
      setIsSubmitting(true);
      
      try {
          const subRef = doc(db, 'submissions', selectedSubmission.id);
          await updateDoc(subRef, {
              feedback: feedback,
              status: 'completed',
              evaluatedAt: serverTimestamp()
          });
          
          setSubmissions(prev => prev.filter(s => s.id !== selectedSubmission.id));
          setSelectedSubmission(null);
          
          toast({ title: "Success", description: "Feedback submitted successfully."});

      } catch (error) {
          console.error("Error submitting feedback:", error);
          toast({ variant: 'destructive', title: "Error", description: "Failed to submit feedback."});
      } finally {
          setIsSubmitting(false);
      }
  }

  const renderSkeleton = () => (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-10 w-32" /></TableCell>
    </TableRow>
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Manual Evaluation Queue</CardTitle>
          <CardDescription>Review student submissions that are pending your feedback.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
          ) : submissions.length > 0 ? (
            <div className="divide-y">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <p className="font-semibold">{sub.studentName}</p>
                    <p className="text-sm text-muted-foreground">Submitted {formatDistanceToNow(sub.submittedAt.toDate(), { addSuffix: true })}</p>
                  </div>
                  <Dialog onOpenChange={(open) => !open && setSelectedSubmission(null)}>
                    <DialogTrigger asChild>
                      <Button onClick={() => handleProvideFeedback(sub)}>Provide Feedback</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Evaluate Submission</DialogTitle>
                        <DialogDescription>
                          Review the student's answer and provide constructive feedback.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto py-4">
                        <div className="space-y-4">
                           <h3 className="font-semibold">Student's Answer</h3>
                           <div className="p-4 border rounded-md bg-muted text-sm whitespace-pre-wrap">
                               {selectedSubmission?.studentAnswer}
                           </div>
                        </div>
                        <div className="space-y-2">
                           <h3 className="font-semibold">Your Feedback</h3>
                           <TiptapEditor content={feedback} onChange={setFeedback} />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleFeedbackSubmit} disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <h2 className="text-xl font-semibold">All Clear!</h2>
              <p className="text-muted-foreground mt-2">
                There are no submissions waiting for your feedback right now.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
