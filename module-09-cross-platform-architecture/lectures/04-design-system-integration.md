# Lecture 4: Design System Integration

## Introduction

After building shared UI components (Lecture 2) and business logic (Lecture 3), the next challenge is creating a **cohesive visual language** that ensures design consistency across web and mobile while respecting each platform's conventions.

**A design system is more than a component library**—it's a comprehensive set of:
- **Design tokens**: Atomic design decisions (colors, spacing, typography)
- **Component library**: Reusable UI building blocks (Button, Card, TextField)
- **Documentation**: Usage guidelines and API references
- **Patterns**: Best practices for common interactions
- **Tooling**: Design-to-code workflows (Figma plugins, token exporters)

**The problem without a design system**:
- **Inconsistent spacing**: Button padding is 12px on one screen, 16px on another
- **Color chaos**: 15 shades of blue used inconsistently throughout the app
- **Duplication**: Every engineer creates their own variation of a Button
- **Platform drift**: iOS app looks modern, Android app looks outdated
- **Slow iteration**: Rebranding requires changing 200+ components manually

**The solution: A unified design system**

Define design decisions once as tokens (variables), create components that use these tokens, and provide documentation so every engineer uses components consistently. When you rebrand, change 1 token and 200+ components update automatically.

This lecture teaches you how to build a production-grade design system with:
1. **Design tokens** (colors, spacing, typography) as the single source of truth
2. **Semantic token architecture** for theming (light/dark mode)
3. **Component documentation** with Storybook
4. **Platform-specific adaptations** (iOS vs Android guidelines)
5. **Design governance** (contribution process, breaking changes)

---

## Why Design Systems?

### The Problem: Design Inconsistency at Scale

Imagine you're building a fintech app with 50+ screens. Without a design system:

**Colors**:
- Homepage uses `#007AFF` for primary buttons
- Settings screen uses `#0066CC` (similar but different)
- Checkout uses `#0052CC`
- Marketing team wants to rebrand to `#FF6B00`
- **Result**: Changing 150+ files manually, missing some, inconsistent rollout

**Spacing**:
- One engineer uses `margin: 16px`
- Another uses `padding: 12px`
- Another uses `gap: 20px`
- **Result**: 15 different spacing values across the app, inconsistent visual rhythm

**Typography**:
- Headers range from 24px to 32px randomly
- Body text is sometimes 14px, sometimes 16px
- **Result**: Visual hierarchy is unclear, readability suffers

### With a Design System

**Design tokens**:
```typescript
const colors = {
  primary: '#007AFF'  // Single source of truth
}

const spacing = {
  md: 16,  // Consistent spacing unit
  lg: 24
}

const typography = {
  h1: { fontSize: 32, fontWeight: 'bold' },
  body: { fontSize: 16, fontWeight: 'normal' }
}
```

**Rebrand**:
```typescript
// Change one variable, entire app updates
const colors = {
  primary: '#FF6B00'  // ✅ Instant rebrand
}
```

**Benefits**:
- ✅ **Consistency**: All buttons use `colors.primary`
- ✅ **Scalability**: 1000 screens use the same tokens
- ✅ **Efficiency**: Rebrand takes 5 minutes instead of 2 weeks
- ✅ **Quality**: Design review focuses on UX, not pixel-pushing

### Real-World Example: Shopify Polaris

Shopify's design system (Polaris) powers:
- Shopify Admin (web)
- Shopify POS (React Native - iOS/Android)
- Shopify mobile app
- 200+ partner integrations

**Results**:
- **Design consistency**: 100% (same Button everywhere)
- **Development speed**: 3x faster (use existing components vs building from scratch)
- **Rebrand speed**: 2 hours (changed tokens, rebuilt)
- **Accessibility**: WCAG AAA compliance (built into components)

---

## Design Token Architecture

### What are Design Tokens?

Design tokens are **named variables that represent atomic design decisions**:

