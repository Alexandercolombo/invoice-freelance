'use client';

import { SignUp } from "@clerk/nextjs";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create a new account',
};

type PageProps = {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

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