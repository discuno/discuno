interface AdminAlertEmailProps {
  type: string
  paymentId: number
  error: string
  retryCount?: number
}

export const AdminAlertEmail = ({
  type,
  paymentId,
  error,
  retryCount,
}: Readonly<AdminAlertEmailProps>) => (
  <div>
    <h2 style={{ color: '#dc2626' }}>Payment System Alert</h2>
    <p>
      <strong>Alert Type:</strong> {type}
    </p>
    <p>
      <strong>Payment ID:</strong> {paymentId}
    </p>
    <p>
      <strong>Error:</strong> {error}
    </p>
    {retryCount ? (
      <p>
        <strong>Retry Count:</strong> {retryCount}
      </p>
    ) : (
      ''
    )}
    <p>Please check the payment system and take appropriate action.</p>
    <p>Time: {new Date().toISOString()}</p>
  </div>
)
