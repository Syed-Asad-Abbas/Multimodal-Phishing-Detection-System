const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const AUTH_URL = 'http://localhost:5001/api/auth';
const REVIEW_URL = 'http://localhost:5001/api/reviews';
const ADMIN_EMAIL = 'admin_test@test.com';
const ADMIN_PASS = 'adminpass123';
const USER_EMAIL = 'user_test@test.com';
const USER_PASS = 'userpass123';

async function runTest() {
    console.log('--- STARTING REVIEWS TEST ---');

    try {
        // 0. Setup: Create User and Admin in DB (Manual hack for test speed)
        console.log('\n0. Setup DB (Creating User & Admin)');
        const hash = '$2b$10$EpIxNwllqg.N7k.n7k.n7k.n7k.n7k.n7k.n7k.n7k.n7k'; // Dummy hash or recreate
        // Actually, I'll register them properly to get tokens

        // Register User
        try { await axios.post(`${AUTH_URL}/register`, { email: USER_EMAIL, password: USER_PASS }); } catch (e) { }
        const userLogin = await axios.post(`${AUTH_URL}/login`, { email: USER_EMAIL, password: USER_PASS });
        const userToken = userLogin.data.accessToken;

        // Register Admin (Then promote manually)
        try { await axios.post(`${AUTH_URL}/register`, { email: ADMIN_EMAIL, password: ADMIN_PASS }); } catch (e) { }
        const adminUser = await prisma.user.update({
            where: { email: ADMIN_EMAIL },
            data: { role: 'ADMIN' }
        });
        const adminLogin = await axios.post(`${AUTH_URL}/login`, { email: ADMIN_EMAIL, password: ADMIN_PASS });
        const adminToken = adminLogin.data.accessToken;

        console.log('   Tokens obtained.');

        // 1. Submit Review (User)
        console.log('\n1. User submits review');
        const reviewRes = await axios.post(`${REVIEW_URL}`, {
            rating: 5,
            comment: "Great system! Caught a phish."
        }, { headers: { Authorization: `Bearer ${userToken}` } });
        console.log('   Review ID:', reviewRes.data.reviewId);
        const reviewId = reviewRes.data.reviewId;

        // 2. Check Testimonials (Should be empty)
        console.log('\n2. Check Public Testimonials (Expect Empty)');
        const pubRes1 = await axios.get(`${REVIEW_URL}/testimonials`);
        console.log('   Count:', pubRes1.data.length);

        // 3. Admin Approve
        console.log('\n3. Admin Approves Review');
        await axios.put(`${REVIEW_URL}/admin/${reviewId}/status`, {
            status: 'APPROVED'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        console.log('   Approved.');

        // 4. Check Testimonials (Should have 1)
        console.log('\n4. Check Public Testimonials (Expect 1)');
        const pubRes2 = await axios.get(`${REVIEW_URL}/testimonials`);
        console.log('   Count:', pubRes2.data.length);
        console.log('   Content:', pubRes2.data[0].comment);

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
