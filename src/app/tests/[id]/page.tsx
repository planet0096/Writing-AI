
"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Test {
  id: string;
  title: string;
  question: string;
  questionImageUrl?: string;
  timer: number;
  trainerId: string;
}

export default function TestTakingPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { user, loading: authLoading, assignedTrainerId } = useAuth();
  const { toast } = useToast();

  const [testData, setTestData] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [wordCount, setWordCount] = useState(0);
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchTest = async () => {
      try {
        const docRef = doc(db, 'tests', id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Test;
          setTestData(data);
          setTimeLeft(data.timer * 60);
        } else {
          toast({ variant: 'destructive', title: 'Not Found', description: 'Test not found.' });
          router.push('/student/tests');
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch test data.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchTest();
  }, [id, router, toast]);
  
  useEffect(() => {
     if (authLoading || isLoading || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
            if(prev <= 1) {
                clearInterval(timerRef.current!);
                setIsTimeUp(true);
                return 0;
            }
            return prev - 1;
        });
    }, 1000);

    return () => {
        if(timerRef.current) clearInterval(timerRef.current);
    }
  }, [authLoading, isLoading, timeLeft]);

  useEffect(() => {
    const words = studentAnswer.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  }, [studentAnswer]);
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!user || !testData || !assignedTrainerId) return;
    setIsSubmitting(true);
    try {
        const submissionRef = await addDoc(collection(db, "submissions"), {
            testId: testData.id,
            studentId: user.uid,
            trainerId: assignedTrainerId,
            studentAnswer: studentAnswer,
            submittedAt: serverTimestamp(),
            status: 'submitted',
        });
        toast({ title: "Success!", description: "Your test has been submitted."});
        router.push(`/submissions/${submissionRef.id}/evaluate`);
    } catch (error) {
        toast({ variant: "destructive", title: "Submission Failed", description: "Could not submit your test. Please try again."});
        setIsSubmitting(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-1/4 mb-8" />
        <div className="grid md:grid-cols-2 gap-8">
          <Card><CardContent className="pt-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
          <Card><CardContent className="pt-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }
  
  if (!testData) return null;

  return (
    <div className="min-h-screen bg-muted/40">
        <div className="container mx-auto px-4 py-8">
            <header className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-headline">{testData.title}</h1>
                    <p className="text-muted-foreground">Focus and write your best response.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-2xl font-mono font-semibold bg-background border rounded-lg px-4 py-2 tabular-nums">
                        {formatTime(timeLeft)}
                    </div>
                    <Button onClick={handleSubmit} disabled={isSubmitting || studentAnswer.length === 0}>
                        {isSubmitting ? 'Submitting...' : 'Submit Test'}
                    </Button>
                </div>
            </header>

            <div className="grid md:grid-cols-2 gap-8 items-start">
                {/* Question Pane */}
                <Card className="sticky top-24">
                    <CardHeader>
                        <CardTitle>Question</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {testData.questionImageUrl && (
                            <div className="relative w-full h-64 mb-4 rounded-md overflow-hidden">
                                <Image src={testData.questionImageUrl} alt="Question visual aid" layout="fill" objectFit="contain" />
                            </div>
                        )}
                        <div
                          className="prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: testData.question }}
                        />
                    </CardContent>
                </Card>

                {/* Answer Pane */}
                <Card>
                    <CardHeader>
                        <CardTitle>Your Answer</CardTitle>
                        <CardDescription>Write your response in the text area below.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            placeholder="Start writing your answer here..."
                            className="min-h-[400px] text-base"
                            value={studentAnswer}
                            onChange={(e) => setStudentAnswer(e.target.value)}
                            disabled={isTimeUp || isSubmitting}
                        />
                        <div className="text-right text-sm text-muted-foreground mt-2">
                           Word Count: {wordCount}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

        <AlertDialog open={isTimeUp} onOpenChange={setIsTimeUp}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Time's Up!</AlertDialogTitle>
                    <AlertDialogDescription>
                        The timer for this test has ended. Please submit your answer now.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={handleSubmit}>Submit Answer</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
