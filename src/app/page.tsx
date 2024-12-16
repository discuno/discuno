import { Dashboard } from "~/app/Dashboard";
import { auth, signIn } from "~/server/auth";
import { LoginPage } from "~/app/Login";

export default async function HomePage() {
  const session = await auth();
  console.log(session);

  if (!session) {
    return <LoginPage />;
  }

  return <Dashboard />;
}
