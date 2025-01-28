'use client';

import { SignIn } from "@clerk/nextjs";

interface SignInPageProps {
  searchParams?: {
    redirect_to?: string;
  };
}

export default function Page({ searchParams }: SignInPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <SignIn
        afterSignInUrl={searchParams?.redirect_to || "/dashboard"}
        appearance={{
          elements: {
            card: "bg-white dark:bg-gray-800",
            formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
            formFieldLabel: "text-gray-700 dark:text-gray-300",
            formFieldInput: "dark:bg-gray-700 dark:text-white dark:border-gray-600",
            footerActionLink: "text-blue-600 hover:text-blue-700 dark:text-blue-400",
          },
        }}
      />
    </div>
  );
} 