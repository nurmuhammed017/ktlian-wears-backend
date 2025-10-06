import { eq, and, desc, /* asc, */ sql, count } from 'drizzle-orm';
import { db } from './index';
import {
  users,
  orders,
  orderItems,
  cartItems,
  products,
  type Order,
  type NewOrder,
  // type OrderItem,
  type NewOrderItem,
  // type CartItem,
  type NewCartItem,
  // type Product,
  type NewProduct,
} from './schema';

// ============================================================================
// ORDER QUERIES
// ============================================================================

export async function createOrder(orderData: NewOrder, orderItemsData: Omit<NewOrderItem, 'orderId'>[]) {
  return await db.transaction(async (tx) => {
    // Create the order
    const [order] = await tx.insert(orders).values(orderData).returning();
    
    // Create order items
    const items = await tx.insert(orderItems).values(
      orderItemsData.map(item => ({ ...item, orderId: order.id }))
    ).returning();
    
    return { order, items };
  });
}

export async function getOrderById(orderId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId));
  
  return order;
}

export async function getOrderWithDetails(orderId: string) {
  const order = await getOrderById(orderId);
  if (!order) return null;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return {
    ...order,
    items,
  };
}

export async function getOrdersByUserId(userId: string, limit = 10, offset = 0) {
  const ordersList = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  return ordersList;
}

export async function getOrdersCountByUserId(userId: string) {
  const [{ value }] = await db
    .select({ value: count() })
    .from(orders)
    .where(eq(orders.userId, userId));
  
  return value;
}

export async function updateOrderStatus(orderId: string, status: Order['status']) {
  const [order] = await db
    .update(orders)
    .set({ 
      status, 
      updatedAt: new Date() 
    })
    .where(eq(orders.id, orderId))
    .returning();
  
  return order;
}

export async function updateOrderPaymentStatus(orderId: string, paymentStatus: string, paymentProvider?: string, paymentProviderId?: string) {
  const [order] = await db
    .update(orders)
    .set({ 
      paymentStatus, 
      paymentProvider,
      paymentProviderId,
      updatedAt: new Date() 
    })
    .where(eq(orders.id, orderId))
    .returning();
  
  return order;
}

export async function getOrderByOrderNumber(orderNumber: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber));
  
  return order;
}

export async function getOrderByPaymentProviderId(providerPaymentId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.paymentProviderId, providerPaymentId));
  
  return order;
}

// ============================================================================
// CART QUERIES
// ============================================================================

export async function getCartItemsByUserId(userId: string) {
  return await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      variantName: cartItems.variantName,
      createdAt: cartItems.createdAt,
      updatedAt: cartItems.updatedAt,
      product: {
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        originalPrice: products.originalPrice,
        images: products.images,
        category: products.category,
        slug: products.slug,
        inStock: products.inStock,
        variants: products.variants,
      }
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId))
    .orderBy(desc(cartItems.createdAt));
}

export async function addToCart(cartItemData: NewCartItem) {
  // Check if item already exists in cart
  const existingItem = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.userId, cartItemData.userId),
        eq(cartItems.productId, cartItemData.productId),
        eq(cartItems.variantName, cartItemData.variantName || '')
      )
    )
    .limit(1);

  if (existingItem.length > 0) {
    // Update quantity
    const [updatedItem] = await db
      .update(cartItems)
      .set({ 
        quantity: existingItem[0].quantity + (cartItemData.quantity || 1),
        updatedAt: new Date()
      })
      .where(eq(cartItems.id, existingItem[0].id))
      .returning();
    
    return updatedItem;
  } else {
    // Create new cart item
    const [newItem] = await db
      .insert(cartItems)
      .values(cartItemData)
      .returning();
    
    return newItem;
  }
}

export async function updateCartItemQuantity(cartItemId: string, quantity: number) {
  const [cartItem] = await db
    .update(cartItems)
    .set({ 
      quantity, 
      updatedAt: new Date() 
    })
    .where(eq(cartItems.id, cartItemId))
    .returning();
  
  return cartItem;
}

export async function removeFromCart(cartItemId: string) {
  await db
    .delete(cartItems)
    .where(eq(cartItems.id, cartItemId));
}

export async function clearUserCart(userId: string) {
  await db
    .delete(cartItems)
    .where(eq(cartItems.userId, userId));
}

