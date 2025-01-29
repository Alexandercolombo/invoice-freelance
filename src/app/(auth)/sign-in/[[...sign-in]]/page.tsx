'use client';

import { SignIn } from "@clerk/nextjs";

interface SignInPageProps {
  searchParams?: {
    redirect_to?: string;
  };
}

export default function SignInPage({ searchParams }: SignInPageProps) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-none",
          },
        }}
        redirectUrl={searchParams?.redirect_to}
      />
    </div>
  );
} 