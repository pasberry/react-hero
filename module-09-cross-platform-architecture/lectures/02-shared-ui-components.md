# Lecture 2: Shared UI Components

## Introduction

After setting up a monorepo in Lecture 1, the next challenge is: **how do you build UI components that work identically on web and mobile without duplicating code?**

The naive approach of maintaining separate component libraries leads to:
- **Design inconsistencies**: Button padding is 12px on web but 16px on mobile
- **Feature parity issues**: Web has dark mode but mobile doesn't
- **Maintenance burden**: Fixing a bug requires changing 2+ codebases
- **Slow iteration**: Adding a new component variant takes 2x the time

**The solution is a shared component library** with platform-specific implementations. You write the component API once (props interface, behavior) and provide platform-specific rendering (HTML vs React Native).

This lecture teaches you how to build a production-grade cross-platform design system using:
1. **Platform abstraction** - Shared primitives (View, Text, Touchable) that render correctly on each platform
2. **Theme system** - Centralized colors, typography, spacing tokens
3. **Responsive design** - Breakpoint-based layouts that adapt to screen size
4. **Component composition** - Building complex components from simple primitives

By the end, you'll be able to write components like this:

```typescript
// ✅ Works on web AND mobile
import { Button } from '@my-app/ui'

<Button variant="primary" onPress={() => alert('Clicked!')}>
  Submit Order
</Button>
```

And the same component renders:
- **Web**: `<button>` with CSS styles
- **Mobile**: `<TouchableOpacity>` with StyleSheet

---

## Why Shared UI Components?

### The Problem: Fragmented Design Systems

Imagine you're building a social media app with web and mobile versions. You need a design system with:
- **20+ components**: Button, Card, Avatar, TextField, Modal, etc.
- **3 color themes**: Light, dark, high contrast
- **Typography scale**: 8 font sizes, 3 weights
- **Spacing system**: Consistent padding/margins

**Without shared components** (duplicate implementations):

```
// Web version (React)
packages/web-ui/
├── Button.tsx           // 150 lines
├── Card.tsx             // 200 lines
├── TextField.tsx        // 180 lines
└── ...

// Mobile version (React Native)
packages/mobile-ui/
├── Button.tsx           // 150 lines (duplicate!)
├── Card.tsx             // 200 lines (duplicate!)
├── TextField.tsx        // 180 lines (duplicate!)
└── ...

Total: 6,000+ lines of duplicate code
```

**Problems**:
1. **Design drift**: Web team updates Button to have rounded corners, mobile team doesn't get the memo
2. **Bug multiplication**: TextField validation bug exists in both implementations
3. **Feature disparity**: Dark mode added to web but mobile team doesn't have time to implement
4. **Documentation overhead**: Maintaining 2 Storybooks, 2 style guides

**With shared components** (single source of truth):

```
packages/ui/
├── Button.tsx           # Shared interface + web implementation
├── Button.native.tsx    # Mobile-specific rendering
├── Card.tsx
├── Card.native.tsx
└── ...

Total: 3,000 lines (50% reduction)
```

**Benefits**:
- ✅ **Single source of truth**: Design changes propagate automatically
- ✅ **Type safety**: Props interface shared between platforms
- ✅ **Feature parity**: Dark mode added once, works everywhere
- ✅ **Half the code**: Less maintenance, fewer bugs

### Real-World Example: Airbnb

Airbnb rebuilt their design system as a shared component library:
- **Before**: 40,000 lines across web and mobile (20K each)
- **After**: 25,000 lines (15K shared, 5K web-specific, 5K mobile-specific)
- **Code reduction**: 37.5%
- **Design consistency**: 100% (same Button everywhere)
- **Development speed**: 2x faster (add variant once, get on both platforms)

---

## Platform Abstraction: Building Primitives

### The Goal: Write Once, Render Everywhere

We want components with **shared APIs** but **platform-specific rendering**:

```typescript
// Shared API (same on web and mobile)
<Button
  variant="primary"
  size="large"
  onPress={() => console.log('Clicked')}
  disabled={false}
>
  Click Me
</Button>
```

