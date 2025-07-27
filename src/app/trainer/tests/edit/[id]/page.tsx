"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TestForm } from '@/components/test-form';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function EditTestPage() {
    const router = useRouter();
    const params = useParams();
    const { id } = params;
    const { toast } = useToast();
    const [testData, setTestData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const fetchTest = async () => {
            try {
                const docRef = doc(db, 'tests', id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setTestData({ id: docSnap.id, ...docSnap.data() } as any);
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Not Found',
                        description: 'Test not found.',
                    });
                    router.push('/trainer/tests');
                }
            } catch (error) {
                console.error("Error fetching test:", error);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to fetch test data.',
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchTest();
    }, [id, router, toast]);

    const handleSave = async (updatedData: any) => {
        try {
            const testRef = doc(db, "tests", id as string);
            await updateDoc(testRef, updatedData);
            toast({
                title: "Success!",
                description: "Test updated successfully.",
            });
            router.push('/trainer/tests');
        } catch (error) {
            console.error("Error updating test: ", error);
            toast({
                variant: "destructive",
                title: "Error updating test",
                description: "There was an error saving your test. Please try again.",
            });
        }
    };
    
    const renderSkeleton = () => (
      <Card>
        <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-40 w-full" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-24 w-full" />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-20 w-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-10 w-28" />
        </CardContent>
      </Card>
    );

    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-6">Edit Test</h1>
            {isLoading ? renderSkeleton() : testData && <TestForm initialData={testData} onSave={handleSave} />}
        </div>
    );
}
