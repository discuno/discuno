interface SignInEmailProps {
  url: string
  host: string
}

export const SignInEmail = ({ url, host }: Readonly<SignInEmailProps>) => (
  <div>
    <h1>Sign in to {host}</h1>
    <p>Click the link below to sign in to your account.</p>
    <a href={url}>Sign in</a>
    <p>If you did not request this email you can safely ignore it.</p>
  </div>
)
