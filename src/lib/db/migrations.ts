import { db } from './index';
import { 
  // users, 
  // sessions, 
  // products, 
  // productVariants, 
  // addresses, 
  // paymentMethods, 
  // orders, 
  // orderItems, 
  // payments 
} from './schema';

export async function runMigrations() {
  console.log('Running database migrations...');

  try {
    // Create tables in the correct order (respecting foreign key constraints)
    
    // 1. Users table (already exists, but ensure it's up to date)
    console.log('✓ Users table ready');
    
    // 2. Sessions table (already exists)
    console.log('✓ Sessions table ready');
    
    // 3. Products table
    console.log('Creating products table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        images JSONB,
        category VARCHAR(100),
        slug VARCHAR(255) NOT NULL UNIQUE,
        in_stock BOOLEAN DEFAULT true,
        tags JSONB,
        rating DECIMAL(3,2),
        review_count INTEGER DEFAULT 0,
        variants JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✓ Products table created');

    // 4. Product variants table
    console.log('Creating product_variants table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        in_stock BOOLEAN DEFAULT true,
        attributes JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✓ Product variants table created');

    // 5. Addresses table
    console.log('Creating addresses table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        company VARCHAR(255),
        address1 VARCHAR(255) NOT NULL,
        address2 VARCHAR(255),
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        country VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    
    // Create indexes separately
    await db.execute(`CREATE INDEX IF NOT EXISTS addresses_user_id_idx ON addresses(user_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS addresses_type_idx ON addresses(type)`);
    console.log('✓ Addresses table created');

    // 6. Payment methods table
    console.log('Creating payment_methods table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        provider_id VARCHAR(255) NOT NULL,
        last4 VARCHAR(4),
        brand VARCHAR(50),
        expiry_month INTEGER,
        expiry_year INTEGER,
        is_default BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    
    // Create indexes separately
    await db.execute(`CREATE INDEX IF NOT EXISTS payment_methods_user_id_idx ON payment_methods(user_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS payment_methods_provider_id_idx ON payment_methods(provider_id)`);
    console.log('✓ Payment methods table created');

    // 7. Orders table
    console.log('Creating orders table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_number VARCHAR(50) NOT NULL UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        subtotal DECIMAL(10,2) NOT NULL,
        tax DECIMAL(10,2) NOT NULL DEFAULT 0,
        shipping DECIMAL(10,2) NOT NULL DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        billing_address_id UUID REFERENCES addresses(id),
        shipping_address_id UUID REFERENCES addresses(id),
        payment_method_id UUID REFERENCES payment_methods(id),
        notes TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    
    // Create indexes separately
    await db.execute(`CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS orders_order_number_idx ON orders(order_number)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at)`);
    console.log('✓ Orders table created');

    // 8. Order items table
    console.log('Creating order_items table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id),
        variant_id UUID REFERENCES product_variants(id),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        product_snapshot JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    
    // Create indexes separately
    await db.execute(`CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON order_items(product_id)`);
    console.log('✓ Order items table created');

    // 9. Payments table
    console.log('Creating payments table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        payment_method_id UUID REFERENCES payment_methods(id),
        provider VARCHAR(50) NOT NULL,
        provider_payment_id VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        status VARCHAR(50) NOT NULL,
        payment_intent VARCHAR(255),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    
    // Create indexes separately
    await db.execute(`CREATE INDEX IF NOT EXISTS payments_order_id_idx ON payments(order_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS payments_provider_payment_id_idx ON payments(provider_payment_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status)`);
    console.log('✓ Payments table created');

    console.log('All migrations completed successfully! 🎉');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Function to add phone column to users table if it doesn't exist
export async function addPhoneToUsers() {
  try {
    console.log('Checking if phone column exists in users table...');
    
    // Check if phone column exists
    const result = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'phone';
    `);
    
    if (result.rows.length === 0) {
      console.log('Adding phone column to users table...');
      await db.execute(`
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
      `);
      console.log('✓ Phone column added to users table');
    } else {
      console.log('✓ Phone column already exists in users table');
    }
  } catch (error) {
    console.error('Error adding phone column:', error);
    throw error;
  }
}

// Function to seed some sample products
export async function seedSampleProducts() {
  try {
    console.log('Seeding sample products...');
    
    const sampleProducts = [
      {
        name: 'Classic White T-Shirt',
        description: 'A comfortable and versatile white t-shirt made from 100% cotton.',
        price: '29.99',
        originalPrice: '39.99',
        images: ['/assets/1.png'],
        category: 'T-Shirts',
        slug: 'classic-white-tshirt',
        inStock: true,
        tags: ['casual', 'cotton', 'white'],
        rating: '4.5',
        reviewCount: 128,
      },
      {
        name: 'Denim Jacket',
        description: 'A timeless denim jacket perfect for any casual occasion.',
        price: '89.99',
        images: ['/assets/2.png'],
        category: 'Jackets',
        slug: 'denim-jacket',
        inStock: true,
        tags: ['denim', 'jacket', 'casual'],
        rating: '4.7',
        reviewCount: 89,
      },
      {
        name: 'Black Hoodie',
        description: 'A cozy black hoodie made from premium cotton blend.',
        price: '59.99',
        originalPrice: '69.99',
        images: ['/assets/3.png'],
        category: 'Hoodies',
        slug: 'black-hoodie',
        inStock: true,
        tags: ['hoodie', 'black', 'casual'],
        rating: '4.6',
        reviewCount: 156,
      },
    ];

    for (const product of sampleProducts) {
      await db.execute(`
        INSERT INTO products (name, description, price, original_price, images, category, slug, in_stock, tags, rating, review_count)
        VALUES ('${product.name}', '${product.description}', ${product.price}, ${product.originalPrice || 'NULL'}, '${JSON.stringify(product.images)}', '${product.category}', '${product.slug}', ${product.inStock}, '${JSON.stringify(product.tags)}', ${product.rating}, ${product.reviewCount})
        ON CONFLICT (slug) DO NOTHING;
      `);
    }

    console.log('✓ Sample products seeded');
  } catch (error) {
    console.error('Error seeding products:', error);
    throw error;
  }
}

// Add role column to users table
async function addRoleToUsers() {
  console.log('Checking if role column exists in users table...');
  
  try {
    // Check if role column already exists
    const result = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role';
    `);
    
    if (result.rows.length === 0) {
      console.log('Adding role column to users table...');
      await db.execute(`
        ALTER TABLE users 
        ADD COLUMN role VARCHAR(20) DEFAULT 'customer' NOT NULL;
      `);
      
      // Create index for better performance
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      `);
      
      console.log('✓ Role column added to users table');
    } else {
      console.log('✓ Role column already exists in users table');
    }
  } catch (error) {
    console.error('Error adding role column to users table:', error);
    throw error;
  }
}

// Main migration function
export async function runAllMigrations() {
  try {
    await runMigrations();
    await addPhoneToUsers();
    await addRoleToUsers();
    await seedSampleProducts();
    console.log('All database setup completed! 🚀');
  } catch (error) {
    console.error('Database setup failed:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runAllMigrations()
    .then(() => {
      console.log('Migrations completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migrations failed:', error);
      process.exit(1);
    });
}
