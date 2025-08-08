"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, writeBatch, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Reusable Floating Label Input Component
const FloatingLabelInput = ({ id, label, type = "text", value, onChange, required = false, disabled = false, placeholder = ' ' }: { id: string, label: string, type?: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, required?: boolean, disabled?: boolean, placeholder?: string }) => (
    <div className="relative">
        <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
                "block px-3.5 pb-2.5 pt-4 w-full text-sm text-slate-900 bg-transparent rounded-lg border border-slate-300 appearance-none focus:outline-none focus:ring-0 focus:border-indigo-600 peer",
                "disabled:opacity-70 disabled:cursor-not-allowed"
            )}
        />
        <label
            htmlFor={id}
            className={cn(
                "absolute text-sm text-slate-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2",
                "peer-focus:px-2 peer-focus:text-indigo-600",
                "peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2",
                "peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4",
                "start-1 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto"
            )}
        >
            {label}
        </label>
    </div>
);


// Combined Login/Signup Page
export default function AuthPage() {
    const router = useRouter();
    const { toast } = useToast();

    // Common state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Signup specific state
    const [name, setName] = useState('');
    const [role, setRole] = useState<'student' | 'trainer'>('student');
    const [trainerCode, setTrainerCode] = useState('');

    const generateProfileCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                toast({ title: "Login successful!", description: "Redirecting to your dashboard." });
                router.push(userData.role === 'trainer' ? '/trainer/dashboard' : '/student/dashboard');
            } else {
                throw new Error("User data not found.");
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Login failed", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userData: any = { name, email, role, createdAt: serverTimestamp() };
            const batch = writeBatch(db);

            if (role === 'trainer') {
                userData.profileCode = generateProfileCode();
            }

            if (role === 'student' && trainerCode) {
                const q = query(collection(db, 'users'), where('profileCode', '==', trainerCode));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    userData.assignedTrainerId = querySnapshot.docs[0].id;
                } else {
                    throw new Error("Invalid Trainer Code. Please check the code and try again.");
                }
            }

            const userRef = doc(db, 'users', user.uid);
            batch.set(userRef, userData);
            await batch.commit();

            toast({ title: "Registration successful!", description: "You are now being redirected." });
            router.push(role === 'trainer' ? '/trainer/dashboard' : '/student/dashboard');

        } catch (error: any) {
            toast({ variant: "destructive", title: "Registration failed", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
            {/* Left Pane */}
            <div className="relative hidden items-center justify-center bg-gray-800 text-white lg:flex">
                 <Image
                    src="https://spacetree.org/wp-content/uploads/Writing-AI.webp"
                    alt="Students writing an exam"
                    layout="fill"
                    objectFit="cover"
                    className="opacity-20"
                    data-ai-hint="education writing"
                />
                 <div className="relative z-10 mx-auto w-full max-w-md space-y-6 px-10">
                    <h1 className="text-5xl font-extrabold tracking-tight">
                        AI Feedback.<br/>
                        Expert Guidance.<br/>
                        Real Results.
                    </h1>
                    <p className="text-lg text-indigo-100">
                        Receive instant, detailed feedback on your IELTS writing tasks. Our AI-powered platform helps you identify weaknesses, track progress, and achieve the score you deserve.
                    </p>
                </div>
            </div>

            {/* Right Pane */}
            <div className="flex items-center justify-center p-6 sm:p-12 lg:p-8 bg-white">
                <div className="mx-auto w-full max-w-md">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-slate-900">Welcome to IELTS Pen</h1>
                        <p className="text-slate-500">Your journey to success starts here.</p>
                    </div>
                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">Log In</TabsTrigger>
                            <TabsTrigger value="signup">Sign Up</TabsTrigger>
                        </TabsList>
                        
                        {/* Login Form */}
                        <TabsContent value="login">
                            <form onSubmit={handleLogin} className="mt-6 space-y-6">
                                <FloatingLabelInput id="login-email" label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
                                <FloatingLabelInput id="login-password" label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} />
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? 'Logging In...' : 'Log In'}
                                </Button>
                            </form>
                        </TabsContent>
                        
                        {/* Signup Form */}
                        <TabsContent value="signup">
                            <form onSubmit={handleSignup} className="mt-6 space-y-6">
                                <FloatingLabelInput id="signup-name" label="Full Name" type="text" value={name} onChange={e => setName(e.target.value)} required disabled={loading} />
                                <FloatingLabelInput id="signup-email" label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
                                <FloatingLabelInput id="signup-password" label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} />
                                
                                <div>
                                    <Label className="text-slate-500">I am a...</Label>
                                    <RadioGroup value={role} onValueChange={(value) => setRole(value as 'student' | 'trainer')} className="flex space-x-4 pt-2">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="student" id="student" /><Label htmlFor="student">Student</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="trainer" id="trainer" /><Label htmlFor="trainer">Trainer</Label></div>
                                    </RadioGroup>
                                </div>

                                {role === 'student' && (
                                    <FloatingLabelInput id="trainerCode" label="Trainer Code (Optional)" type="text" value={trainerCode} onChange={e => setTrainerCode(e.target.value)} disabled={loading} />
                                )}

                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? 'Creating Account...' : 'Create Account'}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
