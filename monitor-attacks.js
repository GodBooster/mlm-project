#!/usr/bin/env node

import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🛡️  Security Attack Monitor');
console.log('='.repeat(50));

// Паттерны атак для мониторинга
const attackPatterns = [
    /\.env/i,
    /\.git/i,
    /\.config/i,
    /\.\.\/\.\./i,  // Path traversal
    /smtp.*\.(env|json|config)/i,
    /mail.*\.(env|json|config)/i,
    /sendgrid.*\.(env|json|config)/i,
    /etc\/passwd/i,
    /proc\/self/i,
    /wp-admin/i,
    /phpmyadmin/i,
    /adminer/i,
    /\.sql/i,
    /\.bak/i,
    /\.backup/i
];

// Подозрительные IP адреса
const suspiciousIPs = new Set();

async function checkPM2Logs() {
    try {
        console.log('📊 Checking PM2 logs for attacks...');
        
        const { stdout } = await execAsync('pm2 logs mlm-backend --lines 100 --nostream');
        
        let attackCount = 0;
        const attacks = [];
        
        stdout.split('\n').forEach(line => {
            if (line.includes('GET /') || line.includes('POST /')) {
                const urlMatch = line.match(/GET\s+([^\s]+)|POST\s+([^\s]+)/);
                if (urlMatch) {
                    const url = urlMatch[1] || urlMatch[2];
                    
                    // Проверяем на паттерны атак
                    for (const pattern of attackPatterns) {
                        if (pattern.test(url)) {
                            attackCount++;
                            attacks.push({
                                url,
                                pattern: pattern.toString(),
                                timestamp: new Date().toISOString()
                            });
                            
                            // Извлекаем IP адрес
                            const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+)/);
                            if (ipMatch) {
                                suspiciousIPs.add(ipMatch[1]);
                            }
                            break;
                        }
                    }
                }
            }
        });
        
        console.log(`🚨 Found ${attackCount} potential attacks`);
        
        if (attacks.length > 0) {
            console.log('\n📋 Attack Details:');
            attacks.forEach((attack, index) => {
                console.log(`${index + 1}. URL: ${attack.url}`);
                console.log(`   Pattern: ${attack.pattern}`);
                console.log(`   Time: ${attack.timestamp}`);
            });
        }
        
        if (suspiciousIPs.size > 0) {
            console.log('\n🌐 Suspicious IP Addresses:');
            suspiciousIPs.forEach(ip => {
                console.log(`   - ${ip}`);
            });
        }
        
        return { attackCount, attacks, suspiciousIPs: Array.from(suspiciousIPs) };
        
    } catch (error) {
        console.error('❌ Error checking PM2 logs:', error.message);
        return { attackCount: 0, attacks: [], suspiciousIPs: [] };
    }
}

async function generateSecurityReport() {
    const result = await checkPM2Logs();
    
    const report = {
        timestamp: new Date().toISOString(),
        totalAttacks: result.attackCount,
        attacks: result.attacks,
        suspiciousIPs: result.suspiciousIPs,
        recommendations: []
    };
    
    if (result.attackCount > 10) {
        report.recommendations.push('🚨 HIGH ATTACK VOLUME: Consider implementing additional security measures');
    }
    
    if (result.suspiciousIPs.length > 5) {
        report.recommendations.push('🌐 MULTIPLE SUSPICIOUS IPS: Consider blocking these IPs in firewall');
    }
    
    if (result.attacks.some(a => a.url.includes('..'))) {
        report.recommendations.push('⚠️ PATH TRAVERSAL DETECTED: Ensure proper input validation');
    }
    
    if (result.attacks.some(a => a.url.includes('.env'))) {
        report.recommendations.push('🔒 ENV FILE ACCESS ATTEMPTS: Ensure .env files are properly protected');
    }
    
    // Сохраняем отчет
    const reportFile = `security-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log('\n📄 Security report saved to:', reportFile);
    
    if (report.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        report.recommendations.forEach(rec => console.log(rec));
    }
    
    return report;
}

// Запускаем мониторинг
generateSecurityReport().catch(console.error);
