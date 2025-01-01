import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import jwt from "jsonwebtoken";
import { env } from "~/env";
import nodemailer from "nodemailer";
import { db } from "~/server/db";
import { userProfiles } from "~/server/db/schema";

interface EmailInputFormProps {
  message?: string;
  isSuccess?: boolean;
  hasExistingEmail?: boolean;
}

export default async function EmailInputForm({
  message,
  isSuccess,
  hasExistingEmail = false,
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

      // Generate a verification token
      const token = jwt.sign(
        { userId: session.userId, eduEmail: lowerCaseEduEmail },
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

      // Perform an upsert operation
      await db
        .insert(userProfiles)
        .values({
          userId: session.userId,
          eduEmail: lowerCaseEduEmail,
          isEduVerified: false, // Initially false until verification
          isMentor: false, // Adjust based on your logic
          bio: "",
          schoolYear: "Freshman",
          graduationYear: new Date().getFullYear() + 4,
        })
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: {
            eduEmail: lowerCaseEduEmail,
            isEduVerified: false,
          },
        });

      // Redirect to the success page
      redirect("/email-verification?status=sent");
    } catch (error: any) {
      // Handle unique constraint violation
      if (
        error.code === "23505" && // PostgreSQL unique violation error code
        error.constraint === "unique_eduEmail"
      ) {
        redirect("/email-verification?status=email-in-use");
      }

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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-100 via-sky-100 to-gray-100 px-4 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950">
      <div className="mx-auto max-w-md space-y-6 rounded-lg border border-border/40 bg-card p-8 text-card-foreground shadow-lg backdrop-blur-md transition-all duration-300 dark:shadow-primary/5 sm:p-12">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-primary">
            {hasExistingEmail
              ? "Edit Your College Email"
              : "Enter Your College Email"}
          </h1>
          <p className="text-muted-foreground">
            We need to verify your email to ensure you are a student.
          </p>
        </div>

        {message && (
          <div
            className={`rounded-md p-3 text-sm ${
              isSuccess
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-destructive/20 text-destructive"
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
              className="mt-1"
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
