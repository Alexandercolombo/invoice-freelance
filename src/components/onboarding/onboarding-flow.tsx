'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UploadButton } from '@/components/ui/upload-button';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/server-utils';
import { storage, validation, features } from '@/lib/browser-utils';

const STORAGE_KEY = 'onboarding_progress';
const MAX_RETRIES = 3;
const AUTOSAVE_DELAY = 1000; // 1 second delay for autosave
const AUTOSAVE_INDICATOR_DELAY = 2000; // 2 seconds to show the "Saved" indicator

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;

const steps = [
  {
    id: 'business',
    title: 'Business Information',
    description: 'Let\'s start with your business details',
    requiredFields: ['businessName', 'email'],
  },
  {
    id: 'branding',
    title: 'Branding',
    description: 'Add your business logo and customize your invoices',
    requiredFields: [],
  },
  {
    id: 'payment',
    title: 'Payment Details',
    description: 'Set up your payment instructions for invoices',
    requiredFields: ['paymentInstructions'],
  },
];

const tooltips = {
  businessName: 'The official name of your business that will appear on invoices',
  email: 'Your primary business contact email',
  phone: 'Enter your phone number in international format (e.g., +1234567890)',
  address: 'Your business mailing address',
  website: 'Enter your business website URL (e.g., https://example.com)',
  paymentInstructions: 'Instructions for how clients should pay you (e.g., bank details, PayPal)',
  invoiceNotes: 'Default notes to appear on all invoices (e.g., payment terms)',
};

