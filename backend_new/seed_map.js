const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedMap() {
    try {
        console.log("Checking for existing Malicious IPs...");
        const count = await prisma.maliciousIpObservation.count();

        if (count > 0) {
            console.log(`Found ${count} existing records. Deleting them for a fresh start...`);
            await prisma.maliciousIpObservation.deleteMany();
        }

        console.log("Generating fake realistic Malicious IPs targeting Lahore...");

        // Fake malicious nodes (Hackers around the world)
        const fakeNodes = [
            { ip: '198.51.100.23', lat: 55.7558, lng: 37.6173, country: 'Russia (Moscow)' },
            { ip: '203.0.113.45', lat: 39.9042, lng: 116.4074, country: 'China (Beijing)' },
            { ip: '45.33.22.11', lat: 40.7128, lng: -74.0060, country: 'USA (New York)' },
            { ip: '185.15.54.3', lat: 52.3676, lng: 4.9041, country: 'Netherlands (Amsterdam)' },
            { ip: '177.34.22.1', lat: -23.5505, lng: -46.6333, country: 'Brazil (Sao Paulo)' },
            { ip: '82.11.44.2', lat: 51.5074, lng: -0.1278, country: 'UK (London)' },
            { ip: '109.22.33.4', lat: 48.8566, lng: 2.3522, country: 'France (Paris)' },
            { ip: '41.22.11.5', lat: -26.2041, lng: 28.0473, country: 'South Africa (Johannesburg)' },
            { ip: '210.11.22.3', lat: 35.6762, lng: 139.6503, country: 'Japan (Tokyo)' },
            { ip: '118.22.44.1', lat: -33.8688, lng: 151.2093, country: 'Australia (Sydney)' }
        ];

        // Generate dummy scans and map them to the fake nodes
        const recordsToInsert = [];
        for (const node of fakeNodes) {
            const dummyScan = await prisma.scan.create({
                data: {
                    user_id: null,
                    url: `http://malicious-${Math.random().toString(36).substring(7)}.com`,
                    status: 'COMPLETED'
                }
            });

            recordsToInsert.push({
                ip_address: node.ip,
                country: node.country,
                geo_lat: node.lat,
                geo_long: node.lng,
                scan_id: dummyScan.id,
                timestamp: new Date()
            });
        }

        await prisma.maliciousIpObservation.createMany({
            data: recordsToInsert
        });

        console.log(`Successfully seeded ${fakeNodes.length} realistic Malicious IPs!`);

    } catch (error) {
        console.error("Failed to seed Malicious IPs:", error);
    } finally {
        await prisma.$disconnect();
    }
}

seedMap();
