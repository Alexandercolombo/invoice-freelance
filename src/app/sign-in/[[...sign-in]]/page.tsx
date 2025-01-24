import { SignIn } from "@clerk/nextjs";

interface SignInPageProps {
  searchParams: Promise<{
    redirect_to?: string;
  }>;
}

export default async function Page({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <SignIn
        afterSignInUrl={resolvedSearchParams.redirect_to || "/dashboard"}
        appearance={{
          elements: {
            card: "bg-white",
          },
        }}
      />
    </div>
  );
} 