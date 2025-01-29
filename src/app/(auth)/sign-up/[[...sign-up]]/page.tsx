'use client';

import { SignUp } from "@clerk/nextjs";

interface SignUpPageProps {
  searchParams?: {
    redirect_to?: string;
  };
}

export default function SignUpPage({ searchParams }: SignUpPageProps) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <SignUp
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