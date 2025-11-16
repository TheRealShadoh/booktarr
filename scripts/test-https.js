#!/usr/bin/env node

/**
 * Test HTTPS certificate configuration
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class HTTPSTestor {
    constructor() {
        this.certDir = path.join(__dirname, '../frontend/certs');
    }

    async test() {
        console.log(chalk.blue('🔍 Testing HTTPS Certificate Configuration\n'));

        try {
            // 1. Check certificate files exist
            this.checkCertificateFiles();

            // 2. Load and verify certificate
            this.verifyCertificate();

            // 3. Check certificate validity
            this.checkValidity();

            // 4. Display certificate info
            this.displayInfo();

            console.log(chalk.green('\n✅ HTTPS configuration is valid and ready to use!\n'));

        } catch (error) {
            console.error(chalk.red('\n❌ HTTPS configuration test failed:'), error.message);
            console.log(chalk.yellow('\n💡 Run: npm run cert:generate\n'));
            process.exit(1);
        }
    }

    checkCertificateFiles() {
        const spinner = require('ora')('Checking certificate files...').start();

        const requiredFiles = [
            'localhost-key.pem',
            'localhost.pem',
            'cert-info.json'
        ];

        for (const file of requiredFiles) {
            const filePath = path.join(this.certDir, file);
            if (!fs.existsSync(filePath)) {
                spinner.fail(`Missing certificate file: ${file}`);
                throw new Error(`Certificate file not found: ${file}`);
            }
        }

        spinner.succeed('Certificate files found');
    }

    verifyCertificate() {
        const spinner = require('ora')('Verifying certificate...').start();

        try {
            const certPath = path.join(this.certDir, 'localhost.pem');
            const certContent = fs.readFileSync(certPath, 'utf8');

            // Basic validation
            if (!certContent.includes('BEGIN CERTIFICATE')) {
                throw new Error('Invalid certificate format');
            }

            if (!certContent.includes('END CERTIFICATE')) {
                throw new Error('Incomplete certificate');
            }

            spinner.succeed('Certificate format is valid');

        } catch (error) {
            spinner.fail('Certificate verification failed');
            throw error;
        }
    }

    checkValidity() {
        const spinner = require('ora')('Checking certificate validity...').start();

        try {
            const infoPath = path.join(this.certDir, 'cert-info.json');
            const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));

            const expiresDate = new Date(info.expires);
            const now = new Date();

            if (expiresDate < now) {
                spinner.fail('Certificate has expired');
                throw new Error(`Certificate expired on ${expiresDate.toLocaleDateString()}`);
            }

            const daysUntilExpiry = Math.floor((expiresDate - now) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry < 30) {
                spinner.warn(`Certificate expires in ${daysUntilExpiry} days`);
                console.log(chalk.yellow('   Consider regenerating soon: npm run cert:generate'));
            } else {
                spinner.succeed(`Certificate valid for ${daysUntilExpiry} days`);
            }

        } catch (error) {
            spinner.fail('Validity check failed');
            throw error;
        }
    }

    displayInfo() {
        const infoPath = path.join(this.certDir, 'cert-info.json');
        const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));

        console.log(chalk.blue('\n📋 Certificate Information:'));
        console.log(`   Generated: ${new Date(info.generated).toLocaleString()}`);
        console.log(`   Expires:   ${new Date(info.expires).toLocaleString()}`);

        console.log(chalk.blue('\n🌐 Valid for these addresses:'));
        info.altNames.forEach(name => {
            console.log(`   • ${name}`);
        });

        console.log(chalk.blue('\n🔑 Certificate Details:'));
        console.log(`   Common Name: ${info.subject.find(s => s.name === 'commonName')?.value}`);
        console.log(`   Organization: ${info.subject.find(s => s.name === 'organizationName')?.value}`);
        console.log(`   Fingerprint: ${info.fingerprint.substring(0, 16)}...`);
    }
}

if (require.main === module) {
    const tester = new HTTPSTestor();
    tester.test();
}

module.exports = HTTPSTestor;
