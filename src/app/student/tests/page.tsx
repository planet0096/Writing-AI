
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, BookCopy, User } from 'lucide-react';

interface Test {
  id: string;
  title: string;
  category: string;
  timer: number;
  trainerId: string;
}

interface Trainer {
    name: string;
}

export default function StudentTestsPage() {
  const router = useRouter();
  const { user, loading: authLoading, assignedTrainerId } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchTests = async () => {
      if (!assignedTrainerId) {
          setIsLoading(false);
          return;
      };
      
      try {
        const testsQuery = query(collection(db, 'tests'), where('trainerId', '==', assignedTrainerId));
        const querySnapshot = await getDocs(testsQuery);
        const testsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Test));
        setTests(testsData);

        const trainerRef = doc(db, 'users', assignedTrainerId);
        const trainerSnap = await getDoc(trainerRef);
        if (trainerSnap.exists()) {
            setTrainer(trainerSnap.data() as Trainer);
        }

      } catch (error) {
        console.error("Error fetching tests: ", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTests();
  }, [user, authLoading, router, assignedTrainerId]);
  
  const categories = useMemo(() => ['all', ...Array.from(new Set(tests.map(t => t.category)))], [tests]);
  
  const filteredTests = useMemo(() => {
    if (selectedCategory === 'all') return tests;
    return tests.filter(test => test.category === selectedCategory);
  }, [tests, selectedCategory]);

  const renderSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-24" />
      </CardFooter>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div className="space-y-1 mb-4 md:mb-0">
          <h1 className="text-3xl font-bold font-headline">My Tests</h1>
          <p className="text-muted-foreground">
            {isLoading ? <Skeleton className="h-5 w-48" /> : `Tests assigned by ${trainer?.name || 'your trainer'}.`}
          </p>
        </div>
        {categories.length > 1 && (
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList>
                    {categories.map(category => (
                        <TabsTrigger key={category} value={category} className="capitalize">
                            {category}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderSkeleton()}
          {renderSkeleton()}
          {renderSkeleton()}
        </div>
      ) : tests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => (
            <Card key={test.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{test.title}</CardTitle>
                <CardDescription>A test on the topic of {test.category}.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-2 h-4 w-4" />
                  <span>{test.timer} minutes recommended time</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <BookCopy className="mr-2 h-4 w-4" />
                  <span className="capitalize">{test.category}</span>
                </div>
                 {trainer && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="mr-2 h-4 w-4" />
                      <span>From: {trainer.name}</span>
                    </div>
                )}
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/tests/${test.id}`}>Start Test</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-dashed border-2 rounded-lg">
            <h2 className="text-xl font-semibold">No Tests Found</h2>
            <p className="text-muted-foreground mt-2">
                {assignedTrainerId ? "Your trainer hasn't assigned any tests yet." : "You are not assigned to a trainer yet."}
            </p>
        </div>
      )}
    </div>
  );
}
