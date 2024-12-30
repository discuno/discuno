import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { eq } from "drizzle-orm";
import { env } from "~/env";
import { userProfiles } from "~/server/db/schema";

interface VerificationPageProps {
  searchParams: { token?: string };
}

export default async function VerificationPage({
  searchParams,
}: VerificationPageProps) {
  const { token } = searchParams;

  if (!token) {
    redirect("/email-verification?status=invalid-token");
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      eduEmail: string;
    };

    const { userId, eduEmail } = decoded;

    // Use a single upsert operation instead of separate query and update/insert
    await db
      .insert(userProfiles)
      .values({
        userId,
        eduEmail,
        isEduVerified: true,
        isMentor: true,
        bio: "",
        schoolYear: "Freshman",
        graduationYear: new Date().getFullYear() + 4,
      })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          eduEmail,
          isEduVerified: true,
          isMentor: true,
        },
      });

    // Redirect mentors to the onboarding page after successful verification
    redirect("/mentor-onboarding");
  } catch (error: any) {
    // If the error is a NEXT_REDIRECT, rethrow it to allow Next.js to handle the redirect
    if (error.digest && error.digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }

    console.error("Error verifying mentor email:", error);
    // Redirect to failure page
    redirect("/email-verification?status=failed");
  }
}
