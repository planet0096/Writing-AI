
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { PlanForm } from '@/components/plan-form';

export default function CreatePlanPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (planData: any) => {
        if (!user) return;
        setIsSaving(true);
        try {
            await addDoc(collection(db, "plans"), {
                ...planData,
                trainerId: user.uid,
                createdAt: serverTimestamp(),
            });
            toast({
                title: "Success!",
                description: "Plan has been created successfully.",
            });
            router.push('/trainer/plans');
        } catch (error) {
            console.error("Error creating plan: ", error);
            toast({
                variant: "destructive",
                title: "Error creating plan",
                description: "There was an error saving the plan. Please try again.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading) return null;

    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold font-headline mb-6">Create New Credit Plan</h1>
            <PlanForm onSave={handleSave} isSaving={isSaving} />
        </div>
    );
}
