#!/usr/bin/env node

/**
 * Cross-platform SSL certificate generation for BookTarr
 * Generates self-signed certificates for HTTPS development
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const ora = require('ora');

class CertificateGenerator {
    constructor() {
        this.certDir = path.join(__dirname, '../certs');
        this.frontendCertDir = path.join(__dirname, '../frontend/certs');
    }

    async generate() {
        console.log(chalk.blue('🔐 Generating SSL certificates for HTTPS development\n'));
        
        try {
            // Get network information
            const networkInfo = this.getNetworkInfo();
            
            // Generate certificates
            await this.generateCertificates(networkInfo);
            
            // Copy to frontend directory
            this.copyCertificates();
            
            console.log(chalk.green('✅ SSL certificates generated successfully!'));
            this.displayUsage(networkInfo);
            
        } catch (error) {
            console.error(chalk.red('❌ Certificate generation failed:'), error.message);
            process.exit(1);
        }
    }

    getNetworkInfo() {
        const interfaces = os.networkInterfaces();
        const ips = ['127.0.0.1', 'localhost'];
        
        for (const [name, addrs] of Object.entries(interfaces)) {
            for (const addr of addrs) {
                if (addr.family === 'IPv4' && !addr.internal) {
                    ips.push(addr.address);
                }
            }
        }
        
        return {
            ips: [...new Set(ips)], // Remove duplicates
            hostnames: ['localhost', 'booktarr.local', '*.local']
        };
    }

    async generateCertificates(networkInfo) {
        const spinner = ora('Generating RSA key pair and certificate...').start();
        
        try {
            const forge = require('node-forge');
            
            // Generate 2048-bit RSA key pair
            const keys = forge.pki.rsa.generateKeyPair(2048);
            
            // Create certificate
            const cert = forge.pki.createCertificate();
            cert.publicKey = keys.publicKey;
            cert.serialNumber = '01';
            
            // Set validity period (1 year)
            cert.validity.notBefore = new Date();
            cert.validity.notAfter = new Date();
            cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
            
            // Set certificate attributes
            const attrs = [
                { name: 'countryName', value: 'US' },
                { name: 'stateOrProvinceName', value: 'Development' },
                { name: 'localityName', value: 'Local' },
                { name: 'organizationName', value: 'BookTarr Development' },
                { name: 'organizationalUnitName', value: 'Development Team' },
                { name: 'commonName', value: 'localhost' }
            ];
            
            cert.setSubject(attrs);
            cert.setIssuer(attrs); // Self-signed
            
            // Add extensions for better browser compatibility
            const altNames = [];
            
            // Add hostnames
            for (const hostname of networkInfo.hostnames) {
                altNames.push({ type: 2, value: hostname }); // DNS name
            }
            
            // Add IP addresses
            for (const ip of networkInfo.ips) {
                if (ip === 'localhost') continue; // Skip non-IP
                altNames.push({ type: 7, ip }); // IP address
            }
            
            cert.setExtensions([
                {
                    name: 'basicConstraints',
                    cA: true
                },
                {
                    name: 'keyUsage',
                    keyCertSign: true,
                    digitalSignature: true,
                    nonRepudiation: true,
                    keyEncipherment: true,
                    dataEncipherment: true
                },
                {
                    name: 'extKeyUsage',
                    serverAuth: true,
                    clientAuth: true
                },
                {
                    name: 'subjectAltName',
                    altNames
                }
            ]);
            
            // Sign the certificate
            cert.sign(keys.privateKey, forge.md.sha256.create());
            
            // Create certificate directories
            if (!fs.existsSync(this.certDir)) {
                fs.mkdirSync(this.certDir, { recursive: true });
            }
            
            // Convert to PEM format
            const privatePem = forge.pki.privateKeyToPem(keys.privateKey);
            const certPem = forge.pki.certificateToPem(cert);
            
            // Save certificates
            fs.writeFileSync(path.join(this.certDir, 'booktarr-key.pem'), privatePem);
            fs.writeFileSync(path.join(this.certDir, 'booktarr-cert.pem'), certPem);
            
            // Also save with common names for compatibility
            fs.writeFileSync(path.join(this.certDir, 'localhost-key.pem'), privatePem);
            fs.writeFileSync(path.join(this.certDir, 'localhost.pem'), certPem);
            
            // Save certificate info
            const certInfo = {
                generated: new Date().toISOString(),
                expires: cert.validity.notAfter.toISOString(),
                subject: attrs,
                altNames: altNames.map(alt => alt.value || alt.ip),
                fingerprint: forge.md.sha256.create().update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()).digest().toHex()
            };
            
            fs.writeFileSync(
                path.join(this.certDir, 'cert-info.json'),
                JSON.stringify(certInfo, null, 2)
            );
            
            spinner.succeed('Certificate generated and saved');
            
        } catch (error) {
            spinner.fail('Certificate generation failed');
            throw error;
        }
    }

    copyCertificates() {
        const spinner = ora('Copying certificates to frontend...').start();
        
        try {
            if (!fs.existsSync(this.frontendCertDir)) {
                fs.mkdirSync(this.frontendCertDir, { recursive: true });
            }
            
            // Copy certificate files
            const files = ['booktarr-key.pem', 'booktarr-cert.pem', 'localhost-key.pem', 'localhost.pem', 'cert-info.json'];
            
            for (const file of files) {
                const src = path.join(this.certDir, file);
                const dest = path.join(this.frontendCertDir, file);
                
                if (fs.existsSync(src)) {
                    fs.copyFileSync(src, dest);
                }
            }
            
            spinner.succeed('Certificates copied to frontend');
            
        } catch (error) {
            spinner.fail('Failed to copy certificates');
            throw error;
        }
    }

    displayUsage(networkInfo) {
        console.log(chalk.blue('\n📋 Certificate Details:'));
        console.log(`   Location: ${this.certDir}`);
        console.log(`   Valid for: 1 year`);
        console.log(`   Type: Self-signed RSA 2048-bit`);
        
        console.log(chalk.blue('\n🌐 Valid for these addresses:'));
        networkInfo.ips.forEach(ip => {
            console.log(`   • https://${ip}:3000`);
        });
        
        console.log(chalk.yellow('\n📱 Mobile Usage:'));
        console.log('   1. Navigate to your mobile IP (shown above)');
        console.log('   2. Accept the security warning (self-signed certificate)');
        console.log('   3. Camera access will work via HTTPS');
        
        console.log(chalk.gray('\n⚠️  Browser Security Warnings:'));
        console.log('   - Chrome: Click "Advanced" → "Proceed to localhost"');
        console.log('   - Firefox: Click "Advanced" → "Accept Risk and Continue"');
        console.log('   - Safari: Click "Show Details" → "visit this website"');
        console.log('   - Mobile: Tap "Advanced" → "Proceed"');
        
        console.log(chalk.blue('\n🔧 Environment Variables:'));
        console.log('   HTTPS=true (automatically set)');
        console.log('   SSL_CRT_FILE=certs/booktarr-cert.pem');
        console.log('   SSL_KEY_FILE=certs/booktarr-key.pem\n');
    }

    clean() {
        console.log(chalk.yellow('🧹 Cleaning SSL certificates...'));
        
        const dirs = [this.certDir, this.frontendCertDir];
        
        for (const dir of dirs) {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
                console.log(`   ✓ Removed ${path.relative(process.cwd(), dir)}`);
            }
        }
        
        console.log(chalk.green('✨ SSL certificates cleaned\n'));
    }
}

// Command line interface
if (require.main === module) {
    const command = process.argv[2];
    const generator = new CertificateGenerator();
    
    switch (command) {
        case 'clean':
            generator.clean();
            break;
        case 'generate':
        default:
            generator.generate();
            break;
    }
}

module.exports = CertificateGenerator;