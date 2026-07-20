import { EventTypeToggleSection } from '~/app/(app)/(mentor)/settings/event-types/components/EventTypeToggleSection'
import { env } from '~/env'

const EventTypesPage = () => {
  return <EventTypeToggleSection paymentsEnabled={env.PAYMENTS_ENABLED} />
}

export default EventTypesPage
