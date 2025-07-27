"use client";

import { TestForm } from '@/components/test-form';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export default function CreateTestPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (!authLoading && !user) {
            // This should be handled by the AuthProvider, but as a fallback
            router.push('/login');
        }
    }, [user, authLoading, router]);

    if (authLoading || !user) {
        // Render a loading state or null while waiting for auth state
        return null;
    }

    const handleSave = async (testData: any) => {
        try {
            await addDoc(collection(db, "tests"), {
                ...testData,
                trainerId: user.uid,
                createdAt: serverTimestamp(),
            });
            toast({
                title: "Success!",
                description: "Test has been created successfully.",
            });
            router.push('/trainer/tests');
        } catch (error) {
            console.error("Error creating test: ", error);
            toast({
                variant: "destructive",
                title: "Error creating test",
                description: "There was an error saving your test. Please try again.",
            });
        }
    };

    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-6">Create New Test</h1>
            <TestForm onSave={handleSave} />
        </div>
    );
}
