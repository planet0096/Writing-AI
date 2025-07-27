
"use client";

import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const pricingSchema = z.object({
  aiEvaluationCost: z.coerce.number().int().min(0, "Must be a positive number"),
  trainerEvaluationCost: z.coerce.number().int().min(0, "Must be a positive number"),
});

type PricingFormValues = z.infer<typeof pricingSchema>;

export default function TrainerPricingSettingsPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      aiEvaluationCost: 10,
      trainerEvaluationCost: 25,
    },
  });

  useEffect(() => {
    if (loading || !user) return;

    const fetchPricing = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().pricing) {
          form.reset(docSnap.data().pricing);
        }
      } catch (error) {
        console.error("Error fetching pricing:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPricing();
  }, [user, form, loading]);

  const onSubmit = async (data: PricingFormValues) => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { pricing: data });
      toast({
        title: "Success!",
        description: "Pricing updated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update pricing.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-24" />
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation Pricing</CardTitle>
        <CardDescription>Set the credit cost for different evaluation types that your students will see.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="aiEvaluationCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Evaluation Cost</FormLabel>
                   <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Cost in credits for one AI-powered evaluation.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="trainerEvaluationCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manual Trainer Evaluation Cost</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                   <FormDescription>
                    Cost in credits for your manual evaluation.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save Pricing'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
