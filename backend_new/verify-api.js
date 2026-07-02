const fetch = require('node-fetch'); // Make sure node-fetch is installed or use native fetch if Node >= 18
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

const API_URL = 'http://localhost:5000/api/scan/submit';

async function createTestUser(email, tier) {
  let user = await prisma.user.findUnique({ where: { email } });
  
  const rawKey = crypto.randomBytes(32).toString('hex');
  const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: `Test ${tier}`,
        subscription_tier: tier,
        api_key_hash: hashedKey,
        api_key_preview: `pg_live_${rawKey.substring(0, 4)}...`,
        api_key_created: new Date()
      }
    });
  } else {
    user = await prisma.user.update({
      where: { email },
      data: {
        subscription_tier: tier,
        api_key_hash: hashedKey,
        api_key_preview: `pg_live_${rawKey.substring(0, 4)}...`,
        api_key_created: new Date()
      }
    });
  }

  return { user, rawKey };
}

async function testApiKey(key, description) {
  console.log(`\nTesting: ${description}`);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: 'http://example.com' })
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', data);
    return response.status;
  } catch (err) {
    console.error('Request failed:', err.message);
    return null;
  }
}

async function main() {
  console.log('--- API Key & Subscription Middleware Verification ---');
  
  // 1. Invalid API Key
  const invalidKeyStatus = await testApiKey('invalid_key_123', 'Invalid API Key');
  if (invalidKeyStatus !== 401) {
    console.error('❌ Failed: Invalid API key should return 401');
  } else {
    console.log('✅ Passed: Invalid API key blocked');
  }

  // 2. Free Account API Key
  const freeAccount = await createTestUser('free@test.com', 'FREE');
  const freeStatus = await testApiKey(freeAccount.rawKey, 'Free Account API Key');
  if (freeStatus !== 403) {
    console.error('❌ Failed: Free account should return 403 Forbidden');
  } else {
    console.log('✅ Passed: Free account correctly restricted');
  }

  // 3. Pro Account API Key
  const proAccount = await createTestUser('pro@test.com', 'PRO');
  const proStatus = await testApiKey(proAccount.rawKey, 'Pro Account API Key');
  if (proStatus === 200 || proStatus === 400 || proStatus === 201) { 
    // 400 could be returned if ML model fails or validation fails, but it means auth PASSED.
    console.log('✅ Passed: Pro account authenticated successfully');
  } else {
    console.error(`❌ Failed: Pro account should authenticate, got ${proStatus}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
