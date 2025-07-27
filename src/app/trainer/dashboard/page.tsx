"use client";

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function TrainerDashboard() {
  const { user, loading } = useAuth();
  const [profileCode, setProfileCode] = useState<string | null>(null);
  const [isCodeLoading, setIsCodeLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfileCode = async () => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfileCode(docSnap.data().profileCode);
          }
        } catch (error) {
          console.error("Error fetching profile code:", error);
        } finally {
          setIsCodeLoading(false);
        }
      }
    };
    fetchProfileCode();
  }, [user]);

  const copyToClipboard = () => {
    if (profileCode) {
      navigator.clipboard.writeText(profileCode);
      toast({
        title: "Copied to clipboard!",
        description: "Your profile code has been copied.",
      });
    }
  };

  if (loading) {
     return (
      <div className="container mx-auto px-4 py-12">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-6 w-1/2" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Welcome, {user?.displayName || user?.email}!</h1>
        <p className="text-muted-foreground">This is your trainer dashboard. Manage your students and resources here.</p>
        <Card>
          <CardHeader>
            <CardTitle>Trainer Dashboard</CardTitle>
            <CardDescription>Oversee your students and materials.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Placeholder content for the trainer dashboard.</p>
            <div className="p-4 border rounded-lg bg-card-foreground/5">
                <h3 className="font-semibold text-lg">Your Profile Code</h3>
                <p className="text-muted-foreground mb-2">Share this code with your students to connect with them.</p>
                {isCodeLoading ? <Skeleton className="h-8 w-32" /> : (
                    <div className="flex items-center gap-4">
                        <p className="text-2xl font-mono tracking-widest bg-muted text-muted-foreground px-4 py-2 rounded-md">{profileCode}</p>
                        <Button onClick={copyToClipboard} variant="outline" size="sm">Copy</Button>
                    </div>
                )}

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
