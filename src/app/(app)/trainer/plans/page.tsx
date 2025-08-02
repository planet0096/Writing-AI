
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Plan {
  id: string;
  planName: string;
  credits: number;
  price: number;
}

export default function PlansPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchPlans = async () => {
      try {
        const q = query(collection(db, 'plans'), where('trainerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const plansData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
        setPlans(plansData.sort((a,b) => a.price - b.price));
      } catch (error) {
        console.error("Error fetching plans: ", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch plans.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, [user, authLoading, router, toast]);

  const handleDelete = async (planId: string) => {
    try {
      await deleteDoc(doc(db, 'plans', planId));
      setPlans(plans.filter(plan => plan.id !== planId));
      toast({
        title: 'Success',
        description: 'Plan deleted successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete plan.',
      });
    }
  };

  const renderSkeleton = () => (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
      <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
      <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
      <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></TableCell>
    </TableRow>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
       <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Credit Plans</h1>
          <p className="text-sm text-slate-500">Create and manage credit packages for your students.</p>
        </div>
        <Button onClick={() => router.push('/trainer/plans/create')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Plan
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>{renderSkeleton()}{renderSkeleton()}</>
            ) : plans.length > 0 ? (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.planName}</TableCell>
                  <TableCell>{plan.credits}</TableCell>
                  <TableCell>${plan.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                     <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" onClick={() => router.push(`/trainer/plans/edit/${plan.id}`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                       <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the credit plan.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(plan.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-500">No plans found. Create one to get started.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

    