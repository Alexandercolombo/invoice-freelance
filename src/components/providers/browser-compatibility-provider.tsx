'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { features, device } from '@/lib/browser-utils';
import { Button } from '@/components/ui/button';

interface BrowserCompatibilityContextType {
  isCompatible: boolean;
  missingFeatures: string[];
  isSafariPrivateMode: boolean;
}

const BrowserCompatibilityContext = createContext<BrowserCompatibilityContextType | null>(null);

export function useBrowserCompatibility() {
  const context = useContext(BrowserCompatibilityContext);
  if (!context) {
    throw new Error('useBrowserCompatibility must be used within a BrowserCompatibilityProvider');
  }
  return context;
}

interface Props {
  children: ReactNode;
}

export function BrowserCompatibilityProvider({ children }: Props) {
  const [state, setState] = useState<BrowserCompatibilityContextType>({
    isCompatible: true,
    missingFeatures: [],
    isSafariPrivateMode: false
  });

  useEffect(() => {
    const missingFeatures = [];
    if (!features.hasLocalStorage()) {
      missingFeatures.push('Local Storage');
    }
    if (!features.hasFileAPI()) {
      missingFeatures.push('File Upload');
    }
    if (!features.hasFormValidation()) {
      missingFeatures.push('Form Validation');
    }

    const isSafariPrivateMode = device.isSafari() && !features.hasLocalStorage();
    const isCompatible = missingFeatures.length === 0 && !isSafariPrivateMode;

    setState({
      isCompatible,
      missingFeatures,
      isSafariPrivateMode
    });
  }, []);

  if (!state.isCompatible) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Browser Compatibility Notice
          </h2>
          {state.isSafariPrivateMode ? (
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              It looks like you're using Safari in private browsing mode. Please disable private browsing or use a different browser to access all features.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Your browser is missing some required features:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
                {state.missingFeatures.map(feature => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <p className="text-gray-600 dark:text-gray-400 mt-4">
                Please use a modern browser like Chrome, Firefox, or Edge to access all features.
              </p>
            </div>
          )}
          <div className="mt-6">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserCompatibilityContext.Provider value={state}>
      {children}
    </BrowserCompatibilityContext.Provider>
  );
} 