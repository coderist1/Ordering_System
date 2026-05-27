import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { createOrder } from '../api/client';
import { colors, radii, spacing, typography, shadows } from '../theme/design';

export default function CartScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { cart, cartCount, cartTotal, updateQty, clearCart } = useCart();
  const [placing, setPlacing] = useState(false);

  const placeOrder = async () => {
    if (!cart.length) {
      Alert.alert('Cart Empty', 'Add products before placing an order.');
      return;
    }
    setPlacing(true);
    try {
      await createOrder({
        customer_name: user?.first_name || user?.email || 'Customer',
        customer_email: user?.email || '',
        items: cart.map((i) => ({
          product_id: i.id,
          product_name: i.name,
          quantity: i.quantity,
          unit_price: i.price,
        })),
      });
      clearCart();
      Alert.alert('Success', 'Order placed successfully!', [
        { text: 'View Orders', onPress: () => navigation.navigate('Orders') },
        { text: 'OK' },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data
        ? Object.values(err.response.data).flat().join(', ')
        : 'Failed to place order';
      Alert.alert('Error', msg);
    } finally {
      setPlacing(false);
    }
  };

  const renderCartItem = ({ item }: { item: (typeof cart)[number] }) => {
    const lineTotal = Number(item.price) * item.quantity;
    return (
      <View style={styles.cartItem}>
        <View style={styles.cartItemTop}>
          <View style={styles.cartItemImageWrap}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.cartItemImage} />
            ) : (
              <Text style={styles.productEmoji}>{item.emoji || '📦'}</Text>
            )}
          </View>
          <View style={styles.cartItemInfo}>
            <Text style={styles.cartItemName}>{item.name}</Text>
            <Text style={styles.cartItemPrice}>₱{Number(item.price).toFixed(2)} each</Text>
            <Text style={styles.cartItemTotal}>₱{lineTotal.toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.cartItemControls}>
          <TouchableOpacity
            onPress={() => updateQty(item.id, item.quantity - 1)}
            style={styles.qtyBtn}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity
            onPress={() => updateQty(item.id, item.quantity + 1)}
            style={styles.qtyBtn}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => updateQty(item.id, 0)} style={styles.removeBtn}>
            <Text style={styles.removeBtnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.storeName}>MY STORE</Text>
        <Text style={styles.title}>Your Cart</Text>
        <Text style={styles.headerSubtitle}>
          {cartCount} item{cartCount === 1 ? '' : 's'} · orders sync with web when signed in
        </Text>
      </View>

      {cart.length === 0 ? (
        <View style={styles.emptyCart}>
          <Text style={styles.emptyCartText}>Your cart is empty</Text>
          <Text style={styles.emptyCartHint}>Browse the shop and add items to get started</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Shop')}>
            <Text style={styles.shopBtnText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCartItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
          <View style={styles.footer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Items</Text>
              <Text style={styles.summaryValue}>{cartCount}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.summaryPrice}>₱{cartTotal.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.placeBtn, placing && styles.buttonDisabled]}
              onPress={placeOrder}
              disabled={placing}
            >
              {placing ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.placeBtnText}>Proceed to Checkout</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    margin: spacing.md,
    ...shadows.sm,
  },
  storeName: {
    ...typography.caption,
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  cartItem: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cartItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cartItemImageWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productEmoji: {
    fontSize: 28,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  cartItemPrice: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cartItemTotal: {
    ...typography.bodyBold,
    color: colors.primary,
    marginTop: 2,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  qtyBtnText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
  qtyText: {
    ...typography.body,
    color: colors.textPrimary,
    minWidth: 30,
    textAlign: 'center',
  },
  removeBtn: {
    backgroundColor: colors.error + '10',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  removeBtnText: {
    ...typography.caption,
    color: colors.error,
  },
  footer: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: 80,
    ...shadows.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  summaryPrice: {
    ...typography.heading,
    color: colors.primary,
    fontWeight: 'bold',
  },
  placeBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  placeBtnText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
  emptyCart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyCartText: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyCartHint: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  shopBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  shopBtnText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
