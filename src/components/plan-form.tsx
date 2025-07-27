
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  planName: z.string().min(1, 'Plan name is required'),
  credits: z.coerce.number().int().positive('Credits must be a positive number'),
  price: z.coerce.number().positive('Price must be a positive number'),
});

type PlanFormValues = z.infer<typeof formSchema>;

interface PlanFormProps {
  initialData?: PlanFormValues;
  onSave: (data: PlanFormValues) => void;
  isSaving?: boolean;
}

export function PlanForm({ initialData, onSave, isSaving }: PlanFormProps) {
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      planName: '',
      credits: 100,
      price: 10,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <Card>
          <CardContent className="pt-6 grid gap-6">
            <FormField
              control={form.control}
              name="planName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Basic Pack" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credits</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Plan'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
