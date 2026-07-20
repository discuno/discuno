interface BookingFailureEmailProps {
  attendeeName: string
  mentorName: string
  reason: string
  refundSucceeded: boolean
}

export const BookingFailureEmail = ({
  attendeeName,
  mentorName,
  reason,
  refundSucceeded,
}: Readonly<BookingFailureEmailProps>) => (
  <div style={{ fontFamily: 'sans-serif', color: '#333' }}>
    <div
      style={{
        maxWidth: '600px',
        margin: 'auto',
        borderRadius: '8px',
        padding: '2rem',
        border: '1px solid #eee',
      }}
    >
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#dc2626' }}>Booking Failed</h2>
      <p>Hi {attendeeName},</p>
      <p>Unfortunately, we were unable to complete your booking with {mentorName}.</p>
      <p>
        <strong>Reason:</strong> {reason}
      </p>
      {refundSucceeded ? (
        <p>Your refund has been initiated. Most banks post refunds within 5-10 business days.</p>
      ) : (
        <p>
          Your refund needs manual review. Our support team has been alerted; please contact
          support@discuno.com if you need an immediate update.
        </p>
      )}
      <p>
        We apologize for the inconvenience. Please try booking again or contact support if the issue
        persists.
      </p>
      <p>
        Best regards,
        <br />
        The Discuno Team
      </p>
    </div>
  </div>
)