**Web renders**:
```html
<button class="btn-primary-large" disabled="false">
  Click Me
</button>
```

**Mobile renders**:
```jsx
<TouchableOpacity style={styles.primaryLarge} disabled={false}>
  <Text>Click Me</Text>
</TouchableOpacity>
```

### Step 1: Create Primitive Components

Primitives are low-level building blocks that abstract platform differences.

#### View Primitive

**packages/ui/primitives/View.tsx** (Web implementation):
```typescript
import React, { CSSProperties } from 'react'

export interface ViewProps {
  children?: React.ReactNode
  style?: ViewStyle
  onClick?: () => void
  testID?: string
}

// Convert React Native style object to CSS
function convertStyle(style?: ViewStyle): CSSProperties {
  if (!style) return {}

  return {
    display: style.flex !== undefined ? 'flex' : 'block',
    flexDirection: style.flexDirection,
    justifyContent: style.justifyContent,
    alignItems: style.alignItems,
    padding: style.padding,
    paddingTop: style.paddingTop,
    paddingRight: style.paddingRight,
    paddingBottom: style.paddingBottom,
    paddingLeft: style.paddingLeft,
    margin: style.margin,
    backgroundColor: style.backgroundColor,
    borderRadius: style.borderRadius,
    // ... map all style properties
  }
}

export function View({ children, style, onClick, testID }: ViewProps) {
  return (
    <div
      style={convertStyle(style)}
      onClick={onClick}
      data-testid={testID}
    >
      {children}
    </div>
  )
}

// Style type compatible with React Native
export interface ViewStyle {
  flex?: number
  flexDirection?: 'row' | 'column'
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between'
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch'
  padding?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  margin?: number
  backgroundColor?: string
  borderRadius?: number
  // ... all React Native style properties
}
```

**packages/ui/primitives/View.native.tsx** (Mobile implementation):
```typescript
import { View as RNView, ViewProps as RNViewProps } from 'react-native'

// Re-export React Native View directly
export const View = RNView
export type ViewProps = RNViewProps
export type ViewStyle = RNViewProps['style']
```

**How it works**:
- Web: Custom `View` component that renders `<div>` and converts styles
- Mobile: Re-exports React Native's `View` (no conversion needed)
- Both platforms use the same import: `import { View } from '@my-app/ui/primitives'`

#### Text Primitive

**packages/ui/primitives/Text.tsx** (Web):
```typescript
import React, { CSSProperties } from 'react'

export interface TextProps {
  children: React.ReactNode
  style?: TextStyle
  numberOfLines?: number
  testID?: string
}

function convertTextStyle(style?: TextStyle): CSSProperties {
  if (!style) return {}

  return {
    fontSize: style.fontSize,
    fontWeight: style.fontWeight as any,
    color: style.color,
    textAlign: style.textAlign,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    // Truncation
    ...(style.numberOfLines && {
      display: '-webkit-box',
      WebkitLineClamp: style.numberOfLines,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden'
    })
  }
}

export function Text({ children, style, numberOfLines, testID }: TextProps) {
  return (
    <span
      style={convertTextStyle({ ...style, numberOfLines })}
      data-testid={testID}
    >
      {children}
    </span>
  )
}

export interface TextStyle {
  fontSize?: number
  fontWeight?: '400' | '600' | '700' | 'normal' | 'bold'
  color?: string
  textAlign?: 'left' | 'center' | 'right'
  lineHeight?: number
  letterSpacing?: number
  numberOfLines?: number
}
```

**packages/ui/primitives/Text.native.tsx** (Mobile):
```typescript
import { Text as RNText, TextProps as RNTextProps } from 'react-native'

export const Text = RNText
export type TextProps = RNTextProps
export type TextStyle = RNTextProps['style']
```

#### Touchable Primitive

