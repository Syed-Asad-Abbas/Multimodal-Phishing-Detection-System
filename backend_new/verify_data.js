const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyData() {
    console.log("🔍 Verifying Database Content...");

    try {
        // 1. Check Counts
        const userCount = await prisma.user.count();
        const scanCount = await prisma.scan.count();
        const resultCount = await prisma.scanResult.count();
        const maliciousIpCount = await prisma.maliciousIpObservation.count();

        console.log("\n📊 Record Counts:");
        console.log(`- Users: ${userCount}`);
        console.log(`- Scans: ${scanCount}`);
        console.log(`- Scan Results: ${resultCount}`);
        console.log(`- Malicious IPs: ${maliciousIpCount}`);

        // 2. Fetch Latest Scan to show detailed storage
        const lastScan = await prisma.scan.findFirst({
            orderBy: { created_at: 'desc' },
            include: {
                results: {
                    include: {
                        shap_values: true,
                        explanation: true
                    }
                }
            }
        });

        if (lastScan) {
            console.log("\n📝 Latest Scan Entry:");
            console.log("ID:", lastScan.id);
            console.log("URL:", lastScan.url);
            console.log("Status:", lastScan.status);
            if (lastScan.results && lastScan.results.length > 0) {
                const res = lastScan.results[0];
                console.log("Prediction:", res.prediction);
                console.log("Confidence:", res.confidence_score);
                console.log("Phishing Prob:", res.phishing_probability);
                console.log("SHAP Values Stored:", res.shap_values.length > 0 ? "Yes" : "No");
                console.log("Explanation Stored:", res.explanation ? "Yes" : "No");
            }
        } else {
            console.log("\n⚠️ No scans found in DB.");
        }

    } catch (error) {
        console.error("❌ DB Verification Failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyData();
