"use client";

import { Suspense } from "react";
import { SettingsContent } from "./settings-content";
import { LoadingState } from "@/components/loading-state";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/sign-in");
    }
  }, [isLoaded, userId, router]);

  if (!isLoaded) {
    return <LoadingState fullScreen={true} />;
  }

  if (!userId) {
    return null;
  }

  return (
    <Suspense fallback={<LoadingState fullScreen={true} />}>
      <SettingsContent />
    </Suspense>
  );
} 