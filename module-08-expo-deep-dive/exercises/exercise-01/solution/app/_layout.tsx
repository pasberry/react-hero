import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { checkForUpdates } from '../lib/updates'

export default function RootLayout() {
  // Check for updates on app launch
  useEffect(() => {
    checkForUpdates()
  }, [])

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="product/[id]"
        options={{
          title: 'Product Details',
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  )
}
