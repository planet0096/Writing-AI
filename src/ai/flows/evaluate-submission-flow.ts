
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
    overallBandScore: z.number().describe("The overall IELTS band score, from 1.0 to 9.0, in 0.5 increments."),
    feedbackSummary: z.string().describe("A brief, encouraging summary of the overall performance and key areas for improvement."),
    detailedFeedback: z.array(z.object({
        descriptor: z.string().describe("The IELTS descriptor being evaluated (e.g., 'Task Achievement')."),
        bandScore: z.number().describe("The band score for this specific descriptor."),
        feedback: z.string().describe("Detailed feedback on the student's performance for this descriptor."),
        suggestions: z.array(z.string()).describe("Actionable suggestions for improvement related to this descriptor.")
    })).length(4),
    highlightedAnswer: z.string().describe(`The student's original answer with mistakes wrapped in <error> tags. The tag MUST have four attributes: 'descriptor' (one of "Task Achievement", "Coherence and Cohesion", "Lexical Resource", or "Grammatical Range and Accuracy"), 'error_type' (e.g., "Spelling"), 'explanation' (why it's wrong), and 'correction' (the fix). Example: '...some <error descriptor="Lexical Resource" error_type="Spelling" explanation="This is a common spelling mistake." correction="people">peeple</error> may disagree.'`)
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
    output: { schema: EvaluationOutputSchema, format: 'json' },
    prompt: `You are an expert IELTS writing examiner. Your task is to provide a detailed, structured evaluation of a student's writing submission in JSON format.

    **Evaluation Criteria:**
    1.  **Overall Band Score:** Provide a score from 1.0 to 9.0, in 0.5 increments.
    2.  **Detailed Feedback:** Evaluate based on the four official criteria: Task Achievement, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy. For each, provide a specific band score, detailed feedback, and a list of actionable suggestions.
    3.  **Highlighted Answer:** Return the student's original answer. For each mistake you identify (grammar, spelling, vocabulary, etc.), you MUST wrap the incorrect text in a custom XML-style tag: \`<error>\`. This tag MUST have four attributes:
        *   \`descriptor\`: The official IELTS band descriptor the error relates to. Must be one of: "Task Achievement", "Coherence and Cohesion", "Lexical Resource", or "Grammatical Range and Accuracy".
        *   \`error_type\`: A specific category for the mistake (e.g., "Tense Error", "Spelling", "Word Choice", "Linking Word Misuse").
        *   \`explanation\`: A clear and concise reason why this is a mistake.
        *   \`correction\`: The suggested correct version of the text.
        
        **Example:** \`The data <error descriptor="Grammatical Range and Accuracy" error_type="Subject-Verb Agreement" explanation="The subject 'data' is plural, so the verb must be plural." correction="show">shows</error> a trend.\`

    **Student's Submission Details:**
    *   **Original Question:** {{{question}}}
    *   **Student's Answer:** {{{studentAnswer}}}
    *   **Specific Instructions from Trainer:** {{{customPrompt}}}

    **IMPORTANT:** You must respond ONLY with a valid JSON object that adheres strictly to the defined output schema. Do not include any text, markdown, or explanations outside of the JSON structure.
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
    
    // 3. Update the submission document with the structured feedback object and new status
    await updateDoc(submissionRef, {
      feedback: output, // Save the entire JSON object
      status: 'completed',
      evaluatedAt: new Date(),
    });
  }
);
