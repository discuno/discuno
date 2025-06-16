import { Footer } from '~/app/(default)/(layout)/Footer'
import { WaitlistPage } from '~/app/(public)/auth/WaitlistPage'
import { redirectIfAuthenticated } from '~/lib/auth/auth-utils'

const AuthPage = async () => {
  // Redirect authenticated users to the dashboard
  await redirectIfAuthenticated('/')

  return (
    <main className="bg-background min-h-screen">
      <WaitlistPage />
      <Footer />
    </main>
  )
}

export default AuthPage
