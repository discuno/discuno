"use client";
import { Button } from "~/components/ui/button";
import { signIn } from "next-auth/react";
import Image from "next/image";

export const LoginPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-r from-blue-50 via-blue-100 to-white px-4 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Image */}
      <div className="mb-8 w-full max-w-md">
        <Image
          src="/images/hero-image.png"
          alt="College Mentorship"
          width={400}
          height={300}
          className="mx-auto rounded-lg shadow-lg"
        />
      </div>

      {/* Welcome Message */}
      <h1 className="mb-4 text-center text-4xl font-bold text-blue-700 dark:text-blue-300">
        Welcome to College Advice
      </h1>
      <p className="mb-8 text-center text-gray-600 dark:text-gray-400">
        Connect with experienced mentors to guide you through your college
        journey.
      </p>

      {/* Sign-In Button */}
      <Button
        onClick={() => signIn()}
        className="w-full max-w-sm rounded-md bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        Sign In to Get Started
      </Button>
    </div>
  );
};