```typescript
// ❌ Hard-coded values (bad)
<Button style={{ backgroundColor: '#007AFF', padding: 16, fontSize: 16 }} />

// ✅ Design tokens (good)
<Button style={{
  backgroundColor: theme.colors.primary,
  padding: theme.spacing.md,
  fontSize: theme.typography.fontSize.base
}} />
```

**Benefits**:
1. **Single source of truth**: Change token, all usages update
2. **Semantic naming**: `colors.primary` vs `#007AFF` (meaning vs value)
3. **Theming**: Switch between light/dark mode by swapping token sets
4. **Type safety**: TypeScript autocompletes available tokens

### Token Categories

**packages/design-system/tokens/index.ts**:
```typescript
export const tokens = {
  // 1. Colors
  colors: {
    // Brand colors
    brand: {
      primary: '#007AFF',
      secondary: '#5856D6',
      tertiary: '#AF52DE'
    },

    // Semantic colors
    semantic: {
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
      info: '#5AC8FA'
    },

    // Neutral colors (grayscale)
    neutral: {
      0: '#FFFFFF',
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
      1000: '#000000'
    },

    // Surface colors (backgrounds)
    surface: {
      primary: '#FFFFFF',
      secondary: '#F9FAFB',
      tertiary: '#F3F4F6',
      inverse: '#1F2937'
    },

    // Text colors
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      inverse: '#F9FAFB',
      link: '#007AFF',
      success: '#047857',
      warning: '#B45309',
      error: '#991B1B'
    },

    // Border colors
    border: {
      default: '#E5E7EB',
      focus: '#007AFF',
      error: '#FF3B30'
    }
  },

  // 2. Spacing (based on 4px grid)
  spacing: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96
  },

  // 3. Typography
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      serif: 'Georgia, Cambria, "Times New Roman", serif',
      mono: 'Monaco, "Courier New", monospace'
    },

    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
      '5xl': 48,
      '6xl': 60,
      '7xl': 72
    },

    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800'
    },

    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2
    },

    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em'
    }
  },

  // 4. Border radius
  radii: {
    none: 0,
    sm: 4,
    base: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999
  },

  // 5. Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1
    },
    base: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 5
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 8
    }
  },

  // 6. Animation durations
  duration: {
    instant: 0,
    fast: 150,
    base: 250,
    slow: 350,
    slower: 500
  },

  // 7. Breakpoints
  breakpoints: {
    mobile: 0,
    tablet: 768,
    desktop: 1024,
    wide: 1440
  }
}
```

### Semantic Token System (Theming)

**Problem**: Hard-coded colors break in dark mode:
```typescript
// ❌ Won't work in dark mode
<Text style={{ color: '#111827' }}>Hello</Text>
```

**Solution**: Semantic tokens that adapt to theme:
```typescript
// ✅ Adapts to theme automatically
<Text style={{ color: theme.colors.text.primary }}>Hello</Text>
```

**Implementation**:

**packages/design-system/themes/light.ts**:
```typescript
import { tokens } from '../tokens'

export const lightTheme = {
  colors: {
    background: {
      primary: tokens.colors.neutral[0],
      secondary: tokens.colors.neutral[50],
      tertiary: tokens.colors.neutral[100]
    },
    text: {
      primary: tokens.colors.neutral[900],
      secondary: tokens.colors.neutral[600],
      tertiary: tokens.colors.neutral[400]
    },
    border: {
      default: tokens.colors.neutral[200],
      subtle: tokens.colors.neutral[100]
    }
  }
}
```

**packages/design-system/themes/dark.ts**:
```typescript
import { tokens } from '../tokens'

export const darkTheme = {
  colors: {
    background: {
      primary: tokens.colors.neutral[1000],
      secondary: tokens.colors.neutral[900],
      tertiary: tokens.colors.neutral[800]
    },
    text: {
      primary: tokens.colors.neutral[50],
      secondary: tokens.colors.neutral[400],
      tertiary: tokens.colors.neutral[600]
    },
    border: {
      default: tokens.colors.neutral[700],
      subtle: tokens.colors.neutral[800]
    }
  }
}
```

