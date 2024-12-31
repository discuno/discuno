import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { userProfiles, users } from "~/server/db/schema";
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

// EditProfileProps Interface
interface EditProfileProps {
  searchParams?: { status?: string };
}

// UserProfile Interface
interface UserProfile {
  userId: string; // Adjust if userId is a string
  bio: string;
  schoolYear: "Freshman" | "Sophomore" | "Junior" | "Senior" | "Graduate";
  graduationYear: number;
  eduEmail: string;
  isEduVerified: boolean;
  isMentor: boolean;
  user?: {
    image: string | null;
  };
}

export default async function EditProfilePage({
  searchParams,
}: EditProfileProps) {
  const session = await auth();

  // Redirect unauthenticated users to the homepage
  if (!session) {
    redirect("/");
  }

  // Fetch the user's profile from the database
  const userProfile = (await db.query.userProfiles.findFirst({
    where: (table, { eq }) => eq(table.userId, session.userId),
    with: {
      user: {
        columns: {
          image: true,
        },
      },
    },
  })) as UserProfile | null;

  // If the user is not a mentor or their .edu email is not verified, redirect them
  if (!userProfile?.isMentor || !userProfile.isEduVerified) {
    redirect("/email-verification");
  }

  /**
   * Server Action to handle profile update.
   * It updates the userProfiles table with the provided bio, school_year, graduation_year, and profile image.
   */
  const handleUpdateProfile = async (formData: FormData) => {
    "use server";
    const bio = formData.get("bio") as string;
    const schoolYear = formData.get("school_year") as string;
    const graduationYear = parseInt(
      formData.get("graduation_year") as string,
      10,
    );
    const profileImageFile = formData.get("profile_image") as File | null;

    // Basic validation
    if (!bio || !schoolYear || isNaN(graduationYear)) {
      redirect("/edit-profile?status=invalid-input");
    }

    // Check if any change has been made
    const isProfileUnchanged =
      bio === userProfile.bio &&
      schoolYear === userProfile.schoolYear &&
      graduationYear === userProfile.graduationYear &&
      !profileImageFile;

    if (isProfileUnchanged) {
      redirect("/edit-profile?status=profile-updated");
    }

    try {
      let imageUrl = userProfile?.user?.image || "";

      // Handle profile image upload if a new image is provided
      if (profileImageFile && profileImageFile.size > 0) {
        imageUrl = await uploadImage(profileImageFile);
        // Update the user's image in the 'users' table
        await db
          .update(users)
          .set({
            image: imageUrl,
          })
          .where(eq(users.id, session.userId)); // Ensure 'id' matches your primary key
      }

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
        .where(eq(userProfiles.userId, session.userId));

      // Redirect to the edit profile page upon successful update
      redirect("/edit-profile?status=profile-updated");
    } catch (error: any) {
      // If the error is a NEXT_REDIRECT, rethrow it to allow Next.js to handle the redirect
      if (error.digest && error.digest.startsWith("NEXT_REDIRECT")) {
        throw error;
      }
      console.error("Error during profile update:", error);
      // Redirect to the edit profile page with an error status
      redirect("/edit-profile?status=error");
    }
  };

  // Placeholder for image upload function
  // Replace this with your actual image upload implementation (e.g., upload to S3, Cloudinary)
  async function uploadImage(file: File): Promise<string> {
    // Example: Return a dummy URL after "uploading"
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(URL.createObjectURL(file));
      }, 1000);
    });
  }

  // Extract the status from the query parameters for displaying messages
  const status = searchParams?.status || "";
  let displayMessage = "";
  let isDisplaySuccess = false;

  switch (status) {
    case "invalid-input":
      displayMessage = "Please provide all the required information correctly.";
      break;
    case "error":
      displayMessage = "An unexpected error occurred. Please try again later.";
      break;
    case "profile-updated":
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
            Edit Your Mentor Profile
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Update your profile information below.
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

        {/* Current Profile Image */}
        <div className="flex justify-center">
          {userProfile?.user?.image ? (
            <img
              src={userProfile?.user?.image}
              alt="Profile Image"
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 text-gray-500">
              No Image
            </div>
          )}
        </div>

        {/* Profile Image Upload */}
        <form
          action={handleUpdateProfile}
          className="space-y-4"
          encType="multipart/form-data"
        >
          <div>
            <Label htmlFor="profile_image">Update Profile Image</Label>
            <Input
              id="profile_image"
              name="profile_image"
              type="file"
              accept="image/*"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Input
              id="bio"
              name="bio"
              type="text"
              placeholder="Tell us about yourself..."
              required
              defaultValue={userProfile.bio || ""}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <Label htmlFor="school_year">School Year</Label>
            <Select
              name="school_year"
              required
              defaultValue={userProfile.schoolYear}
            >
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
              defaultValue={userProfile.graduationYear || ""}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <Button type="submit" className="w-full">
            Update Profile
          </Button>
        </form>
      </div>
    </div>
  );
}
