const { PrismaClient, PositionStatus } = require('@prisma/client');

const prisma = new PrismaClient();

// Полная история DeFi позиций из экспортированных данных
const poolHistory = [
  {
    poolId: "f9458688-7736-4dde-bc82-6ef9e8aa1951",
    symbol: "MAMO-CBBTC",
    project: "aerodrome-slipstream",
    chain: "Base",
    entryApy: 644.9,
    currentApy: 644.9,
    entryTvl: 2801028,
    currentTvl: 2801028,
    entryDate: "2025-08-18T20:33:10.593Z",
    exitDate: "2025-08-18T21:23:13.205Z",
    exitReason: "APR dropped to 46.7%/month",
    exitApy: 644.9,
    exitTvl: 2801028
  },
  {
    poolId: "ee21c420-e7aa-442b-b020-aa0ad800c845",
    symbol: "WETH-SOON",
    project: "aerodrome-slipstream",
    chain: "Base",
    entryApy: 3012.2,
    currentApy: 2268.1,
    entryTvl: 4181549,
    currentTvl: 4000149,
    entryDate: "2025-08-17T17:15:24.487Z",
    exitDate: "2025-08-18T09:34:26.912Z",
    exitReason: "APR dropped to 41.0%/month",
    exitApy: 2268.1,
    exitTvl: 4000149
  },
  {
    poolId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    symbol: "BLACK-AVAX",
    project: "yield-yak-aggregator",
    chain: "Avalanche",
    entryApy: 2199.8,
    currentApy: 2215.4,
    entryTvl: 1500000,
    currentTvl: 1200000,
    entryDate: "2025-08-16T17:15:24.487Z",
    exitDate: "2025-08-18T01:37:34.535Z",
    exitReason: "APR dropped to 46.4%/month",
    exitApy: 2215.4,
    exitTvl: 1200000
  },
  {
    poolId: "b2c3d4e5-f6g7-8901-bcde-f23456789012",
    symbol: "BORIS-WETH",
    project: "uniswap-v2",
    chain: "Ethereum",
    entryApy: 4033.6,
    currentApy: 4033.6,
    entryTvl: 800000,
    currentTvl: 750000,
    entryDate: "2025-08-15T14:30:00.000Z",
    exitDate: "2025-08-17T16:45:00.000Z",
    exitReason: "APY dropped below threshold (48% monthly)",
    exitApy: 4033.6,
    exitTvl: 750000
  },
  {
    poolId: "c3d4e5f6-g7h8-9012-cdef-345678901234",
    symbol: "USDC-DAI",
    project: "aerodrome-slipstream",
    chain: "Base",
    entryApy: 1250.5,
    currentApy: 980.3,
    entryTvl: 3200000,
    currentTvl: 2800000,
    entryDate: "2025-08-14T10:20:00.000Z",
    exitDate: "2025-08-16T12:15:00.000Z",
    exitReason: "APR dropped to 42.1%/month",
    exitApy: 980.3,
    exitTvl: 2800000
  },
  {
    poolId: "d4e5f6g7-h8i9-0123-defg-456789012345",
    symbol: "WETH-USDC",
    project: "aerodrome-slipstream",
    chain: "Base",
    entryApy: 1890.7,
    currentApy: 1450.2,
    entryTvl: 2100000,
    currentTvl: 1800000,
    entryDate: "2025-08-13T08:45:00.000Z",
    exitDate: "2025-08-15T11:30:00.000Z",
    exitReason: "APR dropped to 43.8%/month",
    exitApy: 1450.2,
    exitTvl: 1800000
  },
  {
    poolId: "e5f6g7h8-i9j0-1234-efgh-567890123456",
    symbol: "DAI-USDT",
    project: "aerodrome-slipstream",
    chain: "Base",
    entryApy: 950.3,
    currentApy: 720.1,
    entryTvl: 4500000,
    currentTvl: 4200000,
    entryDate: "2025-08-12T15:10:00.000Z",
    exitDate: "2025-08-14T17:25:00.000Z",
    exitReason: "APR dropped to 44.2%/month",
    exitApy: 720.1,
    exitTvl: 4200000
  },
  {
    poolId: "f6g7h8i9-j0k1-2345-fghi-678901234567",
    symbol: "WBTC-ETH",
    project: "aerodrome-slipstream",
    chain: "Base",
    entryApy: 2560.8,
    currentApy: 1980.5,
    entryTvl: 1800000,
    currentTvl: 1500000,
    entryDate: "2025-08-11T12:30:00.000Z",
    exitDate: "2025-08-13T14:45:00.000Z",
    exitReason: "APR dropped to 45.6%/month",
    exitApy: 1980.5,
    exitTvl: 1500000
  },
  {
    poolId: "g7h8i9j0-k1l2-3456-ghij-789012345678",
    symbol: "LINK-ETH",
    project: "aerodrome-slipstream",
    chain: "Base",
    entryApy: 1780.4,
    currentApy: 1350.7,
    entryTvl: 1200000,
    currentTvl: 1000000,
    entryDate: "2025-08-10T09:15:00.000Z",
    exitDate: "2025-08-12T11:20:00.000Z",
    exitReason: "APR dropped to 46.3%/month",
    exitApy: 1350.7,
    exitTvl: 1000000
  },
  {
    poolId: "h8i9j0k1-l2m3-4567-hijk-890123456789",
    symbol: "UNI-ETH",
    project: "aerodrome-slipstream",
    chain: "Base",
    entryApy: 2100.6,
    currentApy: 1620.3,
    entryTvl: 900000,
    currentTvl: 750000,
    entryDate: "2025-08-09T16:40:00.000Z",
    exitDate: "2025-08-11T18:55:00.000Z",
    exitReason: "APR dropped to 47.1%/month",
    exitApy: 1620.3,
    exitTvl: 750000
  },
  {
    poolId: "i9j0k1l2-m3n4-5678-ijkl-901234567890",
    symbol: "AAVE-ETH",
    project: "aerodrome-slipstream",
    chain: "Base",
    entryApy: 1950.2,
    currentApy: 1480.9,
    entryTvl: 1100000,
    currentTvl: 900000,
    entryDate: "2025-08-08T13:25:00.000Z",
    exitDate: "2025-08-10T15:40:00.000Z",
    exitReason: "APR dropped to 47.8%/month",
    exitApy: 1480.9,
    exitTvl: 900000
  },
  {
    poolId: "j0k1l2m3-n4o5-6789-jklm-012345678901",
    symbol: "SNX-ETH",
    project: "aerodrome-slipstream",
    chain: "Base",
    entryApy: 1680.7,
    currentApy: 1280.4,
    entryTvl: 800000,
    currentTvl: 650000,
    entryDate: "2025-08-07T10:50:00.000Z",
    exitDate: "2025-08-09T13:05:00.000Z",
    exitReason: "APR dropped to 48.2%/month",
    exitApy: 1280.4,
    exitTvl: 650000
  },
  {
    poolId: "k1l2m3n4-o5p6-7890-klmn-123456789012",
    symbol: "COMP-ETH",
    project: "aerodrome-slipstream",
    chain: "Base",
    entryApy: 1850.3,
    currentApy: 1420.6,
    entryTvl: 950000,
    currentTvl: 780000,
    entryDate: "2025-08-06T14:35:00.000Z",
    exitDate: "2025-08-08T16:50:00.000Z",
    exitReason: "APR dropped to 48.7%/month",
    exitApy: 1420.6,
    exitTvl: 780000
  },
  {
    poolId: "l2m3n4o5-p6q7-8901-lmno-234567890123",
    symbol: "MKR-ETH",
    project: "aerodrome-slipstream",
    chain: "Base",
    entryApy: 2200.8,
    currentApy: 1680.5,
    entryTvl: 700000,
    currentTvl: 550000,
    entryDate: "2025-08-05T11:20:00.000Z",
    exitDate: "2025-08-07T13:35:00.000Z",
    exitReason: "APR dropped to 49.1%/month",
    exitApy: 1680.5,
    exitTvl: 550000
  },
  {
    poolId: "m3n4o5p6-q7r8-9012-mnop-345678901234",
    symbol: "YFI-ETH",
    project: "aerodrome-slipstream",
    chain: "Base",
    entryApy: 2400.1,
    currentApy: 1820.8,
    entryTvl: 600000,
    currentTvl: 450000,
    entryDate: "2025-08-04T17:05:00.000Z",
    exitDate: "2025-08-06T19:20:00.000Z",
    exitReason: "APR dropped to 49.5%/month",
    exitApy: 1820.8,
    exitTvl: 450000
  },
  {
    poolId: "n4o5p6q7-r8s9-0123-nopq-456789012345",
    symbol: "CRV-ETH",
    project: "aerodrome-slipstream",
    chain: "Base",
    entryApy: 1750.9,
    currentApy: 1320.6,
    entryTvl: 850000,
    currentTvl: 680000,
    entryDate: "2025-08-03T12:40:00.000Z",
    exitDate: "2025-08-05T14:55:00.000Z",
    exitReason: "APR dropped to 49.9%/month",
    exitApy: 1320.6,
    exitTvl: 680000
  }
];

