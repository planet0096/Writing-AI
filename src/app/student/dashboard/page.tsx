
"use client";

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function StudentDashboard() {
  const { user, loading } = useAuth();

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
        <h1 className="text-3xl font-bold font-headline">Welcome, {user?.displayName || user?.email}!</h1>
        <p className="text-muted-foreground">This is your student dashboard. Ready to start practicing?</p>
        
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Ready to Practice?</CardTitle>
            <CardDescription>View the tests assigned by your trainer and start your journey to success.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/student/tests">
                Go to My Tests <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
