
"use client";

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Users, FileText, Clock } from 'lucide-react';

export default function TrainerDashboard() {
  const { user, loading } = useAuth();
  const [profileCode, setProfileCode] = useState<string | null>(null);
  const [stats, setStats] = useState({
    activeStudents: 0,
    submissionsThisMonth: 0,
    pendingEvaluations: 0,
  });
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (user) {
        setIsDataLoading(true);
        try {
          // Fetch Profile Code
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setProfileCode(userDocSnap.data().profileCode);
          }

          // Fetch Stats
          const studentsQuery = query(collection(db, 'users'), where('assignedTrainerId', '==', user.uid));
          const studentsSnapshot = await getDocs(studentsQuery);
          const activeStudents = studentsSnapshot.size;

          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          const submissionsQuery = query(
            collection(db, 'submissions'), 
            where('trainerId', '==', user.uid),
            where('submittedAt', '>=', Timestamp.fromDate(startOfMonth))
          );
          const submissionsSnapshot = await getDocs(submissionsQuery);
          const submissionsThisMonth = submissionsSnapshot.size;
          
          const pendingQuery = query(
            collection(db, 'submissions'),
            where('trainerId', '==', user.uid),
            where('status', '==', 'submitted')
          );
          const pendingSnapshot = await getDocs(pendingQuery);
          const pendingEvaluations = pendingSnapshot.size;

          setStats({ activeStudents, submissionsThisMonth, pendingEvaluations });

        } catch (error) {
          console.error("Error fetching dashboard data:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load dashboard data.' });
        } finally {
          setIsDataLoading(false);
        }
      }
    };
    if (!loading) {
      fetchDashboardData();
    }
  }, [user, loading, toast]);


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
      <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold font-headline">Welcome, {user?.displayName || user?.email}!</h1>
            <p className="text-muted-foreground">Here's a snapshot of your activity.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Active Students" value={stats.activeStudents} icon={<Users />} isLoading={isDataLoading} />
            <StatCard title="Submissions This Month" value={stats.submissionsThisMonth} icon={<FileText />} isLoading={isDataLoading} />
            <StatCard title="Pending Evaluations" value={stats.pendingEvaluations} icon={<Clock />} isLoading={isDataLoading} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Profile Code</CardTitle>
            <CardDescription>Share this code with your students to connect with them.</CardDescription>
          </CardHeader>
          <CardContent>
            {isDataLoading ? <Skeleton className="h-10 w-48" /> : (
                <div className="flex items-center gap-4">
                    <p className="text-2xl font-mono tracking-widest bg-muted text-muted-foreground px-4 py-2 rounded-md">{profileCode}</p>
                    <Button onClick={copyToClipboard} variant="outline" size="sm">Copy</Button>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    isLoading: boolean;
}

function StatCard({ title, value, icon, isLoading }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className="text-muted-foreground">{icon}</div>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/3" /> : (
                    <div className="text-2xl font-bold">{value}</div>
                )}
            </CardContent>
        </Card>
    );
}

// Need to add getDoc to imports for the profile code fetching
import { doc, getDoc } from 'firebase/firestore';
