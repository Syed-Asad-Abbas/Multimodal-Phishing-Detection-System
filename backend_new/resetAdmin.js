const fs = require('fs');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

dotenv.config();
const prisma = new PrismaClient();

async function resetAdmin() {
    const email = 'admin@phishguard.com';
    const password = 'Password123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingAdmin = await prisma.user.findUnique({
        where: { email }
    });

    if (existingAdmin) {
        await prisma.user.update({
            where: { email },
            data: { password_hash: hashedPassword, role: 'ADMIN' }
        });
        console.log(`Successfully updated password for ${email}`);
    } else {
        await prisma.user.create({
            data: {
                email,
                password_hash: hashedPassword,
                role: 'ADMIN',
                is_verified: true
            }
        });
        console.log(`Successfully created new admin: ${email}`);
    }
}

resetAdmin()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
