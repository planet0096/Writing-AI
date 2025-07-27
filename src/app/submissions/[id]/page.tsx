
"use client";

import * as React from "react";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Edit } from 'lucide-react';
import Image from 'next/image';
import InteractiveFeedbackDisplay from '@/components/interactive-feedback-display';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import TiptapEditor from "@/components/tiptap-editor";
import { useToast } from "@/hooks/use-toast";
import ConversationThread from "@/components/conversation-thread";

interface Submission {
  testId: string;
  studentAnswer: string;
  feedback?: any;
  studentId: string;
  trainerId?: string;
  status: 'submitted' | 'completed';
}

interface Test {
  title: string;
  question: string;
  questionImageUrl?: string;
  sampleAnswer?: string;
}

const descriptorColorMap: Record<string, string> = {
    "Task Achievement": "decoration-purple-500",
    "Coherence and Cohesion": "decoration-green-500",
    "Lexical Resource": "decoration-blue-500",
    "Grammatical Range and Accuracy": "decoration-red-500",
};

const HighlightedAnswerDisplay = ({ htmlString }: { htmlString: string }) => {
    const parsedParts = InteractiveFeedbackDisplay.parseErrorString(htmlString);

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
            {parsedParts.map((part, index) => {
                if (typeof part === 'string') {
                    return <React.Fragment key={index}>{part}</React.Fragment>;
                }

                const underlineClass = descriptorColorMap[part.descriptor] || 'decoration-gray-500';

                return (
                    <Tooltip key={index}>
                        <TooltipTrigger asChild>
                            <span className={`underline decoration-wavy ${underlineClass} decoration-2 cursor-pointer font-semibold`}>
                                {part.text}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-left" side="top">
                            <div className="space-y-1 p-1">
                                <p className="font-bold text-base">{part.correction}</p>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">{part.errorType}</p>
                                <p className="text-sm">{part.explanation}</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
    );
};

export default function SubmissionResultPage() {
  const params = useParams();
  const submissionId = params.id as string;
  const { user, loading: authLoading, role } = useAuth();
  const { toast } = useToast();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedFeedback, setEditedFeedback] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !submissionId) return;

    const subRef = doc(db, 'submissions', submissionId);
    const unsubscribe = onSnapshot(subRef, async (subSnap) => {
      try {
        if (!subSnap.exists()) {
          throw new Error("Submission not found.");
        }
        
        const subData = subSnap.data() as Submission;

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

        if (!test) {
          const testRef = doc(db, 'tests', subData.testId);
          const testSnap = await getDoc(testRef);
          if (testSnap.exists()) {
            setTest(testSnap.data() as Test);
          } else {
            throw new Error("Associated test could not be found.");
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [submissionId, user, authLoading, role, test]);
  
  const handleFeedbackUpdate = async () => {
    if (!submission) return;
    setIsEditing(true);

    const isAI = submission.feedback && typeof submission.feedback === 'object';
    const fieldToUpdate = isAI ? { 'feedback.trainerNotes': editedFeedback } : { feedback: editedFeedback };
    
    try {
      const subRef = doc(db, 'submissions', submissionId);
      await updateDoc(subRef, fieldToUpdate);
      toast({ title: "Success", description: "Feedback has been updated." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update feedback." });
    } finally {
      setIsEditing(false);
    }
  };

  const isStructuredFeedback = submission?.feedback && typeof submission.feedback === 'object';
  const hasManualFeedback = submission?.feedback && typeof submission.feedback === 'string';
  const canEdit = role === 'trainer' && submission?.status === 'completed';

  const getInitialEditorContent = () => {
    if (isStructuredFeedback) {
      return submission.feedback.trainerNotes || "";
    }
    if (hasManualFeedback) {
      return submission.feedback;
    }
    return "";
  };

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-1/2 mb-6" />
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6"><Card><CardHeader><Skeleton className="h-6 w-1/4 mb-4" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card><Card><CardHeader><Skeleton className="h-6 w-1/4 mb-4" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card></div>
          <div><Card><CardHeader><Skeleton className="h-6 w-1/3 mb-4" /></CardHeader><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
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
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Evaluation & Feedback</CardTitle>
                        {canEdit && !isStructuredFeedback && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setEditedFeedback(getInitialEditorContent())}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Edit Feedback</DialogTitle><DialogDescription>Update the feedback for this submission.</DialogDescription></DialogHeader><div className="py-4"><TiptapEditor content={editedFeedback} onChange={setEditedFeedback} /></div><DialogFooter><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose><DialogClose asChild><Button onClick={handleFeedbackUpdate} disabled={isEditing}>{isEditing ? "Saving..." : "Save Changes"}</Button></DialogClose></DialogFooter></DialogContent>
                          </Dialog>
                        )}
                    </div>
                </CardHeader>
                <CardContent><div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: submission?.feedback || "<p>Feedback is being generated or has not been provided yet.</p>" }} /></CardContent>
              </Card>
            )}
             {isStructuredFeedback && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Trainer's Notes</CardTitle>
                     {canEdit && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditedFeedback(getInitialEditorContent())}><Edit className="mr-2 h-4 w-4" /> {submission?.feedback.trainerNotes ? "Edit Notes" : "Add Notes"}</Button>
                          </DialogTrigger>
                           <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Trainer's Notes</DialogTitle><DialogDescription>Add or edit your notes for this AI evaluation.</DialogDescription></DialogHeader><div className="py-4"><TiptapEditor content={editedFeedback} onChange={setEditedFeedback} /></div><DialogFooter><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose><DialogClose asChild><Button onClick={handleFeedbackUpdate} disabled={isEditing}>{isEditing ? "Saving..." : "Save Notes"}</Button></DialogClose></DialogFooter></DialogContent>
                        </Dialog>
                     )}
                  </div>
                </CardHeader>
                <CardContent>
                  {submission.feedback.trainerNotes ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: submission.feedback.trainerNotes }} />
                  ) : (
                    <p className="text-sm text-muted-foreground">{role === 'trainer' ? 'You have not added any notes to this AI evaluation.' : 'Your trainer has not added any additional notes.'}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          <div className="space-y-6">
            <Card><CardHeader><CardTitle>Your Answer</CardTitle></CardHeader><CardContent><TooltipProvider>{isStructuredFeedback ? (<HighlightedAnswerDisplay htmlString={submission.feedback.highlightedAnswer} />) : (<p className="whitespace-pre-wrap text-muted-foreground">{submission?.studentAnswer}</p>)}</TooltipProvider></CardContent></Card>
            <Card><CardHeader><CardTitle>Original Question</CardTitle></CardHeader><CardContent className="space-y-4">{test?.questionImageUrl && (<div className="relative w-full h-64 mb-4 rounded-md overflow-hidden"><Image src={test.questionImageUrl} alt="Question visual aid" layout="fill" objectFit="contain" /></div>)}<div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: test?.question || "" }} /></CardContent></Card>
            {test?.sampleAnswer && (<Card><CardHeader><CardTitle>Sample Answer</CardTitle></CardHeader><CardContent><div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: test.sampleAnswer }} /></CardContent></Card>)}
             {submission && user && (
                <ConversationThread 
                    submissionId={submissionId}
                    studentId={submission.studentId}
                    trainerId={submission.trainerId!}
                    currentUser={user}
                    currentUserRole={role!}
                />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
