const axios = require('axios');

const AUTH_URL = 'http://localhost:5001/api/auth';
const MLOPS_URL = 'http://localhost:5001/api/admin/mlops';
const ADMIN_EMAIL = 'admin_test@test.com';
const ADMIN_PASS = 'adminpass123';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    console.log('--- STARTING MLOPS TEST ---');

    try {
        // 0. Login Admin
        console.log('\n0. Login Admin');
        const adminLogin = await axios.post(`${AUTH_URL}/login`, { email: ADMIN_EMAIL, password: ADMIN_PASS });
        const adminToken = adminLogin.data.accessToken;
        const authHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

        // 1. Check Health
        console.log('\n1. Check Pipeline Health');
        const healthRes = await axios.get(`${MLOPS_URL}/health`, authHeaders);
        console.log('   ML Service:', healthRes.data.ml_service);
        console.log('   DB:', healthRes.data.db);

        // 2. Trigger Retraining
        console.log('\n2. Trigger Retraining');
        const triggerRes = await axios.post(`${MLOPS_URL}/retrain`, {}, authHeaders);
        console.log('   Response:', triggerRes.data.message);
        console.log('   Job ID:', triggerRes.data.jobId);

        // 3. Wait for Async Completion (Simulation is 5s)
        console.log('\n3. Waiting 6s for Simulation...');
        await sleep(6000);

        // 4. Check Retraining History
        console.log('\n4. Check Job History');
        const histRes = await axios.get(`${MLOPS_URL}/history`, authHeaders);
        const job = histRes.data[0];
        console.log('   Latest Job Status:', job.status);
        console.log('   Metrics:', job.metrics_summary);

        console.log('\n--- TEST SUCCESS ---');

    } catch (error) {
        console.error('\n--- TEST FAILED ---');
        if (error.response) {
            console.error(error.response.data);
        } else {
            console.error(error);
        }
    }
}

runTest();
