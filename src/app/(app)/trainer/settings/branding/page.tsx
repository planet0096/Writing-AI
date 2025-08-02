
"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytesResumable, deleteObject } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Upload, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

export default function BrandingPage() {
    const { user, loading: authLoading, brandLogoUrl, setBrandLogoUrl } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || !user) return;
        const file = event.target.files[0];
        if (!file) return;

        // Basic file validation
        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
            setUploadError("Invalid file type. Please upload a PNG or JPG image.");
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
             setUploadError("File is too large. Please upload an image under 2MB.");
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadError(null);

        const storageRef = ref(storage, `logos/${user.uid}/logo`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                setUploadError("Upload failed. Please check your network and try again.");
                setIsUploading(false);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    const userDocRef = doc(db, 'users', user.uid);
                    await updateDoc(userDocRef, { logoUrl: downloadURL });
                    
                    setBrandLogoUrl(downloadURL); // Update context immediately

                    toast({
                        title: "Logo updated",
                        description: "Your new logo has been saved.",
                    });
                } catch (updateError: any) {
                    setUploadError("Failed to save the updated logo URL.");
                } finally {
                    setIsUploading(false);
                }
            }
        );
    };
    
    const handleRemoveLogo = async () => {
        if (!user || !brandLogoUrl || brandLogoUrl.startsWith('/')) return; // Can't remove default logo
        
        try {
            // Remove from storage
            const logoRef = ref(storage, `logos/${user.uid}/logo`);
            await deleteObject(logoRef);
        } catch (error: any) {
            // If it fails because the object doesn't exist, that's fine.
            if (error.code !== 'storage/object-not-found') {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the logo from storage.' });
                return;
            }
        }
        
        try {
            // Remove from Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { logoUrl: null });
            
            setBrandLogoUrl('/logo-fallback.svg'); // Update context to default
            
            toast({ title: 'Logo removed', description: 'Your branding has been reset to the default.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update your profile.' });
        }
    };


    if (authLoading) {
        return <Skeleton className="h-64 w-full" />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Platform Branding</CardTitle>
                <CardDescription>Customize the look and feel of the platform by uploading your own logo. This will be visible to you and your students.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-slate-700">Current Logo</h3>
                    <div className="p-4 border rounded-lg flex items-center justify-center bg-slate-50 min-h-[120px]">
                        {brandLogoUrl ? (
                             <Image src={brandLogoUrl} alt="Your Logo" width={150} height={40} className="max-h-12 w-auto" />
                        ) : (
                            <div className="text-center text-slate-500 space-y-2">
                                <ImageIcon className="mx-auto h-8 w-8" />
                                <p>No custom logo uploaded.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                     <input
                        type="file"
                        accept="image/png, image/jpeg"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                    <div className="flex items-center gap-3">
                        <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                            <Upload className="mr-2 h-4 w-4" />
                            {isUploading ? "Uploading..." : "Upload New Logo"}
                        </Button>
                        {brandLogoUrl && !brandLogoUrl.startsWith('/') && (
                             <Button onClick={handleRemoveLogo} variant="destructive" disabled={isUploading}>
                                <X className="mr-2 h-4 w-4" />
                                Remove Logo
                            </Button>
                        )}
                    </div>
                </div>
                
                 {isUploading && (
                    <div className="w-full max-w-sm">
                        <Progress value={uploadProgress} />
                        <p className="text-sm text-muted-foreground mt-1">{Math.round(uploadProgress)}%</p>
                    </div>
                )}
                 {uploadError && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Upload Failed</AlertTitle>
                        <AlertDescription>{uploadError}</AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
