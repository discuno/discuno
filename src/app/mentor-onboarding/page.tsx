import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { userProfiles } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";

interface MentorOnboardingProps {
  message?: string;
  isSuccess?: boolean;
  searchParams?: { status: string };
}

export default async function MentorOnboardingPage({
  message,
  isSuccess,
  searchParams,
}: MentorOnboardingProps) {
  const session = await auth();

  // Redirect unauthenticated users to the homepage
  if (!session) {
    redirect("/");
  }

  // Fetch the user's profile from the database
  const userProfile = await db.query.userProfiles.findFirst({
    where: (table, { eq }) => eq(table.userId, session.user.id),
  });

  // If the user is not a mentor or their .edu email is not verified, redirect them
  if (!userProfile?.isMentor || !userProfile.isEduVerified) {
    redirect("/email-verification");
  }

  /**
   * Server Action to handle form submission.
   * It updates the userProfiles table with the provided bio, school_year, and graduation_year.
   */
  const handleOnboard = async (formData: FormData) => {
    "use server";
    const bio = formData.get("bio") as string;
    const schoolYear = formData.get("school_year") as string;
    const graduationYear = parseInt(
      formData.get("graduation_year") as string,
      10,
    );

    // Basic validation
    if (!bio || !schoolYear || isNaN(graduationYear)) {
      redirect("/mentor-onboarding?status=invalid-input");
    }

    try {
      // Update the userProfiles table with the additional information
      await db
        .update(userProfiles)
        .set({
          bio,
          schoolYear: schoolYear as
            | "Freshman"
            | "Sophomore"
            | "Junior"
            | "Senior"
            | "Graduate",
          graduationYear,
        })
        .where(eq(userProfiles.userId, session.user.id));

      // Redirect to the dashboard or a confirmation page upon successful onboarding
      redirect("/dashboard?status=onboarded");
    } catch (error: any) {
      // If the error is a NEXT_REDIRECT, rethrow it to allow Next.js to handle the redirect
      if (error.digest && error.digest.startsWith("NEXT_REDIRECT")) {
        throw error;
      }
      console.error("Error during mentor onboarding:", error);
      // Redirect to the onboarding page with an error status
      redirect("/mentor-onboarding?status=error");
    }
  };

  // Extract the status from the query parameters for displaying messages
  const status = searchParams?.status;
  let displayMessage = "";
  let isDisplaySuccess = false;

  switch (status) {
    case "invalid-input":
      displayMessage = "Please provide all the required information correctly.";
      break;
    case "error":
      displayMessage = "An unexpected error occurred. Please try again later.";
      break;
    case "onboarded":
      displayMessage = "Your profile has been successfully updated!";
      isDisplaySuccess = true;
      break;
    default:
      displayMessage = "";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-green-50 via-green-100 to-white px-4">
      <div className="mx-auto max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md sm:p-12">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-green-700">
            Mentor Onboarding
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Please provide the following information to complete your mentor
            profile.
          </p>
        </div>

        {/* Display Message if Exists */}
        {displayMessage && (
          <div
            className={`rounded-md p-3 text-sm ${
              isDisplaySuccess
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {displayMessage}
          </div>
        )}

        <form action={handleOnboard} className="space-y-4">
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Input
              id="bio"
              name="bio"
              type="text"
              placeholder="Tell us about yourself..."
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <Label htmlFor="school_year">School Year</Label>
            <Select name="school_year" required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your current school year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Freshman">Freshman</SelectItem>
                <SelectItem value="Sophomore">Sophomore</SelectItem>
                <SelectItem value="Junior">Junior</SelectItem>
                <SelectItem value="Senior">Senior</SelectItem>
                <SelectItem value="Graduate">Graduate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="graduation_year">Graduation Year</Label>
            <Input
              id="graduation_year"
              name="graduation_year"
              type="number"
              placeholder="e.g., 2027"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <Button type="submit" className="w-full">
            Complete Onboarding
          </Button>
        </form>
      </div>
    </div>
  );
}
