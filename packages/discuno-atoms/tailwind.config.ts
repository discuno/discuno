import { createTailwindConfig } from '@discuno/tailwind-config'
import type { Config } from 'tailwindcss'

const config: Config = createTailwindConfig({
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    // Include any consuming app's components
    '../../apps/*/src/**/*.{js,ts,jsx,tsx}',
  ],
  plugins: [],
})

export default config
