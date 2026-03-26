const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const AUTH_URL = 'http://localhost:5001/api/auth';
const ADMIN_URL = 'http://localhost:5001/api/admin';
const ADMIN_EMAIL = 'admin_test@test.com';
const ADMIN_PASS = 'adminpass123';
const NEW_ADMIN_EMAIL = 'admin_new@test.com';
const NEW_ADMIN_PASS = 'newadmin123';

async function runTest() {
    console.log('--- STARTING CREATE_ADMIN TEST ---');

    try {
        // 0. Login Existing Admin
        console.log('\n0. Login Existing Admin');
        const adminLogin = await axios.post(`${AUTH_URL}/login`, { email: ADMIN_EMAIL, password: ADMIN_PASS });
        const adminToken = adminLogin.data.accessToken;
        const authHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
        console.log('   Token obtained.');

        // 1. Create New Admin (Restricted Action)
        console.log('\n1. Creating New Admin via API');
        try {
            await prisma.user.delete({ where: { email: NEW_ADMIN_EMAIL } }).catch(() => { });
        } catch (e) { }

        const createRes = await axios.post(`${ADMIN_URL}/create-admin`, {
            email: NEW_ADMIN_EMAIL,
            password: NEW_ADMIN_PASS
        }, authHeaders);
        console.log('   Response:', createRes.data.message);

        // 2. Verify Audit Log
        console.log('\n2. Verifying Audit Log');
        const log = await prisma.auditLog.findFirst({
            where: { action: 'CREATE_ADMIN', details: { contains: NEW_ADMIN_EMAIL } }
        });
        console.log('   Audit Log Found:', !!log);

        // 3. Login with New Admin
        console.log('\n3. Login with New Admin');
        const newLogin = await axios.post(`${AUTH_URL}/login`, { email: NEW_ADMIN_EMAIL, password: NEW_ADMIN_PASS });
        console.log('   New Admin Token obtained:', !!newLogin.data.accessToken);

        console.log('\n--- TEST SUCCESS ---');

    } catch (error) {
        console.error('\n--- TEST FAILED ---');
        if (error.response) {
            console.error(error.response.data);
        } else {
            console.error(error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