**Theme provider**:
```typescript
import React, { createContext, useContext, useState } from 'react'
import { lightTheme } from './themes/light'
import { darkTheme } from './themes/dark'

type ColorScheme = 'light' | 'dark'
type Theme = typeof lightTheme

const ThemeContext = createContext<{
  theme: Theme
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => void
} | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light')
  const theme = colorScheme === 'light' ? lightTheme : darkTheme

  return (
    <ThemeContext.Provider value={{ theme, colorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be within ThemeProvider')
  return context
}
```

**Usage**:
```typescript
function MyScreen() {
  const { theme, setColorScheme } = useTheme()

  return (
    <View style={{ backgroundColor: theme.colors.background.primary }}>
      <Text style={{ color: theme.colors.text.primary }}>
        Hello World
      </Text>

      <Button onPress={() => setColorScheme('dark')}>
        Toggle Dark Mode
      </Button>
    </View>
  )
}
```

---

## Component Library Organization

### Atomic Design Methodology

Organize components in layers from simple to complex:

**1. Primitives** (atoms): Platform abstractions
```
packages/design-system/primitives/
├── View.tsx
├── View.native.tsx
├── Text.tsx
├── Text.native.tsx
├── Touchable.tsx
└── Touchable.native.tsx
```

**2. Elements** (molecules): Single-purpose components
```
packages/design-system/elements/
├── Button.tsx
├── Button.native.tsx
├── TextField.tsx
├── TextField.native.tsx
├── Avatar.tsx
├── Badge.tsx
└── Spinner.tsx
```

**3. Patterns** (organisms): Multi-element components
```
packages/design-system/patterns/
├── Card.tsx
├── ListItem.tsx
├── Modal.tsx
├── BottomSheet.tsx
└── SearchBar.tsx
```

**4. Templates**: Page layouts
```
packages/design-system/templates/
├── MainLayout.tsx
├── AuthLayout.tsx
└── SplitLayout.tsx
```

### Component API Design

**Good component API**:
```typescript
export interface ButtonProps {
  // Required props
  children: React.ReactNode
  onPress: () => void

  // Optional props with defaults
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean

  // Advanced props
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  testID?: string
}

// Clear prop documentation
/**
 * Button component for triggering actions
 *
 * @param children - Button label text
 * @param onPress - Click handler
 * @param variant - Visual style (default: 'primary')
 * @param size - Size variant (default: 'md')
 * @param disabled - Disable interactions (default: false)
 * @param loading - Show loading spinner (default: false)
 * @param fullWidth - Expand to container width (default: false)
 *
 * @example
 * <Button variant="primary" onPress={() => alert('Clicked')}>
 *   Submit
 * </Button>
 */
export function Button({ children, onPress, ...props }: ButtonProps) {
  // Implementation
}
```

---

## Documentation with Storybook

### Setup

**packages/design-system/.storybook/main.ts**:
```typescript
import type { StorybookConfig } from '@storybook/react-native'

const config: StorybookConfig = {
  stories: [
    '../**/*.stories.@(js|jsx|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-ondevice-controls',
    '@storybook/addon-ondevice-actions'
  ]
}

export default config
```

### Component Stories

