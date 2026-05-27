import { useState, useEffect, useCallback } from 'react'
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '@/api/ordersApi'
import ProductCard from '@/components/ProductCard'

// ── Constants ────────────────────────────────────────────────────

const CATEGORIES = ['Electronics', 'Beauty', 'Fitness', 'Gifts', 'Kitchen', 'Others']
const BADGES     = ['', 'New', 'Best Seller', 'Popular']
const EMOJIS     = ['📦','🎁','🧴','🏋️','📷','☕','⌚','📱','💻','💄','🛒','🔧','🎮','📚','🎵']

// ── Shared input style ───────────────────────────────────────────

const inp = {
  width: '100%', padding: '10px 12px',
  border: '1.5px solid #e5e7eb', borderRadius: 10,
  fontSize: 13, fontFamily: 'inherit', outline: 'none',
  background: '#fafafa', color: '#111827',
  transition: 'border-color 0.15s, background 0.15s',
  boxSizing: 'border-box',
}

// ── Product Form Modal ───────────────────────────────────────────

function ProductModal({ product, onClose, onSaved }) {
  const isEdit = !!product?.id
  const emptyForm = { name: '', description: '', price: '', category: 'Others', emoji: '📦', badge: '', image_url: '', is_active: true }
  const [form, setForm] = useState(
    product || emptyForm
  )
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(product?.image || '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    setForm(product || emptyForm)
    setImageFile(null)
    setImagePreview(product?.image || product?.image_url || '')
    return () => {
      if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product])

  const onPickImage = (file) => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : (form.image_url || product?.image || product?.image_url || ''))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.price || parseFloat(form.price) < 0) { setError('Valid price is required'); return }
    setSaving(true); setError('')
    try {
      const payload = imageFile ? new FormData() : { ...form }
      if (imageFile) {
        Object.entries(form).forEach(([key, value]) => {
          if (value !== undefined && value !== null) payload.append(key, String(value))
        })
        payload.append('image', imageFile)
      }

      isEdit ? await updateProduct(product.id, payload) : await createProduct(payload)
      onSaved(); onClose()
    } catch (err) {
      const d = err.response?.data
      setError(d ? Object.values(d).flat().join(', ') : 'Failed to save product.')
      setSaving(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', zIndex: 300, backdropFilter: 'blur(3px)' }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '100%', maxWidth: 520,
        background: '#fff', borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        zIndex: 301, overflow: 'hidden',
        animation: 'modalIn 0.2s ease',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
              {isEdit ? 'Edit Product' : 'Add New Product'}
            </h3>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {isEdit ? 'Update product details' : 'Create a product for your catalog'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              border: '1px solid #e5e7eb', background: '#f9fafb',
              cursor: 'pointer', fontSize: 16, color: '#6b7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >×</button>
        </div>

        <form onSubmit={submit} style={{ padding: '20px 24px 24px', maxHeight: '68vh', overflowY: 'auto' }}>
          {error && (
            <div style={{
              padding: '10px 14px', background: '#fef2f2', color: '#ef4444',
              borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 14,
            }}>{error}</div>
          )}

          {/* Emoji picker */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>
              Product Icon
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EMOJIS.map(em => (
                <button
                  key={em} type="button"
                  onClick={() => set('emoji', em)}
                  style={{
                    width: 38, height: 38, borderRadius: 8, fontSize: 18, cursor: 'pointer',
                    border: `2px solid ${form.emoji === em ? '#6C47FF' : '#e5e7eb'}`,
                    background: form.emoji === em ? '#EDEAFF' : '#fff',
                    transition: 'all 0.12s',
                  }}
                >{em}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>
              Product Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={e => onPickImage(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: 13 }}
            />
            {imagePreview && (
              <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#f9fafb' }}>
                <img
                  src={imagePreview}
                  alt="Product preview"
                  style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}
            <input
              style={{ ...inp, marginTop: 10 }}
              placeholder="Or paste image URL (https://...)"
              value={form.image_url || ''}
              onChange={e => {
                set('image_url', e.target.value)
                if (!imageFile) setImagePreview(e.target.value)
              }}
            />
          </div>

          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
              Product Name *
            </label>
            <input
              style={inp}
              placeholder="e.g. Gift Box, Smartwatch..."
              value={form.name}
              onChange={e => set('name', e.target.value)}
              onFocus={e => { e.target.style.borderColor = '#6C47FF'; e.target.style.background = '#fff' }}
              onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#fafafa' }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
              Description
            </label>
            <textarea
              style={{ ...inp, resize: 'vertical', minHeight: 68 }}
              placeholder="Short description..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              onFocus={e => { e.target.style.borderColor = '#6C47FF'; e.target.style.background = '#fff' }}
              onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#fafafa' }}
            />
          </div>

          {/* Price + Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                Price (₱) *
              </label>
              <input
                style={inp} type="number" min="0" step="0.01" placeholder="0.00"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                onFocus={e => { e.target.style.borderColor = '#6C47FF'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#fafafa' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                Category
              </label>
              <select
                style={{ ...inp, cursor: 'pointer' }}
                value={form.category}
                onChange={e => set('category', e.target.value)}
                onFocus={e => { e.target.style.borderColor = '#6C47FF' }}
                onBlur={e => { e.target.style.borderColor = '#e5e7eb' }}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Badge + Active */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                Badge
              </label>
              <select
                style={{ ...inp, cursor: 'pointer' }}
                value={form.badge}
                onChange={e => set('badge', e.target.value)}
                onFocus={e => { e.target.style.borderColor = '#6C47FF' }}
                onBlur={e => { e.target.style.borderColor = '#e5e7eb' }}
              >
                {BADGES.map(b => <option key={b} value={b}>{b || 'No badge'}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                Visibility
              </label>
              <button
                type="button"
                onClick={() => set('is_active', !form.is_active)}
                style={{
                  ...inp, cursor: 'pointer', fontWeight: 700,
                  color: form.is_active ? '#10B981' : '#6b7280',
                  borderColor: form.is_active ? '#10B981' : '#e5e7eb',
                  background: form.is_active ? '#ECFDF5' : '#fafafa',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {form.is_active ? '👁 Active' : '🚫 Inactive'}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div style={{ padding: 14, background: '#f9fafb', borderRadius: 12, marginBottom: 20, border: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Preview</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EDEAFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, border: '1px solid #ddd6fe' }}>
                {form.emoji || '📦'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{form.name || 'Product Name'}</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#6C47FF' }}>₱{parseFloat(form.price || 0).toFixed(2)}</p>
              </div>
              {form.badge && (
                <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: '#EDEAFF', color: '#6C47FF' }}>
                  {form.badge}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button" onClick={onClose}
              style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >Cancel</button>
            <button
              type="submit" disabled={saving}
              style={{ flex: 2, padding: 11, borderRadius: 10, border: 'none', background: saving ? '#EDEAFF' : 'linear-gradient(135deg, #6C47FF, #9B6DFF)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', boxShadow: saving ? 'none' : '0 4px 12px rgba(108,71,255,0.25)' }}
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ── Delete Confirmation Modal ────────────────────────────────────

function DeleteProductModal({ product, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false)

  const handle = async () => {
    setDeleting(true)
    try { await deleteProduct(product.id); onDeleted(); onClose() }
    catch { setDeleting(false) }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', zIndex: 300, backdropFilter: 'blur(3px)' }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '100%', maxWidth: 380,
        background: '#fff', borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        zIndex: 301, padding: 28,
        animation: 'modalIn 0.2s ease', textAlign: 'center',
      }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 24 }}>
          🗑️
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Delete Product?</h3>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 20 }}>
          Remove <strong style={{ color: '#111827' }}>{product.name}</strong> from your catalog? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >Cancel</button>
          <button
            onClick={handle} disabled={deleting}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: deleting ? '#fca5a5' : '#ef4444', color: '#fff', fontWeight: 700, fontSize: 13, cursor: deleting ? 'wait' : 'pointer', fontFamily: 'inherit' }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Products Page ────────────────────────────────────────────────

export default function ProductsPage() {
  const [products,   setProducts]  = useState([])
  const [loading,    setLoading]   = useState(true)
  const [toast,      setToast]     = useState('')
  const [addModal,   setAddModal]  = useState(false)
  const [editPrd,    setEditPrd]   = useState(null)
  const [delPrd,     setDelPrd]    = useState(null)

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadProducts = useCallback(() => {
    setLoading(true)
    fetchProducts()
      .then(r => setProducts(r.data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  return (
    <div className="owner-dashboard">
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 400,
          background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 12, padding: '12px 18px',
          fontSize: 13, fontWeight: 600, color: '#111827',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeUp 0.2s ease',
        }}>
          ✅ {toast}
        </div>
      )}

      {/* Page Header */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <div className="dashboard-subtitle">Owner · Products</div>
          <h1>Product Catalog 🏷️</h1>
          <p>Manage the products available to your customers</p>
        </div>
        <button
          onClick={() => setAddModal(true)}
          className="refresh-btn"
          style={{ background: 'linear-gradient(135deg, #6C47FF, #9B6DFF)', color: '#fff', border: 'none', fontWeight: 700 }}
        >
          + Add Product
        </button>
      </div>

      {/* Product Grid */}
      <div className="table-wrap">
        <div className="table-header">
          <div>
            <span className="table-title">All Products</span>
            <span className="table-title-sub"> — {products.length} product{products.length !== 1 ? 's' : ''}</span>
          </div>
          <button className="refresh-btn" onClick={loadProducts}>↻ Refresh</button>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <span>Loading products...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🏷️</div>
            <h3>No products yet</h3>
            <p>Add your first product so customers can browse and order</p>
            <button
              className="advance-btn"
              style={{ marginTop: 12, background: 'linear-gradient(135deg, #6C47FF, #9B6DFF)', color: '#fff', border: 'none' }}
              onClick={() => setAddModal(true)}
            >
              + Add First Product
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20, padding: 16 }}>
              {products.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  variant="manage"
                  index={i}
                  onEdit={setEditPrd}
                  onDelete={setDelPrd}
                />
              ))}
            </div>

            <div className="table-footer">
              <span>Showing {products.length} product{products.length !== 1 ? 's' : ''}</span>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {addModal && (
        <ProductModal
          product={null}
          onClose={() => setAddModal(false)}
          onSaved={() => { loadProducts(); notify('Product added!') }}
        />
      )}
      {editPrd && (
        <ProductModal
          product={editPrd}
          onClose={() => setEditPrd(null)}
          onSaved={() => { loadProducts(); notify('Product updated!') }}
        />
      )}
      {delPrd && (
        <DeleteProductModal
          product={delPrd}
          onClose={() => setDelPrd(null)}
          onDeleted={() => { loadProducts(); notify('Product deleted.') }}
        />
      )}
    </div>
  )
}