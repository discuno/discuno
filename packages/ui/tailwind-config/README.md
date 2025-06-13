# @discuno/tailwind-config

> 🎨 **Shared Tailwind CSS configuration for the Discuno monorepo**

This package provides a consistent, maintainable Tailwind CSS configuration that can be shared across all packages and applications in the Discuno monorepo.

## 🌟 Features

- **Consistent Design System** - Unified color palette, spacing, and component styles
- **CSS Variables** - Theme-aware colors using HSL variables
- **Custom Animations** - Smooth, accessible animations for UI interactions
- **Extended Utilities** - Additional spacing, sizing, and z-index utilities
- **TypeScript Support** - Fully typed configuration with IntelliSense
- **Monorepo Optimized** - Easy to extend for package-specific needs

## 📦 Installation

```bash
# Install in your package
pnpm add @discuno/tailwind-config
```

## 🚀 Usage

### Basic Usage

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'
import { createTailwindConfig } from '@discuno/tailwind-config'

const config: Config = createTailwindConfig({
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
})

export default config
```

### With Package-Specific Customizations

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'
import { createTailwindConfig } from '@discuno/tailwind-config'

const config: Config = createTailwindConfig({
  content: ['./src/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Package-specific theme extensions
      colors: {
        brand: {
          primary: 'hsl(var(--brand-primary))',
          secondary: 'hsl(var(--brand-secondary))',
        },
      },
    },
  },
  plugins: [
    // Package-specific plugins
    require('@tailwindcss/forms'),
  ],
})

export default config
```

### Direct Import (Advanced)

```typescript
// For more control over the configuration
import { sharedTailwindConfig } from '@discuno/tailwind-config'
import type { Config } from 'tailwindcss'

const config: Config = {
  ...sharedTailwindConfig,
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  // Your customizations
}

export default config
```

## 🎨 Design System

### Color Palette

The shared config uses CSS variables for colors, making them theme-aware:

```css
/* CSS Variables (defined in your global styles) */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... more variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode overrides */
}
```

### Custom Animations

- **accordion-down/up** - Smooth accordion transitions
- **fade-in/out** - Gentle opacity transitions
- **slide-in/out** - Smooth slide animations

### Extended Utilities

- **Spacing**: `18`, `88`, `100`, `112`, `128`
- **Max Width**: `8xl`, `9xl`
- **Z-Index**: `60`, `70`, `80`, `90`, `100`

## 📚 Package Structure

```
packages/ui/tailwind-config/
├── src/
│   └── tailwind.config.ts    # Main configuration
├── package.json              # Package metadata
├── tsconfig.json            # TypeScript config
└── README.md                # This file
```

## 🔧 Development

### Local Development

```bash
# Navigate to the package
cd packages/ui/tailwind-config

# Type check
pnpm typecheck

# Format code
pnpm format:write
```

### Adding New Utilities

To add new shared utilities, edit `src/tailwind.config.ts`:

```typescript
export const sharedTailwindConfig: Partial<Config> = {
  theme: {
    extend: {
      // Add your new utilities here
      spacing: {
        '144': '36rem',
      },
    },
  },
}
```

## 🏗️ Architecture

This package follows monorepo best practices:

1. **Single Source of Truth** - All shared design tokens in one place
2. **Composable** - Easy to extend without duplication
3. **Type-Safe** - Full TypeScript support with proper exports
4. **Version Controlled** - Changes are tracked and versioned

## 📖 Examples

### Web Application

```typescript
// apps/web/tailwind.config.ts
import { createTailwindConfig } from '@discuno/tailwind-config'

export default createTailwindConfig({
  content: ['./src/**/*.{js,ts,jsx,tsx}', './node_modules/@discuno/atoms/**/*.{js,ts,jsx,tsx}'],
})
```

### Component Library

```typescript
// packages/discuno-atoms/tailwind.config.ts
import { createTailwindConfig } from '@discuno/tailwind-config'

export default createTailwindConfig({
  content: ['./src/**/*.{js,ts,jsx,tsx}', '../../apps/*/src/**/*.{js,ts,jsx,tsx}'],
})
```

## 🤝 Contributing

When adding new design tokens:

1. Consider if they should be shared across all packages
2. Use CSS variables for theme-aware properties
3. Follow existing naming conventions
4. Update this README with new utilities

## 📄 License

MIT License - see the [LICENSE](../../../LICENSE) file for details.

---

<div align="center">

**Part of the [Discuno](https://github.com/discuno/discuno) monorepo**

</div>
