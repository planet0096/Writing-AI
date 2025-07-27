
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth"
import { useAuth } from "@/contexts/auth-context"

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>

export default function PasswordPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(data: PasswordFormValues) {
    if (!user || !user.email) {
      toast({ variant: "destructive", title: "Error", description: "No user found." })
      return
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      
      // Re-authenticate the user
      await reauthenticateWithCredential(user, credential);
      
      // Now change the password
      await updatePassword(user, data.newPassword);
      
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      })
      form.reset()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: error.code === 'auth/wrong-password' 
            ? "The current password you entered is incorrect." 
            : error.message,
      })
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
