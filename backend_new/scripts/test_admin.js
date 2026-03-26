const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const AUTH_URL = 'http://localhost:5001/api/auth';
const ADMIN_URL = 'http://localhost:5001/api/admin';
const SCAN_URL = 'http://localhost:5001/api/scan';
const ADMIN_EMAIL = 'admin_test@test.com';
const ADMIN_PASS = 'adminpass123';

async function runTest() {
    console.log('--- STARTING ADMIN TEST ---');

    try {
        // 0. Login Admin
        console.log('\n0. Login Admin');
        const adminLogin = await axios.post(`${AUTH_URL}/login`, { email: ADMIN_EMAIL, password: ADMIN_PASS });
        const adminToken = adminLogin.data.accessToken;
        const authHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
        console.log('   Token obtained.');

        // 1. Get Dashboard Stats
        console.log('\n1. Get Dashboard Stats');
        const statsRes = await axios.get(`${ADMIN_URL}/dashboard/stats`, authHeaders);
        console.log('   Total Scans:', statsRes.data.totalScans);
        console.log('   Phishing Count:', statsRes.data.phishingCount);
        console.log('   Total Users:', statsRes.data.totalUsers);

        // 2. Get Users
        console.log('\n2. Get Users List');
        const usersRes = await axios.get(`${ADMIN_URL}/users`, authHeaders);
        console.log('   Count:', usersRes.data.users.length);

        // 3. Create a Scan to Delete
        console.log('\n3. Create Scan to Delete');
        const scanRes = await axios.post(`${SCAN_URL}/submit`, { url: 'http://delete-me.com' });
        const scanId = scanRes.data.scanId;
        console.log('   Scan ID:', scanId);

        // 4. Soft Delete Scan
        console.log('\n4. Soft Delete Scan');
        await axios.delete(`${ADMIN_URL}/scans/${scanId}`, authHeaders);
        console.log('   Deleted.');

        // 5. Verify Deletion (Should be 410 or not found in list, and Audit Log exist)
        console.log('\n5. Verify Deletion & Audit');
        // Check Audit Log via DB directly for verify
        const log = await prisma.auditLog.findFirst({
            where: { entity_id: scanId, action: 'DELETE_SCAN' }
        });
        console.log('   Audit Log Found:', !!log);

        // Check Scan API
        try {
            await axios.get(`${SCAN_URL}/${scanId}`);
        } catch (e) {
            console.log('   Scan API Returns:', e.response.status); // Expect 410
        }

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
