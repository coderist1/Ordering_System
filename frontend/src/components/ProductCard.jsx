import { useState } from 'react'

const BADGE_STYLES = {
  New: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  'Best Seller': { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  Popular: { bg: '#F3EEFF', color: '#7C3AED', border: '#DDD6FE' },
}

const CATEGORY_COLORS = {
  Electronics: '#6366F1',
  Beauty: '#EC4899',
  Fitness: '#10B981',
  Gifts: '#F59E0B',
  Kitchen: '#EF4444',
  Others: '#8B5CF6',
}

function badgeStyle(label) {
  return BADGE_STYLES[label] || { bg: '#F3EEFF', color: '#7C3AED', border: '#DDD6FE' }
}

export default function ProductCard({
  product,
  variant = 'shop',
  index = 0,
  inCart,
  onAddToCart,
  onUpdateQty,
  onEdit,
  onDelete,
}) {
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)

  const imageSrc = product?.image || product?.image_url
  const showImage = imageSrc && !imgError
  const categoryColor = CATEGORY_COLORS[product.category] || CATEGORY_COLORS.Others
  const badge = badgeStyle(product.badge)

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        borderRadius: 20,
        border: `1.5px solid ${product.is_active === false ? '#FECACA' : '#F0EBFF'}`,
        boxShadow: hovered
          ? '0 16px 40px rgba(124, 58, 237, 0.14)'
          : '0 2px 12px rgba(124, 58, 237, 0.06)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        opacity: product.is_active === false ? 0.72 : 1,
        animation: 'productCardIn 0.45s ease both',
        animationDelay: `${index * 45}ms`,
      }}
    >
      <style>{`
        @keyframes productCardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Image */}
      <div style={{
        position: 'relative',
        aspectRatio: '4 / 3',
        background: `linear-gradient(145deg, #F8F5FF 0%, #EDE9FE 100%)`,
        overflow: 'hidden',
      }}>
        {showImage ? (
          <img
            src={imageSrc}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.35s ease',
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 56,
          }}>
            {product.emoji || '📦'}
          </div>
        )}

        {/* Category pill */}
        <span style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(6px)',
          color: categoryColor,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          padding: '5px 10px',
          borderRadius: 999,
          border: `1px solid ${categoryColor}22`,
        }}>
          {product.category}
        </span>

        {/* Badge */}
        {product.badge && (
          <span style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.border}`,
            fontSize: 10,
            fontWeight: 800,
            padding: '5px 10px',
            borderRadius: 999,
          }}>
            {product.badge}
          </span>
        )}

        {product.is_active === false && (
          <span style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            background: '#FEF2F2',
            color: '#DC2626',
            fontSize: 10,
            fontWeight: 800,
            padding: '5px 10px',
            borderRadius: 999,
            border: '1px solid #FECACA',
          }}>
            Inactive
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '16px 16px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 800,
          color: '#2D1F6E',
          lineHeight: 1.35,
          letterSpacing: '-0.01em',
        }}>
          {product.name}
        </h3>

        {product.description && (
          <p style={{
            margin: '8px 0 0',
            fontSize: 12,
            color: '#9B8FC0',
            lineHeight: 1.5,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            flex: 1,
          }}>
            {product.description}
          </p>
        )}

        {variant === 'manage' && product.created_by_username && (
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9B8FC0' }}>
            by <strong style={{ color: '#2D1F6E' }}>{product.created_by_username}</strong>
          </p>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid #F0EBFF',
        }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#7C3AED', letterSpacing: '-0.02em' }}>
            ₱{parseFloat(product.price).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '14px 16px 16px' }}>
        {variant === 'shop' ? (
          inCart ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#F8F5FF',
              borderRadius: 12,
              padding: 4,
              border: '1.5px solid #E0D8FF',
            }}>
              <button
                type="button"
                onClick={() => onUpdateQty?.(product.id, inCart.qty - 1)}
                style={qtyBtnStyle}
              >
                −
              </button>
              <span style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 14,
                fontWeight: 800,
                color: '#2D1F6E',
              }}>
                {inCart.qty} in cart
              </span>
              <button
                type="button"
                onClick={() => onUpdateQty?.(product.id, inCart.qty + 1)}
                style={qtyBtnStyle}
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddToCart?.(product)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #7C3AED, #9B6DFF)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.28)',
                transition: 'opacity 0.15s',
              }}
            >
              Add to Cart
            </button>
          )
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => onEdit?.(product)}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 10,
                border: '1.5px solid #E0D8FF',
                background: '#FAF8FF',
                color: '#7C3AED',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(product)}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 10,
                border: '1.5px solid #FECACA',
                background: '#FEF2F2',
                color: '#DC2626',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

const qtyBtnStyle = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: 'none',
  background: '#fff',
  color: '#7C3AED',
  fontWeight: 800,
  fontSize: 16,
  cursor: 'pointer',
  boxShadow: '0 1px 4px rgba(124, 58, 237, 0.12)',
  fontFamily: 'inherit',
}
