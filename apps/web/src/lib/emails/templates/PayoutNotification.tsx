interface PayoutNotificationEmailProps {
  amount: number
  currency: string
  transferId: string
}

export const PayoutNotificationEmail = ({
  amount,
  currency,
  transferId,
}: Readonly<PayoutNotificationEmailProps>) => (
  <div>
    <h2>Payment Transferred!</h2>
    <p>Great news! Your earnings have been transferred:</p>
    <ul>
      <li>
        <strong>Amount:</strong> ${(amount / 100).toFixed(2)} {currency.toUpperCase()}
      </li>
      <li>
        <strong>Transfer ID:</strong> {transferId}
      </li>
    </ul>
    <p>The funds should appear in your connected bank account within 1-3 business days.</p>
    <p>You can view more details in your Stripe dashboard.</p>
    <p>
      Best regards,
      <br />
      The Discuno Team
    </p>
  </div>
)
