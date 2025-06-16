import { PublicGuard } from '~/components/auth/PublicGuard'
import '~/styles/globals.css'

const PublicLayout = async ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return <PublicGuard>{children}</PublicGuard>
}

export default PublicLayout
