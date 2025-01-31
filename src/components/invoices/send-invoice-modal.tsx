"use client";

import { useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Send } from "lucide-react";
import { getGmailAuthUrl } from "@/lib/gmail";

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
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
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

  const handleSendViaGmail = async () => {
    try {
      setIsSending(true);
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: invoice.client.email,
          subject: emailSubject,
          body: emailBody,
          pdfUrl: `/api/invoices/${invoice._id}/pdf`
        })
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'Gmail not connected') {
          // Redirect to Gmail OAuth
          window.location.href = getGmailAuthUrl();
          return;
        }
        throw new Error(data.error || 'Failed to send email');
      }

      toast({
        title: "Email sent successfully",
        description: `Invoice ${invoice.number} has been sent to ${invoice.client.email}`,
      });
      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Send email error:', error);
      toast({
        title: "Failed to send email",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenMailClient = () => {
    const mailtoLink = `mailto:${invoice.client.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoLink);
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

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleOpenMailClient}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            Open Email Client
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadAndCopy}
            className="gap-2"
          >
            Download & Copy
          </Button>
          <Button
            onClick={handleSendViaGmail}
            disabled={isSending}
            className="gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send via Gmail
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 