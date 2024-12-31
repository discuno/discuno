import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import Link from "next/link";
import { Button } from "~/components/ui/button";

interface UserProfile {
  userId: string;
  bio: string;
  schoolYear: "Freshman" | "Sophomore" | "Junior" | "Senior" | "Graduate";
  graduationYear: number;
  eduEmail: string;
  isMentor: boolean;
  isEduVerified: boolean;
  user: {
    image: string | null;
  };
}

export default async function ViewProfilePage() {
  const session = await auth();

  // Redirect unauthenticated users to the homepage
  if (!session) {
    redirect("/");
  }

  try {
    // Fetch the user's profile from the database
    const userProfile = (await db.query.userProfiles.findFirst({
      where: (table, { eq }) => eq(table.userId, session.userId),
      columns: {
        userId: true,
        bio: true,
        schoolYear: true,
        graduationYear: true,
        eduEmail: true,
        isMentor: true,
        isEduVerified: true,
      },
      with: {
        user: {
          columns: {
            image: true,
          },
        },
      },
    })) as (UserProfile & { user: { image: string | null } }) | null;

    // If the user is not a mentor or their .edu email is not verified, redirect them
    if (!userProfile?.isMentor || !userProfile.isEduVerified) {
      redirect("/email-verification");
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-blue-50 via-blue-100 to-white px-4">
        <div className="mx-auto max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md sm:p-12">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-blue-700">
              Your Mentor Profile
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              View and manage your profile information.
            </p>
          </div>

          {/* Profile Image */}
          <div className="flex justify-center">
            {userProfile.user.image ? (
              <img
                src={userProfile.user.image}
                alt="Profile Image"
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                No Image
              </div>
            )}
          </div>

          {/* Profile Information */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-medium text-gray-700">Bio</h2>
              <p className="text-gray-600">
                {userProfile.bio || "No bio available."}
              </p>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-700">School Year</h2>
              <p className="text-gray-600">{userProfile.schoolYear}</p>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-700">
                Graduation Year
              </h2>
              <p className="text-gray-600">{userProfile.graduationYear}</p>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-700">
                Educational Email
              </h2>
              <p className="text-gray-600">{userProfile.eduEmail}</p>
            </div>
          </div>

          {/* Edit Profile Button */}
          <div className="mt-6">
            <Link href="/edit-profile">
              <Button className="w-full">Edit Profile</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    redirect("/view-profile?status=error");
  }
}
