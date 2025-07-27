
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlanForm } from '@/components/plan-form';
import { useAuth } from '@/contexts/auth-context';

export default function EditPlanPage() {
    const router = useRouter();
    const params = useParams();
    const { id } = params;
    const { toast } = useToast();
    const { user } = useAuth();

    const [planData, setPlanData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!id || !user) return;
        const fetchPlan = async () => {
            try {
                const docRef = doc(db, 'plans', id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().trainerId === user.uid) {
                    setPlanData({ id: docSnap.id, ...docSnap.data() } as any);
                } else {
                    toast({ variant: 'destructive', title: 'Not Found or Unauthorized' });
                    router.push('/trainer/plans');
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch plan data.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchPlan();
    }, [id, user, router, toast]);

    const handleSave = async (updatedData: any) => {
        setIsSaving(true);
        try {
            const planRef = doc(db, "plans", id as string);
            await updateDoc(planRef, updatedData);
            toast({ title: "Success!", description: "Plan updated successfully." });
            router.push('/trainer/plans');
        } catch (error) {
            toast({ variant: "destructive", title: "Error updating plan" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const renderSkeleton = () => (
      <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-6"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          <Skeleton className="h-10 w-28" />
      </div>
    );

    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold font-headline mb-6">Edit Credit Plan</h1>
            {isLoading ? renderSkeleton() : (
                planData && <PlanForm initialData={planData} onSave={handleSave} isSaving={isSaving} />
            )}
        </div>
    );
}
