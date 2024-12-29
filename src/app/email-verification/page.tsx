import { notFound } from "next/navigation";
import SentEmailVerification from "~/app/email-verification/sent";

interface EmailVerificationPageProps {
  searchParams: { sent?: string };
}

export default function EmailVerificationPage({
  searchParams,
}: EmailVerificationPageProps) {
  const sent = searchParams.sent === "true"; // Check if the query param 'sent' is 'true'

  return sent ? <SentEmailVerification /> : null;
}
