import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { eq, and } from "drizzle-orm";
import { env } from "~/env";
import { userProfiles } from "~/server/db/schema";

interface VerificationPageProps {
  searchParams: { token?: string };
}

export default async function VerificationPage({
  searchParams,
}: VerificationPageProps) {
  const { token } = await searchParams;

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

    // Update the user's verification status
    const updatedUser = await db
      .update(userProfiles)
      .set({ isEduVerified: true, isMentor: true })
      .where(
        and(
          eq(userProfiles.userId, userId),
          eq(userProfiles.eduEmail, eduEmail),
        ),
      )
      .returning();

    if (updatedUser.length === 0) {
      throw new Error("User not found or email mismatch.");
    }

    // Redirect to success page
    redirect("/email-verification?status=success");
  } catch (error) {
    console.error("Error verifying mentor email:", error);
    // Redirect to failure page
    redirect("/email-verification?status=failed");
  }
}
