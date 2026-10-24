
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const methods = [
    { method: 'BKASH', accountNumber: '01737326555', accountType: 'PERSONAL', accountName: 'Tshastho Admin' },
    { method: 'NAGAD', accountNumber: '01737326555', accountType: 'PERSONAL', accountName: 'Tshastho Admin' },
    { method: 'UPAY', accountNumber: '01737326555', accountType: 'PERSONAL', accountName: 'Tshastho Admin' },
    { method: 'BANK', accountNumber: '1234567890', accountType: 'BANK', accountName: 'Tshastho Ltd' }
  ];
  for (const m of methods) {
    await prisma.paymentMethodConfig.upsert({
      where: { method: m.method }, update: {}, create: m,
    });
  }
  console.log('✅ Seeded payment methods!');
}
main().catch(e => console.error(e)).finally(async () => await prisma.$disconnect());
