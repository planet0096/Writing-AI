
"use client";

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, Timestamp, doc, getDoc, updateDoc, increment, deleteDoc, runTransaction, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Users, FileText, Clock, BellDot, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Notification {
    id: string;
    message: string;
    context: {
        studentId: string;
        planId: string;
        planName: string;
        credits: number;
        studentName: string;
    }
}

export default function TrainerDashboard() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [profileCode, setProfileCode] = useState<string | null>(null);
  const [stats, setStats] = useState({
    activeStudents: 0,
    submissionsThisMonth: 0,
    pendingEvaluations: 0,
  });
  const [paymentNotifications, setPaymentNotifications] = useState<Notification[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    if (loading || !user) return;

    const fetchDashboardData = async () => {
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
            where('status', '==', 'submitted'),
            where('evaluationType', '==', 'manual')
          );
          const pendingSnapshot = await getDocs(pendingQuery);
          const pendingEvaluations = pendingSnapshot.size;

          setStats({ activeStudents, submissionsThisMonth, pendingEvaluations });

          // Fetch Payment Notifications
          const notificationsQuery = query(
            collection(db, 'notifications'), 
            where('recipientId', '==', user.uid),
            where('type', '==', 'manual_payment_proof')
          );
          const notificationsSnapshot = await getDocs(notificationsQuery);
          setPaymentNotifications(notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));

        } catch (error) {
          console.error("Error fetching dashboard data:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load dashboard data.' });
        } finally {
          setIsDataLoading(false);
        }
    };
    
    fetchDashboardData();
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

  const handleConfirmPayment = async (notification: Notification) => {
    if (!notification.context || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'Notification data is missing. Cannot process payment.' });
        return;
    }

    try {
        const studentRef = doc(db, 'users', notification.context.studentId);
        const planRef = doc(db, 'plans', notification.context.planId);

        await runTransaction(db, async (transaction) => {
            const [studentSnap, planSnap] = await Promise.all([
                transaction.get(studentRef),
                transaction.get(planRef),
            ]);

            if (!studentSnap.exists()) throw new Error("Student not found.");
            if (!planSnap.exists()) throw new Error("Plan not found.");
            
            const studentData = studentSnap.data();
            const planData = planSnap.data();
            const newBalance = (studentData.credits || 0) + notification.context.credits;

            // Update student's credits and current plan
            transaction.update(studentRef, {
                credits: newBalance,
                currentPlan: {
                    planId: notification.context.planId,
                    planName: notification.context.planName,
                    assignedAt: new Date(),
                }
            });

            // Log the transaction
            const transactionRef = collection(db, 'users', notification.context.studentId, 'credit_transactions');
            transaction.set(doc(transactionRef), {
                type: 'purchase',
                amount: planData.price * 100, // Store in cents
                description: `Manual payment confirmed for ${notification.context.planName}`,
                balance_after: newBalance,
                createdAt: serverTimestamp(),
                trainerId: user.uid,
                studentId: notification.context.studentId,
                planName: notification.context.planName,
            });

            // Delete the notification
            const notifRef = doc(db, 'notifications', notification.id);
            transaction.delete(notifRef);
        });

        setPaymentNotifications(prev => prev.filter(n => n.id !== notification.id));
        toast({ title: 'Success', description: `Credits assigned to ${notification.context.studentName}.` });
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to assign credits.' });
    }
  };


  if (loading || isDataLoading) {
     return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-6 w-1/2" />
          <div className="grid gap-6 md:grid-cols-3">
             <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-6 w-6" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3" /></CardContent></Card>
             <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-6 w-6" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3" /></CardContent></Card>
             <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-6 w-6" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3" /></CardContent></Card>
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-48" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800">Welcome, {user?.displayName || user?.email}!</h1>
          <p className="text-slate-600 text-sm">Here's a snapshot of your activity.</p>
      </div>

      {paymentNotifications.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-500/30">
              <CardHeader>
                  <div className="flex items-center gap-3">
                      <BellDot className="text-amber-600 dark:text-amber-500" />
                      <CardTitle className="text-amber-800 dark:text-amber-300">Manual Payment Verification</CardTitle>
                  </div>
                  <CardDescription>Review these payments and assign credits manually once you've confirmed receipt.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                  {paymentNotifications.map(n => (
                      <div key={n.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-md border gap-2">
                          <p className="text-sm flex-grow text-slate-600 dark:text-slate-300">{n.message}</p>
                          <Button size="sm" onClick={() => handleConfirmPayment(n)} variant="secondary">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Confirm & Assign Credits
                          </Button>
                      </div>
                  ))}
              </CardContent>
          </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Active Students" value={stats.activeStudents} icon={<Users className="text-indigo-600" />} isLoading={isDataLoading} />
          <StatCard title="Submissions This Month" value={stats.submissionsThisMonth} icon={<FileText className="text-indigo-600"/>} isLoading={isDataLoading} />
          <StatCard title="Pending Evaluations" value={stats.pendingEvaluations} icon={<Clock className="text-indigo-600"/>} isLoading={isDataLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Profile Code</CardTitle>
          <CardDescription>Share this code with your students to connect with them.</CardDescription>
        </CardHeader>
        <CardContent>
          {isDataLoading ? <Skeleton className="h-10 w-48" /> : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <p className="text-2xl font-mono tracking-widest bg-slate-100 text-slate-700 px-4 py-2 rounded-md dark:bg-slate-800 dark:text-slate-300">{profileCode}</p>
                  <Button onClick={copyToClipboard} variant="outline">Copy</Button>
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    isLoading: boolean;
}

function StatCard({ title, value, icon, isLoading }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className="text-slate-500">{icon}</div>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/3" /> : (
                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
                )}
            </CardContent>
        </Card>
    );
}
