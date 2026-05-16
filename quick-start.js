#!/usr/bin/env node
/**
 * CARTEX Quick Start Script
 * Helps verify and start the application
 * Run: node quick-start.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + colors.blue + '━'.repeat(60) + colors.reset);
  log('cyan', title);
  console.log(colors.blue + '━'.repeat(60) + colors.reset);
}

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  const status = exists ? '✓' : '✗';
  const color = exists ? 'green' : 'red';
  log(color, `${status} ${description}: ${filePath}`);
  return exists;
}

function checkFolderExists(folderPath, description) {
  const exists = fs.existsSync(folderPath);
  const status = exists ? '✓' : '✗';
  const color = exists ? 'green' : 'red';
  log(color, `${status} ${description}: ${folderPath}`);
  return exists;
}

async function main() {
  log('cyan', '\n🚀 CARTEX Platform Quick Start\n');

  logSection('📋 Pre-flight Checks');

  const projectRoot = __dirname;
  const backendRoot = path.join(projectRoot, 'backend');
  const frontendRoot = path.join(projectRoot, 'frontend');

  // Check critical files and folders
  let allChecksPassed = true;

  allChecksPassed &= checkFolderExists(backendRoot, 'Backend folder');
  allChecksPassed &= checkFolderExists(frontendRoot, 'Frontend folder');
  allChecksPassed &= checkFileExists(
    path.join(backendRoot, '.env'),
    'Backend .env'
  );
  allChecksPassed &= checkFileExists(
    path.join(frontendRoot, '.env'),
    'Frontend .env'
  );
  allChecksPassed &= checkFolderExists(
    path.join(frontendRoot, 'dist'),
    'Frontend build (dist)'
  );
  allChecksPassed &= checkFileExists(
    path.join(frontendRoot, 'dist', 'index.html'),
    'Frontend index.html'
  );
  allChecksPassed &= checkFolderExists(
    path.join(backendRoot, 'node_modules'),
    'Backend dependencies'
  );
  allChecksPassed &= checkFolderExists(
    path.join(frontendRoot, 'node_modules'),
    'Frontend dependencies'
  );

  logSection('🔍 Configuration Review');

  // Read .env files
  const backendEnv = fs.readFileSync(path.join(backendRoot, '.env'), 'utf-8');
  const frontendEnv = fs.readFileSync(path.join(frontendRoot, '.env'), 'utf-8');

  const backendPort = backendEnv.match(/PORT=(\d+)/)?.[1] || '5000';
  const backendNodeEnv =
    backendEnv.match(/NODE_ENV=(\w+)/)?.[1] || 'development';
  const frontendApiUrl = frontendEnv.match(/VITE_API_URL=(.+)/)?.[1] || '';

  log('cyan', '\nBackend Configuration:');
  log('white', `  • PORT: ${backendPort}`);
  log('white', `  • NODE_ENV: ${backendNodeEnv}`);

  log('cyan', '\nFrontend Configuration:');
  log('white', `  • VITE_API_URL: ${frontendApiUrl}`);

  if (frontendApiUrl.includes('localhost:5000')) {
    log('green', '  ✓ Frontend API URL is correctly set to local backend');
  } else {
    log('yellow', '  ⚠ Frontend API URL might need adjustment for local development');
  }

  logSection('📚 What to Do Next');

  log('cyan', '\n1️⃣  Make sure MongoDB & Redis are running:\n');
  log('white', '   Using Docker:');
  log('white', '   $ docker-compose up -d mongo redis\n');
  log('white', '   OR locally:');
  log('white', '   $ mongod     (in one terminal)');
  log('white', '   $ redis-server  (in another terminal)\n');

  log('cyan', '2️⃣  Start Backend Server:\n');
  log('white', '   $ cd backend');
  log('white', '   $ npm run dev\n');
  log('yellow', '   ℹ Server will run on http://localhost:5000\n');

  log('cyan', '3️⃣  Start Frontend (in another terminal):\n');
  log('white', '   $ cd frontend');
  log('white', '   $ npm run dev\n');
  log('yellow', '   ℹ Dev server on http://localhost:5173');
  log('yellow', '   ℹ But you can also access from http://localhost:5000\n');

  log('cyan', '4️⃣  Access the Application:\n');
  log('green', '   ✓ http://localhost:5000');
  log('green', '   ✓ http://localhost:5173 (dev server)\n');

  log('cyan', '5️⃣  Test Registration & Login:\n');
  log('white', '   • Click "Sign Up"');
  log('white', '   • Fill in details and create account');
  log('white', '   • Verify email with OTP');
  log('white', '   • Login and navigate to dashboard\n');
  log('yellow', '   ⚠️  IMPORTANT: After login, RELOAD THE PAGE (Ctrl+F5)');
  log('yellow', '       The page should load correctly, not show "Not Found"\n');

  log('cyan', '6️⃣  Run Tests (when servers are running):\n');
  log('white', '   $ node backend/tests/verify-all.js\n');

  logSection('🐛 Troubleshooting');

  log('yellow', 'If you see "Not Found" error:');
  log('white', '  • Make sure backend is running on port 5000');
  log('white', '  • Check frontend .env has VITE_API_URL=http://localhost:5000');
  log('white', '  • Clear browser cache (Ctrl+Shift+Delete)');
  log('white', '  • Restart both servers\n');

  log('yellow', 'If MongoDB connection fails:');
  log('white', '  • Check MONGODB_URI in backend/.env');
  log('white', '  • Make sure MongoDB service is running');
  log('white', '  • Run: docker-compose up -d mongo\n');

  log('yellow', 'If Redis connection fails:');
  log('white', '  • Check REDIS_URL in backend/.env (if set)');
  log('white', '  • Make sure Redis service is running');
  log('white', '  • Run: docker-compose up -d redis\n');

  logSection('📖 Documentation');

  log('cyan', 'See VERIFICATION_GUIDE.md for:');
  log('white', '  • Detailed testing flow');
  log('white', '  • API endpoint documentation');
  log('white', '  • Production deployment guide\n');

  // Summary
  logSection('✅ Quick Start Ready');

  if (allChecksPassed) {
    log('green', '\n🎉 All checks passed! You\'re ready to start.\n');
  } else {
    log('yellow', '\n⚠️  Some checks failed. Please review above.\n');
    log('yellow', 'Key issues to fix:');
    log('white', '  • Run: npm install (in backend and frontend)');
    log('white', '  • Run: npm run build (in frontend)\n');
  }

  log('cyan', 'Happy coding! 🚀\n');
}

main().catch((error) => {
  log('red', `\nError: ${error.message}\n`);
  process.exit(1);
});