export async function getCartItemCount(userId: string) {
  const [{ value }] = await db
    .select({ value: count() })
    .from(cartItems)
    .where(eq(cartItems.userId, userId));
  
  return value;
}

// ============================================================================
// PRODUCT QUERIES
// ============================================================================

export async function createProduct(productData: NewProduct) {
  const [product] = await db
    .insert(products)
    .values(productData)
    .returning();
  
  return product;
}

export async function getProductById(productId: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId));
  
  return product;
}

export async function getProductBySlug(slug: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug));
  
  return product;
}

export async function getProducts(limit = 20, offset = 0) {
  return await db
    .select()
    .from(products)
    .orderBy(desc(products.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getProductsByCategory(category: string, limit = 20, offset = 0) {
  return await db
    .select()
    .from(products)
    .where(eq(products.category, category))
    .orderBy(desc(products.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function searchProducts(query: string, limit = 20, offset = 0) {
  return await db
    .select()
    .from(products)
    .where(sql`${products.name} ILIKE ${`%${query}%`} OR ${products.description} ILIKE ${`%${query}%`}`)
    .orderBy(desc(products.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function updateProduct(productId: string, productData: Partial<NewProduct>) {
  const [product] = await db
    .update(products)
    .set({ 
      ...productData, 
      updatedAt: new Date() 
    })
    .where(eq(products.id, productId))
    .returning();
  
  return product;
}

export async function deleteProduct(productId: string) {
  await db
    .delete(products)
    .where(eq(products.id, productId));
}

// ============================================================================
// UTILITY QUERIES
// ============================================================================

export async function generateOrderNumber(): Promise<string> {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export async function checkProductStock(productId: string, variantName?: string, quantity = 1): Promise<boolean> {
  const product = await getProductById(productId);
  if (!product) return false;

  if (variantName && product.variants) {
    const variant = product.variants.find(v => v.name === variantName);
    return variant ? (variant.inStock ?? true) && quantity <= 999 : false;
  } else {
    return (product.inStock ?? true) && quantity <= 999;
  }
}

export async function getUserWithOrders(userId: string) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user.length) return null;

  const userOrders = await getOrdersByUserId(userId);
  
  return {
    ...user[0],
    orders: userOrders,
  };
}

// ============================================================================
// USER QUERIES (if needed for authentication)
// ============================================================================

export async function createUser(userData: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }) {
  const [user] = await db
    .insert(users)
    .values(userData)
    .returning();
  
  return user;
}

export async function getUserById(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));
  
  return user;
}

export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
  
  return user;
}

export async function updateUser(userId: string, userData: Partial<{ firstName: string; lastName: string; phone: string; role: string }>) {
  const [user] = await db
    .update(users)
    .set({ 
      ...userData, 
      updatedAt: new Date() 
    })
    .where(eq(users.id, userId))
    .returning();
  
  return user;
}

export async function updateUserPassword(userId: string, password: string) {
  const [user] = await db
    .update(users)
    .set({ 
      password,
      updatedAt: new Date() 
    })
    .where(eq(users.id, userId))
    .returning();
  
  return user;
}

export async function deleteUser(userId: string) {
  await db
    .delete(users)
    .where(eq(users.id, userId));
}

// Role-related functions
export async function updateUserRole(userId: string, role: 'customer' | 'admin' | 'super_admin') {
  const [user] = await db
    .update(users)
    .set({ 
      role,
      updatedAt: new Date() 
    })
    .where(eq(users.id, userId))
    .returning();
  
  return user;
}

export async function getUsersByRole(role: 'customer' | 'admin' | 'super_admin', limit = 20, offset = 0) {
  return await db
    .select()
    .from(users)
    .where(eq(users.role, role))
    .limit(limit)
    .offset(offset);
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId));
  
  return user?.role === 'admin' || user?.role === 'super_admin';
}

export async function isUserAdminByEmail(email: string): Promise<boolean> {
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.email, email));
  
  return user?.role === 'admin' || user?.role === 'super_admin';
}

export async function getAdminUsers(limit = 20, offset = 0) {
  return await db
    .select()
    .from(users)
    .where(sql`${users.role} IN ('admin', 'super_admin')`)
    .limit(limit)
    .offset(offset);
}
