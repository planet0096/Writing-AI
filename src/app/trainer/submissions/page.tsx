
"use client";

import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, serverTimestamp, getDoc, Query, collectionGroup } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from 'lucide-react';

interface Submission {
  id: string;
  testId: string;
  studentId: string;
  studentName?: string;
  testTitle?: string;
  studentAnswer: string;
  submittedAt: { toDate: () => Date };
  status: 'submitted' | 'completed';
}

interface Student {
    id: string;
    name: string;
}

export default function TrainerSubmissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filters and sorting state
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [studentFilter, setStudentFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchStudents = async () => {
        const studentsQuery = query(collection(db, 'users'), where('assignedTrainerId', '==', user.uid));
        const studentsSnapshot = await getDocs(studentsQuery);
        setStudents(studentsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    };

    fetchStudents();
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    
    const fetchSubmissions = async () => {
      setIsLoading(true);
      try {
        let subsQuery: Query = collection(db, 'submissions');

        subsQuery = query(subsQuery, where('trainerId', '==', user.uid));
        
        if (statusFilter !== 'all') {
            subsQuery = query(subsQuery, where('status', '==', statusFilter));
        }
        if (studentFilter !== 'all') {
            subsQuery = query(subsQuery, where('studentId', '==', studentFilter));
        }

        subsQuery = query(subsQuery, orderBy('submittedAt', sortOrder));
        
        const subsSnapshot = await getDocs(subsQuery);

        const submissionsData = await Promise.all(
          subsSnapshot.docs.map(async (subDoc) => {
            const data = subDoc.data() as Submission;
            const userRef = doc(db, 'users', data.studentId);
            const testRef = doc(db, 'tests', data.testId);
            
            const [userSnap, testSnap] = await Promise.all([getDoc(userRef), getDoc(testRef)]);
            
            return {
              id: subDoc.id,
              ...data,
              studentName: userSnap.exists() ? userSnap.data().name : 'Unknown Student',
              testTitle: testSnap.exists() ? testSnap.data().title : 'Unknown Test',
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
    };

    fetchSubmissions();
  }, [user, statusFilter, studentFilter, sortOrder, toast]);


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
          
          // Refetch or remove from local state
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
    <div className="p-4 flex justify-between items-center"><Skeleton className="h-12 w-full" /></div>
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Student Submissions</CardTitle>
          <CardDescription>Review and evaluate submissions from your students.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="submitted">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Student</label>
                    <Select value={studentFilter} onValueChange={setStudentFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Students</SelectItem>
                            {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-end">
                    <Button variant="outline" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
                        Sort by Date <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>

          {isLoading ? (
            <div className="space-y-4">{renderSkeleton()}{renderSkeleton()}</div>
          ) : submissions.length > 0 ? (
            <div className="divide-y">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-grow">
                    <p className="font-semibold">{sub.testTitle}</p>
                    <p className="text-sm">By: <span className="font-medium">{sub.studentName}</span></p>
                    <p className="text-sm text-muted-foreground">Submitted {formatDistanceToNow(sub.submittedAt.toDate(), { addSuffix: true })}</p>
                  </div>
                  {sub.status === 'submitted' ? (
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
                  ) : (
                    <Button asChild variant="outline">
                        <a href={`/submissions/${sub.id}`}>View Feedback</a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <h2 className="text-xl font-semibold">No Submissions Found</h2>
              <p className="text-muted-foreground mt-2">
                No submissions match your current filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
