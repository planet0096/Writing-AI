
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment, serverTimestamp, runTransaction } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { User, MoreHorizontal, ShieldOff, ShieldCheck, UserX, PlusCircle, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Student {
  id: string;
  name: string;
  email: string;
  credits: number;
  accountStatus: 'active' | 'blocked';
}

interface Plan {
    id: string;
    planName: string;
    credits: number;
    price: number;
}

export default function StudentManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);


  useEffect(() => {
    if (authLoading || !user) return;

    const fetchData = async () => {
      try {
        // Fetch students
        const studentsQuery = query(collection(db, 'users'), where('assignedTrainerId', '==', user.uid));
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          credits: 0,
          accountStatus: 'active',
          ...doc.data(),
        } as Student));
        setStudents(studentsData);
        
        // Fetch plans
        const plansQuery = query(collection(db, 'plans'), where('trainerId', '==', user.uid));
        const plansSnapshot = await getDocs(plansQuery);
        const plansData = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
        setPlans(plansData);

      } catch (error) {
        console.error("Error fetching data: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch students or plans.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, toast]);

  const handleStatusChange = async (studentId: string, status: 'active' | 'blocked') => {
    try {
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, { accountStatus: status });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, accountStatus: status } : s));
      toast({ title: 'Success', description: `Student has been ${status === 'active' ? 'unblocked' : 'blocked'}.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update student status.' });
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, { assignedTrainerId: null });
      setStudents(prev => prev.filter(s => s.id !== studentId));
      toast({ title: 'Success', description: 'Student has been removed from your list.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove student.' });
    }
  };
  
  const handleAssignPlan = async (plan: Plan) => {
    if (!selectedStudent || !user) return;
    setIsAssigning(true);

    try {
        const studentRef = doc(db, 'users', selectedStudent.id);
        
        await runTransaction(db, async (transaction) => {
            const studentSnap = await transaction.get(studentRef);
            if (!studentSnap.exists()) throw new Error("Student not found.");
            
            const studentData = studentSnap.data();
            const newBalance = (studentData.credits || 0) + plan.credits;
            
            // Update student document
            transaction.update(studentRef, {
                currentPlan: {
                    planId: plan.id,
                    planName: plan.planName,
                    assignedAt: serverTimestamp(),
                },
                credits: newBalance,
            });

            // Create credit transaction log
            const transactionRef = collection(db, 'users', selectedStudent.id, 'credit_transactions');
            transaction.set(doc(transactionRef), {
                type: 'purchase',
                amount: plan.price * 100, // Store in cents
                description: `Assigned plan: ${plan.planName}`,
                balance_after: newBalance,
                createdAt: serverTimestamp(),
                trainerId: user.uid,
                studentId: selectedStudent.id,
                planName: plan.planName,
            });
        });
        
        setStudents(prevStudents =>
            prevStudents.map(student =>
              student.id === selectedStudent.id ? { ...student, credits: student.credits + plan.credits } : student
            )
        );
        toast({ title: "Success!", description: `${plan.planName} assigned and ${plan.credits} credits added.` });

    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message || "Failed to assign plan." });
    } finally {
        setIsAssigning(false);
        setSelectedStudent(null);
    }
  }

  const renderSkeleton = () => (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-10 w-48" /></TableCell>
    </TableRow>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Student Management</CardTitle>
          <CardDescription>View your assigned students and manage their accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>{renderSkeleton()}{renderSkeleton()}</>
                ) : students.length > 0 ? (
                  students.map((student) => (
                    <TableRow key={student.id} className={student.accountStatus === 'blocked' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                           {student.name}
                           {student.accountStatus === 'blocked' && <Badge variant="destructive">Blocked</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">{student.email}</TableCell>
                      <TableCell className="font-semibold">{student.credits}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                           <Button size="sm" variant="outline" onClick={() => router.push(`/trainer/students/${student.id}`)}>
                                <Eye className="mr-2 h-4 w-4"/> View Details
                           </Button>
                           <Dialog onOpenChange={(open) => !open && setSelectedStudent(null)}>
                              <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" onClick={() => setSelectedStudent(student)}>
                                      <PlusCircle className="mr-2 h-4 w-4"/> Assign Plan
                                  </Button>
                              </DialogTrigger>
                              <DialogContent>
                                  <DialogHeader>
                                      <DialogTitle>Assign a Plan to {selectedStudent?.name}</DialogTitle>
                                      <DialogDescription>Select a credit plan to assign. This will add the plan's credits to the student's current balance.</DialogDescription>
                                  </DialogHeader>
                                  <div className="py-4 space-y-2">
                                      {plans.length > 0 ? plans.map(plan => (
                                          <div key={plan.id} className="flex justify-between items-center p-3 border rounded-lg">
                                              <div>
                                                  <p className="font-semibold text-slate-700 dark:text-slate-200">{plan.planName}</p>
                                                  <p className="text-sm text-slate-500 dark:text-slate-400">{plan.credits} credits for ${plan.price}</p>
                                              </div>
                                              <DialogClose asChild>
                                                  <Button onClick={() => handleAssignPlan(plan)} disabled={isAssigning}>Assign</Button>
                                              </DialogClose>
                                          </div>
                                      )) : <p className="text-slate-500 text-center">You haven't created any plans yet. <Link href="/trainer/plans/create" className="text-indigo-600">Create one now.</Link></p>}
                                  </div>
                              </DialogContent>
                          </Dialog>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                 {student.accountStatus === 'active' ? (
                                      <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'blocked')}>
                                          <ShieldOff className="mr-2 h-4 w-4" /> Block
                                      </DropdownMenuItem>
                                  ) : (
                                      <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'active')}>
                                          <ShieldCheck className="mr-2 h-4 w-4" /> Unblock
                                      </DropdownMenuItem>
                                  )}
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-900/50 dark:focus:text-red-400">
                                              <UserX className="mr-2 h-4 w-4" /> Remove
                                          </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                  This action will unlink the student from your account. Their data will not be deleted.
                                              </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleRemoveStudent(student.id)}>Confirm</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                              </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-slate-500">No students have signed up with your code yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
