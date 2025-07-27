
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { User, PlusCircle } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  credits: number;
}

export default function StudentManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creditAmounts, setCreditAmounts] = useState<{[key: string]: number}>({});

  useEffect(() => {
    const fetchStudents = async () => {
      if (user) {
        try {
          const studentsQuery = query(collection(db, 'users'), where('assignedTrainerId', '==', user.uid));
          const querySnapshot = await getDocs(studentsQuery);
          const studentsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            credits: 0, // Default value
            ...doc.data(),
          } as Student));
          setStudents(studentsData);
        } catch (error) {
          console.error("Error fetching students: ", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    if (!authLoading) {
      fetchStudents();
    }
  }, [user, authLoading]);

  const handleAddCredits = async (studentId: string) => {
    const amount = creditAmounts[studentId];
    if (!amount || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a positive number of credits to add.",
      });
      return;
    }

    try {
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, {
        credits: increment(amount),
      });

      setStudents(prevStudents =>
        prevStudents.map(student =>
          student.id === studentId ? { ...student, credits: student.credits + amount } : student
        )
      );

      setCreditAmounts(prev => ({...prev, [studentId]: 0}));

      toast({
        title: "Success",
        description: `${amount} credits added to the student's account.`,
      });
    } catch (error) {
      console.error("Error adding credits:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add credits. Please try again.",
      });
    }
  };
  
  const renderSkeleton = () => (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-10 w-48" /></TableCell>
    </TableRow>
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Student Management</CardTitle>
          <CardDescription>View your assigned students and manage their credit balances.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead className="text-right">Add Credits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <>
                  {renderSkeleton()}
                  {renderSkeleton()}
                </>
              ) : students.length > 0 ? (
                students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium flex items-center gap-2"><User className="text-muted-foreground" /> {student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell className="font-semibold">{student.credits}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Amount"
                          className="w-24 h-9"
                          value={creditAmounts[student.id] || ''}
                          onChange={(e) => setCreditAmounts(prev => ({ ...prev, [student.id]: parseInt(e.target.value) || 0 }))}
                        />
                        <Button size="sm" onClick={() => handleAddCredits(student.id)}>
                          <PlusCircle className="mr-2 h-4 w-4"/> Add
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    No students have signed up with your code yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
