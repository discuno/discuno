interface AdminManualRefundAlertEmailProps {
  sessionId: string
  bookingError: string
  refundError: string
}

export const AdminManualRefundAlertEmail = ({
  sessionId,
  bookingError,
  refundError,
}: Readonly<AdminManualRefundAlertEmailProps>) => (
  <div>
    <h2 style={{ color: '#dc2626' }}>URGENT: Manual Refund Required</h2>
    <p>A booking failed after payment was processed and automatic refund also failed.</p>
    <p>
      <strong>Immediate action required!</strong>
    </p>
    <ul>
      <li>
        <strong>Session ID:</strong> {sessionId}
      </li>
      <li>
        <strong>Booking Error:</strong> {bookingError}
      </li>
      <li>
        <strong>Refund Error:</strong> {refundError}
      </li>
    </ul>
    <p>Please manually process the refund through Stripe dashboard.</p>
  </div>
)