**packages/ui/primitives/Touchable.tsx** (Web):
```typescript
import React from 'react'
import { View, ViewProps } from './View'

export interface TouchableProps extends ViewProps {
  onPress: () => void
  disabled?: boolean
  activeOpacity?: number
}

export function Touchable({
  children,
  onPress,
  disabled = false,
  style,
  activeOpacity = 0.7,
  ...props
}: TouchableProps) {
  const [isPressed, setIsPressed] = React.useState(false)

  return (
    <View
      style={{
        ...style,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : isPressed ? activeOpacity : 1,
        userSelect: 'none'
      }}
      onClick={disabled ? undefined : onPress}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      {...props}
    >
      {children}
    </View>
  )
}
```

**packages/ui/primitives/Touchable.native.tsx** (Mobile):
```typescript
import { TouchableOpacity, TouchableOpacityProps } from 'react-native'

export const Touchable = TouchableOpacity
export type TouchableProps = TouchableOpacityProps & {
  onPress: () => void
}
```

**packages/ui/primitives/index.ts**:
```typescript
export { View } from './View'
export type { ViewProps, ViewStyle } from './View'

export { Text } from './Text'
export type { TextProps, TextStyle } from './Text'

export { Touchable } from './Touchable'
export type { TouchableProps } from './Touchable'
```

**Benefits of primitives**:
1. **Consistent API**: `<View>`, `<Text>`, `<Touchable>` work the same everywhere
2. **Platform optimization**: Web uses `<div>`, mobile uses native components
3. **Easy migration**: Refactor primitives without touching consumer code

---

## Theme System: Centralized Design Tokens

### Design Tokens

Design tokens are the **single source of truth** for colors, typography, spacing, etc.

**packages/ui/theme/tokens.ts**:
```typescript
export const colors = {
  // Brand colors
  primary: '#007AFF',
  primaryDark: '#0051D5',
  primaryLight: '#4DA2FF',

  // Semantic colors
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Backgrounds (theme-aware)
  background: {
    light: '#FFFFFF',
    dark: '#000000'
  },
  surface: {
    light: '#F9FAFB',
    dark: '#1F2937'
  },

  // Text (theme-aware)
  text: {
    primary: {
      light: '#111827',
      dark: '#F9FAFB'
    },
    secondary: {
      light: '#6B7280',
      dark: '#9CA3AF'
    }
  }
}

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48
}

export const typography = {
  // Font families
  fontFamily: {
    body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'Monaco, Courier New, monospace'
  },

  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48
  },

  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75
  },

  // Text styles (combinations)
  styles: {
    h1: {
      fontSize: 36,
      fontWeight: '700',
      lineHeight: 1.2
    },
    h2: {
      fontSize: 30,
      fontWeight: '700',
      lineHeight: 1.3
    },
    h3: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 1.4
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 1.5
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 1.5
    }
  }
}

export const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999
}

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1 // Android
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5
  }
}
```

### Theme Provider

**packages/ui/theme/ThemeProvider.tsx**:
```typescript
import React, { createContext, useContext, useState } from 'react'
import { colors, spacing, typography, radii, shadows } from './tokens'

export type ColorScheme = 'light' | 'dark'

interface Theme {
  colors: typeof colors
  spacing: typeof spacing
  typography: typeof typography
  radii: typeof radii
  shadows: typeof shadows
  colorScheme: ColorScheme
}

interface ThemeContextValue {
  theme: Theme
  setColorScheme: (scheme: ColorScheme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light')

  const theme: Theme = {
    colors,
    spacing,
    typography,
    radii,
    shadows,
    colorScheme
  }

  return (
    <ThemeContext.Provider value={{ theme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

// Helper to get theme-aware colors
export function useThemedColor(color: { light: string; dark: string }) {
  const { theme } = useTheme()
  return color[theme.colorScheme]
}
```

**Usage**:
```typescript
// App root
import { ThemeProvider } from '@my-app/ui/theme'

export default function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  )
}

// In components
import { useTheme, useThemedColor } from '@my-app/ui/theme'

function MyComponent() {
  const { theme } = useTheme()
  const backgroundColor = useThemedColor(theme.colors.background)

  return (
    <View style={{ backgroundColor, padding: theme.spacing.lg }}>
      <Text style={theme.typography.styles.h1}>Title</Text>
    </View>
  )
}
```

