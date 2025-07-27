
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Check, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { loadStripe } from '@stripe/stripe-js';
import { createStripeCheckoutSession } from '@/ai/flows/stripe-flows';

interface Plan {
    id: string;
    planName: string;
    credits: number;
    price: number;
    isPopular?: boolean;
}

interface PaymentSettings {
    bankDetails?: string;
    paypalEmail?: string;

    stripeAccountId?: string;
    stripeOnboardingComplete?: boolean;
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function StudentPlansPage() {
    const { user, assignedTrainerId, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

    useEffect(() => {
        if (!assignedTrainerId && !authLoading) {
            setIsLoading(false);
            return;
        }
        if (!assignedTrainerId) return;


        const fetchPlansAndSettings = async () => {
            setIsLoading(true);
            try {
                // Fetch plans created by the assigned trainer
                const plansQuery = query(collection(db, 'plans'), where('trainerId', '==', assignedTrainerId));
                const plansSnapshot = await getDocs(plansQuery);
                const fetchedPlans = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan))
                setPlans(fetchedPlans.sort((a, b) => a.price - b.price));

                // Fetch trainer's payment settings
                const trainerRef = doc(db, 'users', assignedTrainerId);
                const trainerSnap = await getDoc(trainerRef);
                if (trainerSnap.exists()) {
                    setPaymentSettings(trainerSnap.data().paymentSettings || {});
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load plans.' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchPlansAndSettings();
    }, [assignedTrainerId, toast, authLoading]);

    const handleStripePurchase = async (plan: Plan) => {
        if (!user || !assignedTrainerId) return;
        setIsProcessing(true);
        try {
            const { sessionId } = await createStripeCheckoutSession({
                planId: plan.id,
                studentId: user.uid,
                trainerId: assignedTrainerId,
                origin: window.location.origin,
            });
            const stripe = await stripePromise;
            if (!stripe) {
                 toast({ variant: 'destructive', title: 'Stripe Error', description: "Stripe.js has not loaded yet." });
                 return;
            }
            const { error } = await stripe.redirectToCheckout({ sessionId });
            if (error) {
                toast({ variant: 'destructive', title: 'Stripe Error', description: error.message });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to initiate purchase.' });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleManualPayment = async (plan: Plan) => {
        if(!user || !assignedTrainerId) return;
        setIsProcessing(true);
        try {
            await addDoc(collection(db, 'notifications'), {
                recipientId: assignedTrainerId,
                type: 'manual_payment_proof',
                message: `${user.displayName} has indicated they've paid for the "${plan.planName}" plan.`,
                link: `/trainer/students`,
                isRead: false,
                createdAt: serverTimestamp(),
                 // Add context for the trainer
                context: {
                    studentId: user.uid,
                    studentName: user.displayName,
                    planId: plan.id,
                    planName: plan.planName,
                    credits: plan.credits,
                }
            });
             toast({ title: 'Notification Sent!', description: 'Your trainer has been notified. They will assign credits upon verifying payment.' });
             setSelectedPlan(null); // Close dialog
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: "Could not send notification." });
        } finally {
            setIsProcessing(false);
        }
    }
    
    const hasPaymentMethods = useMemo(() => {
        if (!paymentSettings) return false;
        return paymentSettings.stripeOnboardingComplete || !!paymentSettings.paypalEmail || !!paymentSettings.bankDetails;
    }, [paymentSettings]);


    const renderSkeleton = () => (
        <Card className="flex flex-col">
            <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader>
            <CardContent className="flex-grow space-y-4">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
            </CardContent>
            <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
        </Card>
    );

    if (isLoading || authLoading) {
        return (
            <div className="container mx-auto px-4 py-12">
                 <div className="text-center max-w-2xl mx-auto mb-12">
                    <Skeleton className="h-10 w-2/3 mx-auto" />
                    <Skeleton className="h-5 w-full mx-auto mt-4" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                    {renderSkeleton()}{renderSkeleton()}{renderSkeleton()}
                </div>
            </div>
        )
    }

    if (!assignedTrainerId) {
        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <h2 className="text-2xl font-bold">No Trainer Assigned</h2>
                <p className="text-muted-foreground">You need to be assigned to a trainer to view credit plans.</p>
            </div>
        );
    }
    
    if (plans.length === 0) {
         return (
            <div className="container mx-auto px-4 py-12 text-center">
                <h2 className="text-2xl font-bold">No Plans Available</h2>
                <p className="text-muted-foreground">Your trainer has not created any credit plans yet.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="text-center max-w-2xl mx-auto mb-12">
                <h1 className="text-4xl font-bold font-headline">Credit Plans</h1>
                <p className="text-lg text-muted-foreground mt-2">Purchase credits to get AI or trainer feedback on your practice tests.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                {plans.map(plan => (
                    <Card key={plan.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-2xl">{plan.planName}</CardTitle>
                            <div className="flex items-baseline gap-2">
                               <span className="text-4xl font-bold">${plan.price}</span>
                               <span className="text-muted-foreground">/ {plan.credits} credits</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-2">
                           {/* Add plan features here if needed */}
                           <p className="text-muted-foreground">Get detailed feedback and improve your score.</p>
                           <ul className="space-y-2 pt-2">
                               <li className="flex items-center gap-2"><Check className="text-green-500"/> AI Evaluations</li>
                               <li className="flex items-center gap-2"><Check className="text-green-500"/> Trainer Feedback</li>
                               <li className="flex items-center gap-2"><Check className="text-green-500"/> Conversation Threads</li>
                           </ul>
                        </CardContent>
                        <CardFooter>
                            <Dialog onOpenChange={(open) => !open && setSelectedPlan(null)}>
                                <DialogTrigger asChild>
                                    <Button className="w-full" onClick={() => setSelectedPlan(plan)} disabled={!hasPaymentMethods}>
                                        {hasPaymentMethods ? 'Purchase Plan' : 'Not Available'}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Purchase {selectedPlan?.planName}</DialogTitle>
                                        <DialogDescription>Choose a payment method to complete your purchase.</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-4">
                                        {paymentSettings?.stripeOnboardingComplete && (
                                            <Button className="w-full" size="lg" onClick={() => handleStripePurchase(selectedPlan!)} disabled={isProcessing}>
                                                {isProcessing ? "Processing..." : "Pay with Card (Stripe)"}
                                            </Button>
                                        )}
                                        {paymentSettings?.paypalEmail && (
                                            <Card>
                                                <CardHeader><CardTitle>PayPal</CardTitle></CardHeader>
                                                <CardContent>
                                                    <p className="text-muted-foreground">Please send ${selectedPlan?.price} to:</p>
                                                    <p className="font-semibold break-words">{paymentSettings.paypalEmail}</p>
                                                </CardContent>
                                                <CardFooter>
                                                    <Button className="w-full" variant="secondary" onClick={() => handleManualPayment(selectedPlan!)} disabled={isProcessing}>
                                                        {isProcessing ? "Notifying..." : "I've Paid, Notify Trainer"}
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        )}
                                         {paymentSettings?.bankDetails && (
                                            <Card>
                                                <CardHeader><CardTitle>Bank Transfer</CardTitle></CardHeader>
                                                <CardContent>
                                                    <p className="text-muted-foreground">Please use the following details for the transfer:</p>
                                                    <p className="font-semibold whitespace-pre-wrap">{paymentSettings.bankDetails}</p>
                                                </CardContent>
                                                <CardFooter>
                                                    <Button className="w-full" variant="secondary" onClick={() => handleManualPayment(selectedPlan!)} disabled={isProcessing}>
                                                         {isProcessing ? "Notifying..." : "I've Paid, Notify Trainer"}
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
