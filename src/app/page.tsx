import { Dashboard } from "~/app/components/Dashboard";
import { auth, signIn } from "~/server/auth";
import { LoginPage } from "~/app/components/Login";

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    return (
      <main>
        <LoginPage />
      </main>
    );
  }

  return (
    <main>
      <Dashboard />
    </main>
  );
}
