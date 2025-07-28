
'use server';
/**
 * @fileOverview A flow for updating a trainer's settings.
 */
import { ai } from '@/ai/genkit';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { z } from 'zod';

const UpdateApiKeyInputSchema = z.object({
  trainerId: z.string(),
  apiKey: z.string(),
});

export const updateTrainerApiKey = ai.defineFlow(
  {
    name: 'updateTrainerApiKey',
    inputSchema: UpdateApiKeyInputSchema,
    outputSchema: z.void(),
  },
  async ({ trainerId, apiKey }) => {
    const settingsRef = doc(db, 'users', trainerId, 'private_details', 'api_settings');
    await setDoc(settingsRef, { geminiApiKey: apiKey }, { merge: true });
  }
);


const EmailSettingsSchema = z.object({
    smtp: z.object({
        host: z.string(),
        port: z.number(),
        user: z.string(),
        pass: z.string(),
    }),
    templates: z.record(z.object({
        subject: z.string(),
        body: z.string(),
        enabled: z.boolean(),
    }))
});

const UpdateEmailSettingsInputSchema = z.object({
    trainerId: z.string(),
    settings: EmailSettingsSchema,
});


export const updateEmailSettings = ai.defineFlow(
  {
    name: 'updateEmailSettings',
    inputSchema: UpdateEmailSettingsInputSchema,
    outputSchema: z.void(),
  },
  async ({ trainerId, settings }) => {
    const settingsRef = doc(db, 'users', trainerId, 'private_details', 'email_settings');
    await setDoc(settingsRef, settings, { merge: true });
  }
);
