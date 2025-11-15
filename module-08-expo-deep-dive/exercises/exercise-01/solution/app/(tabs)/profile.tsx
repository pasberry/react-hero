import { View, Text, StyleSheet } from 'react-native'
import { getCurrentUpdate } from '../../lib/updates'

export default function ProfileScreen() {
  const updateInfo = getCurrentUpdate()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {updateInfo && (
        <View style={styles.updateInfo}>
          <Text style={styles.label}>Current Update:</Text>
          <Text style={styles.value}>{updateInfo.update}</Text>
          <Text style={styles.label}>Channel:</Text>
          <Text style={styles.value}>{updateInfo.channel}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  updateInfo: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
  },
})
