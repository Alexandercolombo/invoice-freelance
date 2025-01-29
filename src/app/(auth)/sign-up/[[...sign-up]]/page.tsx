'use client';

import { SignUp } from "@clerk/nextjs";

interface PageProps {
  params: { 'sign-up': string[] | undefined };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function SignUpPage({ searchParams }: PageProps) {
  const redirectTo = typeof searchParams?.redirect_to === 'string' 
    ? searchParams.redirect_to 
    : undefined;

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-none",
          },
        }}
        redirectUrl={redirectTo}
      />
    </div>
  );
} 