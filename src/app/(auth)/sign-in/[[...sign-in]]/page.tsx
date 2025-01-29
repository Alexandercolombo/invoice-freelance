'use client';

import { SignIn } from "@clerk/nextjs";

interface PageProps {
  params: { 'sign-in': string[] | undefined };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function SignInPage({ searchParams }: PageProps) {
  const redirectTo = typeof searchParams?.redirect_to === 'string' 
    ? searchParams.redirect_to 
    : undefined;

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <SignIn
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