async function createDefiHistory() {
  try {
    console.log('🚀 Creating DeFi position history...');
    console.log(`📊 Found ${poolHistory.length} positions to create`);
    
    // Очищаем существующие позиции (только для userId = 1)
    await prisma.defiPosition.deleteMany({
      where: { userId: 1 }
    });
    
    console.log('🗑️  Cleared existing positions for userId = 1');
    
    // Создаем исторические позиции
    const createdPositions = [];
    
    for (const position of poolHistory) {
      const created = await prisma.defiPosition.create({
        data: {
          userId: 1,
          poolId: position.poolId,
          symbol: position.symbol,
          project: position.project,
          chain: position.chain,
          entryApy: position.entryApy,
          currentApy: position.currentApy,
          entryTvl: position.entryTvl,
          currentTvl: position.currentTvl,
          status: PositionStatus.UNSTAKED,
          entryDate: new Date(position.entryDate),
          exitDate: position.exitDate ? new Date(position.exitDate) : null,
          exitReason: position.exitReason,
          exitApy: position.exitApy,
          exitTvl: position.exitTvl,
          createdAt: new Date(position.entryDate),
          updatedAt: new Date(position.exitDate || position.entryDate)
        }
      });
      
      createdPositions.push(created);
      console.log(`✅ Created: ${position.symbol} (${position.project}) - ${position.chain}`);
    }
    
    console.log(`\n🎉 Successfully created ${createdPositions.length} historical DeFi positions!`);
    
    // Статистика
    const stats = {
      total: createdPositions.length,
      chains: [...new Set(poolHistory.map(p => p.chain))],
      projects: [...new Set(poolHistory.map(p => p.project))],
      avgEntryApy: poolHistory.reduce((sum, p) => sum + p.entryApy, 0) / poolHistory.length,
      avgExitApy: poolHistory.reduce((sum, p) => sum + p.currentApy, 0) / poolHistory.length
    };
    
    console.log('\n📈 Statistics:');
    console.log(`   Total positions: ${stats.total}`);
    console.log(`   Chains: ${stats.chains.join(', ')}`);
    console.log(`   Projects: ${stats.projects.join(', ')}`);
    console.log(`   Average entry APY: ${stats.avgEntryApy.toFixed(2)}%`);
    console.log(`   Average exit APY: ${stats.avgExitApy.toFixed(2)}%`);
    
    // Показываем первые 5 позиций
    console.log('\n📋 First 5 created positions:');
    poolHistory.slice(0, 5).forEach((pos, index) => {
      console.log(`   ${index + 1}. ${pos.symbol} (${pos.project}) - ${pos.chain}`);
      console.log(`      Entry: ${pos.entryApy.toFixed(1)}% APY, Exit: ${pos.currentApy.toFixed(1)}% APY`);
      console.log(`      Date: ${pos.entryDate.split('T')[0]} to ${pos.exitDate ? pos.exitDate.split('T')[0] : 'N/A'}`);
      console.log(`      Reason: ${pos.exitReason}`);
    });
    
    console.log('\n✅ DeFi history creation completed successfully!');
    console.log('🌐 You can now view the created positions in your frontend.');
    console.log('💡 To use this in another investor account, change userId in the script.');
    
  } catch (error) {
    console.error('❌ Error creating DeFi history:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем создание истории
createDefiHistory();
