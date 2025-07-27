
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { createStripeConnectLink } from '@/ai/flows/stripe-flows';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  bankDetails: z.string().optional(),
  paypalEmail: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export default function PaymentSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { bankDetails: '', paypalEmail: '' },
  });

  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      setIsLoading(true);
      const settingsRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(settingsRef);
      if (docSnap.exists()) {
        const data = docSnap.data().paymentSettings || {};
        form.reset(data);
        setStripeOnboardingComplete(data.stripeOnboardingComplete || false);
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, [user, form]);

  const onSubmit = async (data: FormValues) => {
    if (!user) return;
    try {
      const settingsRef = doc(db, 'users', user.uid);
      await updateDoc(settingsRef, {
        paymentSettings: {
            bankDetails: data.bankDetails,
            paypalEmail: data.paypalEmail,
        }
      }, { merge: true });
      toast({ title: 'Success', description: 'Manual payment methods saved.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save settings.' });
    }
  };

  const handleConnectStripe = async () => {
    if (!user) return;
    setIsConnecting(true);
    try {
      const { url } = await createStripeConnectLink({ 
        trainerId: user.uid,
        origin: window.location.origin
       });
      window.location.href = url;
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not connect to Stripe.' });
      setIsConnecting(false);
    }
  };

  if (isLoading || authLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connect with Stripe</CardTitle>
          <CardDescription>Connect your Stripe account to accept credit card payments from students automatically. Stripe handles all payment processing and security.</CardDescription>
        </CardHeader>
        <CardContent>
          {stripeOnboardingComplete ? (
            <Alert variant="default" className="border-green-600 bg-green-50">
                <AlertCircle className="h-4 w-4 !text-green-600" />
                <AlertTitle className="text-green-800">Stripe Connected</AlertTitle>
                <AlertDescription className="text-green-700">
                    Your account is connected and ready to receive payments.
                </AlertDescription>
            </Alert>
          ) : (
            <Button onClick={handleConnectStripe} disabled={isConnecting}>
              {isConnecting ? 'Connecting...' : 'Connect with Stripe'}
            </Button>
          )}
        </CardContent>
      </Card>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manual Payment Methods</CardTitle>
              <CardDescription>Provide details for manual payments. Students will see these instructions and notify you after paying.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="bankDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Transfer Details</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Bank Name: ...&#10;Account Number: ...&#10;Swift Code: ..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paypalEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PayPal Email or PayPal.Me Link</FormLabel>
                    <FormControl>
                      <Input placeholder="your.email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
             <div className="p-6 pt-0">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Saving...' : 'Save Manual Methods'}
                </Button>
            </div>
          </Card>
        </form>
      </Form>
    </div>
  );
}
