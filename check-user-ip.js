#!/usr/bin/env node

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserIP() {
  console.log('🔍 Checking user IP tracking...\n');

  try {
    // Проверяем в основной таблице User
    console.log('1️⃣ Checking User table...');
    const user = await prisma.user.findUnique({
      where: { email: 'mintcoinsorg@gmail.com' },
      select: {
        id: true,
        email: true,
        username: true,
        registrationIp: true,
        lastLoginIp: true,
        createdAt: true,
        lastLogin: true
      }
    });

    if (user) {
      console.log('✅ User found in User table:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Registration IP: ${user.registrationIp || 'NULL'}`);
      console.log(`   Last Login IP: ${user.lastLoginIp || 'NULL'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   Last Login: ${user.lastLogin || 'Never'}`);
    } else {
      console.log('❌ User not found in User table');
    }

    // Проверяем в PendingRegistration
    console.log('\n2️⃣ Checking PendingRegistration table...');
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: 'mintcoinsorg@gmail.com' },
      select: {
        id: true,
        email: true,
        username: true,
        registrationIp: true,
        createdAt: true,
        expiresAt: true
      }
    });

    if (pending) {
      console.log('✅ User found in PendingRegistration table:');
      console.log(`   ID: ${pending.id}`);
      console.log(`   Email: ${pending.email}`);
      console.log(`   Username: ${pending.username}`);
      console.log(`   Registration IP: ${pending.registrationIp || 'NULL'}`);
      console.log(`   Created: ${pending.createdAt}`);
      console.log(`   Expires: ${pending.expiresAt}`);
      console.log(`   Is Expired: ${new Date() > pending.expiresAt ? 'YES' : 'NO'}`);
    } else {
      console.log('❌ User not found in PendingRegistration table');
    }

    // Проверяем все записи с IP
    console.log('\n3️⃣ All users with IP tracking:');
    const usersWithIP = await prisma.user.findMany({
      where: {
        OR: [
          { registrationIp: { not: null } },
          { lastLoginIp: { not: null } }
        ]
      },
      select: {
        email: true,
        registrationIp: true,
        lastLoginIp: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`📊 Found ${usersWithIP.length} users with IP tracking:`);
    usersWithIP.forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.email}`);
      console.log(`      Registration IP: ${u.registrationIp || 'NULL'}`);
      console.log(`      Last Login IP: ${u.lastLoginIp || 'NULL'}`);
    });

    // Проверяем PendingRegistration с IP
    console.log('\n4️⃣ All pending registrations with IP:');
    const pendingWithIP = await prisma.pendingRegistration.findMany({
      where: {
        registrationIp: { not: null }
      },
      select: {
        email: true,
        registrationIp: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`📊 Found ${pendingWithIP.length} pending registrations with IP:`);
    pendingWithIP.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.email} - IP: ${p.registrationIp}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserIP();
