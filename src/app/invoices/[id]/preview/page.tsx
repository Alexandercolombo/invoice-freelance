"use client";

import { InvoicePreviewPage } from "./invoice-preview-page";

export default function Page({ params }: { params: { id: string } }) {
  return <InvoicePreviewPage params={params} />;
} 