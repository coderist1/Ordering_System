import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import {
  fetchOrder,
  updateStatus,
  cancelOrder,
  deleteOrder,
  submitReview,
} from '../api/client'
import { Order } from '../types'
import { colors, radii, spacing, typography, shadows } from '../theme/design'

const NEXT_STATUS: Record<string, string | null> = {
  pending: 'processing',
  processing: 'shipped',
  shipped: 'completed',
  completed: null,
  cancelled: null,
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: colors.statusPending },
  processing: { label: 'Processing', color: colors.statusProcessing },
  shipped: { label: 'Shipped', color: colors.statusShipped },
  completed: { label: 'Completed', color: colors.statusCompleted },
  cancelled: { label: 'Cancelled', color: colors.statusCancelled },
}

export default function OrderDetailScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<any>()
  const route = useRoute<any>()

  const orderId: number = (route.params?.orderId ?? route.params?.id) as number

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [reviewRating, setReviewRating] = useState<number>(5)
  const [reviewComment, setReviewComment] = useState<string>('')
  const [reviewLoading, setReviewLoading] = useState(false)

  const userRole = user?.role || (user as any)?.profile?.role
  const isAdmin = userRole === 'admin'
  const isCustomer = userRole === 'customer' || userRole === 'user'
  const isMyOrder = (order as any)?.created_by_id === (user as any)?.id
  const canReview = isCustomer && isMyOrder && order?.status === 'completed' && !(order as any)?.review
  const hasReview = !!(order as any)?.review

  const nextStatus = useMemo(() => {
    const st = (order?.status || '').toLowerCase()
    return NEXT_STATUS[st] ?? null
  }, [order?.status])

  const currentStatusConfig = STATUS_CONFIG[order?.status?.toLowerCase() || 'pending'] || STATUS_CONFIG.pending

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchOrder(orderId)
      setOrder(res.data)
    } catch {
      setError('Order not found.')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    if (!orderId) return
    load()
  }, [load, orderId])

  const handleAdvance = async () => {
    if (!order || !nextStatus) return
    setUpdating(true)
    try {
      await updateStatus(order.id, nextStatus, `Order advanced to ${nextStatus}`)
      await load()
      Alert.alert('Success', `Order status updated to ${nextStatus}`)
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handleCancel = async () => {
    if (!order) return
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true)
            try {
              await cancelOrder(order.id)
              await load()
              Alert.alert('Success', 'Order cancelled successfully')
            } catch {
              Alert.alert('Error', 'Failed to cancel order')
            } finally {
              setCancelling(false)
            }
          }
        }
      ]
    )
  }

  const handleDelete = async () => {
    if (!order) return
    Alert.alert('Delete Order', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true)
          try {
            await deleteOrder(order.id)
            navigation.goBack()
          } catch {
            Alert.alert('Error', 'Failed to delete order')
          } finally {
            setDeleting(false)
          }
        },
      },
    ])
  }

  const submitReviewAction = async () => {
    if (!order) return
    setReviewLoading(true)
    try {
      await submitReview(order.id, { rating: reviewRating, comment: reviewComment })
      Alert.alert('Success', 'Thank you for your review!')
      setReviewComment('')
      await load()
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to submit review')
    } finally {
      setReviewLoading(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || 'Order not found'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const orderItems = (order as any).items || []
  const statusHistory = (order as any).status_history || []
  const review = (order as any).review

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.orderNumber}>Order #{order.order_number || order.id}</Text>
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, { borderLeftColor: currentStatusConfig.color }]}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.statusLabel}>Current Status</Text>
              <Text style={[styles.statusValue, { color: currentStatusConfig.color }]}>
                {currentStatusConfig.label}
              </Text>
            </View>
          </View>
          
          {isAdmin && nextStatus && (
            <TouchableOpacity
              style={[styles.actionButton, updating && styles.buttonDisabled]}
              onPress={handleAdvance}
              disabled={updating}
            >
              <Text style={styles.actionButtonText}>
                {updating ? 'Processing...' : `Mark as ${nextStatus?.toUpperCase()}`}
              </Text>
            </TouchableOpacity>
          )}

          {isCustomer && order.status === 'pending' && isMyOrder && (
            <TouchableOpacity
              style={[styles.cancelButton, cancelling && styles.buttonDisabled]}
              onPress={handleCancel}
              disabled={cancelling}
            >
              <Text style={styles.cancelButtonText}>
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </Text>
            </TouchableOpacity>
          )}

          {isAdmin && (
            <TouchableOpacity
              style={[styles.deleteButton, deleting && styles.buttonDisabled]}
              onPress={handleDelete}
              disabled={deleting}
            >
              <Text style={styles.deleteButtonText}>
                {deleting ? 'Deleting...' : 'Delete Order'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Customer Info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Customer Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{(order as any).customer_name || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{(order as any).customer_email || '—'}</Text>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.itemsCard}>
          <Text style={styles.cardTitle}>Order Items</Text>
          {orderItems.map((item: any, index: number) => (
            <View key={item.id || index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product_name || item.product || 'Product'}</Text>
                <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>₱{Number(item.subtotal || item.unit_price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₱{Number((order as any).total_amount || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* Status History */}
        {statusHistory.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.cardTitle}>Order Timeline</Text>
            {statusHistory.map((history: any, index: number) => (
              <View key={history.id || index} style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                {index < statusHistory.length - 1 && <View style={styles.timelineLine} />}
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStatus}>
                    {history.from_status ? `${history.from_status} → ${history.to_status}` : `Order ${history.to_status}`}
                  </Text>
                  <Text style={styles.timelineDate}>
                    {new Date(history.changed_at).toLocaleString()}
                  </Text>
                  {history.note && <Text style={styles.timelineNote}>{history.note}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Review Section */}
        {(canReview || hasReview) && (
          <View style={styles.reviewCard}>
            <Text style={styles.cardTitle}>
              {hasReview ? 'Your Review' : 'Leave a Review'}
            </Text>
            
            {hasReview ? (
              <View>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Text key={star} style={[styles.star, star <= (review?.rating || 0) && styles.starFilled]}>
                      *
                    </Text>
                  ))}
                </View>
                {review?.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
              </View>
            ) : canReview ? (
              <View>
                <Text style={styles.reviewLabel}>Rating</Text>
                <View style={styles.starsPicker}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                      <Text style={[styles.starPick, star <= reviewRating && styles.starFilled]}>
                        *
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.reviewLabel}>Comment (optional)</Text>
                <TextInput
                  style={styles.reviewInput}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  placeholder="Share your experience..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.submitReviewButton, reviewLoading && styles.buttonDisabled]}
                  onPress={submitReviewAction}
                  disabled={reviewLoading}
                >
                  <Text style={styles.submitReviewText}>
                    {reviewLoading ? 'Submitting...' : 'Submit Review'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backButtonText: {
    ...typography.body,
    color: colors.primary,
  },
  orderNumber: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  statusCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    ...shadows.sm,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statusLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusValue: {
    ...typography.heading,
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  actionButtonText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
  cancelButton: {
    backgroundColor: colors.error + '10',
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  cancelButtonText: {
    ...typography.bodyBold,
    color: colors.error,
  },
  deleteButton: {
    backgroundColor: colors.error + '10',
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  deleteButtonText: {
    ...typography.bodyBold,
    color: colors.error,
  },
  infoCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    ...typography.body,
    color: colors.textSecondary,
    width: 80,
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  itemsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  itemQuantity: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemPrice: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  totalLabel: {
    ...typography.subheading,
    color: colors.textSecondary,
  },
  totalValue: {
    ...typography.title,
    color: colors.primary,
    fontWeight: 'bold',
  },
  historyCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
    marginTop: 4,
  },
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 20,
    bottom: -20,
    width: 2,
    backgroundColor: colors.borderLight,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  timelineDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timelineNote: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  star: {
    fontSize: 32,
    color: colors.borderLight,
    marginRight: 4,
  },
  starFilled: {
    color: colors.warning,
  },
  starPick: {
    fontSize: 40,
    color: colors.borderLight,
    marginRight: 8,
  },
  starsPicker: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  reviewLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  reviewInput: {
    backgroundColor: colors.bgPrimary,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reviewComment: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  submitReviewButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitReviewText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})