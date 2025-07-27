
'use server';
/**
 * @fileOverview Stripe-related Genkit flows for payments and connections.
 *
 * - createStripeConnectLink - Creates a Stripe Connect onboarding link for a trainer.
 * - createStripeCheckoutSession - Creates a Stripe Checkout session for a student to purchase a plan.
 * - stripeWebhook - Handles incoming webhooks from Stripe, specifically for completed checkouts.
 */
import { ai } from '@/ai/genkit';
import { db } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, updateDoc, increment, runTransaction, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { z } from 'zod';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("STRIPE_SECRET_KEY is not set. Stripe flows will not work.");
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn("STRIPE_WEBHOOK_SECRET is not set. Stripe webhook flow will not work.");
}


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
  typescript: true,
});

// Flow to create a Stripe Connect account and onboarding link
export const createStripeConnectLink = ai.defineFlow(
  {
    name: 'createStripeConnectLink',
    inputSchema: z.object({ trainerId: z.string(), origin: z.string() }),
    outputSchema: z.object({ url: z.string() }),
  },
  async ({ trainerId, origin }) => {
    const userRef = doc(db, 'users', trainerId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists() || userSnap.data().role !== 'trainer') {
      throw new Error('Trainer not found.');
    }

    let stripeAccountId = userSnap.data().stripeAccountId;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: userSnap.data().email,
        country: 'US', // Or make this dynamic
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;
      await updateDoc(userRef, { stripeAccountId });
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/trainer/settings/payments`,
      return_url: `${origin}/trainer/settings/payments/stripe-return?account_id=${stripeAccountId}`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  }
);


// Flow to create a Stripe Checkout Session
export const createStripeCheckoutSession = ai.defineFlow({
    name: 'createStripeCheckoutSession',
    inputSchema: z.object({
        planId: z.string(),
        studentId: z.string(),
        trainerId: z.string(),
        origin: z.string(),
    }),
    outputSchema: z.object({ sessionId: z.string() }),
}, async ({ planId, studentId, trainerId, origin }) => {

    const [planSnap, trainerSnap] = await Promise.all([
        getDoc(doc(db, 'plans', planId)),
        getDoc(doc(db, 'users', trainerId)),
    ]);

    if (!planSnap.exists()) throw new Error("Plan not found.");
    const plan = planSnap.data();
    if (!trainerSnap.exists() || !trainerSnap.data().stripeAccountId) {
        throw new Error("Trainer's Stripe account is not configured.");
    }
    const stripeAccountId = trainerSnap.data().stripeAccountId;
    

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: plan.planName,
                    description: `${plan.credits} credits for IELTS Prep Hub`,
                },
                unit_amount: Math.round(plan.price * 100), // Price in cents
            },
            quantity: 1,
        }],
        mode: 'payment',
        success_url: `${origin}/student/plans?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/student/plans`,
        // The fee is taken from the connected account's balance, not the platform's.
        payment_intent_data: {
            application_fee_amount: Math.round(plan.price * 100 * 0.1), // 10% platform fee
            transfer_data: {
                destination: stripeAccountId,
            },
        },
        metadata: {
            studentId,
            planId,
            credits: plan.credits.toString() // Metadata values must be strings
        }
    });

    if (!session.id) {
        throw new Error("Failed to create Stripe session.");
    }

    return { sessionId: session.id };
});


// HTTP-triggered flow for Stripe Webhooks
export const stripeWebhook = ai.defineFlow<Request, Response>(
  {
    name: 'stripeWebhook',
    https: {},
  },
  async (req) => {
    const sig = req.headers.get('stripe-signature') as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    
    let event: Stripe.Event;

    try {
        const body = await req.text();
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed.`, err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const { studentId, planId, credits } = session.metadata!;
        
        if (!studentId || !planId || !credits) {
            console.error("Webhook received with missing metadata", session.metadata);
            return new Response('Webhook Error: Missing metadata.', { status: 400 });
        }
        
        try {
            const studentRef = doc(db, 'users', studentId);
            const planRef = doc(db, 'plans', planId);
            
            await runTransaction(db, async (transaction) => {
                const [studentSnap, planSnap] = await Promise.all([
                    transaction.get(studentRef),
                    transaction.get(planRef),
                ]);

                if (!studentSnap.exists()) throw new Error(`Student ${studentId} not found.`);
                if (!planSnap.exists()) throw new Error(`Plan ${planId} not found.`);

                const planData = planSnap.data();
                const studentData = studentSnap.data();
                const creditsToAdd = parseInt(credits, 10);
                const newBalance = (studentData.credits || 0) + creditsToAdd;

                // Update student document
                transaction.update(studentRef, {
                    credits: newBalance,
                    currentPlan: {
                        planId: planId,
                        planName: planData.planName,
                        assignedAt: new Date(),
                    }
                });

                // Create a credit transaction log
                const transactionRef = collection(db, 'users', studentId, 'credit_transactions');
                transaction.set(doc(transactionRef), {
                    type: 'purchase',
                    amount: creditsToAdd,
                    description: `Purchased: ${planData.planName}`,
                    balance_after: newBalance,
                    createdAt: serverTimestamp(),
                });
            });

            console.log(`Successfully fulfilled plan ${planId} for student ${studentId}.`);

        } catch (error) {
            console.error("Fulfillment error:", error);
            // We still return a 200 to Stripe to acknowledge receipt, but log the error for investigation.
            // In a production system, you might have a retry mechanism or alert developers.
             return new Response(`Fulfillment error: ${error}`, { status: 500 });
        }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }
);
