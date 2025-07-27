#!/usr/bin/env node
/**
 * E2E Test Runner for BookTarr Frontend
 * Runs comprehensive tests including screenshot validation
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 BookTarr Frontend E2E Test Runner');
console.log('=====================================');

// Ensure test-results directory exists
const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n📋 ${description}`);
    console.log(`Command: ${command} ${args.join(' ')}`);
    console.log('─'.repeat(50));

    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} completed successfully`);
        resolve();
      } else {
        console.log(`❌ ${description} failed with code ${code}`);
        reject(new Error(`${description} failed`));
      }
    });

    process.on('error', (error) => {
      console.log(`❌ Error running ${description}: ${error.message}`);
      reject(error);
    });
  });
}

async function main() {
  const testSuites = [
    {
      command: 'npm',
      args: ['run', 'test:playwright', '--', '--project=chromium', 'tests/csv-import.spec.ts'],
      description: 'CSV Import Tests (Chrome)'
    },
    {
      command: 'npm',
      args: ['run', 'test:playwright', '--', '--project=chromium', 'tests/single-book-addition.spec.ts'],
      description: 'Single Book Addition Tests (Chrome)'
    },
    {
      command: 'npm',
      args: ['run', 'test:playwright', '--', '--project=chromium', 'tests/series-validation.spec.ts'],
      description: 'Series Validation Tests (Chrome)'
    },
    {
      command: 'npm',
      args: ['run', 'test:playwright', '--', '--project=firefox'],
      description: 'All Tests (Firefox)'
    }
  ];

  let passed = 0;
  let failed = 0;

  console.log(`\n🔧 Installing Playwright browsers...`);
  try {
    await runCommand('npx', ['playwright', 'install'], 'Install Playwright Browsers');
  } catch (error) {
    console.log('⚠️  Browser installation failed, but continuing with tests...');
  }

  for (const suite of testSuites) {
    try {
      await runCommand(suite.command, suite.args, suite.description);
      passed++;
    } catch (error) {
      failed++;
      console.log(`❌ ${suite.description} failed: ${error.message}`);
    }
  }

  // Generate summary report
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Screenshots: ${testResultsDir}`);

  // List generated screenshots
  if (fs.existsSync(testResultsDir)) {
    const screenshots = fs.readdirSync(testResultsDir)
      .filter(file => file.endsWith('.png'))
      .sort();
    
    if (screenshots.length > 0) {
      console.log('\n📸 Generated Screenshots:');
      screenshots.forEach(screenshot => {
        console.log(`   • ${screenshot}`);
      });
    }
  }

  // Check for test reports
  const reportFiles = [
    'playwright-report/index.html',
    'test-results/results.json',
    'test-results/results.xml'
  ];

  console.log('\n📋 Test Reports:');
  reportFiles.forEach(reportFile => {
    const fullPath = path.join(__dirname, reportFile);
    if (fs.existsSync(fullPath)) {
      console.log(`   ✅ ${reportFile}`);
    } else {
      console.log(`   ❌ ${reportFile} (not generated)`);
    }
  });

  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed. Check the reports for details.');
    process.exit(1);
  }
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test run interrupted by user');
  process.exit(1);
});

main().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});