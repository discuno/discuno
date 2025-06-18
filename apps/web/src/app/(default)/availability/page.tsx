import { AvailabilityContent } from './components/AvailabilityContent'
import { AvailabilityShell } from './components/AvailabilityShell'

const AvailabilityPage = async () => {
  return (
    <AvailabilityShell>
      <AvailabilityContent />
    </AvailabilityShell>
  )
}

export default AvailabilityPage

export const metadata = {
  title: 'Availability Settings | Discuno',
  description: 'Configure when students can book mentoring sessions with you',
}
