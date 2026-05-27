import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Layout from '@/components/Layout'
import MobileLayout from '@/components/MobileLayout'
import { useState, useEffect } from 'react'

function ResponsiveLayout() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile) return <MobileLayout />
  return <Layout />
}
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import ActivationPending from '@/pages/ActivationPending'
import ActivateAccount from '@/pages/ActivateAccount'
import AdminDashboard from '@/pages/AdminDashboard'
import CustomerDashboard from '@/pages/CustomerDashboard'
import OwnerDashboard from '@/pages/OwnerDashboard'
import Orders from '@/pages/Orders'
import CreateOrder from '@/pages/CreateOrder'
import OrderDetail from '@/pages/OrderDetail'
import Customers from '@/pages/Customers'
import Users from '@/pages/Users'
import ProductsPage from '@/pages/ProductsPage'
import Profile from '@/pages/Profile'
import ApplyForOwner from '@/pages/ApplyForOwner'


function PrivateRoute({ children, roles }) {
  const { user, authChecked } = useAuth()
  const hasToken = Boolean(localStorage.getItem('access_token'))
  const role = user?.role === 'user' ? 'customer' : user?.role
  if (!authChecked) return null // Will show loading from App
  if (!user && !hasToken) return <Navigate to="/login" replace />
  if (user && roles && !roles.includes(role)) return <Navigate to="/dashboard" replace />
  return children
}

// ── Dashboard Router ─────────────────────────────────────────
function DashboardComponent() {
    const { user } = useAuth()
    const role = user?.role === 'user' ? 'customer' : user?.role
    if (role === 'admin')  return <AdminDashboard />
    if (role === 'owner')  return <OwnerDashboard />
    return <CustomerDashboard />
  }

export default function App() {
  const { user, authChecked } = useAuth()

  // Show loading while checking authentication
  if (!authChecked) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <Routes>
       {/* Auth Routes */}
       <Route path="/activation-pending" element={<ActivationPending />} />
       <Route path="/activate/:uid/:token" element={<ActivateAccount />} />
       <Route path="/reset-password/:userId/:token" element={<ResetPassword />} />
      <Route path="/reset-password/:userId/:token/" element={<ResetPassword />} />
       <Route path="/forgot-password" element={<ForgotPassword />} />
         <Route path="/login"    element={!authChecked ? null : (!user ? 
           <Login /> 
           : <Navigate to="/profile" replace />)} />
         <Route path="/register" element={!authChecked ? null : (!user ? 
           <Register /> 
           : <Navigate to="/profile" replace />)} />

      {/* Protected Routes */}
      <Route path="/" element={<PrivateRoute><ResponsiveLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/profile" replace />} />

        {/* Dashboard - role-based */}
        <Route path="dashboard" element={<DashboardComponent />} />

        {/* Orders - all authenticated users */}
        <Route path="orders" element={
          <PrivateRoute><Orders /></PrivateRoute>
        } />

        {/* Create Order - Admin only (customers use cart instead) */}
        <Route path="orders/create" element={
          <PrivateRoute roles={['admin']}><CreateOrder /></PrivateRoute>
        } />

        {/* Order Detail - all authenticated users */}
        <Route path="orders/:id" element={
          <PrivateRoute><OrderDetail /></PrivateRoute>
        } />

{/* Customers/Users - Admin only */}
         <Route path="customers" element={
           <PrivateRoute roles={['admin']}><Customers /></PrivateRoute>
         } />

         {/* Users Management - Admin only */}
         <Route path="users" element={
           <PrivateRoute roles={['admin']}><Users /></PrivateRoute>
         } />

          {/* Products - Admin and Owner only */}
          <Route path="products" element={
            <PrivateRoute roles={['admin', 'owner']}><ProductsPage /></PrivateRoute>
          } />

        {/* Profile - all authenticated users */}
        <Route path="profile" element={
          <PrivateRoute><Profile /></PrivateRoute>
        } />

        {/* Apply for Owner - customers only */}
        <Route path="apply-owner" element={
          <PrivateRoute><ApplyForOwner /></PrivateRoute>
        } />

        {/* Admin & Owner Routes (duplicate removed) */}
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/profile" replace />} />
    </Routes>
  )
}