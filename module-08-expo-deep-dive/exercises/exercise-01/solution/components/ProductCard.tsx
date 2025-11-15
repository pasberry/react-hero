import { memo } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Product } from '../lib/data'

interface ProductCardProps {
  product: Product
}

/**
 * ProductCard Component
 * Optimized with React.memo to prevent unnecessary re-renders
 * Uses expo-image for better performance than react-native Image
 */
export const ProductCard = memo(function ProductCard({
  product,
}: ProductCardProps) {
  const router = useRouter()

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/product/${product.id}`)}
    >
      <Image
        source={{ uri: product.image }}
        style={styles.image}
        contentFit="cover"
        transition={200}
        // Performance: use placeholder while loading
        placeholder={require('../assets/placeholder.png')}
        // Cache images aggressively
        cachePolicy="memory-disk"
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.price}>${product.price.toFixed(2)}</Text>
        <View style={styles.rating}>
          <Text style={styles.ratingText}>⭐ {product.rating}</Text>
        </View>
      </View>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 150,
  },
  info: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    height: 40,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
  },
})
