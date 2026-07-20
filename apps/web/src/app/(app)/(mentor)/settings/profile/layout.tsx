import { type PropsWithChildren } from 'react'

const ProfileLayout = ({ children }: PropsWithChildren) => {
  return <div className="mx-auto w-full max-w-6xl">{children}</div>
}

export default ProfileLayout
