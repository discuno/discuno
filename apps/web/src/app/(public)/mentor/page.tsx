import { MentorPage } from '~/app/(public)/mentor/MentorPage'
import { Footer } from '~/app/(default)/(layout)/Footer'

export default async function MentorRoute() {
  return (
    <main className="bg-background min-h-screen">
      <MentorPage />
      <Footer />
    </main>
  )
}
