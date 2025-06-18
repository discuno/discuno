import { Footer } from '~/app/(default)/(layout)/Footer'
import { WaitlistPage } from '~/app/(public)/auth/WaitlistPage'

const AuthPage = async () => {
  return (
    <>
      <WaitlistPage />
      <Footer />
    </>
  )
}

export default AuthPage
