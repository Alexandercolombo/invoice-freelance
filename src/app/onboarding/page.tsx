import { Suspense } from 'react';
import { OnboardingContent } from './onboarding-content';
import { LoadingState } from '@/components/loading-state';

export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingState fullScreen={true} />}>
      <OnboardingContent />
    </Suspense>
  );
} 