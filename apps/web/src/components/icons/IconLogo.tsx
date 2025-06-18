import { type SVGProps } from 'react'

interface IconLogoProps extends SVGProps<SVGSVGElement> {
  /**
   * The size of the logo icon. Defaults to current font size (1em)
   */
  size?: string | number
}

export const IconLogo = ({
  size = '1em',
  width = size,
  height = size,
  className,
  ...props
}: IconLogoProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 285.39 215"
      width={width}
      height={height}
      className={className}
      aria-label="Discuno Icon"
      role="img"
      {...props}
    >
      <g fill="currentColor">
        <path d="M147.22 215h-9.05c-.27 0-.48-.2-.5-.47-.28-6.39-4.2-77.19-44.31-148.35-.21-.37.1-.8.52-.73 10.48 1.9 87.14 1.9 97.63 0 .42-.08.73.36.52.73-40.11 71.16-44.04 141.96-44.31 148.35a.49.49 0 0 1-.5.47ZM158.66 215h-7.62c-.42 0-.65-.47-.39-.8 5.58-7.06 45.5-60.56 45.96-147.67 0-.43.5-.66.82-.38 8.91 8.04 73.31 42.72 87.97 48.85-57.7 25.51-122.31 95.54-126.37 99.85-.09.1-.22.15-.36.15ZM126.73 215h7.66c.41 0 .65-.46.4-.79-5.44-7.2-45.52-63.11-46-147.69 0-.43-.5-.66-.81-.37C79.08 74.19 10.04 111.17 0 115c57.7 40.37 122.32 95.55 126.38 99.85.09.1.22.15.36.15Z" />
        <circle cx={32.39} cy={65} r={25} />
        <circle cx={252.39} cy={65} r={25} />
        <circle cx={142.39} cy={30} r={30} />
      </g>
    </svg>
  )
}