**packages/design-system/elements/Button.stories.tsx**:
```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Elements/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    },
    disabled: {
      control: 'boolean'
    },
    loading: {
      control: 'boolean'
    }
  }
}

export default meta
type Story = StoryObj<typeof Button>

// Default story
export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
    onPress: () => console.log('Pressed')
  }
}

// All variants showcase
export const Variants: Story = {
  render: () => (
    <View style={{ gap: 16, padding: 24 }}>
      <Button variant="primary" onPress={() => {}}>Primary</Button>
      <Button variant="secondary" onPress={() => {}}>Secondary</Button>
      <Button variant="outline" onPress={() => {}}>Outline</Button>
      <Button variant="ghost" onPress={() => {}}>Ghost</Button>
    </View>
  )
}

// All sizes showcase
export const Sizes: Story = {
  render: () => (
    <View style={{ gap: 16, padding: 24 }}>
      <Button size="sm" onPress={() => {}}>Small</Button>
      <Button size="md" onPress={() => {}}>Medium</Button>
      <Button size="lg" onPress={() => {}}>Large</Button>
    </View>
  )
}

// States showcase
export const States: Story = {
  render: () => (
    <View style={{ gap: 16, padding: 24 }}>
      <Button onPress={() => {}}>Default</Button>
      <Button disabled onPress={() => {}}>Disabled</Button>
      <Button loading onPress={() => {}}>Loading</Button>
    </View>
  )
}

// With icons
export const WithIcons: Story = {
  render: () => (
    <View style={{ gap: 16, padding: 24 }}>
      <Button leftIcon={<Icon name="plus" />} onPress={() => {}}>
        Create New
      </Button>
      <Button rightIcon={<Icon name="arrow-right" />} onPress={() => {}}>
        Continue
      </Button>
    </View>
  )
}
```

### Documentation Website

**Generated documentation includes**:
- **Component preview**: Interactive playground
- **Props table**: Type-safe prop definitions
- **Code examples**: Copy-paste usage examples
- **Accessibility**: ARIA attributes, keyboard shortcuts
- **Platform notes**: iOS vs Android differences

**Example URL structure**:
```
https://design.myapp.com/
├── /tokens/colors
├── /tokens/spacing
├── /tokens/typography
├── /elements/button
├── /elements/textfield
├── /patterns/card
└── /patterns/modal
```

---

## Platform-Specific Adaptations

### iOS Human Interface Guidelines

**iOS-specific patterns**:
```typescript
// iOS uses bottom sheets for actions
export function ActionSheet({ options }: ActionSheetProps) {
  if (Platform.OS === 'ios') {
    return <BottomSheet>{options}</BottomSheet>
  }

  // Android uses dialogs
  return <Dialog>{options}</Dialog>
}

// iOS uses UISegmentedControl
export function SegmentedControl({ options }: SegmentedControlProps) {
  if (Platform.OS === 'ios') {
    return <IOSSegmentedControl options={options} />
  }

  // Android uses TabLayout
  return <AndroidTabs options={options} />
}
```

### Material Design (Android)

**Android-specific patterns**:
```typescript
// Floating Action Button (FAB) for primary actions
export function FAB({ icon, onPress }: FABProps) {
  if (Platform.OS === 'android') {
    return (
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.colors.primary,
          elevation: 6
        }}
        onPress={onPress}
      >
        {icon}
      </TouchableOpacity>
    )
  }

  // iOS uses toolbar buttons
  return <ToolbarButton icon={icon} onPress={onPress} />
}
```

---

## Design Governance

### Contribution Process

**Adding a new component**:

1. **Proposal**: Create RFC (Request for Comments) in GitHub issues
2. **Design review**: Design team reviews mockups in Figma
3. **Implementation**: Build component following guidelines
4. **Documentation**: Add Storybook stories and props docs
5. **Review**: Code review + design QA
6. **Release**: Publish as new minor version

### Breaking Changes

**Versioning strategy** (Semantic Versioning):
- **Patch** (1.0.1): Bug fixes, no API changes
- **Minor** (1.1.0): New components, backward compatible
- **Major** (2.0.0): Breaking changes (rename props, remove components)

**Migration guide example**:
```markdown
# Migration Guide: v1 → v2

## Breaking Changes

### Button: `variant` prop renamed to `appearance`

**Before**:
```typescript
<Button variant="primary">Submit</Button>
```

**After**:
```typescript
<Button appearance="primary">Submit</Button>
```

### TextField: `error` prop now accepts object instead of string

**Before**:
```typescript
<TextField error="Invalid email" />
```

**After**:
```typescript
<TextField error={{ message: 'Invalid email' }} />
```

## Automated Migration

Run codemod to automatically update your codebase:
```bash
npx @myapp/design-system-codemod v1-to-v2
```
```

