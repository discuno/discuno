import { ComponentsShowcaseContent } from './components/ComponentsShowcaseContent'
import { ComponentsShowcaseShell } from './components/ComponentsShowcaseShell'

export default function ComponentsShowcasePage() {
  return (
    <ComponentsShowcaseShell>
      <ComponentsShowcaseContent />
    </ComponentsShowcaseShell>
  )
}

export const metadata = {
  title: 'Components Showcase | @discuno/atoms | Discuno',
  description: 'Modern, hydration-safe replacement for @calcom/atoms with zero SSR issues',
}
