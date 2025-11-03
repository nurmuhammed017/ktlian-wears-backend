import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '@/lib/db/queries';

// GET /api/products/search - Search products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Search query is required'
      }, { status: 400 });
    }

    // Search products
    const products = await searchProducts(query, limit, offset);

    // Apply additional filters if needed
    let filteredProducts = products;

    if (category && category !== 'All') {
      filteredProducts = filteredProducts.filter(product => 
        product.category?.toLowerCase() === category.toLowerCase()
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

    return NextResponse.json({
      success: true,
      data: {
        products: filteredProducts,
        query,
        total: filteredProducts.length,
        filters: {
          category,
          minPrice,
          maxPrice
        }
      }
    });

  } catch (error) {
    console.error('Error searching products:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to search products',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