---

## Accessibility

### Color Contrast

**WCAG AA compliance** (4.5:1 contrast ratio for text):

```typescript
// packages/design-system/utils/a11y.ts
export function calculateContrast(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground)
  const l2 = relativeLuminance(background)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

// Validate color combinations
export function validateContrast(fg: string, bg: string, level: 'AA' | 'AAA'): boolean {
  const contrast = calculateContrast(fg, bg)
  const minContrast = level === 'AAA' ? 7 : 4.5

  return contrast >= minContrast
}

// Usage in components
const textColor = tokens.colors.text.primary
const bgColor = tokens.colors.background.primary

if (!validateContrast(textColor, bgColor, 'AA')) {
  console.warn('Insufficient color contrast!')
}
```

### Screen Reader Support

**Accessible components**:
```typescript
export function Button({ children, onPress, disabled, ...props }: ButtonProps) {
  return (
    <Touchable
      onPress={onPress}
      disabled={disabled}
      // Accessibility props
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={typeof children === 'string' ? children : props.accessibilityLabel}
      accessibilityState={{ disabled }}
      accessibilityHint={props.accessibilityHint}
      {...props}
    >
      <Text>{children}</Text>
    </Touchable>
  )
}
```

---

## Tooling Integration

### Figma Token Exporter

**Export design tokens from Figma**:

```bash
# Install Figma token plugin
npm install -g figma-to-tokens

# Export tokens from Figma
figma-to-tokens export \
  --file-key="ABC123" \
  --output="packages/design-system/tokens/figma.json"
```

**Transform Figma tokens to TypeScript**:
```typescript
// scripts/transform-tokens.ts
import figmaTokens from '../figma.json'

function transformTokens(tokens: FigmaTokens): DesignTokens {
  return {
    colors: {
      primary: tokens.colors.brand.primary.value,
      secondary: tokens.colors.brand.secondary.value
    },
    spacing: Object.fromEntries(
      Object.entries(tokens.spacing).map(([key, { value }]) => [key, parseInt(value)])
    )
  }
}

export const tokens = transformTokens(figmaTokens)
```

---

## Summary

Design systems are the **foundation of scalable, consistent cross-platform applications**.

**Key takeaways**:

1. **Design tokens** are the single source of truth for colors, spacing, typography, and other design decisions

2. **Semantic token architecture** enables theming (light/dark mode) by mapping semantic names to different values

3. **Atomic design** organizes components from primitives → elements → patterns → templates

4. **Storybook documentation** provides interactive component playgrounds for designers and developers

5. **Platform-specific adaptations** respect iOS and Android guidelines while maintaining brand consistency

6. **Design governance** ensures quality through RFCs, design reviews, and migration guides

**Design system metrics**:

| Metric | Before Design System | After Design System |
|--------|---------------------|---------------------|
| **Design consistency** | 60% (inconsistent spacing/colors) | 100% (all use tokens) |
| **Development speed** | 2 weeks per feature | 1 week (reuse components) |
| **Rebrand time** | 3 months (change 500+ files) | 2 hours (change tokens) |
| **Accessibility** | 40% WCAG AA | 100% WCAG AAA |

**Real-world impact**:
- **Shopify Polaris**: 3x faster development, 100% design consistency across 200+ integrations
- **Airbnb**: 37% code reduction with shared design system
- **Microsoft Fluent**: Used across Office, Teams, Windows 11 (billions of users)

**Next lecture**:
- **Lecture 5**: Server-Driven UI - Building dynamic interfaces controlled by backend configurations for instant updates without app deployments

---

## Additional Resources

- [Design Systems Handbook](https://www.designbetter.co/design-systems-handbook)
- [Shopify Polaris](https://polaris.shopify.com/)
- [Material Design](https://material.io/design)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Storybook Documentation](https://storybook.js.org/)
