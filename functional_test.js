const axios = require('axios');

const API_URL = 'http://127.0.0.1:5000/api';
const EMAIL = `auto_test_${Date.now()}@example.com`; // Unique email
const PASSWORD = 'Password123!';
const TARGET_URL = 'https://discord.com';

async function runTest() {
    console.log("🚀 Starting Automated Functional Test...");
    console.log(`Target Backend: ${API_URL}`);
    console.log(`Test User: ${EMAIL}`);

    let token = null;

    try {
        // 1. REGISTER
        console.log("\n1️⃣  Testing Registration...");
        try {
            const regRes = await axios.post(`${API_URL}/auth/register`, {
                name: 'Auto Tester',
                email: EMAIL,
                password: PASSWORD
            });
            console.log("✅ Registration Successful:", regRes.data.message);
        } catch (e) {
            console.error("❌ Registration Failed:", e.response?.data || e.message);
            process.exit(1);
        }

        // 2. LOGIN
        console.log("\n2️⃣  Testing Login...");
        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                email: EMAIL,
                password: PASSWORD
            });
            token = loginRes.data.accessToken;
            if (!token) throw new Error("No access token received");
            console.log("✅ Login Successful. Token received.");
        } catch (e) {
            console.error("❌ Login Failed:", e.response?.data || e.message);
            process.exit(1);
        }

        // 3. SCAN
        console.log("\n3️⃣  Testing URL Scan (Node -> Flask -> ML)...");
        try {
            const scanRes = await axios.post(`${API_URL}/scan/submit`, {
                url: TARGET_URL
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("✅ Scan Submitted Successfully.");
            console.log("   Scan ID:", scanRes.data.scanId);
            console.log("   Prediction:", scanRes.data.result.prediction);
            console.log("   Confidence:", scanRes.data.result.confidence_score);
        } catch (e) {
            console.error("❌ Scan Failed:", e.response?.data || e.message);
            // Don't exit, try history anyway
        }

        // 4. HISTORY
        console.log("\n4️⃣  Testing Scan History...");
        try {
            const histRes = await axios.get(`${API_URL}/scan/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const scans = histRes.data.scans;
            console.log(`✅ History Retrieved. Found ${scans.length} scans.`);
            if (scans.length > 0) {
                console.log("   Latest Scan URL:", scans[0].url);
            } else {
                console.warn("⚠️  History is empty (expected 1).");
            }
        } catch (e) {
            console.error("❌ History Fetch Failed:", e.response?.data || e.message);
        }

        console.log("\n✨ Functional Test Complete!");

    } catch (error) {
        console.error("\n❌ Unexpected Error:", error.message);
    }
}

runTest();
