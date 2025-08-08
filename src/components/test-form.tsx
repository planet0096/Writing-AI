
"use client";

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Upload, X, AlertCircle } from 'lucide-react';
import TiptapEditor from './tiptap-editor';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Switch } from './ui/switch';


const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  question: z.string().min(1, 'Question is required'),
  category: z.string().min(1, 'Category is required'),
  timer: z.coerce.number().int().positive('Timer must be a positive number'),
  isFree: z.boolean().optional(),
  sampleAnswer: z.string().optional(),
  aiEvaluationPrompt: z.string().optional(),
  questionImageUrl: z.string().optional(),
});

type TestFormValues = z.infer<typeof formSchema>;

interface TestFormProps {
  initialData?: TestFormValues & { id?: string };
  onSave: (data: TestFormValues) => void;
}

export function TestForm({ initialData, onSave }: TestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const form = useForm<TestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      title: '',
      question: '',
      category: '',
      timer: 40,
      isFree: false,
      sampleAnswer: '',
      aiEvaluationPrompt: '',
      questionImageUrl: '',
    },
  });
  
  const questionImageUrl = form.watch('questionImageUrl');
  
  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  const handleImageUpload = (file: File) => {
    const user = auth.currentUser;
    if (!file || !user) {
        setUploadError("You must be logged in to upload files.");
        return;
    };

    if (questionImageUrl) {
        handleRemoveImage(false); 
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const storageRef = ref(storage, `test_images/${user.uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        let errorMessage = 'An unknown error occurred during upload.';
        switch (error.code) {
          case 'storage/unauthorized':
            errorMessage = "Permission Denied: You don't have authorization to upload. Check your storage security rules.";
            break;
          case 'storage/canceled':
            errorMessage = 'Upload was canceled.';
            break;
          case 'storage/unknown':
            errorMessage = 'An unknown storage error occurred. Please check your network and try again.';
            break;
        }
        setUploadError(errorMessage);
        setIsUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          form.setValue('questionImageUrl', downloadURL, { shouldValidate: true });
          setIsUploading(false);
          toast({ title: 'Image uploaded successfully!'});
        });
      }
    );
  };
  
  const handleRemoveImage = async (showToast = true) => {
    const imageUrl = form.getValues('questionImageUrl');
    if(!imageUrl) return;

    try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
        form.setValue('questionImageUrl', '', { shouldValidate: true });
        if (showToast) {
            toast({ title: 'Image removed' });
        }
    } catch (error: any) {
        let errorMessage = "Failed to remove image."
        if (error.code === 'storage/object-not-found') {
            errorMessage = "Image already deleted or not found in storage."
            // Clear the URL from the form even if the file is not in storage
            form.setValue('questionImageUrl', '', { shouldValidate: true });
        }
        toast({ variant: 'destructive', title: 'Error', description: errorMessage });
    }
  };


  const onSubmit = (data: TestFormValues) => {
    setIsSubmitting(true);
    onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
            <CardContent className="pt-6 grid gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Writing Task 2: Technology" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="question"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question</FormLabel>
                       <FormDescription>
                        Enter the full test question. You can use an image for charts or graphs below.
                      </FormDescription>
                      <FormControl>
                        <TiptapEditor content={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="questionImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Image (Optional)</FormLabel>
                       <FormDescription>
                        Upload an image to accompany the question, like a chart or graph.
                      </FormDescription>
                      <FormControl>
                        <div className="space-y-4">
                         <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
                            className="hidden"
                          />
                          {!questionImageUrl && !isUploading && (
                             <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Image
                             </Button>
                          )}
                           {isUploading && <div className="w-full max-w-sm"><Progress value={uploadProgress} className="w-full" /><p className="text-sm text-muted-foreground mt-2">{Math.round(uploadProgress)}% uploaded</p></div>}
                          {questionImageUrl && !isUploading && (
                             <div className="relative w-full max-w-sm h-64 mt-2 border rounded-md overflow-hidden">
                                <Image src={questionImageUrl} alt="Question visual" layout="fill" objectFit="contain" />
                                <Button type="button" size="icon" variant="destructive" className="absolute top-2 right-2 h-7 w-7 z-10" onClick={() => handleRemoveImage()}>
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Remove Image</span>
                                </Button>
                             </div>
                          )}
                           {uploadError && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Upload Failed</AlertTitle>
                                    <AlertDescription>{uploadError}</AlertDescription>
                                </Alert>
                            )}
                        </div>
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Academic Task 1" {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="timer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timer (minutes)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                <FormField
                  control={form.control}
                  name="isFree"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Allow Free Evaluation</FormLabel>
                        <FormDescription>
                          If enabled, students can get this test evaluated for free, regardless of their credit balance.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sampleAnswer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sample Answer</FormLabel>
                       <FormDescription>A model answer for students to compare against.</FormDescription>
                      <FormControl>
                        <Textarea placeholder="Provide a high-scoring sample answer..." className="min-h-[120px]" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="aiEvaluationPrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI Evaluation Prompt</FormLabel>
                      <FormDescription>A custom prompt to guide the AI when it evaluates student submissions for this specific test.</FormDescription>
                      <FormControl>
                        <Textarea placeholder="e.g., Evaluate the following IELTS Writing Task 2 response based on Task Response, Cohesion, Lexical Resource, and Grammar..." className="min-h-[120px]" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSubmitting || isUploading}>
                    {isSubmitting ? 'Saving...' : (isUploading ? 'Uploading...' : 'Save Test')}
                </Button>

            </CardContent>
        </Card>
      </form>
    </Form>
  );
}
