
'use server';
/**
 * @fileOverview An AI flow to extract text from images (OCR).
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';

const ExtractTextFromImagesInputSchema = z.object({
  images: z.array(z.string().describe("An array of image data URIs. Expected format: 'data:<mimetype>;base64,<encoded_data>'")),
});
export type ExtractTextFromImagesInput = z.infer<typeof ExtractTextFromImagesInputSchema>;

const ExtractTextFromImagesOutputSchema = z.object({
  text: z.string().describe('The combined text extracted from all images.'),
});
export type ExtractTextFromImagesOutput = z.infer<typeof ExtractTextFromImagesOutputSchema>;

export async function extractTextFromImages(input: ExtractTextFromImagesInput): Promise<ExtractTextFromImagesOutput> {
  return extractTextFromImagesFlow(input);
}

const extractTextFromImagesFlow = ai.defineFlow(
  {
    name: 'extractTextFromImagesFlow',
    inputSchema: ExtractTextFromImagesInputSchema,
    outputSchema: ExtractTextFromImagesOutputSchema,
  },
  async ({ images }) => {
    const visionModel = googleAI.model('gemini-1.5-flash');

    const parts = images.map(dataUri => ({
      media: {
        url: dataUri,
      },
    }));

    const { text } = await ai.generate({
      model: visionModel,
      prompt: [
        { text: "Extract all handwritten and printed text from the following image(s). Respond only with the transcribed text, without any additional comments or explanations." },
        ...parts
      ],
    });

    return { text: text.trim() };
  }
);
