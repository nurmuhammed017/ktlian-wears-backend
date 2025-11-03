import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getProductById, getProductBySlug, updateProduct, deleteProduct } from '@/lib/db/queries';

// Validation schema for updating products
const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{2})?$/).optional(),
  originalPrice: z.string().regex(/^\d+(\.\d{2})?$/).optional(),
  images: z.array(z.string().url()).optional(),
  category: z.string().optional(),
  slug: z.string().min(1).optional(),
  inStock: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  rating: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  reviewCount: z.number().min(0).optional(),
  variants: z.array(z.object({
    name: z.string(),
    price: z.number().optional(),
    inStock: z.boolean().optional(),
    attributes: z.record(z.string(), z.string()).optional()
  })).optional()
});

// GET /api/products/[id] - Get single product by ID or slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let product = null;

    // Check if id is a UUID (contains hyphens and is 36 chars) or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    if (isUUID) {
      // Try to get product by ID first
      try {
        product = await getProductById(id);
      } catch (error) {
        // If ID lookup fails, product stays null
        console.warn('Product lookup by ID failed:', error);
      }
    }
    
    if (!product) {
      // Try to get by slug
      try {
        product = await getProductBySlug(id);
      } catch (error) {
        // If slug lookup fails, product stays null
        console.warn('Product lookup by slug failed:', error);
      }
    }

    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Product not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch product',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if product exists
    const existingProduct = await getProductById(id);
    if (!existingProduct) {
      return NextResponse.json({
        success: false,
        error: 'Product not found'
      }, { status: 404 });
    }

    // Validate input
    const validationResult = updateProductSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.issues
      }, { status: 400 });
    }

    // Update product in database
    const updatedProduct = await updateProduct(id, validationResult.data);

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });

  } catch (error) {
    console.error('Error updating product:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return NextResponse.json({
          success: false,
          error: 'Product with this slug already exists'
        }, { status: 409 });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update product',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if product exists
    const existingProduct = await getProductById(id);
    if (!existingProduct) {
      return NextResponse.json({
        success: false,
        error: 'Product not found'
      }, { status: 404 });
    }

    // Delete product from database
    await deleteProduct(id);

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete product',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
