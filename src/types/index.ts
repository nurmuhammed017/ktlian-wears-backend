// Database types (imported from schema)
export type { 
  User, 
  NewUser, 
  Product,
  NewProduct,
  Order,
  NewOrder,
  OrderItem,
  NewOrderItem,
  CartItem as DBCartItem,
  NewCartItem
} from '@/lib/db/schema';

// ProductVariant type (defined in schema)
export type { ProductVariant } from '@/lib/db/schema';

// Frontend-compatible Product type (makes variants optional) - Temporarily disabled
/*
export interface FrontendProduct extends Omit<Product, 'variants'> {
  variants?: Product['variants'];
}
*/

// Extended types for frontend use
export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  product: import('@/lib/db/schema').Product;
  variant?: import('@/lib/db/schema').ProductVariant;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}

export interface CheckoutFormData {
  // Billing information
  billingFirstName: string;
  billingLastName: string;
  billingEmail: string;
  billingPhone: string;
  billingCompany?: string;
  billingAddress1: string;
  billingAddress2?: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
  billingCountry: string;

  // Shipping information
  shippingFirstName: string;
  shippingLastName: string;
  shippingCompany?: string;
  shippingAddress1: string;
  shippingAddress2?: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingPhone: string;

  // Payment information
  paymentMethodType: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  cardNumber?: string;
  cardExpiryMonth?: string;
  cardExpiryYear?: string;
  cardCvc?: string;
  cardName?: string;

  // Order information
  useSameAddressForShipping: boolean;
  savePaymentMethod: boolean;
  saveAddresses: boolean;
  notes?: string;
}

export interface CheckoutStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
}

export interface OrderSummary {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  items: CartItem[];
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  estimatedDays: string;
  description?: string;
}

export interface TaxRate {
  rate: number;
  amount: number;
  description: string;
}

// User role types
export type UserRole = 'customer' | 'admin' | 'super_admin';

// Order status types
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

// Payment status types
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';

// Address type
export type AddressType = 'billing' | 'shipping';

// Payment method types
export type PaymentMethodType = 'card' | 'paypal' | 'apple_pay' | 'google_pay';

// Card brand types
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'jcb' | 'diners_club';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ValidationError[];
}

// Category and Collection types (keeping existing ones)
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  children?: Category[];
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  products: import('@/lib/db/schema').Product[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  slug: string;
  inStock: boolean;
  variants?: import('@/lib/db/schema').ProductVariant[];
  tags: string[];
  rating?: number;
  reviewCount?: number;
} 