import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchOrders, fetchProducts, createOrder, cancelOrder } from '../api/ordersApi'
import ProductCard from '@/components/ProductCard'

// ── Color Palette ────────────────────────────────────────────────
const C = {
  primary:   '#7C3AED',
  primary2:  '#9B6DFF',
  softBg:    '#F3EEFF',
  softBg2:   '#EDEAFF',
  border:    '#F0EBFF',
  border2:   '#E0D8FF',
  dark:      '#2D1F6E',
  mid:       '#9B8FC0',
  light:     '#C4B8E8',
  white:     '#fff',
  pageBg:    '#FAF8FF',
  success:   '#10B981',
  successBg: '#ECFDF5',
  warn:      '#F59E0B',
  warnBg:    '#FFFBEB',
  red:       '#ef4444',
  redBg:     '#fef2f2',
}

const CATEGORIES = ['All', 'Electronics', 'Beauty', 'Fitness', 'Gifts', 'Kitchen', 'Others']

const STATUS_META = {
  pending:    { color: '#F59E0B', bg: '#FFFBEB', dot: '#F59E0B', label: 'Pending'    },
  processing: { color: '#6C47FF', bg: '#EDEAFF', dot: '#6C47FF', label: 'Processing' },
  shipped:    { color: '#9B6DFF', bg: '#F3EEFF', dot: '#9B6DFF', label: 'Shipped'    },
  completed:  { color: '#10B981', bg: '#ECFDF5', dot: '#10B981', label: 'Completed'  },
  cancelled:  { color: '#ef4444', bg: '#fef2f2', dot: '#ef4444', label: 'Cancelled'  },
}

// ── Shared section-container styles (mirrors OwnerDashboard .table-wrap) ──
const S = {
  // Outer card — same purpose as .table-wrap
  wrap: {
    background: '#fff',
    borderRadius: 20,
    border: '1.5px solid #F0EBFF',
    boxShadow: '0 2px 16px rgba(155,109,255,0.07)',
    overflow: 'visible',
  },
  // Top bar — mirrors .table-header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '1.5px solid #F0EBFF',
    background: '#FAF8FF',
    gap: 12,
    flexWrap: 'wrap',
  },
  // Section title — mirrors .table-title
  title: {
    fontSize: 14,
    fontWeight: 800,
    color: '#2D1F6E',
    letterSpacing: '-0.01em',
  },
  // Muted sub-count next to title — mirrors .table-title-sub
  titleSub: {
    fontSize: 12,
    fontWeight: 600,
    color: '#9B8FC0',
    marginLeft: 6,
  },
  // Body padding
  body: {
    padding: '20px',
  },
  // Footer bar — mirrors .table-footer
  footer: {
    padding: '10px 20px',
    borderTop: '1.5px solid #F0EBFF',
    background: '#FAF8FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 12,
    color: '#C4B8E8',
    fontWeight: 600,
  },
}

// ── Helpers ──────────────────────────────────────────────────────
function useCountUp(target, delay = 0) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    setVal(0)
    const t = setTimeout(() => {
      if (!target) return
      let cur = 0
      const step = Math.max(1, Math.ceil(target / 25))
      const iv = setInterval(() => {
        cur = Math.min(cur + step, target)
        setVal(cur)
        if (cur >= target) clearInterval(iv)
      }, 32)
      return () => clearInterval(iv)
    }, delay)
    return () => clearTimeout(t)
  }, [target, delay])
  return val
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

// ── StatusPill ───────────────────────────────────────────────────
function StatusPill({ status }) {
  const m = STATUS_META[status?.toLowerCase()] || STATUS_META.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: m.bg, color: m.color,
      padding: '4px 11px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  )
}

