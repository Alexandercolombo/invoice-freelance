'use client';

import { SignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-4">
        <div className="text-red-500">Something went wrong during sign up.</div>
        <Button onClick={() => window.location.href = '/'}>Return Home</Button>
        <Button variant="outline" onClick={() => setError(null)}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-none bg-white dark:bg-gray-800",
            formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm text-white",
            formFieldInput: "rounded-md border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600",
            footerActionLink: "text-blue-600 hover:text-blue-700 dark:text-blue-400",
            formFieldLabel: "text-gray-700 dark:text-gray-300",
          },
        }}
        signInUrl="/sign-in"
        afterSignUpUrl="/onboarding"
        routing="path"
        path="/sign-up"
      />
    </div>
  );
} 