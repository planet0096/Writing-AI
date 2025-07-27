
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const pricingSchema = z.object({
  aiEvaluationCost: z.coerce.number().int().min(0, "Must be a positive number"),
  trainerEvaluationCost: z.coerce.number().int().min(0, "Must be a positive number"),
});

type PricingFormValues = z.infer<typeof pricingSchema>;

export default function TrainerSettingsPage() {
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
    const fetchPricing = async () => {
      if (user) {
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
      }
    };
    fetchPricing();
  }, [user, form]);

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

  if (loading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-8 w-1/4 mb-6" />
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
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Pricing</CardTitle>
          <CardDescription>Set the credit cost for different evaluation types.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="aiEvaluationCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AI Evaluation Cost (in credits)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="trainerEvaluationCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trainer Evaluation Cost (in credits)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
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
    </div>
  );
}
