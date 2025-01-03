"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface SendInvoiceModalProps {
  invoice: {
    _id: Id<"invoices">;
    number: string;
    client: {
      name: string;
      email: string;
    };
  };
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function SendInvoiceModal({
  invoice,
  trigger,
  onSuccess,
}: SendInvoiceModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailSubject, setEmailSubject] = useState(
    `Invoice ${invoice.number} from Your Business`
  );
  const [emailBody, setEmailBody] = useState(
    `Dear ${invoice.client.name},\n\nPlease find attached invoice ${invoice.number}.\n\nBest regards,\nYour Business`
  );

  const handleCopyToClipboard = async () => {
    try {
      const textToCopy = `Subject: ${emailSubject}\n\n${emailBody}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handleDownloadAndCopy = () => {
    // Trigger PDF download
    window.open(`/api/invoices/${invoice._id}/pdf`, '_blank');
    // Copy email text
    handleCopyToClipboard();
    // Close modal and call success callback
    setIsOpen(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default" size="sm">
            Prepare Invoice Email
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Prepare Invoice Email</DialogTitle>
          <DialogDescription>
            Customize the email message for invoice {invoice.number} to {invoice.client.name} ({invoice.client.email})
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label
              htmlFor="subject"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email Subject
            </label>
            <Input
              id="subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="message"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email Message
            </label>
            <Textarea
              id="message"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={6}
            />
          </div>

          {copied && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Email text copied to clipboard!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDownloadAndCopy}
            className="gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-download"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF & Copy Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 