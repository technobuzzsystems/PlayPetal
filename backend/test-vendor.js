const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
const test = async () => {
  try {
    const sellerId = 'vendor-1';
    
    // Simulate auto-provisioning
    console.log('Querying existingVendor...');
    const existingVendor = await prisma.$queryRawUnsafe(`SELECT id FROM "VendorProfile" WHERE id = $1 LIMIT 1;`, sellerId);
    console.log('existingVendor result:', existingVendor);
    
  } catch (err) {
    console.error('ERROR during auto-provisioning:', err);
  } finally {
    await prisma.$disconnect();
  }
};
test();
