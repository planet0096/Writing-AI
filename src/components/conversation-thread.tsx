
"use client";

import { useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, writeBatch, getDocs, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Paperclip, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { User as FirebaseUser } from 'firebase/auth';

interface Message {
    id: string;
    text: string;
    authorId: string;
    authorName: string;
    authorRole: 'student' | 'trainer';
    createdAt: { toDate: () => Date };
    isRead: boolean;
}

interface ConversationThreadProps {
    submissionId: string;
    studentId: string;
    trainerId: string;
    currentUser: FirebaseUser;
    currentUserRole: 'student' | 'trainer';
}

const getInitials = (name?: string | null) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export default function ConversationThread({ submissionId, studentId, trainerId, currentUser, currentUserRole }: ConversationThreadProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();

    const markMessagesAsRead = useCallback(async () => {
        const messagesRef = collection(db, 'submissions', submissionId, 'feedback_thread');
        const q = query(messagesRef, where('isRead', '==', false), where('authorRole', '!=', currentUserRole));
        
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });
        await batch.commit();
    }, [submissionId, currentUserRole]);

    useEffect(() => {
        const messagesRef = collection(db, 'submissions', submissionId, 'feedback_thread');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedMessages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(fetchedMessages);
            setIsLoading(false);
            
            // Mark messages as read when the component mounts or updates
            markMessagesAsRead();
        });

        return () => unsubscribe();
    }, [submissionId, markMessagesAsRead]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !trainerId) return;

        setIsSending(true);
        const messagesRef = collection(db, 'submissions', submissionId, 'feedback_thread');
        
        try {
            await addDoc(messagesRef, {
                text: newMessage,
                authorId: currentUser.uid,
                authorName: currentUser.displayName || 'Anonymous',
                authorRole: currentUserRole,
                createdAt: serverTimestamp(),
                isRead: false,
            });

            // Get data needed for email templates
            const recipientId = currentUserRole === 'student' ? trainerId : studentId;
            const recipientSnap = await getDoc(doc(db, 'users', recipientId));
            const recipientEmail = recipientSnap.data()?.email;

            const submissionSnap = await getDoc(doc(db, 'submissions', submissionId));
            const testId = submissionSnap.data()?.testId;
            const testSnap = await getDoc(doc(db, 'tests', testId));
            const testTitle = testSnap.data()?.title;

            if (!recipientEmail || !testTitle) {
                throw new Error("Could not retrieve all necessary data for email notification.");
            }

            // Queue a notification email
            const templateName = currentUserRole === 'student' ? 'new-student-question' : 'trainer-reply';
            
            await addDoc(collection(db, 'email_queue'), {
                to: recipientEmail,
                template: templateName,
                templateData: {
                    student_name: currentUserRole === 'student' ? currentUser.displayName : recipientSnap.data()?.name,
                    trainer_name: currentUserRole === 'trainer' ? currentUser.displayName : recipientSnap.data()?.name,
                    test_title: testTitle,
                    link_to_submission: `${process.env.NEXT_PUBLIC_BASE_URL}/submissions/${submissionId}`,
                },
                trainerId: trainerId,
            });
            
            setNewMessage('');

        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not send message.' });
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Card>
            <CardHeader><CardTitle>Conversation Thread</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-4 border rounded-lg p-4 bg-slate-50">
                        {isLoading && <p>Loading conversation...</p>}
                        {!isLoading && messages.length === 0 && (
                            <div className="text-center text-muted-foreground py-8">
                                <Paperclip className="mx-auto h-8 w-8 mb-2" />
                                <p>No questions yet.</p>
                                <p className="text-xs">{currentUserRole === 'student' ? "Ask your trainer a question about your feedback." : "The student hasn't asked any questions yet."}</p>
                            </div>
                        )}
                        {messages.map(message => (
                            <div key={message.id} className={cn("flex items-start gap-3", message.authorId === currentUser.uid ? "justify-end" : "justify-start")}>
                                {message.authorId !== currentUser.uid && (
                                     <Avatar className="h-8 w-8">
                                        {/* In a real app you might fetch the author's avatar URL */}
                                        <AvatarFallback>{getInitials(message.authorName)}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={cn("max-w-xs md:max-w-md rounded-lg p-3", message.authorId === currentUser.uid ? "bg-primary text-primary-foreground" : "bg-white border")}>
                                    <p className="text-sm font-semibold">{message.authorId === currentUser.uid ? "You" : message.authorName}</p>
                                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                                     <p className="text-xs opacity-70 mt-1 text-right">
                                        {message.createdAt ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true }) : '...'}
                                    </p>
                                </div>
                                {message.authorId === currentUser.uid && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={currentUser.photoURL || ''} alt={currentUser.displayName || ''} />
                                        <AvatarFallback>{getInitials(currentUser.displayName)}</AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSendMessage} className="space-y-2 relative">
                        <Textarea 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={currentUserRole === 'student' ? "Ask a follow-up question..." : "Type your reply..."}
                            disabled={isSending}
                            className="pr-20"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <Button type="submit" disabled={isSending || !newMessage.trim()} size="icon">
                                <Send className="h-4 w-4"/>
                            </Button>
                        </div>
                    </form>
                </div>
            </CardContent>
        </Card>
    );
}
