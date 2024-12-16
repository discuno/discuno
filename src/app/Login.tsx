"use client";
import { Button } from "~/components/ui/button";
import { signIn } from "next-auth/react";

export const LoginPage = () => {
  return <Button onClick={() => signIn()}>Sign In</Button>;
};
