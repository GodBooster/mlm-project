import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const bcrypt = await import('bcrypt');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminData = {
    email: 'admin2@mlm.com',
    username: 'admin2',
    password: hashedPassword,
    balance: 0,
    bonus: 0,
    rank: 'DIAMOND',
    referralCode: 'ADMIN002',
    isAdmin: true
  };
  const existing = await prisma.user.findUnique({ where: { email: adminData.email } });
  if (existing) {
    console.log('Админ уже существует:', existing.email);
  } else {
    const admin = await prisma.user.create({ data: adminData });
    console.log('✅ Админ создан:', admin.email);
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); }); 