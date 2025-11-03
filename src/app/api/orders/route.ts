import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionWithUser, getSessionToken } from '@/lib/auth/session';
import { 
  createOrder, 
  getOrdersByUserId, 
  getOrdersCountByUserId,
  generateOrderNumber,
  checkProductStock,
  getProductById
} from '@/lib/db/queries';

// Validation schemas
const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantName: z.string().optional(),
    quantity: z.number().int().positive().max(999),
  })).min(1),
  billingAddress: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    address1: z.string().min(1),
    address2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1),
    phone: z.string().optional(),
  }),
  shippingAddress: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    address1: z.string().min(1),
    address2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1),
    phone: z.string().optional(),
  }),
  notes: z.string().optional(),
  useSameAddressForShipping: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const token = await getSessionToken();
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const session = await getSessionWithUser(token);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get user's orders
    const orders = await getOrdersByUserId(session.user.id, limit, offset);
    const total = await getOrdersCountByUserId(session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const token = await getSessionToken();
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const session = await getSessionWithUser(token);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = createOrderSchema.parse(body);
    
    // Check if all items are in stock
    for (const item of validatedData.items) {
      const inStock = await checkProductStock(
        item.productId, 
        item.variantName, 
        item.quantity
      );
      
      if (!inStock) {
        return NextResponse.json(
          { error: 'One or more items are out of stock' },
          { status: 400 }
        );
      }
    }

    // Calculate order totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of validatedData.items) {
      const product = await getProductById(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 400 }
        );
      }

      let unitPrice = Number(product.price);
      let variant = null;

      if (item.variantName && product.variants) {
        variant = product.variants.find(v => v.name === item.variantName);
        if (variant && variant.price) {
          unitPrice = variant.price;
        }
      }

      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      // Create product snapshot for order item
      const productSnapshot = {
        name: product.name,
        description: product.description || undefined,
        images: product.images || undefined,
        category: product.category || undefined,
        variant: variant ? {
          name: variant.name,
          attributes: variant.attributes || {},
        } : undefined,
      };

      orderItems.push({
        productId: item.productId,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: unitPrice.toString(),
        totalPrice: totalPrice.toString(),
        productSnapshot,
      });
    }

    // Calculate tax and shipping (simplified for now)
    const tax = subtotal * 0.08; // 8% tax
    const shipping = subtotal > 100 ? 0 : 5.99; // Free shipping over $100
    const total = subtotal + tax + shipping;

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Prepare addresses
    const shippingAddress = validatedData.useSameAddressForShipping 
      ? validatedData.billingAddress 
      : validatedData.shippingAddress;

    // Create order
    const orderData = {
      userId: session.user.id,
      orderNumber,
      status: 'pending' as const,
      subtotal: subtotal.toString(),
      tax: tax.toString(),
      shipping: shipping.toString(),
      total: total.toString(),
      currency: 'USD',
      billingAddress: validatedData.billingAddress,
      shippingAddress,
      notes: validatedData.notes || null,
      metadata: {
        useSameAddressForShipping: validatedData.useSameAddressForShipping,
      },
    };

    const { order, items } = await createOrder(orderData, orderItems);

    return NextResponse.json({
      success: true,
      data: {
        order,
        items,
      },
      message: 'Order created successfully',
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error', 
          details: error.issues 
        },
        { status: 400 }
      );
    }

    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
