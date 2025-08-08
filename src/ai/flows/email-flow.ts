
'use server';
/**
 * @fileOverview A flow for sending emails from a queue.
 */
import { ai } from '@/ai/genkit';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import * as nodemailer from 'nodemailer';
import { z } from 'zod';

// Define the schema for the email queue document data
export const EmailQueueDataSchema = z.object({
  to: z.string().email(),
  template: z.string(),
  templateData: z.record(z.any()),
  trainerId: z.string(),
});

export type EmailQueueData = z.infer<typeof EmailQueueDataSchema>;

// This flow is designed to be called by a trigger when a document is added to the email_queue.
export const sendQueuedEmail = ai.defineFlow(
  {
    name: 'sendQueuedEmail',
    inputSchema: EmailQueueDataSchema,
    outputSchema: z.void(),
  },
  async (data) => {
    const { to, template, templateData, trainerId } = data;

    // 1. Fetch the trainer's email settings
    const settingsRef = doc(db, 'users', trainerId, 'private_details', 'email_settings');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists() || !settingsSnap.data()?.smtp) {
      console.error(`SMTP settings not found for trainer ${trainerId}.`);
      // In a real app, you might want to add error handling here, like moving to a failed queue.
      return;
    }
    const settings = settingsSnap.data()!;
    const smtpConfig = settings.smtp;
    
    const templateConfig = settings.templates?.[template];
    
    if (!templateConfig || !templateConfig.enabled) {
      console.log(`Email template '${template}' is disabled or does not exist for trainer ${trainerId}.`);
      return;
    }

    // 2. Interpolate the template with data
    let subject = templateConfig.subject;
    let body = templateConfig.body;
    for (const key in templateData) {
        const regex = new RegExp(`\\[${key}\\]`, 'g');
        subject = subject.replace(regex, templateData[key] as string);
        body = body.replace(regex, templateData[key] as string);
    }
    
    // 3. Configure Nodemailer and send the email
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
        from: `"IELTS Pen" <${smtpConfig.user}>`,
        to,
        subject,
        html: body,
      });
      console.log(`Email '${template}' sent successfully to ${to}`);
    } catch (error) {
      console.error(`Failed to send email '${template}' to ${to}. Error:`, error);
      // Optional: Add logic to handle failed sends, e.g., retry queue.
    }
  }
);
