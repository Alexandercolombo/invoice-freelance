"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UploadButton } from "@/components/ui/upload-button";
import Image from "next/image";

interface BusinessSettings {
  businessName: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  logoUrl?: string;
  paymentInstructions: string;
  invoiceNotes?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const user = useQuery(api.users.getUser, isSignedIn ? undefined : "skip");
  const updateUser = useMutation(api.users.update);

  const [settings, setSettings] = useState<BusinessSettings>({
    businessName: user?.businessName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    website: user?.website || "",
    logoUrl: user?.logoUrl || "",
    paymentInstructions: user?.paymentInstructions || "",
    invoiceNotes: user?.invoiceNotes || "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Show loading state while auth is loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }

  // Redirect if not signed in
  if (!isSignedIn) {
    router.push("/sign-in");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Redirecting to sign in...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateUser(settings);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (url: string) => {
    setSettings((prev) => ({ ...prev, logoUrl: url }));
  };

  const handleLogoUploadError = (error: Error) => {
    setError(`Failed to upload logo: ${error.message}`);
  };

  return (
    <div className="py-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
              Business Settings
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Business Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Business Logo
                </label>
                <div className="mt-1 flex items-center gap-4">
                  {settings.logoUrl ? (
                    <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
                      <Image
                        src={settings.logoUrl}
                        alt="Business Logo"
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                      <svg
                        className="h-8 w-8 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <UploadButton
                      onUploadComplete={handleLogoUpload}
                      onUploadError={handleLogoUploadError}
                    />
                    {settings.logoUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSettings((prev) => ({ ...prev, logoUrl: "" }))}
                        className="text-sm"
                      >
                        Remove Logo
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Business Name
                </label>
                <Input
                  type="text"
                  value={settings.businessName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSettings({ ...settings, businessName: e.target.value })
                  }
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <Input
                  type="email"
                  value={settings.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSettings({ ...settings, email: e.target.value })
                  }
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone
                </label>
                <Input
                  type="tel"
                  value={settings.phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSettings({ ...settings, phone: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Address
                </label>
                <Textarea
                  value={settings.address}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setSettings({ ...settings, address: e.target.value })
                  }
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Website
                </label>
                <Input
                  type="url"
                  value={settings.website}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSettings({ ...settings, website: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Invoice Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Payment Instructions
                </label>
                <Textarea
                  value={settings.paymentInstructions}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setSettings({ ...settings, paymentInstructions: e.target.value })
                  }
                  required
                  className="mt-1"
                  rows={4}
                  placeholder="Example:&#10;Payment accepted via:&#10;- Zelle: your@email.com&#10;- Bank Transfer: Routing #xxx, Account #xxx&#10;- PayPal: your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Default Invoice Notes
                </label>
                <Textarea
                  value={settings.invoiceNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setSettings({ ...settings, invoiceNotes: e.target.value })
                  }
                  className="mt-1"
                  rows={4}
                  placeholder="Example:&#10;- Payment due within 30 days&#10;- Late payments subject to 1.5% monthly interest&#10;- Thank you for your business!"
                />
              </div>
            </div>
          </Card>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                    Success
                  </h3>
                  <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                    Settings saved successfully.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSaving}
              className="ml-3"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 