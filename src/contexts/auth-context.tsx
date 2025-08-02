"use client";

import { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, DocumentData } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  role: 'student' | 'trainer' | null;
  loading: boolean;
  assignedTrainerId: string | null;
  brandLogoUrl: string | null;
  setBrandLogoUrl: (url: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  assignedTrainerId: null,
  brandLogoUrl: null,
  setBrandLogoUrl: () => {},
});

const DEFAULT_LOGO_PATH = '/logo-fallback.svg'; // A fallback, can be anything

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'student' | 'trainer' | null>(null);
  const [assignedTrainerId, setAssignedTrainerId] = useState<string | null>(null);
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(DEFAULT_LOGO_PATH);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleUserDocument = useCallback(async (userData: DocumentData) => {
      setRole(userData.role);

      if (userData.role === 'student') {
        const trainerId = userData.assignedTrainerId || null;
        setAssignedTrainerId(trainerId);
        if (trainerId) {
          const trainerDoc = await getDoc(doc(db, 'users', trainerId));
          if (trainerDoc.exists()) {
            setBrandLogoUrl(trainerDoc.data().logoUrl || DEFAULT_LOGO_PATH);
          } else {
            setBrandLogoUrl(DEFAULT_LOGO_PATH);
          }
        } else {
          setBrandLogoUrl(DEFAULT_LOGO_PATH);
        }
      } else if (userData.role === 'trainer') {
        setBrandLogoUrl(userData.logoUrl || DEFAULT_LOGO_PATH);
      }
  }, []);


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        
        const initialDocSnap = await getDoc(docRef);
        if (initialDocSnap.exists() && initialDocSnap.data().accountStatus === 'blocked') {
            toast({
                variant: 'destructive',
                title: 'Account Blocked',
                description: 'Your account is currently blocked. Please contact your trainer.',
            });
            await signOut(auth);
            setUser(null);
            setRole(null);
            setLoading(false);
            router.push('/');
            return;
        }

        const unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            handleUserDocument(userData);
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
        setBrandLogoUrl(DEFAULT_LOGO_PATH);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [router, toast, handleUserDocument]);
  
    useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/';
    const isPublicPage = pathname.startsWith('/ielts-writing-questions');

    if (isAuthPage || isPublicPage) return;

    const isProtectedStudentPage = pathname.startsWith('/student') || pathname.startsWith('/tests');
    const isProtectedTrainerPage = pathname.startsWith('/trainer');
    const isProfilePage = pathname.startsWith('/profile');
    const isSubmissionPage = pathname.startsWith('/submissions');


    if (!user && (isProtectedStudentPage || isProtectedTrainerPage || isProfilePage || isSubmissionPage)) {
      router.push('/');
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
    <AuthContext.Provider value={{ user, role, loading, assignedTrainerId, brandLogoUrl, setBrandLogoUrl }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
