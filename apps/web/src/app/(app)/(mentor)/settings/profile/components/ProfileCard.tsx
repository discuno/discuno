import { type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

interface ProfileCardProps {
  title: string
  description?: string
  icon: LucideIcon
  children: React.ReactNode
}

export const ProfileCard = ({ title, description, icon: Icon, children }: ProfileCardProps) => {
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-center gap-3">
          <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md">
            <Icon aria-hidden="true" className="size-4" />
          </span>
          <CardTitle>{title}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