---

## Building Complex Components

### Button Component

**packages/ui/components/Button.tsx** (Web):
```typescript
import React from 'react'
import { View, Text, Touchable } from '../primitives'
import { useTheme } from '../theme'

export interface ButtonProps {
  children: React.ReactNode
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  testID?: string
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  testID
}: ButtonProps) {
  const { theme } = useTheme()

  // Size styles
  const sizeStyles = {
    small: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.fontSize.sm
    },
    medium: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      fontSize: theme.typography.fontSize.base
    },
    large: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      fontSize: theme.typography.fontSize.lg
    }
  }[size]

  // Variant styles
  const variantStyles = {
    primary: {
      backgroundColor: theme.colors.primary,
      color: theme.colors.white
    },
    secondary: {
      backgroundColor: theme.colors.gray200,
      color: theme.colors.gray900
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.primary,
      color: theme.colors.primary
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.colors.primary
    }
  }[variant]

  return (
    <Touchable
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        ...variantStyles,
        paddingVertical: sizeStyles.paddingVertical,
        paddingHorizontal: sizeStyles.paddingHorizontal,
        borderRadius: theme.radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        ...(fullWidth && { width: '100%' })
      }}
      testID={testID}
    >
      {loading ? (
        <Text style={{ color: variantStyles.color, fontSize: sizeStyles.fontSize }}>
          Loading...
        </Text>
      ) : (
        <Text
          style={{
            color: variantStyles.color,
            fontSize: sizeStyles.fontSize,
            fontWeight: theme.typography.fontWeight.semibold
          }}
        >
          {children}
        </Text>
      )}
    </Touchable>
  )
}
```

**packages/ui/components/Button.native.tsx** (Mobile - nearly identical):
```typescript
import React from 'react'
import { ActivityIndicator } from 'react-native'
import { View, Text, Touchable } from '../primitives'
import { useTheme } from '../theme'
import type { ButtonProps } from './Button'

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  testID
}: ButtonProps) {
  const { theme } = useTheme()

  const sizeStyles = {
    small: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.fontSize.sm
    },
    medium: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      fontSize: theme.typography.fontSize.base
    },
    large: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      fontSize: theme.typography.fontSize.lg
    }
  }[size]

  const variantStyles = {
    primary: {
      backgroundColor: theme.colors.primary,
      color: theme.colors.white
    },
    secondary: {
      backgroundColor: theme.colors.gray200,
      color: theme.colors.gray900
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.primary,
      color: theme.colors.primary
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.colors.primary
    }
  }[variant]

  return (
    <Touchable
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        backgroundColor: variantStyles.backgroundColor,
        borderWidth: variantStyles.borderWidth,
        borderColor: variantStyles.borderColor,
        paddingVertical: sizeStyles.paddingVertical,
        paddingHorizontal: sizeStyles.paddingHorizontal,
        borderRadius: theme.radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        ...(fullWidth && { width: '100%' })
      }}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.color} />
      ) : (
        <Text
          style={{
            color: variantStyles.color,
            fontSize: sizeStyles.fontSize,
            fontWeight: theme.typography.fontWeight.semibold
          }}
        >
          {children}
        </Text>
      )}
    </Touchable>
  )
}
```

**Key differences**:
- Web: Loading state shows "Loading..." text
- Mobile: Loading state shows `<ActivityIndicator>` (native spinner)
- 95% of code is identical (size/variant logic)

### Card Component

