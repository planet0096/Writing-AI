
'use server';
/**
 * @fileOverview An AI flow to evaluate an IELTS writing submission.
 *
 * - evaluateSubmission - A function that orchestrates the evaluation process.
 * - EvaluateSubmissionInput - The input type for the evaluation flow.
 */
import { ai } from '@/ai/genkit';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { z } from 'zod';

const EvaluateSubmissionInputSchema = z.object({
  submissionId: z.string().describe('The ID of the submission document in Firestore.'),
});
export type EvaluateSubmissionInput = z.infer<typeof EvaluateSubmissionInputSchema>;

const EvaluationOutputSchema = z.object({
  feedbackHtml: z.string().describe('Detailed feedback formatted as an HTML string.'),
});

// This is the exported function that the client will call.
export async function evaluateSubmission(input: EvaluateSubmissionInput): Promise<void> {
  await evaluateSubmissionFlow(input);
}

const evaluationPrompt = ai.definePrompt({
    name: 'ieltsEvaluationPrompt',
    input: {
        schema: z.object({
            question: z.string(),
            studentAnswer: z.string(),
            customPrompt: z.string().optional(),
        })
    },
    output: { schema: EvaluationOutputSchema },
    prompt: `You are an expert IELTS writing examiner. Evaluate the following submission based on the official criteria: Task Achievement, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy.

    **Original Question:**
    {{{question}}}

    **Student's Answer:**
    {{{studentAnswer}}}

    **Specific Instructions from Trainer:**
    {{{customPrompt}}}

    Please provide your feedback as a detailed, well-structured HTML document. Use headings (h3), paragraphs (p), and lists (ul, li) to organize your points clearly. Do not include <html> or <body> tags.
    `,
});


const evaluateSubmissionFlow = ai.defineFlow(
  {
    name: 'evaluateSubmissionFlow',
    inputSchema: EvaluateSubmissionInputSchema,
    outputSchema: z.void(),
  },
  async ({ submissionId }) => {
    // 1. Fetch submission and test data from Firestore
    const submissionRef = doc(db, 'submissions', submissionId);
    const submissionSnap = await getDoc(submissionRef);
    if (!submissionSnap.exists()) {
      throw new Error('Submission not found');
    }
    const submissionData = submissionSnap.data();

    const testRef = doc(db, 'tests', submissionData.testId);
    const testSnap = await getDoc(testRef);
    if (!testSnap.exists()) {
      throw new Error('Test not found');
    }
    const testData = testSnap.data();

    // 2. Call the Gemini API via the defined prompt
    const { output } = await evaluationPrompt({
        question: testData.question,
        studentAnswer: submissionData.studentAnswer,
        customPrompt: testData.aiEvaluationPrompt
    });

    if (!output) {
        throw new Error("AI evaluation failed to produce a result.");
    }
    
    // 3. Update the submission document with the feedback and new status
    await updateDoc(submissionRef, {
      feedback: output.feedbackHtml,
      status: 'completed',
      evaluatedAt: new Date(),
    });
  }
);
