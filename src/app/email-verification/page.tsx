import { redirect } from "next/navigation";
import SentEmailVerification from "~/app/email-verification/Sent";
import EmailInputForm from "~/app/email-verification/EmailInputForm";
import { auth } from "~/server/auth";

interface EmailVerificationPageProps {
  searchParams: { sent?: string };
}

export default async function EmailVerificationPage({
  searchParams,
}: EmailVerificationPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const sent = (await searchParams).sent === "true";

  return sent ? <SentEmailVerification /> : <EmailInputForm />;
}
