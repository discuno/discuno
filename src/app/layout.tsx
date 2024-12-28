/* eslint-disable react/react-in-jsx-scope */
import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { NavBarBase } from "~/app/_components/navigation-client";
import { getProfilePic } from "~/server/queries";

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
  try {
    profilePic = (await getProfilePic()) ?? "";
  } catch (error) {
    console.error("Error fetching profile pic:", error);
  }

  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body className="min-h-screen bg-gradient-to-r from-blue-50 via-blue-100 to-white">
        <NavBarBase profilePic={profilePic} />
        {children}
        {modal}
        <div id="modal-root" />
      </body>
    </html>
  );
}
