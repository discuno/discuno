import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { redirect } from "next/navigation";

export default async function EmailInputForm() {
  const handleSubmit = async (formData: FormData) => {
    "use server";
    const email = formData.get("email") as string;

    try {
      // TODO: Replace with your API endpoint to send verification email
      const response = await fetch(
        "https://your-api-endpoint.com/send-verification-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        },
      );

      if (response.ok) {
        // Redirect to the same page with sent=true
        redirect("/email-verification?sent=true");
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to send verification email.");
      }
    } catch (error) {
      console.error("Error sending verification email:", error);
      // You can handle error state here or redirect to an error page
      redirect("/email-verification?sent=false");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-blue-50 via-blue-100 to-white px-4">
      <div className="mx-auto max-w-md space-y-6 px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-blue-700">
            Enter Your College Email
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            We need to verify your email to ensure you are a student.
          </p>
        </div>
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
