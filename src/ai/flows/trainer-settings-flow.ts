
'use server';
/**
 * @fileOverview A flow for updating a trainer's settings.
 */
import { ai } from '@/ai/genkit';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { z } from 'zod';
import * as nodemailer from 'nodemailer';

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


export const sendTestEmail = ai.defineFlow(
    {
        name: 'sendTestEmail',
        inputSchema: z.object({ trainerId: z.string() }),
        outputSchema: z.object({ success: z.boolean(), message: z.string() })
    },
    async ({ trainerId }) => {
        const settingsRef = doc(db, 'users', trainerId, 'private_details', 'email_settings');
        const userRef = doc(db, 'users', trainerId);

        const [settingsSnap, userSnap] = await Promise.all([
            getDoc(settingsRef),
            getDoc(userRef)
        ]);

        if (!settingsSnap.exists() || !settingsSnap.data().smtp) {
            throw new Error("SMTP settings are not configured.");
        }
        if (!userSnap.exists()) {
            throw new Error("Trainer not found.");
        }

        const smtpConfig = settingsSnap.data().smtp;
        const trainerEmail = userSnap.data().email;

        const transporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.port === 465, // true for 465, false for other ports
            auth: {
                user: smtpConfig.user,
                pass: smtpConfig.pass,
            },
        });

        try {
            await transporter.sendMail({
                from: `"IELTS Prep Hub" <${smtpConfig.user}>`,
                to: trainerEmail,
                subject: "Test Email from IELTS Prep Hub",
                html: "<b>This is a test message.</b><p>Your SMTP settings are configured correctly.</p>",
            });
            return { success: true, message: `Test email sent successfully to ${trainerEmail}!` };
        } catch (error: any) {
            console.error("Nodemailer error:", error);
            if (error.code === 'EAUTH') {
                throw new Error("Authentication failed. Please double-check your SMTP username and password.");
            } else if (error.code === 'ECONNECTION') {
                throw new Error("Could not connect to the server. Please double-check the SMTP Host and Port.");
            } else {
                throw new Error(`Failed to send email: ${error.message}`);
            }
        }
    }
);
