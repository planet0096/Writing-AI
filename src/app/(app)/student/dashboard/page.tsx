
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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-5 w-1/3" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-40" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-800">Welcome, {user?.displayName || user?.email}!</h1>
        <p className="text-sm text-slate-600">This is your student dashboard. Ready to start practicing?</p>
      </div>
      
      <Card className="bg-indigo-600/5 dark:bg-indigo-500/10 border-indigo-600/20">
        <CardHeader>
          <CardTitle className="text-indigo-800 dark:text-indigo-200">Ready to Practice?</CardTitle>
          <CardDescription className="text-indigo-700 dark:text-indigo-300">View the tests assigned by your trainer and start your journey to success.</CardDescription>
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
  );
}
