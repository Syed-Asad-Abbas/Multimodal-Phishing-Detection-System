const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function main() {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    console.log("Admin email:", admin.email);
    const token = jwt.sign(
        { id: admin.id, email: admin.email, role: admin.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1d' }
    );

    console.log("\nTesting API Endpoints with token...");
    try {
        const stats = await fetch('http://localhost:5000/api/admin/dashboard/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json());
        console.log("Stats:", stats);

        const analytics = await fetch('http://localhost:5000/api/admin/dashboard/analytics', {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json());
        console.log("Analytics Matrix:", analytics.confusionMatrix);

        const users = await fetch('http://localhost:5000/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json());
        console.log("Users Fetched:", users.pagination?.total);

    } catch (e) {
        console.error("API test failed:", e.message);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
