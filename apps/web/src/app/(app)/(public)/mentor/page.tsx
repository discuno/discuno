import { Footer } from '~/app/(app)/(layout)/Footer'
import { MentorPage } from '~/app/(app)/(public)/mentor/MentorPage'

export default async function MentorRoute() {
  return (
    <main className="bg-background min-h-screen">
      <MentorPage />
      <Footer />
    </main>
  )
}
