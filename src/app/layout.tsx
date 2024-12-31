import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { NavBarBase } from "~/app/_components/navigation-client";
import { getProfilePic } from "~/server/queries";
import { auth } from "~/server/auth";
import { ThemeProvider } from "~/components/theme-provider";

export const metadata: Metadata = {
  title: "College Advice - Your Guide to College Success",
  description:
    "Discover personalized advice, resources, and tools to help you get into your dream college.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
  modal,
}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {
  let profilePic = "";
  let isAuthenticated = false;

  try {
    const session = await auth();

    if (session) {
      isAuthenticated = true;
      profilePic = (await getProfilePic()) ?? "";
    }
  } catch (error) {
    console.error("Error fetching profile pic:", error);
  }

  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body className="min-h-screen bg-white text-gray-900 transition-colors duration-300 dark:bg-gray-900 dark:text-gray-100">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {isAuthenticated && <NavBarBase profilePic={profilePic} />}
          {children}
          {modal}
          <div id="modal-root" />
        </ThemeProvider>
      </body>
    </html>
  );
}
