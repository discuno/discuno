import { redirect } from "next/navigation";
import SentEmailVerification from "~/app/email-verification/Sent";
import EmailInputForm from "~/app/email-verification/EmailInputForm";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
interface EmailVerificationPageProps {
  searchParams: { status?: string };
}

export default async function EmailVerificationPage({
  searchParams,
}: EmailVerificationPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const { status } = await searchParams;
  let message = "";
  let isSuccess = false;

  switch (status) {
    case "success":
      message =
        "Your email has been verified successfully! You are now a mentor.";
      isSuccess = true;
      break;
    case "invalid-token":
    case "failed":
      message = "Verification failed. Please try again or contact support.";
      break;
    case "sent":
      message = "Verification email sent! Please check your .edu inbox.";
      break;
    case "email-in-use":
      message = "This .edu email is already in use.";
      break;
    case "invalid-email":
      message = "Please enter a valid .edu email address.";
      break;
    case "already-verified":
      message = "This email is already verified.";
      break;
    case "error":
      message = "An unexpected error occurred. Please try again later.";
      break;
  }

  // Render the SentEmailVerification component if the status is 'sent'
  if (status === "sent") {
    return <SentEmailVerification />;
  }

  // Render the EmailInputForm with the appropriate message and success flag
  return <EmailInputForm message={message} isSuccess={isSuccess} />;
}
