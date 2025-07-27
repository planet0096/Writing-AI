
"use client";

import { useAuth } from '@/contexts/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { updateTrainerApiKey } from '@/ai/flows/trainer-settings-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { KeyRound, ShieldCheck } from 'lucide-react';

const apiKeySchema = z.object({
  apiKey: z.string().min(10, "Please enter a valid API key."),
});

type ApiKeyFormValues = z.infer<typeof apiKeySchema>;

export default function GeminiApiKeyPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      apiKey: '',
    },
  });

  const onSubmit = async (data: ApiKeyFormValues) => {
    if (!user) return;
    try {
      await updateTrainerApiKey({ trainerId: user.uid, apiKey: data.apiKey });
      toast({
        title: "Success!",
        description: "Your Gemini API key has been saved securely.",
      });
      form.reset();
    } catch (error) {
        console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save your API key.",
      });
    }
  };
  
  if (loading) {
      return null;
  }

  return (
      <div className="space-y-6">
        <Alert>
            <KeyRound className="h-4 w-4" />
            <AlertTitle>Why provide your own API key?</AlertTitle>
            <AlertDescription>
            Using your own Gemini API key for student evaluations ensures that you have full control over your usage and billing. Your key is stored securely and is only used when your students request an AI evaluation.
            </AlertDescription>
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle>Set Your Gemini API Key</CardTitle>
            <CardDescription>This key will be used for all AI-powered evaluations requested by your students.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your API Key</FormLabel>
                       <FormControl>
                        <Input type="password" placeholder="••••••••••••••••••••••••••••••••••" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your key is encrypted and stored securely.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    <ShieldCheck />
                  {form.formState.isSubmitting ? 'Saving...' : 'Save Securely'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
  );
}
