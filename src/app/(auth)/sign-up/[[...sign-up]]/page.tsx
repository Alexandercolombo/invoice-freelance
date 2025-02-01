'use client';

import { SignUp } from "@clerk/nextjs";

export default function Page() {
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