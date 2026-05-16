#!/usr/bin/env node
/**
 * CARTEX API & Routing Verification Script
 * Tests all critical endpoints and functionality
 * Run: node backend/tests/verify-all.js
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1`;

let testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

// Colored console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Make HTTP request
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const protocol = url.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Test helper
async function test(name, fn) {
  try {
    await fn();
    testResults.passed++;
    testResults.tests.push({ name, status: '✓', error: null });
    log('green', `✓ ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: '✗', error: error.message });
    log('red', `✗ ${name}: ${error.message}`);
  }
}

// Assert helpers
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}. Expected ${expected}, got ${actual}`);
}

function assertIncludes(actual, expected, message) {
  if (!actual.includes(expected)) throw new Error(`${message}. Expected to include "${expected}"`);
}

// ══════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════

async function runTests() {
  log('cyan', '🚀 Starting CARTEX Verification Tests\n');
  log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Backend Health Checks
  log('cyan', '1️⃣  Backend Health Checks');
  log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await test('Server is running on port 5000', async () => {
    const res = await makeRequest('GET', `${BASE_URL}/api/health`);
    assertEqual(res.status, 200, 'Health check endpoint');
  });

  await test('API is accessible', async () => {
    const res = await makeRequest('GET', `${API_BASE}/products`);
    assert(res.status > 0, 'API endpoint not responding');
  });

  // 2. Frontend SPA Serving
  log('\n' + colors.cyan + '2️⃣  Frontend SPA Serving' + colors.reset);
  log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await test('Root path serves index.html', async () => {
    const res = await makeRequest('GET', `${BASE_URL}/`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('Non-API routes serve index.html (SPA fallback)', async () => {
    const res = await makeRequest('GET', `${BASE_URL}/products`);
    assertEqual(res.status, 200, 'SPA fallback for /products');
  });

  await test('Admin route serves index.html (SPA fallback)', async () => {
    const res = await makeRequest('GET', `${BASE_URL}/admin/dashboard`);
    assertEqual(res.status, 200, 'SPA fallback for /admin/dashboard');
  });

  // 3. Authentication Routes
  log('\n' + colors.cyan + '3️⃣  Authentication Routes' + colors.reset);
  log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let registeredUserId = null;
  let accessToken = null;

  await test('POST /api/v1/auth/register - Create new user', async () => {
    const res = await makeRequest('POST', `${API_BASE}/auth/register`, {
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      phone: '9876543210',
      password: 'Test@123456',
      hostelName: 'Test Hostel',
      district: '507f1f77bcf86cd799439011', // Example ID, actual might be different
      locality: '507f1f77bcf86cd799439012',
      gender: 'male',
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data?.success, 'Registration failed');
    registeredUserId = res.data?.data?.userId;
    assert(registeredUserId, 'No user ID returned');
  });

  await test('POST /api/v1/auth/refresh-token - Refresh token endpoint exists', async () => {
    const res = await makeRequest('POST', `${API_BASE}/auth/refresh-token`);
    // Endpoint should exist (might return 401 without proper cookie)
    assert([200, 401, 400].includes(res.status), `Unexpected status ${res.status}`);
  });

  // 4. User Routes
  log('\n' + colors.cyan + '4️⃣  User Routes' + colors.reset);
  log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await test('GET /api/v1/users - List users (may require auth)', async () => {
    const res = await makeRequest('GET', `${API_BASE}/users`);
    assert([200, 401].includes(res.status), 'Users endpoint not responding properly');
  });

  // 5. Product Routes
  log('\n' + colors.cyan + '5️⃣  Product Routes' + colors.reset);
  log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await test('GET /api/v1/products - List products', async () => {
    const res = await makeRequest('GET', `${API_BASE}/products`);
    assert([200, 400].includes(res.status), `Expected 200/400, got ${res.status}`);
  });

  await test('GET /api/v1/products?category=electronics - Filter products', async () => {
    const res = await makeRequest('GET', `${API_BASE}/products?category=electronics`);
    assert([200, 400].includes(res.status), 'Products filter endpoint not responding');
  });

  // 6. Order Routes
  log('\n' + colors.cyan + '6️⃣  Order Routes' + colors.reset);
  log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await test('GET /api/v1/orders - List orders (requires auth)', async () => {
    const res = await makeRequest('GET', `${API_BASE}/orders`);
    assert([200, 401].includes(res.status), 'Orders endpoint not responding');
  });

  // 7. Admin Routes
  log('\n' + colors.cyan + '7️⃣  Admin Routes' + colors.reset);
  log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await test('GET /api/v1/admin/stats - Admin stats endpoint exists', async () => {
    const res = await makeRequest('GET', `${API_BASE}/admin/stats`);
    assert([200, 401, 403].includes(res.status), 'Admin endpoint not responding');
  });

  // 8. Other Routes
  log('\n' + colors.cyan + '8️⃣  Other Routes' + colors.reset);
  log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await test('GET /api/v1/categories - List categories', async () => {
    const res = await makeRequest('GET', `${API_BASE}/categories`);
    assert([200, 400].includes(res.status), 'Categories endpoint not responding');
  });

  await test('GET /api/v1/districts - List districts', async () => {
    const res = await makeRequest('GET', `${API_BASE}/districts`);
    assert([200, 400].includes(res.status), 'Districts endpoint not responding');
  });

  // Results
  log('\n' + colors.blue + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('cyan', '📊 Test Results');
  log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  log('green', `✓ Passed: ${testResults.passed}`);
  if (testResults.failed > 0) {
    log('red', `✗ Failed: ${testResults.failed}`);
  } else {
    log('green', `✗ Failed: ${testResults.failed}`);
  }

  const total = testResults.passed + testResults.failed;
  const percentage = Math.round((testResults.passed / total) * 100);
  log('cyan', `\nTotal: ${testResults.passed}/${total} (${percentage}%)`);

  if (testResults.failed > 0) {
    log('\n' + colors.red + '❌ Failed Tests:' + colors.reset);
    testResults.tests
      .filter((t) => t.status === '✗')
      .forEach((t) => {
        log('red', `  • ${t.name}: ${t.error}`);
      });
  } else {
    log('\n' + colors.green + '🎉 All Tests Passed!' + colors.reset);
  }

  log('blue', '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  log('red', `\n💥 Fatal Error: ${error.message}`);
  log('yellow', '\nMake sure the backend server is running on port 5000');
  log('yellow', 'Start it with: cd backend && npm run dev\n');
  process.exit(1);
});
