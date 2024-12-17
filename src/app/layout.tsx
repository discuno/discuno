import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { NavBar } from "./_components/navigation";

export const metadata: Metadata = {
  title: "MyApp - Your Guide to College Success",
  description:
    "Discover personalized advice, resources, and tools to help you get into your dream college.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body className="min-h-screen bg-black">
        <NavBar />
        {children}
        {modal}
        <div id="modal-root" />
      </body>
    </html>
  );
}
