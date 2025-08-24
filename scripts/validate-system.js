#!/usr/bin/env node

/**
 * System validation and health check for BookTarr
 * Validates all components and dependencies
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('cross-spawn');
const chalk = require('chalk');
const ora = require('ora');

class SystemValidator {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            details: []
        };
    }

    async validate() {
        console.log(chalk.blue('🔍 BookTarr System Validation\n'));
        
        const checks = [
            { name: 'Node.js Environment', fn: this.checkNodeEnvironment },
            { name: 'Python Environment', fn: this.checkPythonEnvironment },
            { name: 'Project Structure', fn: this.checkProjectStructure },
            { name: 'Frontend Dependencies', fn: this.checkFrontendDependencies },
            { name: 'Backend Dependencies', fn: this.checkBackendDependencies },
            { name: 'SSL Certificates', fn: this.checkSSLCertificates },
            { name: 'Network Configuration', fn: this.checkNetworkConfiguration },
            { name: 'Database Setup', fn: this.checkDatabaseSetup },
            { name: 'API Endpoints', fn: this.checkAPIEndpoints },
            { name: 'Test Suite', fn: this.checkTestSuite }
        ];
        
        for (const check of checks) {
            await this.runCheck(check.name, check.fn.bind(this));
        }
        
        this.displayResults();
        
        return this.results.failed === 0;
    }

    async runCheck(name, checkFn) {
        const spinner = ora(`Checking ${name}...`).start();
        
        try {
            const result = await checkFn();
            
            if (result.status === 'pass') {
                spinner.succeed(chalk.green(`${name}: ${result.message}`));
                this.results.passed++;
            } else if (result.status === 'warn') {
                spinner.warn(chalk.yellow(`${name}: ${result.message}`));
                this.results.warnings++;
            } else {
                spinner.fail(chalk.red(`${name}: ${result.message}`));
                this.results.failed++;
            }
            
            this.results.details.push({ name, ...result });
            
        } catch (error) {
            spinner.fail(chalk.red(`${name}: ${error.message}`));
            this.results.failed++;
            this.results.details.push({ name, status: 'fail', message: error.message });
        }
    }

    async checkNodeEnvironment() {
        const nodeVersion = process.version;
        const npmVersion = await this.getCommandVersion('npm', '--version');
        
        const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        if (nodeMajor < 16) {
            return { status: 'fail', message: `Node.js ${nodeVersion} is too old (requires >= 16.0.0)` };
        }
        
        return { 
            status: 'pass', 
            message: `Node.js ${nodeVersion}, npm ${npmVersion}` 
        };
    }

    async checkPythonEnvironment() {
        try {
            const pythonVersion = await this.getCommandVersion('python', '--version');
            const pipVersion = await this.getCommandVersion('pip', '--version');
            
            // Check Python version (should be >= 3.8)
            const versionMatch = pythonVersion.match(/(\d+)\.(\d+)/);
            if (versionMatch) {
                const major = parseInt(versionMatch[1]);
                const minor = parseInt(versionMatch[2]);
                
                if (major < 3 || (major === 3 && minor < 8)) {
                    return { status: 'fail', message: `Python ${pythonVersion} is too old (requires >= 3.8.0)` };
                }
            }
            
            return { 
                status: 'pass', 
                message: `Python ${pythonVersion}, pip available` 
            };
        } catch (error) {
            return { status: 'fail', message: 'Python not found or not accessible' };
        }
    }

    async checkProjectStructure() {
        const requiredPaths = [
            'frontend/package.json',
            'frontend/src/App.tsx',
            'backend/main.py',
            'backend/requirements.txt',
            'scripts/dev-server.js'
        ];
        
        const missing = [];
        
        for (const filePath of requiredPaths) {
            if (!fs.existsSync(path.join(process.cwd(), filePath))) {
                missing.push(filePath);
            }
        }
        
        if (missing.length > 0) {
            return { 
                status: 'fail', 
                message: `Missing files: ${missing.join(', ')}` 
            };
        }
        
        return { status: 'pass', message: 'All required files present' };
    }

    async checkFrontendDependencies() {
        try {
            const packageJsonPath = path.join(process.cwd(), 'frontend/package.json');
            const nodeModulesPath = path.join(process.cwd(), 'frontend/node_modules');
            
            if (!fs.existsSync(packageJsonPath)) {
                return { status: 'fail', message: 'Frontend package.json not found' };
            }
            
            if (!fs.existsSync(nodeModulesPath)) {
                return { status: 'warn', message: 'Frontend dependencies not installed (run: cd frontend && npm install)' };
            }
            
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const depCount = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).length;
            
            return { status: 'pass', message: `${depCount} dependencies installed` };
        } catch (error) {
            return { status: 'fail', message: 'Error checking frontend dependencies' };
        }
    }

    async checkBackendDependencies() {
        try {
            const requirementsPath = path.join(process.cwd(), 'backend/requirements.txt');
            const venvPath = path.join(process.cwd(), 'backend/venv');
            
            if (!fs.existsSync(requirementsPath)) {
                return { status: 'fail', message: 'Backend requirements.txt not found' };
            }
            
            // Try to import key dependencies
            const testImports = ['fastapi', 'sqlmodel', 'uvicorn'];
            const importResults = await Promise.all(
                testImports.map(pkg => this.testPythonImport(pkg))
            );
            
            const missing = testImports.filter((pkg, index) => !importResults[index]);
            
            if (missing.length > 0) {
                return { 
                    status: 'warn', 
                    message: `Missing Python packages: ${missing.join(', ')} (run: cd backend && pip install -r requirements.txt)` 
                };
            }
            
            return { status: 'pass', message: 'All backend dependencies available' };
        } catch (error) {
            return { status: 'fail', message: 'Error checking backend dependencies' };
        }
    }

    async checkSSLCertificates() {
        const certPaths = [
            'certs/localhost-key.pem',
            'certs/localhost.pem',
            'frontend/certs/localhost-key.pem',
            'frontend/certs/localhost.pem'
        ];
        
        const exists = certPaths.map(certPath => 
            fs.existsSync(path.join(process.cwd(), certPath))
        );
        
        const existingCount = exists.filter(Boolean).length;
        
        if (existingCount === 0) {
            return { 
                status: 'warn', 
                message: 'No SSL certificates found (run: npm run cert:generate)' 
            };
        } else if (existingCount < certPaths.length) {
            return { 
                status: 'warn', 
                message: `Partial SSL setup (${existingCount}/${certPaths.length} files)` 
            };
        }
        
        return { status: 'pass', message: 'SSL certificates configured' };
    }

    async checkNetworkConfiguration() {
        try {
            const frontendPackagePath = path.join(process.cwd(), 'frontend/package.json');
            const envPath = path.join(process.cwd(), 'frontend/.env');
            
            if (!fs.existsSync(frontendPackagePath)) {
                return { status: 'fail', message: 'Frontend package.json not found' };
            }
            
            const pkg = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));
            
            if (!pkg.proxy) {
                return { status: 'warn', message: 'No proxy configuration found' };
            }
            
            const hasEnvFile = fs.existsSync(envPath);
            
            return { 
                status: 'pass', 
                message: `Proxy: ${pkg.proxy}${hasEnvFile ? ', .env configured' : ''}` 
            };
        } catch (error) {
            return { status: 'fail', message: 'Error checking network configuration' };
        }
    }

    async checkDatabaseSetup() {
        const dbPath = path.join(process.cwd(), 'backend/booktarr.db');
        
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            const size = (stats.size / 1024).toFixed(1);
            return { status: 'pass', message: `Database exists (${size} KB)` };
        }
        
        return { 
            status: 'warn', 
            message: 'Database not found (will be created on first run)' 
        };
    }

    async checkAPIEndpoints() {
        try {
            // Try to connect to backend
            const response = await fetch('http://localhost:8000/api/health', {
                method: 'GET',
                timeout: 5000
            });
            
            if (response.ok) {
                const data = await response.json();
                return { status: 'pass', message: `Backend responding: ${JSON.stringify(data)}` };
            } else {
                return { status: 'warn', message: `Backend responded with status ${response.status}` };
            }
        } catch (error) {
            return { 
                status: 'warn', 
                message: 'Backend not running (start with: npm run dev)' 
            };
        }
    }

    async checkTestSuite() {
        const testFiles = [
            'frontend/tests',
            'backend/tests',
            'frontend/playwright.config.ts',
            'backend/pytest.ini'
        ];
        
        const existing = testFiles.filter(testPath => 
            fs.existsSync(path.join(process.cwd(), testPath))
        );
        
        if (existing.length === 0) {
            return { status: 'warn', message: 'No test configuration found' };
        }
        
        return { 
            status: 'pass', 
            message: `Test suites configured (${existing.length}/${testFiles.length})` 
        };
    }

    async getCommandVersion(command, flag) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, [flag], { stdio: 'pipe' });
            let output = '';
            
            process.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                output += data.toString();
            });
            
            process.on('close', (code) => {
                if (code === 0) {
                    resolve(output.trim());
                } else {
                    reject(new Error(`Command failed with code ${code}`));
                }
            });
            
            process.on('error', reject);
        });
    }

    async testPythonImport(packageName) {
        try {
            await this.runPythonCommand(`import ${packageName}`);
            return true;
        } catch (error) {
            return false;
        }
    }

    async runPythonCommand(command) {
        return new Promise((resolve, reject) => {
            const process = spawn('python', ['-c', command], { stdio: 'pipe' });
            
            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Python command failed with code ${code}`));
                }
            });
            
            process.on('error', reject);
        });
    }

    displayResults() {
        console.log(chalk.blue('\n📊 Validation Results:'));
        console.log(`   ✅ Passed: ${chalk.green(this.results.passed)}`);
        console.log(`   ⚠️  Warnings: ${chalk.yellow(this.results.warnings)}`);
        console.log(`   ❌ Failed: ${chalk.red(this.results.failed)}`);
        
        if (this.results.failed === 0 && this.results.warnings === 0) {
            console.log(chalk.green('\n🎉 System is fully ready for development!'));
            console.log(chalk.blue('   Run: npm run dev'));
        } else if (this.results.failed === 0) {
            console.log(chalk.yellow('\n⚠️  System is ready with minor issues'));
            console.log(chalk.blue('   Run: npm run dev (warnings can be addressed later)'));
        } else {
            console.log(chalk.red('\n❌ System has critical issues that need to be fixed'));
            console.log(chalk.blue('   Fix the failed checks before running npm run dev'));
        }
        
        console.log(chalk.gray('\n💡 Tips:'));
        console.log('   • npm run setup - Install all dependencies');
        console.log('   • npm run cert:generate - Generate SSL certificates');
        console.log('   • npm run validate - Run this check again\n');
    }
}

// Polyfill fetch for older Node versions
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

// Run validation if called directly
if (require.main === module) {
    const validator = new SystemValidator();
    validator.validate().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = SystemValidator;