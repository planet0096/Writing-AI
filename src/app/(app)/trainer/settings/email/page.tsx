
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { updateEmailSettings, sendTestEmail } from '@/ai/flows/trainer-settings-flow';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Edit, Send } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import TiptapEditor from '@/components/tiptap-editor';
import { Label } from '@/components/ui/label';

const smtpSchema = z.object({
    host: z.string().min(1, 'Host is required.'),
    port: z.coerce.number().int().positive('Port must be a positive number.'),
    user: z.string().min(1, 'Username is required.'),
    pass: z.string().min(1, 'Password is required.'),
});

const emailTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    subject: z.string().min(1, 'Subject is required.'),
    body: z.string().min(1, 'Body is required.'),
    enabled: z.boolean(),
    shortcodes: z.array(z.string()),
});

const emailSettingsSchema = z.object({
  smtp: smtpSchema,
  templates: z.array(emailTemplateSchema),
});

type EmailSettingsFormValues = z.infer<typeof emailSettingsSchema>;
type EmailTemplateFormValues = z.infer<typeof emailTemplateSchema>;

const DEFAULT_TEMPLATES: EmailTemplateFormValues[] = [
    {
        id: 'newManualSubmission',
        name: 'New Manual Submission',
        subject: 'New IELTS Submission for Review: {{testTitle}}',
        body: `<p>Hi {{trainerName}},</p><p>A new submission has been made by <strong>{{studentName}}</strong> for the test "<strong>{{testTitle}}</strong>".</p><p>Please log in to your dashboard to review it.</p>`,
        enabled: true,
        shortcodes: ['{{studentName}}', '{{trainerName}}', '{{testTitle}}'],
    },
    // Add more default templates here in the future
];

