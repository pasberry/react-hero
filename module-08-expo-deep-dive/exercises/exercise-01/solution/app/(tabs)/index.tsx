import { View, StyleSheet, FlatList } from 'react-native'
import { PRODUCTS } from '../../lib/data'
import { ProductCard } from '../../components/ProductCard'

/**
 * Home Screen - Product List
 * Demonstrates FlatList performance optimizations
 */
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={PRODUCTS}
        renderItem={({ item }) => <ProductCard product={item} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={50}
        initialNumToRender={6}
        windowSize={5}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 8,
  },
})
