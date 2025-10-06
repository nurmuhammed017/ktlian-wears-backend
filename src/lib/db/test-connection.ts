import 'dotenv/config';
import { db } from './index';

async function testConnection() {
  console.log('🔍 Testing database connection...');
  console.log('🔗 Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  
  try {
    await db.execute('SELECT NOW() as current_time');
    console.log('✅ Database connection successful!');
    
    await db.execute('SELECT COUNT(*) FROM users');
    console.log('✅ Users table exists and is accessible');
    
    await db.execute('SELECT COUNT(*) FROM products');
    console.log('✅ Products table exists and is accessible');
    
    await db.execute('SELECT COUNT(*) FROM cart_items');
    console.log('✅ Cart items table exists and is accessible');
    
    console.log('🎉 Database setup is complete and ready for e-commerce!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
