'use client';

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-none",
          },
        }}
        redirectUrl="/dashboard"
        afterSignInUrl="/dashboard"
      />
    </div>
  );
} 