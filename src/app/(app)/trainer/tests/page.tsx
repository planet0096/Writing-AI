
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Test {
  id: string;
  title: string;
  category: string;
  questionImageUrl?: string;
}

export default function TestsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchTests = async () => {
      try {
        const q = query(collection(db, 'tests'), where('trainerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const testsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Test));
        setTests(testsData);
      } catch (error) {
        console.error("Error fetching tests: ", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch tests.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTests();
  }, [user, authLoading, router, toast]);

  const handleDelete = async (testId: string, imageUrl?: string) => {
    try {
      // Delete Firestore document
      await deleteDoc(doc(db, 'tests', testId));

      // Delete image from Storage if it exists
      if (imageUrl) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      }
      
      setTests(tests.filter(test => test.id !== testId));
      toast({
        title: 'Success',
        description: 'Test deleted successfully.',
      });
    } catch (error) {
      console.error("Error deleting test: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete test.',
      });
    }
  };
  
  const renderSkeleton = () => (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
      <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Test Management</h1>
          <p className="text-sm text-slate-500">Create, edit, and manage your writing tests.</p>
        </div>
        <Button onClick={() => router.push('/trainer/tests/create')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Test
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {renderSkeleton()}
                {renderSkeleton()}
                {renderSkeleton()}
              </>
            ) : tests.length > 0 ? (
              tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium">{test.title}</TableCell>
                  <TableCell className="text-slate-500">{test.category}</TableCell>
                  <TableCell className="text-right">
                     <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" onClick={() => router.push(`/trainer/tests/edit/${test.id}`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the test and its associated image from storage.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(test.id, test.questionImageUrl)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-slate-500">
                  No tests found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

    