**packages/ui/components/Card.tsx**:
```typescript
import React from 'react'
import { View, Text } from '../primitives'
import { useTheme, useThemedColor } from '../theme'

export interface CardProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  variant?: 'elevated' | 'outlined' | 'filled'
  onPress?: () => void
  testID?: string
}

export function Card({
  children,
  title,
  subtitle,
  variant = 'elevated',
  onPress,
  testID
}: CardProps) {
  const { theme } = useTheme()
  const backgroundColor = useThemedColor(theme.colors.surface)
  const textColor = useThemedColor(theme.colors.text.primary)

  const variantStyles = {
    elevated: {
      backgroundColor,
      ...theme.shadows.md
    },
    outlined: {
      backgroundColor,
      borderWidth: 1,
      borderColor: theme.colors.gray300
    },
    filled: {
      backgroundColor: theme.colors.gray100
    }
  }[variant]

  const content = (
    <View
      style={{
        ...variantStyles,
        borderRadius: theme.radii.lg,
        padding: theme.spacing.lg
      }}
      testID={testID}
    >
      {title && (
        <Text
          style={{
            ...theme.typography.styles.h3,
            color: textColor,
            marginBottom: subtitle ? theme.spacing.xs : theme.spacing.sm
          }}
        >
          {title}
        </Text>
      )}

      {subtitle && (
        <Text
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: useThemedColor(theme.colors.text.secondary),
            marginBottom: theme.spacing.sm
          }}
        >
          {subtitle}
        </Text>
      )}

      {children}
    </View>
  )

  if (onPress) {
    return (
      <Touchable onPress={onPress}>
        {content}
      </Touchable>
    )
  }

  return content
}
```

**Usage**:
```typescript
<Card
  title="Featured Product"
  subtitle="Limited time offer"
  variant="elevated"
  onPress={() => navigate('/product/123')}
>
  <Text>Product details here...</Text>
  <Button variant="primary">Add to Cart</Button>
</Card>
```

---

## Responsive Design

### Breakpoint Hook

**packages/ui/hooks/useBreakpoint.ts**:
```typescript
import { useEffect, useState } from 'react'
import { useWindowDimensions } from 'react-native'

export const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440
}

export interface Breakpoint {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isWide: boolean
  width: number
  height: number
}

export function useBreakpoint(): Breakpoint {
  const { width, height } = useWindowDimensions()

  return {
    isMobile: width < breakpoints.tablet,
    isTablet: width >= breakpoints.tablet && width < breakpoints.desktop,
    isDesktop: width >= breakpoints.desktop && width < breakpoints.wide,
    isWide: width >= breakpoints.wide,
    width,
    height
  }
}

// Responsive value hook
export function useResponsiveValue<T>(values: {
  mobile: T
  tablet?: T
  desktop?: T
  wide?: T
}): T {
  const { isMobile, isTablet, isDesktop, isWide } = useBreakpoint()

  if (isWide && values.wide !== undefined) return values.wide
  if (isDesktop && values.desktop !== undefined) return values.desktop
  if (isTablet && values.tablet !== undefined) return values.tablet
  return values.mobile
}
```

**Usage**:
```typescript
function ProductGrid() {
  const columns = useResponsiveValue({
    mobile: 1,
    tablet: 2,
    desktop: 3,
    wide: 4
  })

  const padding = useResponsiveValue({
    mobile: 16,
    tablet: 24,
    desktop: 32
  })

  return (
    <View style={{ padding, flexDirection: 'row', flexWrap: 'wrap' }}>
      {products.map(product => (
        <View key={product.id} style={{ width: `${100 / columns}%` }}>
          <ProductCard product={product} />
        </View>
      ))}
    </View>
  )
}
```

### Platform-Specific Layouts

**packages/ui/components/Layout.tsx**:
```typescript
import React from 'react'
import { View } from '../primitives'
import { useBreakpoint } from '../hooks'

interface LayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
}

export function Layout({ children, sidebar }: LayoutProps) {
  const { isMobile } = useBreakpoint()

  if (isMobile) {
    // Mobile: Stack vertically
    return (
      <View style={{ flex: 1 }}>
        {children}
        {sidebar && <View>{sidebar}</View>}
      </View>
    )
  }

  // Desktop: Sidebar + content
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {sidebar && (
        <View style={{ width: 280, borderRightWidth: 1, borderColor: '#E5E7EB' }}>
          {sidebar}
        </View>
      )}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  )
}
```

