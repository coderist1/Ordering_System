export interface User {
  id: number;
  username: string;
  email: string;
  role: 'customer' | 'owner' | 'admin';
  first_name?: string;
  last_name?: string;
  profile_image?: string | null;
  address?: string | null;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: string | number;
  category: string;
  emoji?: string;
  badge?: string;
  image?: string;
  is_active: boolean;
  quantity?: number; // Optional for cart management
}

export interface OrderSummary {
  total_orders: number;
  total_revenue: string | number;
  completed_revenue: string | number;
  by_status: {
    pending: number;
    processing: number;
    shipped: number;
    completed: number;
  };
}

export interface Order {
  id: number;
  order_number: string;
  status: string;
  customer_name: string;
  customer_email: string;
  total: string | number;
  total_amount?: string | number;
  created_at: string;
}

export interface Notification {
  id: string;
  message: string;
  created_at: string;
}