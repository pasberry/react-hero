# Lecture 5: Server-Driven UI

## Introduction

Server-Driven UI lets you change app UI without deploying updates by fetching UI configuration from your API.

## Schema Definition

```typescript
// packages/types/ui-schema.ts
export type UIComponent =
  | { type: 'text'; props: { content: string; style?: TextStyle } }
  | { type: 'button'; props: { label: string; action: string } }
  | { type: 'image'; props: { url: string } }
  | { type: 'stack'; props: { children: UIComponent[] } }

export type Screen = {
  title: string
  components: UIComponent[]
}
```

## Renderer

```typescript
// packages/ui/renderer/ComponentRenderer.tsx
export function ComponentRenderer({ component }: { component: UIComponent }) {
  switch (component.type) {
    case 'text':
      return <Text>{component.props.content}</Text>

    case 'button':
      return (
        <Button onPress={() => handleAction(component.props.action)}>
          {component.props.label}
        </Button>
      )

    case 'image':
      return <Image source={{ uri: component.props.url }} />

    case 'stack':
      return (
        <View>
          {component.props.children.map((child, i) => (
            <ComponentRenderer key={i} component={child} />
          ))}
        </View>
      )
  }
}
```

## Usage

```typescript
// Fetch UI from server
function DynamicScreen({ screenId }: { screenId: string }) {
  const [screen, setScreen] = useState<Screen | null>(null)

  useEffect(() => {
    fetch(`/api/screens/${screenId}`)
      .then(res => res.json())
      .then(setScreen)
  }, [screenId])

  if (!screen) return <Loading />

  return (
    <View>
      <Text style={styles.title}>{screen.title}</Text>
      {screen.components.map((component, i) => (
        <ComponentRenderer key={i} component={component} />
      ))}
    </View>
  )
}
```

## Benefits

- Update UI without app releases
- A/B test layouts
- Personalize per user
- Gradual rollouts

## Summary

Server-Driven UI provides flexibility to change app experiences without code deployments.

**Module 9 Complete!** Cross-platform architecture enables code sharing while respecting platform differences.
