#!/usr/bin/env node

/**
 * Cross-platform development server for BookTarr
 * Replaces platform-specific .bat/.ps1 files
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('cross-spawn');
const detectPort = require('detect-port');
const chalk = require('chalk');
const ora = require('ora');

class BookTarrDevServer {
    constructor() {
        this.processes = new Map();
        this.config = {
            backendPort: 8000,
            frontendPort: 3000,
            frontendDir: path.join(__dirname, '../frontend'),
            backendDir: path.join(__dirname, '../backend'),
        };
    }

    async start() {
        console.log(chalk.blue('🚀 Starting BookTarr Development Environment\n'));
        
        try {
            // 1. Detect and configure network
            await this.configureNetwork();
            
            // 2. Generate SSL certificates if needed
            await this.ensureSSLCertificates();
            
            // 3. Start backend server
            await this.startBackend();
            
            // 4. Start frontend server
            await this.startFrontend();
            
            // 5. Display status
            this.displayStatus();
            
            // 6. Handle cleanup
            this.setupCleanup();
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to start development server:'), error.message);
            process.exit(1);
        }
    }

    async configureNetwork() {
        const spinner = ora('Configuring network settings...').start();
        
        try {
            // Get the best network IP
            const networkIPs = this.getNetworkIPs();
            const primaryIP = this.selectPrimaryIP(networkIPs);
            
            this.config.primaryIP = primaryIP;
            
            // Update frontend proxy configuration
            await this.updateFrontendProxy(primaryIP);
            
            spinner.succeed(`Network configured for IP: ${primaryIP}`);
        } catch (error) {
            spinner.fail('Failed to configure network');
            throw error;
        }
    }

    getNetworkIPs() {
        const os = require('os');
        const interfaces = os.networkInterfaces();
        const ips = [];
        
        for (const [name, addrs] of Object.entries(interfaces)) {
            for (const addr of addrs) {
                if (addr.family === 'IPv4' && !addr.internal) {
                    ips.push({ name, address: addr.address, ...addr });
                }
            }
        }
        
        return ips;
    }

    selectPrimaryIP(ips) {
        // Priority: 192.168.x.x > 10.x.x.x > 172.16-31.x.x > others
        const priorities = [
            /^192\.168\./,
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
            /./
        ];
        
        for (const pattern of priorities) {
            const match = ips.find(ip => pattern.test(ip.address));
            if (match) {
                return match.address;
            }
        }
        
        return 'localhost';
    }

    async updateFrontendProxy(ip) {
        const packageJsonPath = path.join(this.config.frontendDir, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error('Frontend package.json not found');
        }
        
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        pkg.proxy = `http://${ip}:${this.config.backendPort}`;
        
        fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
        
        // Update .env file
        const envPath = path.join(this.config.frontendDir, '.env');
        const envContent = [
            'HOST=0.0.0.0',
            'HTTPS=true',
            'REACT_APP_API_URL=',
            'REACT_APP_VERSION=$npm_package_version',
            'REACT_APP_ENABLE_PWA=true',
            'REACT_APP_ENABLE_ANALYTICS=false'
        ].join('\n') + '\n';
        
        fs.writeFileSync(envPath, envContent);
    }

    async ensureSSLCertificates() {
        const spinner = ora('Checking SSL certificates...').start();
        
        try {
            const certPath = path.join(this.config.frontendDir, 'certs');
            const keyFile = path.join(certPath, 'localhost-key.pem');
            const certFile = path.join(certPath, 'localhost.pem');
            
            if (!fs.existsSync(keyFile) || !fs.existsSync(certFile)) {
                spinner.text = 'Generating SSL certificates...';
                await this.generateSSLCertificates();
                spinner.succeed('SSL certificates generated');
            } else {
                spinner.succeed('SSL certificates found');
            }
        } catch (error) {
            spinner.fail('SSL certificate setup failed');
            // Continue without HTTPS for development
            console.warn(chalk.yellow('⚠️  Continuing without HTTPS'));
        }
    }

    async generateSSLCertificates() {
        const forge = require('node-forge');
        
        // Generate key pair
        const keys = forge.pki.rsa.generateKeyPair(2048);
        
        // Create certificate
        const cert = forge.pki.createCertificate();
        cert.publicKey = keys.publicKey;
        cert.serialNumber = '01';
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
        
        const attrs = [
            { name: 'countryName', value: 'US' },
            { name: 'organizationName', value: 'BookTarr Development' },
            { name: 'commonName', value: 'localhost' }
        ];
        
        cert.setSubject(attrs);
        cert.setIssuer(attrs);
        
        // Add Subject Alternative Names for all possible access methods
        cert.setExtensions([
            {
                name: 'subjectAltName',
                altNames: [
                    { type: 2, value: 'localhost' },
                    { type: 2, value: this.config.primaryIP },
                    { type: 7, ip: '127.0.0.1' },
                    { type: 7, ip: this.config.primaryIP }
                ]
            }
        ]);
        
        // Sign certificate
        cert.sign(keys.privateKey);
        
        // Save certificates
        const certDir = path.join(this.config.frontendDir, 'certs');
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir, { recursive: true });
        }
        
        fs.writeFileSync(
            path.join(certDir, 'localhost-key.pem'),
            forge.pki.privateKeyToPem(keys.privateKey)
        );
        
        fs.writeFileSync(
            path.join(certDir, 'localhost.pem'),
            forge.pki.certificateToPem(cert)
        );
    }

    async startBackend() {
        const spinner = ora('Starting backend server...').start();
        
        try {
            // Check if port is available
            const availablePort = await detectPort(this.config.backendPort);
            if (availablePort !== this.config.backendPort) {
                throw new Error(`Backend port ${this.config.backendPort} is already in use`);
            }
            
            // Start Python backend
            const backendProcess = spawn('python', ['main.py'], {
                cwd: this.config.backendDir,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, PYTHONPATH: this.config.backendDir }
            });
            
            this.processes.set('backend', backendProcess);
            
            // Wait for backend to be ready
            await this.waitForBackend();
            
            spinner.succeed('Backend server started');
        } catch (error) {
            spinner.fail('Backend server failed to start');
            throw error;
        }
    }

    async startFrontend() {
        const spinner = ora('Starting frontend server...').start();
        
        try {
            // Check if port is available
            const availablePort = await detectPort(this.config.frontendPort);
            if (availablePort !== this.config.frontendPort) {
                throw new Error(`Frontend port ${this.config.frontendPort} is already in use`);
            }
            
            // Start React frontend
            const frontendProcess = spawn('npm', ['start'], {
                cwd: this.config.frontendDir,
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });
            
            this.processes.set('frontend', frontendProcess);
            
            // Wait for frontend to be ready
            await this.waitForFrontend();
            
            spinner.succeed('Frontend server started');
        } catch (error) {
            spinner.fail('Frontend server failed to start');
            throw error;
        }
    }

    async waitForBackend(timeout = 30000) {
        const start = Date.now();
        
        while (Date.now() - start < timeout) {
            try {
                const response = await fetch(`http://localhost:${this.config.backendPort}/api/health`);
                if (response.ok) {
                    return;
                }
            } catch (error) {
                // Continue waiting
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error('Backend health check timeout');
    }

    async waitForFrontend(timeout = 60000) {
        const start = Date.now();
        
        while (Date.now() - start < timeout) {
            try {
                const response = await fetch(`https://localhost:${this.config.frontendPort}`, {
                    method: 'HEAD',
                    headers: { 'Accept': 'text/html' }
                });
                if (response.ok) {
                    return;
                }
            } catch (error) {
                // Continue waiting
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        throw new Error('Frontend startup timeout');
    }

    displayStatus() {
        console.log(chalk.green('\n🎉 BookTarr Development Environment Started!'));
        console.log(chalk.blue('\n📋 Access URLs:'));
        console.log(`   Desktop:  ${chalk.cyan(`https://localhost:${this.config.frontendPort}`)}`);
        console.log(`   Mobile:   ${chalk.cyan(`https://${this.config.primaryIP}:${this.config.frontendPort}`)}`);
        console.log(`   Backend:  ${chalk.cyan(`http://localhost:${this.config.backendPort}`)}`);
        
        console.log(chalk.blue('\n🔧 Development Info:'));
        console.log(`   Frontend: React with hot reload`);
        console.log(`   Backend:  FastAPI with auto-reload`);
        console.log(`   Database: SQLite (booktarr.db)`);
        console.log(`   Network:  ${this.config.primaryIP} (auto-detected)`);
        
        console.log(chalk.yellow('\n📱 Mobile Usage:'));
        console.log('   1. Navigate to the mobile URL above');
        console.log('   2. Accept the security certificate warning');
        console.log('   3. Camera scanning will work via HTTPS');
        
        console.log(chalk.gray('\n⚠️  Note: Press Ctrl+C to stop all servers\n'));
    }

    setupCleanup() {
        const cleanup = () => {
            console.log(chalk.yellow('\n🛑 Shutting down development servers...'));
            
            for (const [name, process] of this.processes) {
                try {
                    process.kill('SIGTERM');
                    console.log(`   ✓ Stopped ${name} server`);
                } catch (error) {
                    console.log(`   ✗ Failed to stop ${name} server:`, error.message);
                }
            }
            
            console.log(chalk.green('✨ Cleanup complete\n'));
            process.exit(0);
        };
        
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('uncaughtException', (error) => {
            console.error(chalk.red('Uncaught exception:'), error);
            cleanup();
        });
    }
}

// Polyfill fetch for older Node versions
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

// Start the development server
if (require.main === module) {
    const server = new BookTarrDevServer();
    server.start().catch((error) => {
        console.error(chalk.red('Failed to start development server:'), error);
        process.exit(1);
    });
}

module.exports = BookTarrDevServer;