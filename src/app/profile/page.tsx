
"use client"

import { useAuth } from "@/contexts/auth-context"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { updateProfile } from "firebase/auth"
import { doc, updateDoc } from "firebase/firestore"
import { auth, db, storage } from "@/lib/firebase"
import { getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRef, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.displayName || "",
    },
    values: { // Ensures the form updates when user data loads
      name: user?.displayName || "",
    }
  })

  async function onSubmit(data: ProfileFormValues) {
    if (!user) return
    try {
      // Update Firebase Auth profile
      await updateProfile(user, { displayName: data.name })
      // Update Firestore user document
      const userDocRef = doc(db, 'users', user.uid)
      await updateDoc(userDocRef, { name: data.name })

      toast({
        title: "Profile updated",
        description: "Your name has been updated successfully.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !user) return
    const file = event.target.files[0]
    if (!file) return

    setIsUploading(true)
    try {
      const storageRef = ref(storage, `avatars/${user.uid}`)
      await uploadBytes(storageRef, file)
      const photoURL = await getDownloadURL(storageRef)

      await updateProfile(user, { photoURL })
      const userDocRef = doc(db, 'users', user.uid)
      await updateDoc(userDocRef, { photoURL })

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been changed.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message,
      })
    } finally {
      setIsUploading(false)
    }
  }

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-24" />
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <Avatar className="h-16 w-16 cursor-pointer" onClick={handleAvatarClick}>
          <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
          <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
        </Avatar>
        <Button onClick={handleAvatarClick} variant="outline" disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Change Avatar'}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : 'Update Profile'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
