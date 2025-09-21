interface BookingConfirmationEmailProps {
  attendeeName?: string
  organizerName: string
  title: string
  startTime: string
  duration?: number
  isMentor: boolean
}

export const BookingConfirmationEmail = ({
  attendeeName,
  organizerName,
  title,
  startTime,
  duration,
  isMentor,
}: Readonly<BookingConfirmationEmailProps>) => (
  <div>
    <h1>{isMentor ? 'New Booking Received!' : 'Booking Confirmed!'}</h1>
    <p>Hi {isMentor ? organizerName : (attendeeName ?? 'there')},</p>
    <p>
      {isMentor ? 'You have a new session booked:' : 'Your session has been successfully booked:'}
    </p>
    <ul>
      <li>
        <strong>Session:</strong> {title}
      </li>
      <li>
        <strong>{isMentor ? 'Student:' : 'Mentor:'}</strong>{' '}
        {isMentor ? attendeeName : organizerName}
      </li>
      <li>
        <strong>Date & Time:</strong> {startTime}
      </li>
      <li>
        <strong>Duration:</strong> {duration ?? 30} minutes
      </li>
    </ul>
    <p>
      {isMentor
        ? 'Please prepare for your session and check your calendar for meeting details.'
        : "We'll send you calendar details and meeting links closer to the session time."}
    </p>
    <p>
      Best regards,
      <br />
      The Discuno Team
    </p>
  </div>
)
