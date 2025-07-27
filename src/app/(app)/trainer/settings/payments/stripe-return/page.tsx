
"use client";

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Stripe } from 'stripe';

function StripeReturnContent() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    useEffect(() => {
        if (authLoading || !user) return;

        const accountId = searchParams.get('account_id');
        if (!accountId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Stripe Account ID not found.' });
            router.push('/trainer/settings/payments');
            return;
        }

        const verifyAndUpdate = async () => {
            try {
                // In a real app, you'd call a backend function to verify the account status with the Stripe API
                // For this simulation, we will assume if we get here, it's successful.
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, { 
                    'paymentSettings.stripeOnboardingComplete': true,
                    'paymentSettings.stripeAccountId': accountId
                }, { merge: true });

                toast({ title: 'Success!', description: 'Stripe account connected successfully.' });
            } catch (error) {
                console.error("Stripe connection error:", error);
                toast({ variant: 'destructive', title: 'Verification Failed', description: 'Could not finalize Stripe connection.' });
            } finally {
                router.push('/trainer/settings/payments');
            }
        };

        verifyAndUpdate();

    }, [user, authLoading, router, searchParams, toast]);

    return (
        <div className="flex h-screen items-center justify-center flex-col gap-4">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-dashed border-primary"></div>
            <p className="text-muted-foreground">Finalizing Stripe connection, please wait...</p>
        </div>
    );
}

export default function StripeReturnPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <StripeReturnContent />
        </Suspense>
    )
}

