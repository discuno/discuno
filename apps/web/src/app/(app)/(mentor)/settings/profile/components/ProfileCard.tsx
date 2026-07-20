interface ProfileCardProps {
  title: string
  description?: string
  children: React.ReactNode
}

export const ProfileCard = ({ title, description, children }: ProfileCardProps) => {
  return (
    <section>
      <header className="mb-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm leading-6">{description}</p>
        )}
      </header>
      {children}
    </section>
  )
}
