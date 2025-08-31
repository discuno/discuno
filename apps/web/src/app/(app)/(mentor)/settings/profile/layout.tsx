import { type PropsWithChildren } from 'react'

const ProfileLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="min-h-screen px-4 py-8 pt-20 md:px-8">
      <div className="mx-auto max-w-4xl">{children}</div>
    </div>
  )
}

export default ProfileLayout