---

## Accessibility

### Accessible Components

**packages/ui/components/Button.tsx** (with accessibility):
```typescript
export function Button({ children, onPress, disabled, testID, ...props }: ButtonProps) {
  const { theme } = useTheme()

  return (
    <Touchable
      onPress={onPress}
      disabled={disabled}
      // Accessibility props
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      accessibilityState={{ disabled }}
      // Minimum touch target (44x44 on mobile)
      style={{
        minWidth: 44,
        minHeight: 44,
        ...styles
      }}
      testID={testID}
    >
      <Text>{children}</Text>
    </Touchable>
  )
}
```

**Accessibility checklist**:
- ✅ `accessible={true}`: Component is focusable by screen readers
- ✅ `accessibilityRole="button"`: Announces as button
- ✅ `accessibilityLabel`: Screen reader announces this text
- ✅ `accessibilityState`: Announces disabled state
- ✅ Minimum touch target: 44x44 pixels (iOS guideline)

---

## Performance Optimization

### Memoization

**packages/ui/components/ProductCard.tsx**:
```typescript
import React, { memo } from 'react'
import { Card } from './Card'
import { Text, View } from '../primitives'

interface ProductCardProps {
  product: {
    id: string
    name: string
    price: number
    imageUrl: string
  }
  onPress: (id: string) => void
}

// Memoize to prevent re-renders when props don't change
export const ProductCard = memo(function ProductCard({
  product,
  onPress
}: ProductCardProps) {
  return (
    <Card onPress={() => onPress(product.id)}>
      <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: 200 }} />
      <Text>{product.name}</Text>
      <Text>${product.price}</Text>
    </Card>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: Only re-render if product.id changed
  return prevProps.product.id === nextProps.product.id
})
```

### Virtualized Lists

**packages/ui/components/VirtualizedGrid.tsx**:
```typescript
import React from 'react'
import { FlatList } from 'react-native'
import { useBreakpoint } from '../hooks'

interface VirtualizedGridProps<T> {
  data: T[]
  renderItem: (item: T) => React.ReactElement
  keyExtractor: (item: T) => string
}

export function VirtualizedGrid<T>({
  data,
  renderItem,
  keyExtractor
}: VirtualizedGridProps<T>) {
  const columns = useResponsiveValue({ mobile: 1, tablet: 2, desktop: 3 })

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => renderItem(item)}
      keyExtractor={keyExtractor}
      numColumns={columns}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={5}
      initialNumToRender={10}
    />
  )
}
```

---

## Testing Shared Components

### Visual Regression Testing

**packages/ui/components/__tests__/Button.test.tsx**:
```typescript
import { render } from '@testing-library/react'
import { Button } from '../Button'
import { ThemeProvider } from '../../theme'

describe('Button', () => {
  it('renders primary variant correctly', () => {
    const { container } = render(
      <ThemeProvider>
        <Button onPress={() => {}} variant="primary">
          Click Me
        </Button>
      </ThemeProvider>
    )

    expect(container).toMatchSnapshot()
  })

  it('renders all sizes correctly', () => {
    const sizes = ['small', 'medium', 'large'] as const

    sizes.forEach(size => {
      const { container } = render(
        <ThemeProvider>
          <Button onPress={() => {}} size={size}>
            {size}
          </Button>
        </ThemeProvider>
      )

      expect(container).toMatchSnapshot(`button-${size}`)
    })
  })
})
```

### Storybook for Cross-Platform Components

**packages/ui/components/Button.stories.tsx**:
```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost']
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large']
    }
  }
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
    onPress: () => alert('Pressed')
  }
}

export const AllVariants: Story = {
  render: () => (
    <View style={{ gap: 16 }}>
      <Button variant="primary" onPress={() => {}}>Primary</Button>
      <Button variant="secondary" onPress={() => {}}>Secondary</Button>
      <Button variant="outline" onPress={() => {}}>Outline</Button>
      <Button variant="ghost" onPress={() => {}}>Ghost</Button>
    </View>
  )
}
```

