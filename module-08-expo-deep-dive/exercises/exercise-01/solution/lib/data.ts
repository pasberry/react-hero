export interface Product {
  id: string
  name: string
  price: number
  image: string
  category: string
  description: string
  rating: number
  reviews: number
}

export const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Wireless Headphones',
    price: 99.99,
    image: 'https://picsum.photos/seed/product1/400/400',
    category: 'Electronics',
    description: 'Premium wireless headphones with noise cancellation',
    rating: 4.5,
    reviews: 128,
  },
  {
    id: '2',
    name: 'Smart Watch',
    price: 299.99,
    image: 'https://picsum.photos/seed/product2/400/400',
    category: 'Electronics',
    description: 'Fitness tracker with heart rate monitoring',
    rating: 4.8,
    reviews: 256,
  },
  {
    id: '3',
    name: 'Running Shoes',
    price: 89.99,
    image: 'https://picsum.photos/seed/product3/400/400',
    category: 'Sports',
    description: 'Lightweight running shoes with excellent cushioning',
    rating: 4.3,
    reviews: 89,
  },
  {
    id: '4',
    name: 'Laptop Backpack',
    price: 49.99,
    image: 'https://picsum.photos/seed/product4/400/400',
    category: 'Accessories',
    description: 'Durable backpack with padded laptop compartment',
    rating: 4.6,
    reviews: 145,
  },
  {
    id: '5',
    name: 'Water Bottle',
    price: 24.99,
    image: 'https://picsum.photos/seed/product5/400/400',
    category: 'Sports',
    description: 'Insulated stainless steel water bottle',
    rating: 4.7,
    reviews: 312,
  },
]

export const CATEGORIES = [
  'All',
  'Electronics',
  'Sports',
  'Accessories',
]
