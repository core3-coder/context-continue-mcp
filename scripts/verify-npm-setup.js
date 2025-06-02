#!/usr/bin/env node

/**
 * NPM Publish Verification Script
 * Run this to check if everything is ready for publishing
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('🔍 NPM Publish Verification\n');

// Check package.json
console.log('📦 Package Information:');
try {
  const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
  console.log(`   Name: ${pkg.name}`);
  console.log(`   Version: ${pkg.version}`);
  console.log(`   License: ${pkg.license}`);
  console.log('');
} catch (error) {
  console.error('❌ Could not read package.json');
  process.exit(1);
}

// Check npm login
console.log('👤 NPM Authentication:');
try {
  const user = execSync('npm whoami', { encoding: 'utf8' }).trim();
  console.log(`   ✅ Logged in as: ${user}`);
} catch (error) {
  console.log('   ❌ Not logged in to npm');
  console.log('   Run: npm login');
}
console.log('');

// Check if package exists
console.log('🔍 Package Registry Check:');
try {
  execSync('npm view context-continue-mcp', { encoding: 'utf8' });
  console.log('   ⚠️  Package already exists on npm');
} catch (error) {
  if (error.message.includes('404')) {
    console.log('   ✅ Package name available');
  } else {
    console.log('   ❌ Registry check failed');
  }
}
console.log('');

// Check build
console.log('🔨 Build Check:');
try {
  console.log('   Building project...');
  execSync('npm run build', { stdio: 'ignore' });
  console.log('   ✅ Build successful');
} catch (error) {
  console.log('   ❌ Build failed');
  console.log('   Run: npm run build');
}
console.log('');

// Test publish (dry run)
console.log('🧪 Publish Test (Dry Run):');
try {
  const output = execSync('npm publish --dry-run', { encoding: 'utf8' });
  console.log('   ✅ Dry run successful');
  console.log('   Ready to publish!');
} catch (error) {
  console.log('   ❌ Dry run failed');
  console.log('   Check the error above');
}
console.log('');

console.log('🚀 Next Steps:');
console.log('   1. Fix any issues shown above');
console.log('   2. Ensure NPM_TOKEN is in GitHub Secrets');
console.log('   3. Run "Simple NPM Publish" workflow with dry_run=true');
console.log('   4. If successful, run again with dry_run=false');
