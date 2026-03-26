const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Users:", await prisma.user.count());
    console.log("Admins:", await prisma.user.count({ where: { role: 'ADMIN' } }));
    console.log("Normal Users:", await prisma.user.count({ where: { role: 'USER' } }));
    console.log("DailyStats:", await prisma.dailyScanStat.count());
    console.log("ModelMetrics:", await prisma.modelMetricsDaily.count());
    console.log("Scans:", await prisma.scan.count());
    console.log("Malicious IPs:", await prisma.maliciousIpObservation.count());
}
main().catch(console.error).finally(() => prisma.$disconnect());
