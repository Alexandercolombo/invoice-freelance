import { SignUp } from "@clerk/nextjs";

interface SignUpPageProps {
  searchParams: Promise<{
    redirect_to?: string;
  }>;
}

export default async function Page({ searchParams }: SignUpPageProps) {
  const resolvedSearchParams = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Start managing your freelance business today
          </p>
        </div>
        <SignUp
          afterSignUpUrl={resolvedSearchParams.redirect_to || "/dashboard"}
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-white dark:bg-gray-800 shadow-md rounded-lg p-8",
              headerTitle: "text-2xl font-bold text-gray-900 dark:text-white",
              headerSubtitle: "text-gray-600 dark:text-gray-400",
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
              formFieldLabel: "text-gray-700 dark:text-gray-300",
              formFieldInput: "dark:bg-gray-700 dark:text-white dark:border-gray-600",
              dividerLine: "bg-gray-200 dark:bg-gray-700",
              dividerText: "text-gray-500 dark:text-gray-400",
              footerActionLink: "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300",
            },
          }}
        />
      </div>
    </div>
  );
} 