import { View, Text, StyleSheet } from 'react-native'

export default function CartScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shopping Cart</Text>
      <Text style={styles.subtitle}>Your cart is empty</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
})
