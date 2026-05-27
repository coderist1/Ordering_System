import React from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RouteProp, useNavigation } from '@react-navigation/native'
import { colors, radii, spacing, typography, shadows } from '../theme/design'
import { Product } from '../types'
import { useCart } from '../context/CartContext'

type Props = {
  route: RouteProp<Record<string, any>, 'ProductDetail'>
}

export default function ProductDetailScreen({ route }: Props) {
  const navigation = useNavigation<any>()
  const { addToCart, cart } = useCart()
  const product: Product = route.params?.product

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Product not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const inCart = cart.some((item) => Number(item.id) === Number(product.id))

  const handleAdd = () => {
    addToCart(product)
    Alert.alert('Added to Cart', `${product.name} was added to your cart`)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imageWrap}>
          {product.image ? (
            <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>{product.emoji || '📦'}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.category}>{product.category}</Text>
          <Text style={styles.price}>₱{Number(product.price).toFixed(2)}</Text>
          {product.description ? (
            <Text style={styles.description}>{product.description}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.addBtn, inCart && styles.addBtnInCart]}
            onPress={handleAdd}
            activeOpacity={0.88}
          >
            <Text style={styles.addBtnText}>{inCart ? '✓ Added to Cart' : 'Add to Cart'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart')}>
            <Text style={styles.cartBtnText}>View Cart</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  imageWrap: {
    height: 320,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
    marginBottom: spacing.md,
  },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 72 },
  card: { backgroundColor: colors.bgCard, borderRadius: radii.lg, padding: spacing.md, ...shadows.sm },
  title: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.xs },
  category: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  price: {
    ...typography.subheading,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addBtnInCart: {
    backgroundColor: colors.success,
  },
  addBtnText: { ...typography.bodyBold, color: colors.textInverse },
  cartBtn: {
    backgroundColor: colors.bgPrimary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cartBtnText: { ...typography.bodyBold, color: colors.primary },
  backBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  backBtnText: { color: colors.textSecondary },
})
