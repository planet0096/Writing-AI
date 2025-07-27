
"use client";

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setRole(userData.role);
          if (userData.role === 'student') {
            setAssignedTrainerId(userData.assignedTrainerId || null);
          }
        }
        setUser(user);
      } else {
        setUser(null);
        setRole(null);
        setAssignedTrainerId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isPublicTestPage = pathname.startsWith('/tests/');
    const isProtectedStudentPage = pathname.startsWith('/student');
    const isProtectedTrainerPage = pathname.startsWith('/trainer');

    // If trying to access a protected page while logged out, redirect to login
    if (!user && (isProtectedStudentPage || isProtectedTrainerPage || isPublicTestPage)) {
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
