import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/booker/index.ts',
    'src/availability/index.ts',
    'src/event-types/index.ts',
    'src/connect/index.ts',
    'src/provider/index.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    '@tanstack/react-query',
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
    'date-fns',
    'lucide-react',
  ],
  treeshake: false, // Preserve "use client" directives
  splitting: false,
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
  target: 'es2022',
  outDir: 'dist',
  banner: {
    js: '"use client";', // Ensure all output files have use client directive
  },
  esbuildOptions(options) {
    // Preserve React directives and other important comments
    options.keepNames = true
    options.legalComments = 'inline'
    options.jsx = 'automatic'
  },
  onSuccess: async () => {
    console.log('✅ Build completed successfully!')
  }
})
