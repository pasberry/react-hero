import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Image } from 'expo-image'
import { PRODUCTS } from '../../lib/data'
import { HapticFeedback } from '../../lib/haptic'

/**
 * Product Detail Screen
 * Dynamic route: /product/[id]
 * Demonstrates expo-image for performance
 */
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const product = PRODUCTS.find((p) => p.id === id)

  if (!product) {
    return (
      <View style={styles.container}>
        <Text>Product not found</Text>
      </View>
    )
  }

  async function handleAddToCart() {
    // Trigger haptic feedback
    await HapticFeedback.notification('success')
    console.log('Added to cart:', product.name)
  }

  return (
    <ScrollView style={styles.container}>
      {/* Product image with expo-image for performance */}
      <Image
        source={{ uri: product.image }}
        style={styles.image}
        contentFit="cover"
        transition={200}
        // Performance: cache aggressively
        cachePolicy="memory-disk"
      />

      <View style={styles.content}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>${product.price.toFixed(2)}</Text>

        <View style={styles.rating}>
          <Text style={styles.ratingText}>⭐ {product.rating}</Text>
          <Text style={styles.reviews}>({product.reviews} reviews)</Text>
        </View>

        <Text style={styles.description}>{product.description}</Text>

        <Pressable style={styles.button} onPress={handleAddToCart}>
          <Text style={styles.buttonText}>Add to Cart</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  image: {
    width: '100%',
    height: 300,
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 16,
    marginRight: 8,
  },
  reviews: {
    fontSize: 14,
    color: '#666',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
