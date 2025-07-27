
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, increment, collection, addDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles, User, AlertCircle } from 'lucide-react';
import { evaluateSubmission } from '@/ai/flows/evaluate-submission-flow';

interface Trainer {
  id: string;
  pricing: {
    aiEvaluationCost: number;
    trainerEvaluationCost: number;
  };
}

interface Submission {
    testId: string;
}

interface Test {
    title: string;
}

export default function EvaluateSubmissionPage() {
  const router = useRouter();
  const params = useParams();
  const submissionId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [studentCredits, setStudentCredits] = useState(0);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchRequiredData = async () => {
      try {
        const studentRef = doc(db, 'users', user.uid);
        const subRef = doc(db, 'submissions', submissionId);

        const [studentSnap, subSnap] = await Promise.all([
          getDoc(studentRef),
          getDoc(subRef)
        ]);
        
        if (!studentSnap.exists()) throw new Error("Student data not found.");
        if (!subSnap.exists()) throw new Error("Submission not found.");
        
        const studentData = studentSnap.data();
        const subData = subSnap.data() as Submission;
        const trainerId = studentData.assignedTrainerId;
        
        setStudentCredits(studentData.credits || 0);
        setSubmission(subData);

        if (!trainerId) throw new Error("No trainer assigned.");

        const testRef = doc(db, 'tests', subData.testId);
        const [trainerSnap, testSnap] = await Promise.all([
          getDoc(doc(db, 'users', trainerId)),
          getDoc(testRef)
        ]);

        if (!trainerSnap.exists()) throw new Error("Trainer data not found.");
        if (!testSnap.exists()) throw new Error("Test data not found.");

        setTrainer({ id: trainerSnap.id, ...trainerSnap.data() } as Trainer);
        setTest(testSnap.data() as Test);

      } catch (err: any) {
        setError(err.message);
        toast({ variant: 'destructive', title: 'Error', description: err.message });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequiredData();
  }, [user, authLoading, toast, submissionId]);
  
  const handleEvaluationRequest = async (type: 'ai' | 'manual') => {
      if (!user || !trainer || !test) return;
      
      const cost = type === 'ai' ? trainer.pricing.aiEvaluationCost : trainer.pricing.trainerEvaluationCost;
      
      if(studentCredits < cost) {
          setError("You do not have enough credits for this evaluation. Please purchase more or contact your trainer.");
          return;
      }

      setIsProcessing(true);
      setError(null);
      
      try {
        const studentRef = doc(db, 'users', user.uid);
        const submissionRef = doc(db, 'submissions', submissionId);
        
        await runTransaction(db, async (transaction) => {
            const studentSnap = await transaction.get(studentRef);
            if (!studentSnap.exists()) throw new Error("Student data not found.");
            
            const currentCredits = studentSnap.data().credits || 0;
            if (currentCredits < cost) {
                throw new Error("You do not have enough credits for this evaluation.");
            }
            const newBalance = currentCredits - cost;

            // 1. Deduct credits and update student document
            transaction.update(studentRef, { credits: newBalance });

            // 2. Create a credit transaction log
            const transactionLogRef = collection(db, 'users', user.uid, 'credit_transactions');
            transaction.set(doc(transactionLogRef), {
                type: 'spend',
                amount: -cost,
                description: `${type === 'ai' ? 'AI' : 'Trainer'} Evaluation for "${test.title}"`,
                balance_after: newBalance,
                createdAt: serverTimestamp(),
            });

            // 3. Update submission with evaluation type
            transaction.update(submissionRef, {
                evaluationType: type,
                trainerId: trainer.id,
            });
        });

        // 4. If AI, trigger the evaluation flow (outside transaction)
        if(type === 'ai') {
            await evaluateSubmission({ submissionId, trainerId: trainer.id });
        }

        toast({
            title: "Request Submitted!",
            description: `Your submission has been sent for ${type === 'ai' ? 'AI' : 'manual'} evaluation.`
        });
        
        router.push(`/student/submissions`);
          
      } catch (err: any) {
          console.error("Evaluation request failed: ", err);
          setError(err.message);
          toast({ variant: 'destructive', title: 'Processing Failed', description: err.message || 'Could not process your request.'});
          // Note: Firestore transactions are atomic, so no rollback is needed.
      } finally {
          setIsProcessing(false);
      }
  };


  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Card><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          <Card><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold font-headline text-center">Submission Received!</h1>
        <p className="text-muted-foreground text-center">Your test has been submitted. Now, choose how you'd like it evaluated.</p>
        <p className="text-center font-semibold">Your current credit balance: {studentCredits}</p>
        
        {error && (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <Card className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="w-8 h-8 text-accent" />
                        <CardTitle>AI Evaluation</CardTitle>
                    </div>
                    <CardDescription>Get instant, detailed feedback on your writing from our AI assistant.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-2xl font-bold">{trainer?.pricing?.aiEvaluationCost ?? <Skeleton className="w-12 h-8 inline-block"/>} Credits</p>
                </CardContent>
                <div className="p-6 pt-0">
                    <Button 
                        className="w-full" 
                        onClick={() => handleEvaluationRequest('ai')}
                        disabled={isProcessing || isLoading}
                    >
                        {isProcessing ? 'Processing...' : 'Evaluate with AI'}
                    </Button>
                </div>
            </Card>
            <Card className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <User className="w-8 h-8 text-primary" />
                        <CardTitle>Trainer Evaluation</CardTitle>
                    </div>
                    <CardDescription>Receive personalized, expert feedback directly from your assigned trainer.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                     <p className="text-2xl font-bold">{trainer?.pricing?.trainerEvaluationCost ?? <Skeleton className="w-12 h-8 inline-block"/>} Credits</p>
                </CardContent>
                <div className="p-6 pt-0">
                     <Button 
                        className="w-full" 
                        variant="secondary" 
                        onClick={() => handleEvaluationRequest('manual')}
                        disabled={isProcessing || isLoading}
                     >
                        {isProcessing ? 'Processing...' : 'Send to Trainer'}
                    </Button>
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
}