export default function EmailSettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplateFormValues | null>(null);

    const form = useForm<EmailSettingsFormValues>({
        resolver: zodResolver(emailSettingsSchema),
        defaultValues: {
            smtp: { host: '', port: 587, user: '', pass: '' },
            templates: DEFAULT_TEMPLATES,
        },
    });

    const { fields, update } = useFieldArray({
        control: form.control,
        name: 'templates',
    });

    useEffect(() => {
        if (!user) return;

        const fetchSettings = async () => {
            setIsLoading(true);
            const settingsRef = doc(db, 'users', user.uid, 'private_details', 'email_settings');
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const templates = DEFAULT_TEMPLATES.map(dt => {
                    const savedTemplate = data.templates?.[dt.id];
                    return savedTemplate ? { ...dt, ...savedTemplate } : dt;
                });
                form.reset({
                    smtp: data.smtp || { host: '', port: 587, user: '', pass: '' },
                    templates: templates,
                });
            }
            setIsLoading(false);
        };
        fetchSettings();
    }, [user, form]);

    const onSubmit = async (data: EmailSettingsFormValues) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            // Convert array of templates to an object keyed by id for Firestore
            const templatesAsObject = data.templates.reduce((acc, t) => {
                acc[t.id] = { subject: t.subject, body: t.body, enabled: t.enabled };
                return acc;
            }, {} as Record<string, any>);

            await updateEmailSettings({
                trainerId: user.uid,
                settings: {
                    smtp: data.smtp,
                    templates: templatesAsObject
                }
            });
            toast({ title: 'Success', description: 'Email settings have been saved.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save email settings.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleTemplateUpdate = (updatedTemplate: EmailTemplateFormValues) => {
        const index = fields.findIndex(f => f.id === updatedTemplate.id);
        if(index !== -1){
            update(index, updatedTemplate);
            // We need to trigger the main form save to persist this
            form.handleSubmit(onSubmit)();
        }
        setEditingTemplate(null);
    };
    
    const handleTestSmtp = async () => {
        if (!user) return;
        
        await form.trigger('smtp');
        const smtpState = form.getFieldState('smtp');
        if (smtpState.invalid) {
            toast({ variant: 'destructive', title: 'Invalid SMTP data', description: 'Please fill in all SMTP fields before testing.' });
            return;
        }
        
        setIsTesting(true);
        try {
            // First save the current settings
            await onSubmit(form.getValues());
            
            // Then run the test flow
            const result = await sendTestEmail({ trainerId: user.uid });
            toast({ title: 'Success', description: result.message });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Test Failed', description: error.message });
        } finally {
            setIsTesting(false);
        }
    };

    if (isLoading || authLoading) {
        return <Skeleton className="h-[500px] w-full" />;
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>SMTP Server Settings</CardTitle>
                        <CardDescription>Configure your outgoing mail server to send email notifications. Your credentials are stored securely.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="smtp.host" render={({ field }) => (
                                <FormItem><FormLabel>SMTP Host</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="smtp.port" render={({ field }) => (
                                <FormItem><FormLabel>Port</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="smtp.user" render={({ field }) => (
                                <FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="smtp.pass" render={({ field }) => (
                                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                    </CardContent>
                    <CardFooter className="gap-2">
                        <Button type="submit" disabled={isSubmitting || isTesting}>
                            {isSubmitting ? 'Saving...' : 'Save All Settings'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={handleTestSmtp} disabled={isTesting || isSubmitting}>
                            <Send className="mr-2 h-4 w-4" />
                            {isTesting ? 'Sending...' : 'Send Test Email'}
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Email Templates</CardTitle>
                        <CardDescription>Enable, disable, or customize the emails sent from the platform.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       {fields.map((template, index) => (
                            <div key={template.id}>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="font-medium text-slate-800 dark:text-slate-200">{template.name}</p>
                                        <p className="text-sm text-muted-foreground">{form.getValues(`templates.${index}.subject`)}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon"><Edit className="h-4 w-4"/></Button>
                                            </DialogTrigger>
                                            <EditTemplateDialog 
                                                template={form.getValues(`templates.${index}`)}
                                                onSave={handleTemplateUpdate}
                                            />
                                        </Dialog>
                                        <FormField
                                            control={form.control}
                                            name={`templates.${index}.enabled`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                                {index < fields.length -1 && <Separator className="mt-4" />}
                            </div>
                       ))}
                    </CardContent>
                </Card>
            </form>
        </Form>
    );
}


interface EditTemplateDialogProps {
    template: EmailTemplateFormValues;
    onSave: (data: EmailTemplateFormValues) => void;
}

function EditTemplateDialog({template, onSave}: EditTemplateDialogProps) {
    const { register, handleSubmit, control, watch } = useForm<EmailTemplateFormValues>({
        defaultValues: template,
    });

    return (
         <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Edit: {template.name}</DialogTitle>
                <DialogDescription>
                    Customize the subject and body of this email. Use the provided shortcodes to insert dynamic content.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                <div className="md:col-span-2 space-y-4">
                    <div>
                        <Label htmlFor="subject">Email Subject</Label>
                        <Input id="subject" {...register('subject')} />
                    </div>
                     <div>
                        <Label>Email Body</Label>
                        <Controller
                            control={control}
                            name="body"
                            render={({ field }) => <TiptapEditor content={field.value} onChange={field.onChange} />}
                        />
                    </div>
                </div>
                <div className="space-y-4">
                    <Card className="bg-slate-50 dark:bg-slate-800">
                        <CardHeader><CardTitle className="text-sm">Available Shortcodes</CardTitle></CardHeader>
                        <CardContent>
                            <ul className="space-y-1">
                                {template.shortcodes.map(code => (
                                    <li key={code}><code className="text-xs bg-slate-200 dark:bg-slate-700 p-1 rounded">{code}</code></li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Live Preview</AlertTitle>
                        <AlertDescription>The content below is a sample preview.</AlertDescription>
                    </Alert>
                    <div className="border p-4 rounded-md prose prose-sm dark:prose-invert max-w-none">
                        <h3 className="text-base font-semibold">{watch('subject')}</h3>
                        <div dangerouslySetInnerHTML={{ __html: watch('body')}} />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                <DialogClose asChild><Button onClick={handleSubmit(onSave)}>Save Template</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
    );
}
