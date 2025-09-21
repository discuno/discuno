interface RefundNotificationEmailProps {
  amount: number
  reason: string
}

export const RefundNotificationEmail = ({
  amount,
  reason,
}: Readonly<RefundNotificationEmailProps>) => (
  <div>
    <h2>Refund Processed</h2>
    <p>Hi there,</p>
    <p>We&apos;ve processed a refund for your recent booking:</p>
    <ul>
      <li>
        <strong>Amount:</strong> ${(amount / 100).toFixed(2)}
      </li>
      <li>
        <strong>Reason:</strong> {reason}
      </li>
    </ul>
    <p>The refund should appear in your account within 5-10 business days.</p>
    <p>If you have any questions, please contact our support team.</p>
    <p>
      Best regards,
      <br />
      The Discuno Team
    </p>
  </div>
)