---

## Real-World Example: Complete Form Component

**packages/ui/components/TextField.tsx**:
```typescript
import React, { useState } from 'react'
import { View, Text } from '../primitives'
import { useTheme } from '../theme'

export interface TextFieldProps {
  label: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  secureTextEntry?: boolean
  autoComplete?: 'email' | 'password' | 'username'
  testID?: string
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  disabled = false,
  secureTextEntry = false,
  autoComplete,
  testID
}: TextFieldProps) {
  const { theme } = useTheme()
  const [isFocused, setIsFocused] = useState(false)

  return (
    <View style={{ marginBottom: theme.spacing.lg }} testID={testID}>
      {/* Label */}
      <Text
        style={{
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
          color: theme.colors.gray700,
          marginBottom: theme.spacing.xs
        }}
      >
        {label}
      </Text>

      {/* Input */}
      <input
        type={secureTextEntry ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        style={{
          width: '100%',
          padding: theme.spacing.md,
          fontSize: theme.typography.fontSize.base,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: error
            ? theme.colors.error
            : isFocused
            ? theme.colors.primary
            : theme.colors.gray300,
          backgroundColor: disabled ? theme.colors.gray100 : theme.colors.white,
          outline: 'none'
        }}
      />

      {/* Error message */}
      {error && (
        <Text
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.error,
            marginTop: theme.spacing.xs
          }}
        >
          {error}
        </Text>
      )}
    </View>
  )
}
```

**Usage in a login form**:
```typescript
import { useState } from 'react'
import { View, Button, TextField } from '@my-app/ui'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({ email: '', password: '' })

  function handleSubmit() {
    // Validation
    const newErrors = { email: '', password: '' }

    if (!email.includes('@')) {
      newErrors.email = 'Invalid email address'
    }

    if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    setErrors(newErrors)

    if (!newErrors.email && !newErrors.password) {
      // Submit form
      login(email, password)
    }
  }

  return (
    <View style={{ padding: 24 }}>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        error={errors.email}
        autoComplete="email"
      />

      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Enter password"
        error={errors.password}
        secureTextEntry
        autoComplete="password"
      />

      <Button variant="primary" onPress={handleSubmit} fullWidth>
        Log In
      </Button>
    </View>
  )
}
```

---

## Summary

Shared UI components are the foundation of cross-platform development, enabling:

**Key takeaways**:

1. **Platform primitives** (`View`, `Text`, `Touchable`) abstract differences between web and mobile with a unified API

2. **Theme system** provides centralized design tokens (colors, typography, spacing) ensuring visual consistency

3. **Component composition** allows building complex components (Button, Card, TextField) from simple primitives

4. **Responsive design** with breakpoint hooks adapts layouts to screen size automatically

5. **Accessibility** is built-in with proper roles, labels, and touch targets

6. **Performance** is optimized with memoization and virtualized lists

**Code sharing metrics**:

| Approach | Lines of Code | Maintenance Burden | Design Consistency |
|----------|---------------|--------------------|--------------------|
| **Separate libraries** | 10,000 | High (2x bugs) | Low (drift) |
| **Shared components** | 5,000 | Low (1 fix everywhere) | High (single source) |

**Real-world impact**:
- **Airbnb**: 37% code reduction, 100% design consistency
- **Shopify**: 60% code sharing, 2x development speed
- **Microsoft**: 50% faster feature development

**Next lecture**:
- **Lecture 3**: Shared business logic - State management, validation, and API clients that work across platforms

---

## Additional Resources

- [React Native Web Documentation](https://necolas.github.io/react-native-web/)
- [Shopify Restyle](https://github.com/Shopify/restyle) - Type-enforced theme system
- [Tamagui](https://tamagui.dev/) - Universal React components
- [Airbnb Design System](https://airbnb.design/building-a-visual-language/)
