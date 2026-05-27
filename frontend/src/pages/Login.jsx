import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import ChatbotWidget from '@/components/ChatbotWidget'
import { getApiErrorMessage } from '@/api/getApiErrorMessage'

export default function Login() {
  const { login: loginUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await loginUser(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Login failed.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-visual-refresh">
      <div className="visual-form">
        <div className="brand-logo">
          <span className="logo-sparkle">✨</span> AMU Bowls
        </div>

        <div className="text-header">
          <h2>Welcome Back</h2>
          <p>Log in to continue managing your orders and account.</p>
        </div>

        {error && <div className="error-pill">{error}</div>}

        <form onSubmit={submit}>
          <div className="input-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              className="capsule-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              className="capsule-input"
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="footer-link" style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '16px' }}>
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          <button type="submit" className="capsule-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Log In'}
          </button>
        </form>

        <div className="footer-link">
          Don't have an account? <Link to="/register">Create Account</Link>
        </div>
      </div>

      <div className="image-section">
        <img
          src="/gift-box-reg.jpeg"
          alt="AMU Bowls welcome visual"
          className="cover-image"
        />
        <div className="image-overlay">
          <h3>Welcome Back</h3>
          <p>Pick up where you left off and keep things moving.</p>
        </div>
      </div>
      <ChatbotWidget />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');

        .register-visual-refresh {
          display: flex;
          height: 100vh;
          min-height: 100dvh;
          width: 100vw;
          font-family: 'Poppins', sans-serif;
          background: #fff;
          overflow-x: hidden;
        }

        .visual-form {
          flex: 1;
          padding: 60px 80px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-width: 600px;
          margin: 0 auto;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          animation: slideInLeft 0.6s ease-out;
        }

        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .brand-logo {
          font-size: 24px;
          font-weight: 700;
          color: #333;
          margin-bottom: 40px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo-sparkle { color: var(--accent); }

        .text-header h2 {
          font-size: 32px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 10px;
        }

        .text-header p {
          color: #666;
          font-size: 15px;
          margin-bottom: 30px;
        }

        .error-pill {
          background: #fee2e2;
          color: #ef4444;
          padding: 10px 15px;
          border-radius: 20px;
          font-size: 13px;
          margin-bottom: 20px;
          text-align: center;
          font-weight: 500;
        }

        .input-group {
          margin-bottom: 20px;
        }

        .input-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #333;
          margin-bottom: 8px;
          margin-left: 10px;
        }

        .capsule-input {
          width: 100%;
          padding: 14px 24px;
          border-radius: 50px;
          border: 2px solid #eee;
          background: #f9f9f9;
          font-size: 14px;
          outline: none;
          transition: all 0.3s ease;
        }

          .capsule-input:focus {
          border-color: var(--accent);
          background: #fff;
          box-shadow: 0 4px 12px rgba(228, 64, 95, 0.1);
        }

        .capsule-btn {
          width: 100%;
          padding: 16px;
          border-radius: 50px;
          border: none;
          background: #1a1a1a;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 10px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .capsule-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
          background: #000;
        }

        .capsule-btn:disabled {
          background: #ccc;
          transform: none;
          cursor: not-allowed;
        }

        .footer-link {
          text-align: center;
          margin-top: 30px;
          font-size: 14px;
          color: #666;
        }

          .footer-link a {
          color: var(--accent);
          text-decoration: none;
          font-weight: 600;
          margin-left: 5px;
        }

        .footer-link a:hover {
          text-decoration: underline;
        }

        .image-section {
          flex: 1;
          position: relative;
          background: #f0f0f0;
          overflow: hidden;
          display: none;
        }

        @media (min-width: 900px) {
          .image-section { display: block; }
        }

        .cover-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 10s ease;
        }

        .image-section:hover .cover-image {
          transform: scale(1.05);
        }

        .image-overlay {
          position: absolute;
          bottom: 60px;
          left: 60px;
          right: 60px;
          color: white;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3);
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 30px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .image-overlay h3 {
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .image-overlay p {
          font-size: 16px;
          opacity: 0.9;
        }

        @media (max-width: 900px) {
          .visual-form { padding: 40px 30px; }
        }

        @media (max-width: 640px) {
          .visual-form { padding: 30px 22px; }
          .text-header h2 { font-size: 28px; }
          .brand-logo { margin-bottom: 30px; }
        }

        @media (max-width: 480px) {
          .visual-form { padding: 24px 18px; }
          .text-header p { font-size: 14px; }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  )
}