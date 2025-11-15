import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          // TODO: Add icon
        }}
      />
      {/* TODO: Add more tabs (categories, cart, profile) */}
    </Tabs>
  )
}