// ── StatCard ─────────────────────────────────────────────────────
function StatCard({ label, value, icon, delay, accentBg }) {
  const n = useCountUp(value, delay)
  return (
    <div
      style={{
        background: C.white, borderRadius: 18, padding: '20px 18px',
        border: `1.5px solid ${C.border}`,
        boxShadow: '0 2px 14px rgba(155,109,255,0.07)',
        position: 'relative', overflow: 'hidden',
        animation: 'fadeUp 0.5s ease both', animationDelay: `${delay}ms`,
        transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(155,109,255,0.14)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = '0 2px 14px rgba(155,109,255,0.07)' }}
    >
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 60, height: 60, background: accentBg || C.softBg,
        borderRadius: '0 18px 0 60px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
        padding: '8px 8px 0 0', fontSize: 16,
      }}>{icon}</div>
      <p style={{ fontSize: 10, fontWeight: 700, color: C.light, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 800, color: C.dark, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {typeof n === 'number' ? n.toLocaleString() : 0}
      </p>
    </div>
  )
}

// ── Cart Sidebar ─────────────────────────────────────────────────
function CartSidebar({ cart, onClose, onUpdateQty, onRemove, onPlaceOrder, placing }) {
  const total = cart.reduce((s, i) => s + (parseFloat(i?.price || 0) * (i?.qty || 0)), 0)

  const [confirmId, setConfirmId] = useState(null)

  return (
    <>
      {/* Background overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(45,31,110,0.18)',
          zIndex: 200,
          backdropFilter: 'blur(2px)'
        }}
      />

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 360,
          background: C.white,
          zIndex: 201,
          boxShadow: '-8px 0 40px rgba(124,58,237,0.15)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.25s ease',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 22px 16px',
          borderBottom: `1.5px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.dark }}>
            🛒 My Cart <span style={{ fontSize: 13, color: C.mid }}>({cart.length})</span>
          </h2>
          <button onClick={onClose} style={{
            background: C.softBg,
            border: 'none',
            borderRadius: 10,
            width: 32,
            height: 32,
            cursor: 'pointer'
          }}>✕</button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 22px' }}>
          {cart.length === 0 ? (
            <p style={{ textAlign: 'center' }}>Cart is empty</p>
          ) : cart.map(item => (
            <div key={item.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0',
              borderBottom: `1.5px solid ${C.border}`
            }}>
              <div style={{
                width: 48,
                height: 48,
                background: C.softBg,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {item.image ? (
                  <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <span style={{ fontSize: 24 }}>{item.emoji || '📦'}</span>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700 }}>{item.name}</p>
                <p style={{ color: C.primary }}>₱{parseFloat(item.price).toFixed(2)}</p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: C.softBg,
                borderRadius: 10,
                padding: '4px 6px'
              }}>
                <button
                  onClick={() => onUpdateQty(item.id, item.qty - 1)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    border: 'none',
                    background: '#fff',
                    color: C.primary,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                  }}
                >
                  −
                </button>

                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.dark,
                  minWidth: 18,
                  textAlign: 'center'
                }}>
                  {item.qty}
                </span>

                <button
                  onClick={() => onUpdateQty(item.id, item.qty + 1)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    border: 'none',
                    background: C.primary,
                    color: '#fff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(124,58,237,0.35)'
                  }}
                >
                  +
                </button>
              </div>

              {/* DELETE BUTTON */}
              <button
                onClick={() => setConfirmId(item.id)}
                style={{
                  background: C.redBg,
                  border: 'none',
                  borderRadius: 8,
                  width: 28,
                  height: 28,
                  cursor: 'pointer'
                }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div style={{ padding: '16px 22px', borderTop: `1.5px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span>Total</span>
              <span>₱{total.toFixed(2)}</span>
            </div>
            <button
                onClick={onPlaceOrder}
                disabled={placing}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 14,
                  border: 'none',
                  background: placing
                    ? C.light
                    : `linear-gradient(135deg, ${C.primary}, ${C.primary2})`,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: placing ? 'wait' : 'pointer',
                  boxShadow: placing
                    ? 'none'
                    : '0 6px 20px rgba(124,58,237,0.35)',
                  transition: 'all 0.2s'
                }}
              >
                {placing ? '⏳ Placing Order...' : '✅ Place Order'}
              </button>
          </div>
        )}
      </div>

      {/* ✅ MODAL */}
      {confirmId && (
  <>
    {/* Overlay */}
    <div
      onClick={() => setConfirmId(null)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 10, 40, 0.55)',
        backdropFilter: 'blur(6px)',
        zIndex: 300,
      }}
    />

    {/* Modal */}
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#fff',
        padding: '26px 24px',
        borderRadius: 20,
        zIndex: 301,
        width: 320,
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        animation: 'popIn 0.2s ease',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 46,
        height: 46,
        margin: '0 auto 12px',
        borderRadius: 14,
        background: '#FEE2E2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
      }}>
        🗑️
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: 16,
        fontWeight: 800,
        color: '#1F2937',
        marginBottom: 6,
      }}>
        Delete Item?
      </h3>

      {/* Description */}
      <p style={{
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 18,
      }}>
        Are you sure you want to remove this item from your cart? This cannot be undone.
      </p>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => setConfirmId(null)}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 10,
            border: '1px solid #E5E7EB',
            background: '#F9FAFB',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Cancel
        </button>

        <button
          onClick={() => {
            onRemove(confirmId)
            setConfirmId(null)
          }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 10,
            border: 'none',
            background: '#EF4444',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(239,68,68,0.35)',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  </>
)}
    </>
  )
}

// ── Main Component ───────────────────────────────────────────────
export default function CustomerDashboard() {
  const { user }   = useAuth()
  const navigate   = useNavigate()

  const [tab,      setTab]      = useState('shop')
  const [products, setProducts] = useState([])
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const [cart,         setCart]         = useState([])
  const [cartOpen,     setCartOpen]     = useState(false)
  const [placing,      setPlacing]      = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [toast,        setToast]        = useState('')

  // Load cart once on mount (avoid overwriting saved cart with [] on first render)
  useEffect(() => {
    const saved = localStorage.getItem('cart')
    if (!saved) return
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        setCart(parsed.filter(item => item && item.id != null && item.price != null))
      }
    } catch (e) {
      console.error('Failed to parse cart from local storage', e)
    }
  }, [])

  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('cart', JSON.stringify(cart))
    } else {
      localStorage.removeItem('cart')
    }
  }, [cart])

  const [category, setCategory] = useState('All')
  const [search,   setSearch]   = useState('')

  const [cancellingId, setCancellingId] = useState(null)

  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 4000) }

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true); setError(null)
    try {
      const [pRes, oRes] = await Promise.all([fetchProducts(), fetchOrders()])
      setProducts(pRes.data.products || [])
      setOrders(oRes.data.orders || [])
    } catch {
      setError('Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const stats = {
    total:     orders.length,
    pending:   orders.filter(o => o.status?.toLowerCase() === 'pending').length,
    shipped:   orders.filter(o => o.status?.toLowerCase() === 'shipped').length,
    completed: orders.filter(o => o.status?.toLowerCase() === 'completed').length,
  }

  const cartCount = cart.reduce((s, i) => s + (i?.qty || 0), 0)
  const cartTotal = cart.reduce((s, i) => s + (parseFloat(i?.price || 0) * (i?.qty || 0)), 0)

  const filteredProducts = products.filter(p =>
    (category === 'All' || p.category === category) &&
    (search === '' || p.name?.toLowerCase().includes(search.toLowerCase()))
  )

  const addToCart = (product) => {
    const normalized = { ...product, id: Number(product.id), qty: 1 }
    setCart(prev => {
      const existing = prev.find(i => Number(i.id) === normalized.id)
      if (existing) {
        return prev.map(i => Number(i.id) === normalized.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, normalized]
    })
    notify(`Added ${product.name} to cart`)
  }

  const updateQty = (id, qty) => {
    const numericId = Number(id)
    if (qty <= 0) setCart(prev => prev.filter(i => Number(i.id) !== numericId))
    else setCart(prev => prev.map(i => Number(i.id) === numericId ? { ...i, qty } : i))
  }

  const placeOrder = async () => {
    if (!cart.length) return
    setPlacing(true)
    try {
      await createOrder({
        customer_name:  user.username,
        customer_email: user.email || `${user.username}@customer.com`,
        items: cart.map(i => ({
          product_id:   i.id,
          product_name: i.name,
          quantity:     i.qty,
          unit_price:   parseFloat(i.price),
        })),
      })
      setCart([])
      setCartOpen(false)
      setOrderSuccess(true)
      setTimeout(() => setOrderSuccess(false), 4000)
      notify('Order placed successfully! 🎉')
      await load()
      setTab('orders')
    } catch (err) {
      const msg = err?.response?.data
        ? Object.values(err.response.data).flat().join(', ')
        : 'Failed to place order. Please try again.'
      notify(`Error: ${msg}`)
    } finally {
      setPlacing(false)
    }
  }

  const handleCancelOrder = async (orderId) => {
    setCancellingId(orderId)
    try {
      await cancelOrder(orderId)
      notify('Order cancelled successfully.')
      await load()
    } catch (err) {
      notify(err.response?.data?.detail || 'Failed to cancel order.')
    } finally {
      setCancellingId(null)
    }
  }

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  })()

  return (
    <>
      <style>{`
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin    { to   { transform:rotate(360deg) } }
        @keyframes slideIn { from { transform:translateX(100%) } to { transform:translateX(0) } }
        @keyframes popIn   { from { opacity:0; transform:scale(0.9) } to { opacity:1; transform:scale(1) } }
      `}</style>

      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14 }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: 20, right: 20, zIndex: 400,
            background: C.white, border: `1.5px solid ${C.border}`,
            borderRadius: 14, padding: '12px 18px',
            fontSize: 13, fontWeight: 600, color: C.dark,
            boxShadow: '0 8px 28px rgba(155,109,255,0.15)',
            display: 'flex', alignItems: 'center', gap: 8,
            animation: 'popIn 0.25s ease',
          }}>
            ✅ {toast}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12, animation: 'fadeUp 0.4s ease both' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.light, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>My Store</p>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.dark, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {greeting}, {user?.username || 'there'} 👋
            </h1>
            <p style={{ marginTop: 4, fontSize: 13, color: C.mid, fontWeight: 500 }}>Browse products, manage your cart and track orders.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={load} style={{ background: C.softBg, border: `1.5px solid ${C.border2}`, borderRadius: 12, padding: '9px 16px', color: C.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              ↻ Refresh
            </button>
            <button
              onClick={() => setCartOpen(true)}
              style={{
                background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`,
                border: 'none', borderRadius: 12, padding: '9px 18px',
                color: C.white, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
              }}
            >
              🛒 Cart
              {cartCount > 0 && (
                <span style={{ background: C.warn, color: C.white, borderRadius: '50%', width: 20, height: 20, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Order success banner */}
        {orderSuccess && (
          <div style={{ background: C.successBg, border: '1.5px solid #6EE7B7', borderRadius: 14, padding: '12px 18px', marginBottom: 18, color: '#065F46', fontSize: 13, fontWeight: 700, animation: 'popIn 0.3s ease' }}>
            ✅ Order placed successfully! You can track it in My Orders.
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#FFF0F0', border: '1.5px solid #FFD0CC', borderRadius: 14, padding: '12px 18px', marginBottom: 18, color: '#CC2200', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚠️ {error}
            <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.primary, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Retry</button>
          </div>
        )}

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 22 }}>
          <StatCard label="My Orders"  value={stats.total}     icon="📦" delay={60}  accentBg={C.softBg}    />
          <StatCard label="Pending"    value={stats.pending}   icon="⏳" delay={110} accentBg={C.warnBg}    />
          <StatCard label="Shipped"    value={stats.shipped}   icon="🚚" delay={160} accentBg={C.softBg2}   />
          <StatCard label="Completed"  value={stats.completed} icon="✅" delay={210} accentBg={C.successBg} />
          <StatCard label="Cart Items" value={cartCount}       icon="🛒" delay={260} accentBg={C.softBg}    />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: C.softBg, padding: 5, borderRadius: 14, width: 'fit-content' }}>
          {[{ key: 'shop', label: '🛍️ Shop' }, { key: 'orders', label: '📦 My Orders' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '9px 20px', borderRadius: 10, border: 'none',
              background: tab === t.key ? `linear-gradient(135deg, ${C.primary}, ${C.primary2})` : 'transparent',
              color: tab === t.key ? C.white : C.mid,
              fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
              boxShadow: tab === t.key ? '0 4px 12px rgba(124,58,237,0.25)' : 'none',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.primary2, animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: C.light, fontWeight: 600 }}>Loading…</span>
          </div>
        ) : (
          <>

            {/* ══════════════════════════════════════════════
                SHOP TAB — section-wrapped like OwnerDashboard
                ══════════════════════════════════════════════ */}
            {tab === 'shop' && (
              <div style={{ animation: 'fadeUp 0.4s ease both' }}>
                <div style={S.wrap}>

                  {/* ── Section header: title + search + category chips ── */}
                  <div style={S.header}>
                    {/* Left */}
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span style={S.title}>Products</span>
                      <span style={S.titleSub}>
                        {filteredProducts.length !== products.length
                          ? `${filteredProducts.length} of ${products.length}`
                          : `${products.length} available`}
                      </span>
                    </div>

                    {/* Right: search + filters */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: C.light, pointerEvents: 'none' }}>🔍</span>
                        <input
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Search…"
                          style={{
                            padding: '7px 12px 7px 30px', borderRadius: 10,
                            border: `1.5px solid ${C.border2}`, background: C.white,
                            fontSize: 12, color: C.dark, fontFamily: 'inherit',
                            outline: 'none', width: 155,
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {CATEGORIES.map(cat => (
                          <button key={cat} onClick={() => setCategory(cat)} style={{
                            padding: '5px 12px', borderRadius: 20, border: 'none',
                            background: category === cat
                              ? `linear-gradient(135deg, ${C.primary}, ${C.primary2})`
                              : C.softBg,
                            color: category === cat ? C.white : C.mid,
                            fontWeight: 700, fontSize: 11, cursor: 'pointer',
                            fontFamily: 'inherit', transition: 'all 0.15s',
                          }}>{cat}</button>
                        ))}
                        {(search || category !== 'All') && (
                          <button
                            onClick={() => { setSearch(''); setCategory('All') }}
                            style={{ padding: '5px 10px', borderRadius: 20, border: `1.5px solid ${C.border2}`, background: C.white, color: C.mid, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                          >✕ Clear</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Cart summary bar (inside container) ── */}
                  {cartCount > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 20px',
                      background: C.softBg2,
                      borderBottom: `1.5px solid ${C.border2}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15 }}>🛒</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>
                          {cartCount} item{cartCount !== 1 ? 's' : ''} in cart —{' '}
                          <strong style={{ color: C.primary }}>₱{cartTotal.toFixed(2)}</strong>
                        </span>
                      </div>
                      <button
                        onClick={() => setCartOpen(true)}
                        style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, color: C.white, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 10px rgba(124,58,237,0.25)' }}
                      >View Cart →</button>
                    </div>
                  )}

                  {/* ── Product grid body ── */}
                  <div style={S.body}>
                    {filteredProducts.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '50px 0' }}>
                        <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                        <p style={{ fontWeight: 600, color: C.light }}>
                          {products.length === 0 ? 'No products available yet.' : 'No products match your search.'}
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
                        {filteredProducts.map((product, i) => {
                          const inCart = cart.find(c => Number(c.id) === Number(product.id))
                          return (
                            <ProductCard
                              key={product.id}
                              product={product}
                              variant="shop"
                              index={i}
                              inCart={inCart}
                              onAddToCart={addToCart}
                              onUpdateQty={updateQty}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* ── Section footer ── */}
                  <div style={S.footer}>
                    <span style={S.footerText}>
                      {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                      {filteredProducts.length !== products.length ? ` (filtered from ${products.length})` : ' total'}
                    </span>
                    {cartCount > 0 && (
                      <button
                        onClick={() => setCartOpen(true)}
                        style={{ fontSize: 12, fontWeight: 700, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                      >View cart ({cartCount}) →</button>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                ORDERS TAB — section-wrapped like OwnerDashboard
                ══════════════════════════════════════════════ */}
            {tab === 'orders' && (
              <div style={{ animation: 'fadeUp 0.4s ease both' }}>
                <div style={S.wrap}>

                  {/* ── Section header: title + New Order button ── */}
                  <div style={S.header}>
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span style={S.title}>My Recent Orders</span>
                      <span style={S.titleSub}>{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
                    </div>
                    <button
                      onClick={() => setTab('shop')}
                      style={{
                        background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`,
                        border: 'none', borderRadius: 10, padding: '8px 16px',
                        color: C.white, fontWeight: 700, fontSize: 12,
                        cursor: 'pointer', fontFamily: 'inherit',
                        boxShadow: '0 3px 12px rgba(124,58,237,0.25)',
                      }}
                    >+ New Order</button>
                  </div>

                  {orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                      <p style={{ color: C.light, fontWeight: 600, marginBottom: 14 }}>No orders yet</p>
                      <button
                        onClick={() => setTab('shop')}
                        style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})`, border: 'none', borderRadius: 12, padding: '10px 22px', color: C.white, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                      >Start Shopping</button>
                    </div>
                  ) : (
                    <>
                      {/* Scrollable wrapper — prevents cancel column from being clipped */}
                      <div style={{ overflowX: 'auto' }}>

                      {/* Column headers */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: '130px 1fr 110px 130px 100px 110px',
                        padding: '9px 20px', gap: 12,
                        background: C.pageBg,
                        borderBottom: `1.5px solid ${C.border}`,
                        minWidth: 700,
                      }}>
                        {['Order #', 'Date', 'Total', 'Status', 'View', 'Cancel'].map(h => (
                          <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.light, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</span>
                        ))}
                      </div>

                      {/* Rows */}
                      {orders.map((o, i) => (
                        <div key={o.id} style={{
                          display: 'grid', gridTemplateColumns: '130px 1fr 110px 130px 100px 110px',
                          padding: '13px 20px', gap: 12, alignItems: 'center',
                          borderBottom: i < orders.length - 1 ? `1.5px solid ${C.pageBg}` : 'none',
                          animation: 'fadeUp 0.4s ease both', animationDelay: `${i * 40}ms`,
                          transition: 'background 0.15s', minWidth: 700,
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = C.pageBg}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>{o.order_number}</span>
                          <div>
                            <div style={{ fontSize: 12, color: C.mid }}>
                              {new Date(o.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div style={{ fontSize: 10, color: C.light, marginTop: 1 }}>{timeAgo(o.created_at)}</div>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>
                            ₱{parseFloat(o.total_amount || 0).toFixed(2)}
                          </span>
                          <StatusPill status={o.status} />
                          <button
                            onClick={() => navigate(`/orders/${o.id}`)}
                            style={{ background: C.softBg, border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: '5px 12px', color: C.primary, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = C.softBg2; e.currentTarget.style.borderColor = C.primary }}
                            onMouseLeave={e => { e.currentTarget.style.background = C.softBg;  e.currentTarget.style.borderColor = C.border2 }}
                          >View →</button>
                          {/* Cancel button — only for pending orders */}
                          {o.status === 'pending' ? (
                            <button
                              onClick={() => handleCancelOrder(o.id)}
                              disabled={cancellingId === o.id}
                              style={{
                                background: '#fef2f2', border: '1.5px solid #fecaca',
                                borderRadius: 10, padding: '5px 12px',
                                color: '#ef4444', fontWeight: 700, fontSize: 11,
                                cursor: cancellingId === o.id ? 'wait' : 'pointer',
                                fontFamily: 'inherit', transition: 'all 0.15s',
                                opacity: cancellingId === o.id ? 0.6 : 1,
                              }}
                              onMouseEnter={e => { if (cancellingId !== o.id) e.currentTarget.style.background = '#fee2e2' }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2' }}
                            >
                              {cancellingId === o.id ? '...' : '✕ Cancel'}
                            </button>
                          ) : (
                            <span />
                          )}
                        </div>
                      ))}

                      </div>{/* end scrollable wrapper */}
                    </>
                  )}

                  {/* ── Section footer ── */}
                  {orders.length > 0 && (
                    <div style={S.footer}>
                      <span style={S.footerText}>{orders.length} order{orders.length !== 1 ? 's' : ''} total</span>
                    </div>
                  )}

                </div>
              </div>
            )}

          </>
        )}
      </div>

      {cartOpen && (
        <CartSidebar
          cart={cart}
          onClose={() => setCartOpen(false)}
          onUpdateQty={updateQty}
          onRemove={id => setCart(prev => prev.filter(i => i.id !== id))}
          onPlaceOrder={placeOrder}
          placing={placing}
        />
      )}
    </>
  )
}