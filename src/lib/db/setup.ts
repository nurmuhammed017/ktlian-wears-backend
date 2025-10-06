import { runAllMigrations } from './migrations';

async function main() {
  console.log('🚀 Setting up database...');
  
  try {
    await runAllMigrations();
    console.log('✅ Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

main();
