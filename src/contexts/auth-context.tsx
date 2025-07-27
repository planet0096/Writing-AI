
"use client";

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  role: 'student' | 'trainer' | null;
  loading: boolean;
  assignedTrainerId: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  assignedTrainerId: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'student' | 'trainer' | null>(null);
  const [assignedTrainerId, setAssignedTrainerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        
        // Check for blocked status before proceeding
        const initialDocSnap = await getDoc(docRef);
        if (initialDocSnap.exists() && initialDocSnap.data().accountStatus === 'blocked') {
            toast({
                variant: 'destructive',
                title: 'Account Blocked',
                description: 'Your account is currently blocked. Please contact your trainer.',
            });
            await signOut(auth); // Sign out the user
            setUser(null);
            setRole(null);
            setLoading(false);
            router.push('/login');
            return;
        }

        const unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setRole(userData.role);
            if (userData.role === 'student') {
              setAssignedTrainerId(userData.assignedTrainerId || null);
            }
             setUser({
              ...user,
              displayName: userData.name || user.displayName,
              photoURL: userData.photoURL || user.photoURL,
           });
          }
           setLoading(false);
        });

        return () => unsubscribeFirestore();

      } else {
        setUser(null);
        setRole(null);
        setAssignedTrainerId(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [router, toast]);
  
    useEffect(() => {
    if (loading) return;

    const isPublicPage = ['/', '/login', '/register'].includes(pathname) || pathname.startsWith('/#') || pathname.startsWith('/ielts-writing-questions');
    if (isPublicPage) return;

    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isProtectedStudentPage = pathname.startsWith('/student') || pathname.startsWith('/tests');
    const isProtectedTrainerPage = pathname.startsWith('/trainer');
    const isProfilePage = pathname.startsWith('/profile');
    const isSubmissionPage = pathname.startsWith('/submissions');


    if (!user && (isProtectedStudentPage || isProtectedTrainerPage || isProfilePage || isSubmissionPage)) {
      router.push('/login');
      return;
    }

    if (user) {
      if (isAuthPage) {
        if (role === 'student') router.push('/student/dashboard');
        if (role === 'trainer') router.push('/trainer/dashboard');
      } 
      else if (isProtectedStudentPage && role !== 'student') {
        router.push('/trainer/dashboard'); 
      } else if (isProtectedTrainerPage && role !== 'trainer') {
        router.push('/student/dashboard');
      }
    }
  }, [user, role, loading, pathname, router]);


  return (
    <AuthContext.Provider value={{ user, role, loading, assignedTrainerId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
