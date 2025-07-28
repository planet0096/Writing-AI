
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { EmailQueueData, EmailQueueDataSchema, sendQueuedEmail } from './flows/email-flow';

// This is the Firebase Function trigger.
// It will be part of the `index.ts` file in a Firebase Functions setup.
// For Genkit, we will invoke this flow from the trigger.

export const onemailqueued = onDocumentCreated('email_queue/{documentId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log("No data associated with the event");
        return;
    }
    
    const parseResult = EmailQueueDataSchema.safeParse(snapshot.data());
    
    if (!parseResult.success) {
        console.error("Invalid data in email_queue document:", parseResult.error);
        return;
    }

    try {
        await sendQueuedEmail(parseResult.data);
    } catch (error) {
        console.error("Error processing queued email:", error);
    }
});
