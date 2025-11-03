import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getProducts, createProduct, getProductsByCategory } from '@/lib/db/queries';
import type { NewProduct } from '@/lib/db/schema';

// Validation schema for creating products
const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{2})?$/, 'Price must be a valid decimal'),
  originalPrice: z.string().regex(/^\d+(\.\d{2})?$/, 'Original price must be a valid decimal').optional(),
  images: z.array(z.string().url()).min(1, 'At least one image is required'),
  category: z.string().optional(),
  slug: z.string().min(1, 'Slug is required'),
  inStock: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  rating: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Rating must be a valid decimal').optional(),
  reviewCount: z.number().min(0).default(0),
  variants: z.array(z.object({
    name: z.string(),
    price: z.number().optional(),
    inStock: z.boolean().optional(),
    attributes: z.record(z.string(), z.string()).optional()
  })).default([])
});

// GET /api/products - Get all products with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const inStock = searchParams.get('inStock');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    let products;
    let totalCount = 0;

    // Fetch products based on filters
    if (category && category !== 'All') {
      products = await getProductsByCategory(category, limit, offset);
      // For now, we'll use the length of returned products as total
      // In a real implementation, you'd have a separate count query
      totalCount = products.length;
    } else {
      products = await getProducts(limit, offset);
      totalCount = products.length;
    }

    // Apply additional filtering if needed (in a real app, this should be done in SQL)
    let filteredProducts = products;

    if (search) {
      filteredProducts = filteredProducts.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.description?.toLowerCase().includes(search.toLowerCase()) ||
        product.category?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (minPrice || maxPrice) {
      filteredProducts = filteredProducts.filter(product => {
        const price = parseFloat(product.price);
        if (minPrice && price < parseFloat(minPrice)) return false;
        if (maxPrice && price > parseFloat(maxPrice)) return false;
        return true;
      });
    }

    if (inStock === 'true') {
      filteredProducts = filteredProducts.filter(product => product.inStock);
    }

    // Sort products
    filteredProducts.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'price':
          aValue = parseFloat(a.price);
          bValue = parseFloat(b.price);
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'rating':
          aValue = parseFloat(a.rating || '0');
          bValue = parseFloat(b.rating || '0');
          break;
        default: // createdAt
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Calculate pagination info
    totalCount = filteredProducts.length;
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        products: filteredProducts,
        pagination: {
          page,
          limit,
          total: filteredProducts.length,
          totalPages,
          hasNextPage,
          hasPreviousPage
        },
        filters: {
          category,
          search,
          minPrice,
          maxPrice,
          inStock,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = createProductSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.issues
      }, { status: 400 });
    }

    const productData: NewProduct = validationResult.data;

    // Create product in database
    const newProduct = await createProduct(productData);

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      data: newProduct
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating product:', error);
    
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
      error: 'Failed to create product',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
