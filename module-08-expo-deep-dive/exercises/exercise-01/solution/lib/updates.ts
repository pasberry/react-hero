import * as Updates from 'expo-updates'
import { Alert } from 'react-native'

/**
 * Check for OTA updates and prompt user to restart if available
 */
export async function checkForUpdates() {
  try {
    const update = await Updates.checkForUpdateAsync()

    if (update.isAvailable) {
      // Download update in background
      await Updates.fetchUpdateAsync()

      // Prompt user to restart
      Alert.alert(
        'Update Available',
        'A new version is ready. Restart to apply?',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Restart Now', onPress: () => Updates.reloadAsync() }
        ]
      )
    }
  } catch (error) {
    console.error('Update check failed:', error)
    // Don't show error to user - updates are optional
  }
}

/**
 * Get current update information
 */
export function getCurrentUpdate() {
  if (!Updates.isEmbeddedLaunch) {
    const update = Updates.updateId
    const channel = Updates.channel
    return { update, channel }
  }
  return null
}