export function OnboardingFlow() {
  const router = useRouter();
  const { toast } = useToast();
  const createUser = useMutation(api.users.create);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const saveIndicatorTimerRef = useRef<NodeJS.Timeout>();
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    logoUrl: '',
    paymentInstructions: '',
    invoiceNotes: '',
  });

  // Load saved progress
  useEffect(() => {
    const savedProgress = storage.get(STORAGE_KEY);
    if (savedProgress) {
      try {
        setFormData(savedProgress.data);
        setCurrentStep(savedProgress.step);
      } catch (error) {
        console.error('Failed to restore progress:', error);
      }
    }
  }, []);

  // Debounced save progress
  const saveProgress = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    if (saveIndicatorTimerRef.current) {
      clearTimeout(saveIndicatorTimerRef.current);
    }

    setIsSaving(true);
    setIsSaved(false);

    autoSaveTimerRef.current = setTimeout(() => {
      storage.set(STORAGE_KEY, {
        data: formData,
        step: currentStep,
      });
      setIsSaving(false);
      setIsSaved(true);

      // Hide the "Saved" indicator after delay
      saveIndicatorTimerRef.current = setTimeout(() => {
        setIsSaved(false);
      }, AUTOSAVE_INDICATOR_DELAY);
    }, AUTOSAVE_DELAY);
  }, [formData, currentStep]);

  // Save progress when form data or step changes
  useEffect(() => {
    saveProgress();
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData, currentStep, saveProgress]);

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.values(formData).some(value => value)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentStep > 0) {
        handleBack();
      } else if (e.key === 'Enter' && !isSubmitting) {
        if (currentStep < steps.length - 1) {
          handleNext();
        } else {
          handleSubmit(new Event('submit') as any);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentStep, isSubmitting]);

  const validateEmail = (email: string): boolean => {
    if (!validation.email(email)) {
      setValidationErrors(prev => ({
        ...prev,
        email: 'Please enter a valid email address',
      }));
      return false;
    }
    setValidationErrors(prev => {
      const { email, ...rest } = prev;
      return rest;
    });
    return true;
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Phone is optional
    if (!validation.phone(phone)) {
      setValidationErrors(prev => ({
        ...prev,
        phone: 'Please enter a valid phone number',
      }));
      return false;
    }
    setValidationErrors(prev => {
      const { phone, ...rest } = prev;
      return rest;
    });
    return true;
  };

  const validateWebsite = (website: string): boolean => {
    if (!validation.url(website)) {
      setValidationErrors(prev => ({
        ...prev,
        website: 'Please enter a valid website URL',
      }));
      return false;
    }
    setValidationErrors(prev => {
      const { website, ...rest } = prev;
      return rest;
    });
    return true;
  };

  const formatPhoneNumber = (value: string): string => {
    const cleaned = value.replace(/[^0-9+]/g, '');
    if (!cleaned) return '';
    
    // Handle international format
    if (cleaned.startsWith('+')) {
      // Group numbers in blocks of 3 after country code
      const countryCode = cleaned.slice(0, cleaned.length > 3 ? 3 : undefined);
      const rest = cleaned.slice(countryCode.length).replace(/(\d{3})/g, '$1 ').trim();
      return `${countryCode} ${rest}`;
    }
    
    // Default US format: (XXX) XXX-XXXX
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return cleaned;
    
    const [, area, prefix, line] = match;
    if (!area) return '';
    if (!prefix) return `(${area}`;
    if (!line) return `(${area}) ${prefix}`;
    return `(${area}) ${prefix}-${line}`;
  };

  const formatWebsite = (value: string): string => {
    if (!value) return '';
    if (!value.startsWith('http')) {
      return `https://${value}`;
    }
    return value;
  };

  const validateStep = useCallback((step: number) => {
    const requiredFields = steps[step].requiredFields;
    const isValid = requiredFields.every(field => {
      const value = formData[field as keyof typeof formData];
      if (!value) {
        setValidationErrors(prev => ({
          ...prev,
          [field]: 'This field is required',
        }));
        return false;
      }
      if (field === 'email' && !validateEmail(value as string)) {
        return false;
      }
      if (field === 'phone' && !validatePhone(value as string)) {
        return false;
      }
      if (field === 'website' && !validateWebsite(value as string)) {
        return false;
      }
      return true;
    });

    if (isValid) {
      setValidationErrors({});
    }
    return isValid;
  }, [formData]);

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    let formattedValue = value;
    if (field === 'phone') {
      formattedValue = formatPhoneNumber(value);
    } else if (field === 'website') {
      formattedValue = value.toLowerCase().trim();
    }
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    
    // Immediate validation for specific fields
    if (field === 'phone') {
      validatePhone(formattedValue);
    } else if (field === 'website' && formattedValue) {
      validateWebsite(formattedValue);
    }
    
    // Clear validation error for the field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1 && validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      toast({
        title: 'Required Fields',
        description: 'Please fill in all required fields before proceeding.',
        variant: 'destructive',
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(currentStep)) {
      return;
    }

    // Additional email validation before submission
    if (!validation.email(formData.email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Format website URL before submission
      const formattedWebsite = formData.website ? 
        (formData.website.startsWith('http') ? formData.website : `https://${formData.website}`) : 
        undefined;

      await createUser({
        name: formData.businessName,
        email: formData.email,
        businessName: formData.businessName,
        paymentInstructions: formData.paymentInstructions,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        website: formattedWebsite,
        logoUrl: formData.logoUrl || undefined,
        invoiceNotes: formData.invoiceNotes || undefined,
      });
      
      // Clear saved progress on successful submission
      storage.remove(STORAGE_KEY);
      
      toast({
        title: 'Welcome aboard!',
        description: 'Your business profile has been set up successfully.',
      });
      router.push('/dashboard');
    } catch (error) {
      setRetryCount(prev => prev + 1);
      
      if (retryCount < MAX_RETRIES) {
        toast({
          title: 'Error',
          description: `Failed to create profile. Retrying... (${retryCount + 1}/${MAX_RETRIES})`,
          variant: 'destructive',
        });
        setTimeout(() => handleSubmit(e), 1000);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create profile after multiple attempts. Please try again later.',
          variant: 'destructive',
        });
        setRetryCount(0);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoUpload = (url: string) => {
    setFormData(prev => ({ ...prev, logoUrl: url }));
  };

  const renderField = (
    label: string,
    field: keyof typeof formData,
    type: string = 'text',
    required: boolean = false,
    Component: typeof Input | typeof Textarea = Input,
    props = {}
  ) => {
    const id = `field-${field}`;
    const ariaDescribedBy = validationErrors[field] ? `${id}-error` : `${id}-description`;
    
    return (
      <div role="group" aria-labelledby={`${id}-label`}>
        <label 
          id={`${id}-label`}
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label} {required && <span className="text-red-500" aria-label="required">*</span>}
        </label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mt-1">
                <Component
                  id={id}
                  type={type}
                  value={formData[field]}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  required={required}
                  aria-describedby={ariaDescribedBy}
                  aria-invalid={!!validationErrors[field]}
                  className={cn(
                    "w-full",
                    validationErrors[field] && "border-red-500 focus:ring-red-500"
                  )}
                  {...props}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p id={`${id}-description`}>{tooltips[field as keyof typeof tooltips]}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {validationErrors[field] && (
          <p 
            id={`${id}-error`}
            className="mt-1 text-sm text-red-500"
            role="alert"
          >
            {validationErrors[field]}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <nav aria-label="Progress">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div className="flex-1 w-full">
                {/* Mobile step indicator */}
                <div className="block sm:hidden mb-4">
                  <p className="text-sm font-medium text-gray-500">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    />
                  </div>
                </div>
                
                {/* Desktop step indicators */}
                <ol className="hidden sm:flex justify-between">
                  {steps.map((step, index) => (
                    <li 
                      key={step.id} 
                      className="flex items-center"
                      aria-current={currentStep === index ? 'step' : undefined}
                    >
                      <div 
                        className={`flex h-8 w-8 items-center justify-center rounded-full 
                          ${index < currentStep ? 'bg-green-500 text-white' : 
                            index === currentStep ? 'bg-blue-600 text-white' : 
                            'bg-gray-200 text-gray-600'}`}
                        aria-hidden="true"
                      >
                        {index < currentStep ? '✓' : index + 1}
                      </div>
                      <span className="sr-only">
                        {step.title} - {
                          index < currentStep ? 'completed' :
                          index === currentStep ? 'current' :
                          'upcoming'
                        }
                      </span>
                      {index < steps.length - 1 && (
                        <div 
                          className={`h-1 w-16 ${
                            index < currentStep ? 'bg-green-500' :
                            index === currentStep ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </li>
                  ))}
                </ol>
                
                <div className="mt-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {steps[currentStep].title}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {steps[currentStep].description}
                  </p>
                </div>
              </div>
              <div 
                className="mt-4 sm:mt-0 ml-0 sm:ml-4 text-sm text-gray-500 dark:text-gray-400 w-full sm:w-auto text-center sm:text-left"
                aria-live="polite"
                aria-atomic="true"
              >
                {isSaving && 'Saving...'}
                {isSaved && (
                  <span className="text-green-500 flex items-center justify-center sm:justify-start">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Saved
                  </span>
                )}
              </div>
            </div>
          </nav>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className="space-y-6"
          noValidate
          aria-label="Business profile setup"
        >
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="business"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {renderField('Business Name', 'businessName', 'text', true)}
                {renderField('Email', 'email', 'email', true)}
                {renderField('Phone', 'phone', 'tel')}
                {renderField('Address', 'address', 'text', false, Textarea, { rows: 3 })}
                {renderField('Website', 'website', 'url')}
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="branding"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Business Logo
                  </label>
                  <div className="mt-1 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {formData.logoUrl ? (
                      <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
                        <img
                          src={formData.logoUrl}
                          alt="Business Logo"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300">
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
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <UploadButton
                        onUploadComplete={handleLogoUpload}
                        onUploadError={(error: Error) => {
                          toast({
                            title: 'Error',
                            description: `Failed to upload logo: ${error.message}`,
                            variant: 'destructive',
                          });
                        }}
                      />
                      {formData.logoUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
                          className="text-sm w-full sm:w-auto"
                        >
                          Remove Logo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {renderField('Payment Instructions', 'paymentInstructions', 'text', true, Textarea, {
                  rows: 4,
                  placeholder: "Example:\nPayment accepted via:\n- Zelle: your@email.com\n- Bank Transfer: Routing #xxx, Account #xxx\n- PayPal: your@email.com"
                })}
                {renderField('Default Invoice Notes', 'invoiceNotes', 'text', false, Textarea, {
                  rows: 4,
                  placeholder: "Example:\n- Payment due within 30 days\n- Late payments subject to 1.5% monthly interest\n- Thank you for your business!"
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-0 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0 || isSubmitting}
              aria-label={currentStep === 0 ? "Back (disabled)" : "Back to previous step"}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Back
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button 
                type="button" 
                onClick={handleNext}
                disabled={!validateStep(currentStep) || isSubmitting}
                aria-label={
                  !validateStep(currentStep) 
                    ? "Next (disabled - please fill required fields)" 
                    : "Next step"
                }
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                Next
              </Button>
            ) : (
              <Button 
                type="submit"
                disabled={!validateStep(currentStep) || isSubmitting}
                aria-label={
                  isSubmitting 
                    ? "Setting up your profile..." 
                    : !validateStep(currentStep)
                    ? "Complete Setup (disabled - please fill required fields)"
                    : "Complete Setup"
                }
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {isSubmitting ? 'Setting up...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
} 