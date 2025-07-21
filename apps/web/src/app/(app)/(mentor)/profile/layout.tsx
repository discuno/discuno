import { type PropsWithChildren } from 'react'

const ProfileLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="from-background via-secondary/30 to-muted/50 flex min-h-screen items-center justify-center bg-gradient-to-br px-8 py-8 pt-20">
      <div className="bg-card text-card-foreground border/50 w-full max-w-2xl space-y-6 rounded-lg border p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl">
        {children}
      </div>
    </div>
  )
}

export default ProfileLayout
