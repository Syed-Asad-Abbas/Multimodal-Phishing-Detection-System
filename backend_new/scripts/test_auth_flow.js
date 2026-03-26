const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5001/api/auth';
const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123';
const NEW_PASSWORD = 'newpassword123';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTest() {
    console.log('--- STARTING AUTH FLOW TEST ---');

    try {
        // 1. Register
        console.log(`\n1. Registering user: ${TEST_EMAIL}`);
        const regRes = await axios.post(`${BASE_URL}/register`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
        });
        console.log('   Response:', regRes.data.message);
        const userId = regRes.data.userId;
        const verifyToken = regRes.data.debugToken;

        if (!verifyToken) throw new Error('Debug token missing (is NODE_ENV=development?)');

        // 2. Verify Email
        console.log(`\n2. Verifying Email with token: ${verifyToken}`);
        const verifyRes = await axios.get(`${BASE_URL}/verify-email?token=${verifyToken}`);
        console.log('   Response:', verifyRes.data.message);

        // 3. Login
        console.log('\n3. Logging In');
        const loginRes = await axios.post(`${BASE_URL}/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
        });
        console.log('   Login Success. Got tokens.');
        let { accessToken, refreshToken } = loginRes.data;

        // 4. Refresh Token
        console.log('\n4. Refreshing Access Token');
        const refreshRes = await axios.post(`${BASE_URL}/refresh-token`, { refreshToken });
        console.log('   New Access Token obtained:', refreshRes.data.accessToken ? 'YES' : 'NO');

        // 5. Forgot Password
        console.log('\n5. Forgot Password');
        const forgotRes = await axios.post(`${BASE_URL}/forgot-password`, { email: TEST_EMAIL });
        console.log('   Response:', forgotRes.data.message);
        const resetToken = forgotRes.data.debugToken;

        // 6. Reset Password
        console.log(`\n6. Resetting Password with token: ${resetToken}`);
        await axios.post(`${BASE_URL}/reset-password`, {
            token: resetToken,
            newPassword: NEW_PASSWORD,
        });
        console.log('   Password Reset Success');

        // 7. Login with OLD password (should fail)
        console.log('\n7. Testing Login with OLD password (expect fail)');
        try {
            await axios.post(`${BASE_URL}/login`, { email: TEST_EMAIL, password: TEST_PASSWORD });
            console.error('   FAILED: Old password should not work!');
        } catch (e) {
            console.log('   SUCCESS: Old password rejected as expected.');
        }

        // 8. Login with NEW password
        console.log('\n8. Logging In with NEW password');
        const newLoginRes = await axios.post(`${BASE_URL}/login`, {
            email: TEST_EMAIL,
            password: NEW_PASSWORD,
        });
        console.log('   Login Success.');

        // 9. Enable 2FA (Database Hack)
        console.log('\n9. ENABLING 2FA (Manually via Prisma)');
        await prisma.user.update({
            where: { id: userId },
            data: { is_2fa_enabled: true },
        });
        console.log('   2FA Enabled in DB.');

        // 10. Login with 2FA
        console.log('\n10. Login with 2FA enabled');
        const login2faRes = await axios.post(`${BASE_URL}/login`, {
            email: TEST_EMAIL,
            password: NEW_PASSWORD,
        });

        if (login2faRes.data.requires2FA) {
            console.log('   Response indicates 2FA required. Valid.');
            const otp = login2faRes.data.debugOTP;
            console.log(`   Got Debug OTP: ${otp}`);

            // 11. Verify 2FA
            console.log('\n11. Verifying 2FA OTP');
            const verify2faRes = await axios.post(`${BASE_URL}/2fa/verify`, {
                userId: userId,
                token: otp
            });
            console.log('   2FA Verify Success. Got tokens:', verify2faRes.data.accessToken ? 'YES' : 'NO');
        } else {
            console.error('   FAILED: Expected requires2FA=true');
        }

        console.log('\n--- TEST SUMMARY: PASS ---');

    } catch (error) {
        console.error('\n--- TEST FAILED ---');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
