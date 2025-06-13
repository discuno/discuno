import { createTailwindConfig } from '@discuno/tailwind-config'
import type { Config } from 'tailwindcss'

const config: Config = createTailwindConfig({
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
    // Include the atoms package components
    './node_modules/@discuno/atoms/**/*.{js,ts,jsx,tsx}',
  ],
  plugins: [],
})

export default config
