
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import Image from 'next/image';
import InteractiveFeedbackDisplay from '@/components/interactive-feedback-display';

interface Submission {
  testId: string;
  studentAnswer: string;
  feedback?: any; // Can be string or a structured object
  studentId: string;
  trainerId?: string;
}

interface Test {
  title: string;
  question: string;
  questionImageUrl?: string;
  sampleAnswer?: string;
}

export default function SubmissionResultPage() {
  const params = useParams();
  const submissionId = params.id as string;
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !submissionId) return;

    const fetchData = async () => {
      try {
        const subRef = doc(db, 'submissions', submissionId);
        const subSnap = await getDoc(subRef);

        if (!subSnap.exists()) {
          throw new Error("Submission not found.");
        }
        
        const subData = subSnap.data() as Submission;

        // Authorization check
        if (role === 'student' && subData.studentId !== user.uid) {
            throw new Error("You are not authorized to view this submission.");
        }
        if (role === 'trainer') {
            const studentDoc = await getDoc(doc(db, 'users', subData.studentId));
            if (!studentDoc.exists() || studentDoc.data().assignedTrainerId !== user.uid) {
                 throw new Error("You are not authorized to view this submission.");
            }
        }

        setSubmission(subData);

        const testRef = doc(db, 'tests', subData.testId);
        const testSnap = await getDoc(testRef);
        if (testSnap.exists()) {
          setTest(testSnap.data() as Test);
        } else {
          throw new Error("Associated test could not be found.");
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [submissionId, user, authLoading, router, role]);
  
  const isStructuredFeedback = submission?.feedback && typeof submission.feedback === 'object';

  if (isLoading || authLoading) {
    return (
        <div className="container mx-auto px-4 py-8">
             <Skeleton className="h-8 w-1/2 mb-6" />
            <div className="grid md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <Card>
                        <CardHeader><Skeleton className="h-6 w-1/4 mb-4" /></CardHeader>
                        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><Skeleton className="h-6 w-1/4 mb-4" /></CardHeader>
                        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
                    </Card>
                </div>
                <div>
                    <Card>
                        <CardHeader><Skeleton className="h-6 w-1/3 mb-4" /></CardHeader>
                        <CardContent><Skeleton className="h-96 w-full" /></CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="bg-muted/40">
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold font-headline mb-6">{test?.title}: Feedback</h1>
            <div className="grid lg:grid-cols-2 gap-8 items-start">
                
                <div className="space-y-6 lg:sticky lg:top-24">
                   {isStructuredFeedback ? (
                     <InteractiveFeedbackDisplay feedback={submission.feedback} />
                   ) : (
                     <Card className="border-primary/50 bg-primary/5">
                        <CardHeader><CardTitle>Evaluation & Feedback</CardTitle></CardHeader>
                        <CardContent>
                            <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: submission?.feedback || "<p>Feedback is being generated or has not been provided yet.</p>" }}/>
                        </CardContent>
                    </Card>
                   )}
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Your Answer</CardTitle></CardHeader>
                        <CardContent>
                            {isStructuredFeedback ? (
                                <div
                                    className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{ __html: submission.feedback.highlightedAnswer }}
                                />
                            ) : (
                               <p className="whitespace-pre-wrap text-muted-foreground">{submission?.studentAnswer}</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Original Question</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                           {test?.questionImageUrl && (
                            <div className="relative w-full h-64 mb-4 rounded-md overflow-hidden">
                                <Image src={test.questionImageUrl} alt="Question visual aid" layout="fill" objectFit="contain" />
                            </div>
                           )}
                           <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: test?.question || ""}} />
                        </CardContent>
                    </Card>

                    {test?.sampleAnswer && (
                        <Card>
                            <CardHeader><CardTitle>Sample Answer</CardTitle></CardHeader>
                            <CardContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: test.sampleAnswer }}/>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
