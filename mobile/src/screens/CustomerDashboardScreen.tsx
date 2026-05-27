import React, { useState, useEffect, useCallback } from 'react'
import { useNavigation } from '@react-navigation/native'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { fetchProducts, fetchOrders } from '../api/client'
import { Product, Order } from '../types'
import { colors, radii, spacing, typography, shadows, typeScale } from '../theme/design'

const CATEGORIES = ['All', 'Electronics', 'Beauty', 'Fitness', 'Gifts', 'Kitchen', 'Others']

export default function CustomerDashboardScreen() {
  const { user } = useAuth()
  const { cart, cartCount, addToCart } = useCart()
  const navigation = useNavigation<any>()
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [pRes, oRes] = await Promise.all([fetchProducts(), fetchOrders()])
      setProducts(pRes.data?.products || pRes.data || [])
      setOrders(oRes.data?.orders || oRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    completed: orders.filter((o) => o.status === 'completed').length,
  }

  const filteredProducts = products.filter(
    (p) =>
      (category === 'All' || p.category === category) &&
      (search === '' || p.name?.toLowerCase().includes(search.toLowerCase()))
  )

  const handleAddToCart = (product: Product) => {
    addToCart(product)
    Alert.alert('Added to Cart', `${product.name} added to your cart`)
  }

  const isInCart = (productId: number) =>
    cart.some((item) => Number(item.id) === Number(productId))

  const renderProduct = ({ item }: { item: Product }) => {
    const inCart = isInCart(item.id)
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetail', { product: item })}
        activeOpacity={0.9}
      >
        <View style={styles.productImageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productImage} />
          ) : (
            <Text style={styles.productEmoji}>{item.emoji || '📦'}</Text>
          )}
          {item.badge ? (
            <View style={styles.productBadge}>
              <Text style={styles.productBadgeText}>{item.badge}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productPrice}>₱{Number(item.price).toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, inCart && styles.inCartButton]}
          onPress={() => handleAddToCart(item)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.85}
        >
          <Text style={styles.addButtonText}>{inCart ? '✓ Added' : 'Add to Cart'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: spacing.xl }}>
          <Text style={styles.storeName}>MY STORE</Text>
          <Text style={styles.greeting}>
            {getGreeting()}, {user?.first_name || user?.username || 'Customer'}
          </Text>
          <Text style={styles.headerSubtitle}>
            Browse products, manage your cart and track orders.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Cart')}
          style={styles.cartIconContainer}
        >
          <Text style={styles.cartIcon}>Cart</Text>
          {cartCount > 0 ? (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total Orders</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.statusPending }]}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.statusShipped }]}>{stats.shipped}</Text>
                <Text style={styles.statLabel}>Shipped</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.statusCompleted }]}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>

            <View style={styles.filterSection}>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search products..."
                  placeholderTextColor={colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === cat && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products available yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    ...shadows.sm,
  },
  storeName: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  greeting: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  cartIconContainer: {
    padding: spacing.sm,
    alignSelf: 'flex-start',
  },
  cartIcon: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: 'bold',
    fontSize: 10,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    ...typography.heading,
    color: colors.primary,
    fontWeight: 'bold',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filterSection: {
    marginBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: typeScale.body,
  },
  categoriesScroll: {
    marginTop: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.bgCard,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.textInverse,
  },
  productRow: {
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  productCard: {
    flex: 1,
    flexBasis: '48%',
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
    marginHorizontal: spacing.xs,
    minWidth: 160,
    ...shadows.sm,
  },
  productImageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 190,
    borderRadius: radii.lg,
    backgroundColor: colors.bgPrimary,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productEmoji: {
    fontSize: 68,
  },
  productBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  productBadgeText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: 'bold',
  },
  productInfo: {
    marginBottom: spacing.sm,
  },
  productName: {
    ...typography.subheading,
    color: colors.textPrimary,
    fontSize: 16,
  },
  productCategory: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  productPrice: {
    ...typography.heading,
    color: colors.primary,
    marginTop: spacing.xs,
    fontSize: 18,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  inCartButton: {
    backgroundColor: colors.success,
  },
  addButtonText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
})
