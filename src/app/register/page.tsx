
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';

const DEFAULT_TEMPLATES = {
    'welcome-student': {
        subject: 'Welcome to Your IELTS Practice Platform!',
        body: `<p>Hi [student_name], you have successfully joined the practice group for [trainer_name]. We're excited to help you prepare for your IELTS exam!</p>`,
        enabled: true,
    },
    'feedback-ready': {
        subject: 'Your feedback for "[test_title]" is ready!',
        body: `<p>Hi [student_name], your evaluation for the test "[test_title]" is complete. Click the link below to view your detailed feedback and results. <a href="[link_to_submission]">View Feedback</a></p>`,
        enabled: true,
    },
    'trainer-reply': {
        subject: '[trainer_name] replied to your question',
        body: `<p>Hi [student_name], your trainer has replied to your question regarding the test "[test_title]". You can view the conversation here: <a href="[link_to_submission]">View Conversation</a></p>`,
        enabled: true,
    },
    'plan-assigned': {
        subject: 'A new plan has been added to your account',
        body: `<p>Hi [student_name], your trainer, [trainer_name], has assigned the "[plan_name]" to your account, adding [credits_added] credits to your balance.</p>`,
        enabled: true,
    },
    'new-student-signup': {
        subject: 'New Student Joined: [student_name]',
        body: `<p>Hi [trainer_name], a new student, [student_name], has just joined your platform using your registration code.</p>`,
        enabled: true,
    },
    'new-manual-submission': {
        subject: 'New Submission from [student_name] for Manual Review',
        body: `<p>Hi [trainer_name], you have received a new submission for the test "[test_title]" from [student_name] that requires your manual evaluation. <a href="[link_to_submission]">Review Submission</a></p>`,
        enabled: true,
    },
    'new-student-question': {
        subject: 'New Question from [student_name] on "[test_title]"',
        body: `<p>Hi [trainer_name], [student_name] has asked a question on their submission for the test "[test_title]". Please review and reply here: <a href="[link_to_submission]">View Question</a></p>`,
        enabled: true,
    },
};


export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'trainer'>('student');
  const [trainerCode, setTrainerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const generateProfileCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userData: {
        name: string;
        email: string;
        role: string;
        createdAt: any;
        profileCode?: string;
        assignedTrainerId?: string;
      } = {
        name,
        email,
        role,
        createdAt: serverTimestamp(),
      };
      
      const batch = writeBatch(db);

      if (role === 'trainer') {
        userData.profileCode = generateProfileCode();
        
        // Add default email settings for the new trainer
        const emailSettingsRef = doc(db, 'users', user.uid, 'private_details', 'email_settings');
        batch.set(emailSettingsRef, {
            smtp: { host: '', port: 587, user: '', pass: '' },
            templates: DEFAULT_TEMPLATES
        });
      }

      let trainerData: { id: string, name: string, email: string } | null = null;
      if (role === 'student' && trainerCode) {
        const trainersRef = collection(db, 'users');
        const q = query(trainersRef, where('profileCode', '==', trainerCode));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const trainerDoc = querySnapshot.docs[0];
          userData.assignedTrainerId = trainerDoc.id;
          const data = trainerDoc.data();
          trainerData = { id: trainerDoc.id, name: data.name, email: data.email };
        } else {
          toast({
            variant: "destructive",
            title: "Invalid Trainer Code",
            description: "The trainer code you entered does not exist.",
          });
          setLoading(false);
          return;
        }
      }

      // Set main user document
      const userRef = doc(db, 'users', user.uid);
      batch.set(userRef, userData);

      // Queue emails if needed
      if (role === 'student' && trainerData) {
        // Welcome email to student
        const studentEmailRef = doc(collection(db, 'email_queue'));
        batch.set(studentEmailRef, {
            to: email,
            template: 'welcome-student',
            templateData: {
                student_name: name,
                trainer_name: trainerData.name,
            },
            trainerId: trainerData.id,
        });

        // New student notification to trainer
        const trainerEmailRef = doc(collection(db, 'email_queue'));
        batch.set(trainerEmailRef, {
             to: trainerData.email,
            template: 'new-student-signup',
            templateData: {
                student_name: name,
                trainer_name: trainerData.name,
            },
            trainerId: trainerData.id,
        });
      }
      
      await batch.commit();


      toast({
        title: "Registration successful!",
        description: "You are now being redirected.",
      });

      router.push(role === 'trainer' ? '/trainer/dashboard' : '/student/dashboard');

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message,
      });
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>Enter your details below to register.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-3">
              <Label>I am a...</Label>
              <RadioGroup value={role} onValueChange={(value) => setRole(value as 'student' | 'trainer')} className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="student" id="student" />
                  <Label htmlFor="student">Student</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="trainer" id="trainer" />
                  <Label htmlFor="trainer">Trainer</Label>
                </div>
              </RadioGroup>
            </div>
            
            {role === 'student' && (
              <div className="space-y-2">
                <Label htmlFor="trainerCode">Trainer Code (Optional)</Label>
                <Input id="trainerCode" type="text" value={trainerCode} onChange={(e) => setTrainerCode(e.target.value)} placeholder="Enter 6-character code" />
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Registering...' : 'Create Account'}
            </Button>
          </form>
           <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
