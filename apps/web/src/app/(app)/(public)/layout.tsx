import { FingerprintProvider } from '~/lib/providers/FingerprintProvider'
import '~/styles/globals.css'

const PublicLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return <FingerprintProvider>{children}</FingerprintProvider>
}

export default PublicLayout
