import { WaitlistPage } from '~/app/(public)/auth/WaitlistPage'
import { Footer } from '~/app/(default)/(layout)/Footer'

const AuthPage = () => {
  return (
    <main className="bg-background min-h-screen">
      <WaitlistPage />
      <Footer />
    </main>
  )
}

export default AuthPage
