import Image from 'next/image'

export function ThemeAwareFullLogo() {
  return (
    <>
      <Image
        src="/logos/white-full-logo.svg"
        alt="Discuno Logo"
        width={150}
        height={50}
        className="hidden dark:block"
      />
      <Image
        src="/logos/black-full-logo.svg"
        alt="Discuno Logo"
        width={150}
        height={50}
        className="block dark:hidden"
      />
    </>
  )
}
