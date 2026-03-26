const axios = require('axios');
const BASE_URL = 'http://localhost:5001/api/scan';

async function runTest() {
    console.log('--- STARTING SCAN TEST ---');
    try {
        // 1. Submit Scan (Mocked)
        console.log('\n1. Submitting Scan for http://phish-example.com (Expect Phishing)');
        const res = await axios.post(`${BASE_URL}/submit`, {
            url: 'http://phish-example.com',
        });
        console.log('   Response ID:', res.data.scanId);
        console.log('   Prediction:', res.data.result.prediction);
        const scanId = res.data.scanId;

        // 2. Get Scan Details
        console.log(`\n2. getting Scan Details: ${scanId}`);
        const detailRes = await axios.get(`${BASE_URL}/${scanId}`);
        console.log('   URL:', detailRes.data.url);
        console.log('   Status:', detailRes.data.status);
        console.log('   Results Present:', !!detailRes.data.results);
        console.log('   SHAP Values:', detailRes.data.results.shap_values.length > 0 ? 'YES' : 'NO');
        console.log('   Malicious IP:', !!detailRes.data.malicious_ip ? 'YES' : 'NO');

        console.log('\n--- TEST SUCCESS ---');
    } catch (error) {
        console.error('\n--- TEST FAILED ---');
        if (error.response) {
            console.error(error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

runTest();
