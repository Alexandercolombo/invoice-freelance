import { SignIn } from "@clerk/nextjs";

export default function SignInPage({
  searchParams,
}: {
  searchParams: { redirect_to?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome Back
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>
        <div className="mt-8">
          <SignIn
            redirectUrl={searchParams.redirect_to}
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "bg-white dark:bg-gray-800 shadow-xl rounded-lg",
                headerTitle: "text-xl font-semibold text-center",
                headerSubtitle: "text-gray-600 dark:text-gray-400 text-center",
                socialButtonsBlockButton: "w-full",
                formFieldInput: "w-full",
                footer: "hidden"
              },
              layout: {
                socialButtonsPlacement: "bottom",
                showOptionalFields: false,
              }
            }}
          />
        </div>
      </div>
    </div>
  );
} 