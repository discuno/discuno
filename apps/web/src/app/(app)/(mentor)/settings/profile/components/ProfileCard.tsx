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
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground h-5 w-5" />
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
