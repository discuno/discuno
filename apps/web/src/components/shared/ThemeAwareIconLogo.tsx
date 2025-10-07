import Image from 'next/image'

export function ThemeAwareIconLogo() {
  return (
    <>
      <Image
        src="/logos/white-icon-logo.svg"
        alt="Discuno Logo"
        width={40}
        height={40}
        className="hidden dark:block"
        style={{ width: 'auto', height: 'auto' }}
      />
      <Image
        src="/logos/black-icon-logo.svg"
        alt="Discuno Logo"
        width={40}
        height={40}
        className="block dark:hidden"
        style={{ width: 'auto', height: 'auto' }}
      />
    </>
  )
}
