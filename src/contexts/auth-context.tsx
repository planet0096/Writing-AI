
"use client";

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, set up a real-time listener for their document
        const docRef = doc(db, 'users', user.uid);
        const unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setRole(userData.role);
            if (userData.role === 'student') {
              setAssignedTrainerId(userData.assignedTrainerId || null);
            }
          }
          // The user object from onAuthStateChanged might be stale,
          // so we create a new object with the latest auth state and firestore data
          // This is a bit of a hack to get the UI to update with profile changes
           setUser({
              ...user,
              displayName: docSnap.data()?.name || user.displayName,
              photoURL: docSnap.data()?.photoURL || user.photoURL,
           });
           setLoading(false);
        });

        // Return a cleanup function for the Firestore listener
        return () => unsubscribeFirestore();

      } else {
        // User is signed out
        setUser(null);
        setRole(null);
        setAssignedTrainerId(null);
        setLoading(false);
      }
    });

    // Return a cleanup function for the auth state listener
    return () => unsubscribeAuth();
  }, []);
  
    useEffect(() => {
    if (loading) return;

    const isPublicPage = ['/', '/login', '/register'].includes(pathname) || pathname.startsWith('/#') || pathname.startsWith('/ielts-writing-questions');
    if (isPublicPage) return;

    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isProtectedStudentPage = pathname.startsWith('/student') || pathname.startsWith('/tests');
    const isProtectedTrainerPage = pathname.startsWith('/trainer');
    const isProfilePage = pathname.startsWith('/profile');

    // If trying to access a protected page while logged out, redirect to login
    if (!user && (isProtectedStudentPage || isProtectedTrainerPage || isProfilePage)) {
      router.push('/login');
      return;
    }

    if (user) {
      // If on an auth page while logged in, redirect to dashboard
      if (isAuthPage) {
        if (role === 'student') router.push('/student/dashboard');
        if (role === 'trainer') router.push('/trainer/dashboard');
      } 
      // Role-based protection for dashboard pages
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
