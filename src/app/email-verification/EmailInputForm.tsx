import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import jwt from "jsonwebtoken";
import { env } from "~/env";
import nodemailer from "nodemailer";
import { db } from "~/server/db";

interface EmailInputFormProps {
  message?: string;
  isSuccess?: boolean;
}

export default async function EmailInputForm({
  message,
  isSuccess,
}: EmailInputFormProps) {
  const handleSubmit = async (formData: FormData) => {
    "use server";
    const eduEmailRaw = formData.get("email");

    if (typeof eduEmailRaw !== "string") {
      redirect("/email-verification?status=invalid-email");
    }

    const lowerCaseEduEmail = eduEmailRaw.toLowerCase();

    // Validate the email format
    if (!lowerCaseEduEmail.endsWith(".edu")) {
      redirect("/email-verification?status=invalid-email");
    }

    try {
      const session = await auth();

      if (!session) {
        redirect("/");
      }

      const existingProfiles = await db.query.userProfiles.findMany({
        where: (model, { or, eq }) =>
          or(
            eq(model.userId, session.user.id),
            eq(model.eduEmail, lowerCaseEduEmail),
          ),
      });

      // Check if the user already has this email
      const userProfile = existingProfiles.find(
        (profile) => profile.userId === session.user.id,
      );
      if (userProfile?.eduEmail === lowerCaseEduEmail) {
        redirect("/email-verification?status=already-verified");
      }

      // Check if email is already in use by another user
      const emailInUse = existingProfiles.find(
        (profile) => profile.eduEmail === lowerCaseEduEmail,
      );
      if (emailInUse) {
        redirect("/email-verification?status=email-in-use");
      }

      // Generate a verification token
      const token = jwt.sign(
        { userId: session.user.id, lowerCaseEduEmail },
        env.JWT_SECRET,
        { expiresIn: "10m" },
      );

      // Construct the verification URL
      const verifyUrl = `${env.NEXT_PUBLIC_BASE_URL}/email-verification/verify?token=${token}`;

      // Configure the email transporter
      const transporter = nodemailer.createTransport(env.AUTH_EMAIL_SERVER);

      // Send the verification email
      await transporter.sendMail({
        to: lowerCaseEduEmail,
        from: env.AUTH_EMAIL_FROM,
        subject: "Verify Your College Email to Become a Mentor",
        html: `
          <p>Hi ${session.user.name || "there"},</p>
          <p>Thank you for your interest in becoming a mentor at College Advice.</p>
          <p>Please verify your college email by clicking the link below:</p>
          <a href="${verifyUrl}">Verify Email</a>
          <p>This link will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        `,
      });

      // Redirect to the success page
      redirect("/email-verification?status=sent");
    } catch (error: any) {
      // If the error is a NEXT_REDIRECT, rethrow it to allow Next.js to handle the redirect
      if (error.digest && error.digest.startsWith("NEXT_REDIRECT")) {
        throw error;
      }

      // Handle other unexpected errors
      console.error("Error sending mentor verification email", error);
      redirect("/email-verification?status=error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-blue-50 via-blue-100 to-white px-4">
      <div className="mx-auto max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md sm:p-12">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-blue-700">
            Enter Your College Email
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            We need to verify your email to ensure you are a student.
          </p>
        </div>

        {/* Display Message if Exists */}
        {message && (
          <div
            className={`rounded-md p-3 text-sm ${
              isSuccess
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">College Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@college.edu"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <Button type="submit" className="w-full">
            Send Verification Email
          </Button>
        </form>
      </div>
    </div>
  );
}
