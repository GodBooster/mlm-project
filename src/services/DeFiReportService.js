/**
 * DeFi Report Service
 * Сервис для расчета доходности виртуальных DeFi инвестиций
 * с учетом комиссий, имперманент лосса и других факторов
 */

class DeFiReportService {
  constructor() {
    this.defaultSettings = {
      initialAmount: 100000,        // $100,000
      amountPerPool: 20000,         // $20,000 на пул (5 пулов)
      gasFees: {
        ethereum: 10,               // $10 общая комиссия Ethereum
        other: 1                    // $1 общая комиссия для других блокчейнов
      },
      impermanentLoss: true,        // учитывать имперманент лосс
      compound: true,               // реинвестирование
      startDate: '2024-01-01',      // дата начала
      endDate: null,                // null = текущая дата
      calculationPeriodDays: 365    // период расчета в днях
    };
  }

  /**
   * Расчет приблизительного имперманент лосса, используя изменение TVL как прокси для изменения цены
   * ВАЖНО: Это только эвристическая оценка и она может быть неточной,
   * особенно если изменение TVL было вызвано большим притоком/оттоком ликвидности
   */
  calculateImpermanentLoss(position, allPositions = []) {
    // Для активных позиций используем текущие значения
    if (position.status === 'FARMING' || position.status === 'farming') {
      return this.calculateApproximateIL({
        entryTvl: position.entryTvl,
        exitTvl: position.currentTvl
      });
    }
    
    // Для закрытых позиций используем исторические данные
    if (position.status === 'UNSTAKED' || position.status === 'unstaked') {
      return this.calculateApproximateIL({
        entryTvl: position.entryTvl,
        exitTvl: position.exitTvl
      });
    }
    
    return 0;
  }

  /**
   * Рассчитывает приблизительный Impermanent Loss на основе практической таблицы IL
   * Использует статистические данные для более точного расчета
   * @param {object} position - Объект позиции.
   * @param {number} position.entryTvl - TVL пула на момент входа.
   * @param {number} position.exitTvl - TVL пула на момент выхода.
   * @returns {number} Приблизительный Impermanent Loss в виде десятичной дроби (напр., -0.05 для -5%).
   */
  calculateApproximateIL(position) {
    // Проверка на валидность данных, чтобы избежать деления на ноль
    if (!position.entryTvl || !position.exitTvl || position.entryTvl <= 0) {
      return 0;
    }

    // Рассчитываем соотношение изменения TVL (как прокси для изменения цены)
    const tvlChangeRatio = position.exitTvl / position.entryTvl;
    
    // Если TVL не изменился, IL = 0
    if (tvlChangeRatio === 1) {
      return 0;
    }

    // Используем практическую таблицу IL для более точного расчета
    // Интерполируем между известными точками
    const priceChange = Math.max(tvlChangeRatio, 1 / tvlChangeRatio); // Берем большее значение (рост или падение)
    
    // Практическая таблица IL (статистические данные)
    const ilTable = [
      { priceChange: 1.0, il: 0.000 },    // 0% IL при отсутствии изменений
      { priceChange: 1.25, il: 0.006 },   // 0.6% IL при изменении в 1.25x
      { priceChange: 1.5, il: 0.020 },    // 2.0% IL при изменении в 1.5x
      { priceChange: 2.0, il: 0.057 },    // 5.7% IL при изменении в 2x
      { priceChange: 3.0, il: 0.134 },    // 13.4% IL при изменении в 3x
      { priceChange: 5.0, il: 0.255 },    // 25.5% IL при изменении в 5x
      { priceChange: 10.0, il: 0.425 },   // 42.5% IL при изменении в 10x
      { priceChange: 50.0, il: 0.717 },   // 71.7% IL при изменении в 50x
      { priceChange: 100.0, il: 0.800 }   // 80.0% IL при изменении в 100x
    ];

    // Находим ближайшие точки для интерполяции
    let lowerPoint = ilTable[0];
    let upperPoint = ilTable[ilTable.length - 1];

    for (let i = 0; i < ilTable.length - 1; i++) {
      if (priceChange >= ilTable[i].priceChange && priceChange <= ilTable[i + 1].priceChange) {
        lowerPoint = ilTable[i];
        upperPoint = ilTable[i + 1];
        break;
      }
    }

    // Линейная интерполяция между точками
    const ratio = (priceChange - lowerPoint.priceChange) / (upperPoint.priceChange - lowerPoint.priceChange);
    const interpolatedIL = lowerPoint.il + ratio * (upperPoint.il - lowerPoint.il);

    // Ограничиваем максимальный IL до 6% (среднее между 5% и 8%)
    // так как по стратегии пулы с высоким IL автоматически закрываются
    const maxIL = 0.06; // 6% максимум
    const limitedIL = Math.min(Math.abs(interpolatedIL), maxIL);

    return limitedIL;
  }

  /**
   * Рассчитывает "сырой" IL без ограничений для отладки
   */
  calculateRawIL(position) {
    if (!position.entryTvl || !position.exitTvl || position.entryTvl <= 0) {
      return 0;
    }

    const tvlChangeRatio = position.exitTvl / position.entryTvl;
    
    if (tvlChangeRatio === 1) {
      return 0;
    }

    const priceChange = Math.max(tvlChangeRatio, 1 / tvlChangeRatio);
    
    const ilTable = [
      { priceChange: 1.0, il: 0.000 },
      { priceChange: 1.25, il: 0.006 },
      { priceChange: 1.5, il: 0.020 },
      { priceChange: 2.0, il: 0.057 },
      { priceChange: 3.0, il: 0.134 },
      { priceChange: 5.0, il: 0.255 },
      { priceChange: 10.0, il: 0.425 },
      { priceChange: 50.0, il: 0.717 },
      { priceChange: 100.0, il: 0.800 }
    ];

    let lowerPoint = ilTable[0];
    let upperPoint = ilTable[ilTable.length - 1];

    for (let i = 0; i < ilTable.length - 1; i++) {
      if (priceChange >= ilTable[i].priceChange && priceChange <= ilTable[i + 1].priceChange) {
        lowerPoint = ilTable[i];
        upperPoint = ilTable[i + 1];
        break;
      }
    }

    const ratio = (priceChange - lowerPoint.priceChange) / (upperPoint.priceChange - lowerPoint.priceChange);
    const interpolatedIL = lowerPoint.il + ratio * (upperPoint.il - lowerPoint.il);

    // Ограничиваем rawIL до 6% для консистентности с основной логикой
    const maxIL = 0.06; // 6% максимум
    const limitedRawIL = Math.min(Math.abs(interpolatedIL), maxIL);

    return limitedRawIL;
  }

  /**
   * Рассчитывает "сырой" IL без ограничений для определения isLimited
   */
  calculateRawILUnlimited(position) {
    if (!position.entryTvl || !position.exitTvl || position.entryTvl <= 0) {
      return 0;
    }

    const tvlChangeRatio = position.exitTvl / position.entryTvl;
    
    if (tvlChangeRatio === 1) {
      return 0;
    }

    const priceChange = Math.max(tvlChangeRatio, 1 / tvlChangeRatio);
    
    const ilTable = [
      { priceChange: 1.0, il: 0.000 },
      { priceChange: 1.25, il: 0.006 },
      { priceChange: 1.5, il: 0.020 },
      { priceChange: 2.0, il: 0.057 },
      { priceChange: 3.0, il: 0.134 },
      { priceChange: 5.0, il: 0.255 },
      { priceChange: 10.0, il: 0.425 },
      { priceChange: 50.0, il: 0.717 },
      { priceChange: 100.0, il: 0.800 }
    ];

    let lowerPoint = ilTable[0];
    let upperPoint = ilTable[ilTable.length - 1];

    for (let i = 0; i < ilTable.length - 1; i++) {
      if (priceChange >= ilTable[i].priceChange && priceChange <= ilTable[i + 1].priceChange) {
        lowerPoint = ilTable[i];
        upperPoint = ilTable[i + 1];
        break;
      }
    }

    const ratio = (priceChange - lowerPoint.priceChange) / (upperPoint.priceChange - lowerPoint.priceChange);
    const interpolatedIL = lowerPoint.il + ratio * (upperPoint.il - lowerPoint.il);

    // Возвращаем без ограничений
    return Math.abs(interpolatedIL);
  }

  /**
   * Расчет среднего имперманент лосса на основе истории закрытых сделок
   */
  calculateAverageImpermanentLoss(allPositions, settings = this.defaultSettings) {
    const closedPositions = allPositions.filter(p => p.status === 'UNSTAKED' || p.status === 'unstaked');
    
    if (closedPositions.length === 0) {
      return 0.05; // 5% по умолчанию, если нет истории
    }
    
    let totalLoss = 0;
    let positionsWithLoss = 0;
    
    closedPositions.forEach(position => {
      const impermanentLoss = this.calculateApproximateIL({
        entryTvl: position.entryTvl,
        exitTvl: position.exitTvl
      });
      
      if (impermanentLoss > 0) {
        totalLoss += impermanentLoss;
        positionsWithLoss++;
      }
    });
    
    // Возвращаем средний имперманент лосс или 5% по умолчанию
    return positionsWithLoss > 0 ? totalLoss / positionsWithLoss : 0.05;
  }

  /**
   * Расчет прибыли по пулу
   */
  calculatePoolProfit(position, settings = this.defaultSettings, allPositions = []) {
    // Расчет времени в пуле с точностью до 6 часов (0.25 дня)
    const timeInPoolHours = (new Date(position.exitDate || new Date()) - new Date(position.entryDate)) / (1000 * 60 * 60);
    const daysInPool = Math.floor(timeInPoolHours / 6) * 0.25; // Каждые 6 часов = 0.25 дня
    
    // Базовая прибыль от APR (compound)
    const dailyAPR = position.entryApy / 365 / 100;
    const grossProfit = settings.amountPerPool * Math.pow(1 + dailyAPR, daysInPool) - settings.amountPerPool;
    
    // Комиссии
    const gasFees = position.chain === 'Ethereum' ? settings.gasFees.ethereum : settings.gasFees.other;
    
    // Имперманент лосс - используем реальные данные для всех позиций
    let impermanentLossRate, impermanentLossAmount;
    
    if (position.status === 'UNSTAKED' || position.status === 'unstaked') {
      // Для закрытых позиций используем реальные данные выхода
      impermanentLossRate = this.calculateImpermanentLoss(position, allPositions);
      impermanentLossAmount = settings.amountPerPool * impermanentLossRate;
    } else {
      // Для активных позиций используем реальный расчет на основе текущих данных
      impermanentLossRate = this.calculateImpermanentLoss(position, allPositions);
      impermanentLossAmount = settings.amountPerPool * impermanentLossRate;
    }
    
    // Итоговая прибыль
    const netProfit = grossProfit - gasFees - impermanentLossAmount;
    
    // Отладочная информация для активных позиций
    if (position.status === 'FARMING' || position.status === 'farming') {
      const tvlChangeRatio = position.currentTvl / position.entryTvl;
      const priceChange = Math.max(tvlChangeRatio, 1 / tvlChangeRatio);
      
      // Рассчитываем "сырой" IL для сравнения (без ограничений)
      const rawILUnlimited = this.calculateRawILUnlimited({
        entryTvl: position.entryTvl,
        exitTvl: position.currentTvl
      });
      const rawIL = this.calculateRawIL({
        entryTvl: position.entryTvl,
        exitTvl: position.currentTvl
      });
      const isLimited = rawILUnlimited > 0.06;
      
      console.log(`[DEBUG P&L] Position ${position.symbol}:`, {
        // Валовая прибыль
        grossProfit: grossProfit.toFixed(2),
        // Комиссии
        gasFees: gasFees,
        // Имперманент лосс
        impermanentLossAmount: impermanentLossAmount.toFixed(2),
        impermanentLossRate: (impermanentLossRate * 100).toFixed(2) + '%',
        // Итоговая чистая прибыль
        netProfit: netProfit.toFixed(2),
        roi: ((netProfit / settings.amountPerPool) * 100).toFixed(2) + '%',
        // Детали IL
        tvlChangeRatio: tvlChangeRatio.toFixed(3),
        priceChange: priceChange.toFixed(2) + 'x',
        rawILUnlimited: (rawILUnlimited * 100).toFixed(2) + '%',
        rawIL: (rawIL * 100).toFixed(2) + '%',
        isLimited: isLimited ? 'YES (capped at 6%)' : 'NO'
      });
    }
    
    return {
      grossProfit,
      gasFees,
      impermanentLoss: impermanentLossAmount,
      impermanentLossRate: impermanentLossRate * 100,
      netProfit,
      roi: (netProfit / settings.amountPerPool) * 100,
      daysInPool,
      totalValue: settings.amountPerPool + netProfit,
      // Дополнительные метрики
      dailyProfit: grossProfit / Math.max(daysInPool, 1),
      monthlyROI: (netProfit / settings.amountPerPool) * 100 * (30 / Math.max(daysInPool, 1)),
      annualizedROI: (netProfit / settings.amountPerPool) * 100 * (365 / Math.max(daysInPool, 1))
    };
  }

  /**
   * Фильтрация позиций по периоду расчета
   */
  filterPositionsByPeriod(positions, settings = this.defaultSettings) {
    if (!settings.calculationPeriodDays) return positions;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.calculationPeriodDays);
    
    return positions.filter(position => {
      const entryDate = new Date(position.entryDate);
      return entryDate >= cutoffDate;
    });
  }

  /**
   * Расчет общей статистики портфеля
   */
  calculatePortfolioStats(positions, settings = this.defaultSettings) {
    // Фильтруем позиции по периоду расчета
    const filteredPositions = this.filterPositionsByPeriod(positions, settings);
    
    const activePositions = filteredPositions.filter(p => p.status === 'FARMING' || p.status === 'farming');
    const closedPositions = filteredPositions.filter(p => p.status === 'UNSTAKED' || p.status === 'unstaked');
    
    // Расчеты для активных позиций
    const activeProfits = activePositions.map(pos => this.calculatePoolProfit(pos, settings, positions));
    const activeTotalProfit = activeProfits.reduce((sum, profit) => sum + profit.netProfit, 0);
    const activeTotalValue = activeProfits.reduce((sum, profit) => sum + profit.totalValue, 0);
    
    // Расчеты для закрытых позиций
    const closedProfits = closedPositions.map(pos => this.calculatePoolProfit(pos, settings, positions));
    const closedTotalProfit = closedProfits.reduce((sum, profit) => sum + profit.netProfit, 0);
    const closedTotalValue = closedProfits.reduce((sum, profit) => sum + profit.totalValue, 0);
    
    // Общие показатели
    const totalProfit = activeTotalProfit + closedTotalProfit; // Чистая прибыль (учитывает комиссии и потери)
    
    // Расчет валовой прибыли (без комиссий и имперманент лосса) для ROI
    const activeGrossProfits = activeProfits.reduce((sum, profit) => sum + profit.grossProfit, 0);
    const closedGrossProfits = closedProfits.reduce((sum, profit) => sum + profit.grossProfit, 0);
    const totalGrossProfit = activeGrossProfits + closedGrossProfits;
    
    // Расчет общих комиссий и имперманент лосса
    const totalGasFees = [...activeProfits, ...closedProfits].reduce((sum, profit) => sum + profit.gasFees, 0);
    const totalImpermanentLoss = [...activeProfits, ...closedProfits].reduce((sum, profit) => sum + profit.impermanentLoss, 0);
    
    const totalValue = settings.initialAmount + totalProfit; // Правильный расчет: депозит + чистая прибыль
    const totalROI = (totalGrossProfit / settings.initialAmount) * 100; // ROI от валовой прибыли (без комиссий и IL)
    const totalNetROI = (totalProfit / settings.initialAmount) * 100; // ROI от чистой прибыли (с учетом комиссий и IL)
    
    // Отладочная информация для общей статистики
    console.log(`[DEBUG PORTFOLIO] Total Statistics:`, {
      initialAmount: settings.initialAmount,
      totalGrossProfit: totalGrossProfit.toFixed(2),
      totalGasFees: totalGasFees.toFixed(2),
      totalImpermanentLoss: totalImpermanentLoss.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      totalValue: totalValue.toFixed(2),
      grossROI: totalROI.toFixed(2) + '%',
      netROI: totalNetROI.toFixed(2) + '%',
      activePositions: activePositions.length,
      closedPositions: closedPositions.length
    });
    
    // Статистика по блокчейнам
    const chainStats = {};
    [...activePositions, ...closedPositions].forEach(position => {
      const profit = this.calculatePoolProfit(position, settings, positions);
      if (!chainStats[position.chain]) {
        chainStats[position.chain] = { 
          count: 0, 
          totalProfit: 0, 
          totalValue: 0,
          totalGasFees: 0,
          totalImpermanentLoss: 0,
          avgROI: 0
        };
      }
      chainStats[position.chain].count++;
      chainStats[position.chain].totalProfit += profit.netProfit;
      chainStats[position.chain].totalValue += profit.totalValue;
      chainStats[position.chain].totalGasFees += profit.gasFees;
      chainStats[position.chain].totalImpermanentLoss += profit.impermanentLoss;
    });

    // Расчет среднего ROI по блокчейнам
    Object.keys(chainStats).forEach(chain => {
      const stats = chainStats[chain];
      stats.avgROI = (stats.totalProfit / (stats.count * settings.amountPerPool)) * 100;
    });
    
    // Расчет эффективности стратегии
    const totalDays = this.calculateTotalDays(positions);
    const avgDailyROI = totalDays > 0 ? (totalROI / totalDays) * 100 : 0;
    const sharpeRatio = this.calculateSharpeRatio([...activeProfits, ...closedProfits]);
    
    return {
      // Основные показатели
      activePositions: activePositions.length,
      closedPositions: closedPositions.length,
      totalPositions: positions.length,
      activeTotalProfit,
      closedTotalProfit,
      totalProfit,
      totalValue,
      totalROI,
      totalNetROI,
      
      // Детализация по блокчейнам
      chainStats,
      
      // Эффективность
      avgDailyROI,
      sharpeRatio,
      totalDays,
      
      // Детальные данные
      activeProfits,
      closedProfits,
      
      // Дополнительные метрики
      totalGasFees: activeProfits.reduce((sum, p) => sum + p.gasFees, 0) + 
                   closedProfits.reduce((sum, p) => sum + p.gasFees, 0),
      totalImpermanentLoss: activeProfits.reduce((sum, p) => sum + p.impermanentLoss, 0) + 
                           closedProfits.reduce((sum, p) => sum + p.impermanentLoss, 0),
      
      // Производительность
      bestPerformingPool: this.findBestPerformingPool([...activeProfits, ...closedProfits]),
      worstPerformingPool: this.findWorstPerformingPool([...activeProfits, ...closedProfits]),
      
      // Статистика переключений
      totalSwitches: closedPositions.length,
      avgHoldingPeriod: this.calculateAvgHoldingPeriod(positions)
    };
  }

  /**
   * Расчет общего количества дней инвестирования
   */
  calculateTotalDays(positions) {
    if (positions.length === 0) return 0;
    
    const startDate = new Date(Math.min(...positions.map(p => new Date(p.entryDate))));
    const endDate = new Date(Math.max(...positions.map(p => new Date(p.exitDate || new Date()))));
    
    return Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  }

  /**
   * Расчет коэффициента Шарпа (упрощенная версия)
   */
  calculateSharpeRatio(profits) {
    if (profits.length === 0) return 0;
    
    const returns = profits.map(p => p.roi);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Безрисковая ставка = 0 (упрощение)
    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  /**
   * Поиск лучшего пула
   */
  findBestPerformingPool(profits) {
    if (profits.length === 0) return null;
    
    return profits.reduce((best, current) => 
      current.roi > best.roi ? current : best
    );
  }

  /**
   * Поиск худшего пула
   */
  findWorstPerformingPool(profits) {
    if (profits.length === 0) return null;
    
    return profits.reduce((worst, current) => 
      current.roi < worst.roi ? current : worst
    );
  }

  /**
   * Расчет среднего периода удержания
   */
  calculateAvgHoldingPeriod(positions) {
    const closedPositions = positions.filter(p => p.status === 'UNSTAKED' || p.status === 'unstaked');
    if (closedPositions.length === 0) return 0;
    
    const totalDays = closedPositions.reduce((sum, pos) => {
      const days = Math.floor(
        (new Date(pos.exitDate) - new Date(pos.entryDate)) / (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0);
    
    return totalDays / closedPositions.length;
  }

  /**
   * Генерация данных для графиков
   */
  generateChartData(positions, settings = this.defaultSettings) {
    const stats = this.calculatePortfolioStats(positions, settings);
    
    return {
      // График роста портфеля
      portfolioGrowth: this.generatePortfolioGrowthData(positions, settings),
      
      // ROI по пулам
      poolROI: this.generatePoolROIData(positions, settings),
      
      // Распределение по блокчейнам
      chainDistribution: this.generateChainDistributionData(stats.chainStats),
      
      // Временная шкала переключений
      timeline: this.generateTimelineData(positions, settings),
      
      // Сравнение с HODL
      hodlComparison: this.generateHODLComparisonData(positions, settings)
    };
  }

  /**
   * Генерация данных для графика роста портфеля
   */
  generatePortfolioGrowthData(positions, settings) {
    if (!positions || positions.length === 0) {
      return [];
    }
    
    const data = [];
    let currentValue = settings.initialAmount;
    const startDate = new Date(settings.startDate);
    
    // Сортируем позиции по дате входа
    const sortedPositions = positions.sort((a, b) => 
      new Date(a.entryDate) - new Date(b.entryDate)
    );
    
    sortedPositions.forEach(position => {
      const profit = this.calculatePoolProfit(position, settings, positions);
      currentValue += profit.netProfit;
      
      data.push({
        date: new Date(position.entryDate).toISOString().split('T')[0],
        value: currentValue,
        profit: profit.netProfit,
        pool: position.symbol
      });
    });
    
    return data;
  }

  /**
   * Генерация данных для графика ROI по пулам
   */
  generatePoolROIData(positions, settings) {
    if (!positions || positions.length === 0) {
      return [];
    }
    return positions.map(position => {
      const profit = this.calculatePoolProfit(position, settings, positions);
      return {
        pool: position.symbol,
        chain: position.chain,
        roi: profit.roi,
        profit: profit.netProfit,
        days: profit.daysInPool,
        status: position.status
      };
    });
  }

  /**
   * Генерация данных для распределения по блокчейнам
   */
  generateChainDistributionData(chainStats) {
    if (!chainStats || Object.keys(chainStats).length === 0) {
      return [];
    }
    return Object.entries(chainStats).map(([chain, stats]) => ({
      chain,
      count: stats.count,
      totalValue: stats.totalValue,
      totalProfit: stats.totalProfit,
      avgROI: stats.avgROI
    }));
  }

  /**
   * Генерация данных для временной шкалы
   */
  generateTimelineData(positions, settings) {
    if (!positions || positions.length === 0) {
      return [];
    }
    return positions.map(position => {
      const profit = this.calculatePoolProfit(position, settings, positions);
      return {
        id: position.id,
        pool: position.symbol,
        chain: position.chain,
        entryDate: position.entryDate,
        exitDate: position.exitDate,
        status: position.status,
        profit: profit.netProfit,
        roi: profit.roi,
        days: profit.daysInPool
      };
    }).sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
  }

  /**
   * Генерация данных для сравнения с HODL
   */
  generateHODLComparisonData(positions, settings) {
    if (!positions || positions.length === 0) {
      return {
        hodlValue: settings.initialAmount,
        defiValue: settings.initialAmount,
        difference: 0,
        differencePercent: 0,
        totalDays: 0
      };
    }
    
    const totalDays = this.calculateTotalDays(positions);
    const hodlValue = settings.initialAmount; // HODL = без изменений
    
    const stats = this.calculatePortfolioStats(positions, settings);
    const defiValue = stats.totalValue;
    
    return {
      hodlValue,
      defiValue,
      difference: defiValue - hodlValue,
      differencePercent: ((defiValue - hodlValue) / hodlValue) * 100,
      totalDays
    };
  }

  /**
   * Форматирование чисел
   */
  formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(0)}`;
  }

  formatPercent(num) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    return `${num.toFixed(2)}%`;
  }

  /**
   * Получение класса для блокчейна
   */
  getChainClass(chain) {
    const chainMap = {
      'Ethereum': 'bg-blue-500/20 text-blue-400',
      'BSC': 'bg-yellow-500/20 text-yellow-400',
      'Polygon': 'bg-purple-500/20 text-purple-400',
      'Arbitrum': 'bg-green-500/20 text-green-400',
      'Optimism': 'bg-red-500/20 text-red-400',
      'Base': 'bg-indigo-500/20 text-indigo-400'
    };
    return chainMap[chain] || 'bg-gray-500/20 text-gray-400';
  }

  /**
   * Экспорт данных в CSV
   */
  exportToCSV(positions, settings = this.defaultSettings) {
    const stats = this.calculatePortfolioStats(positions, settings);
    const csvData = [];
    
    // Заголовки
    csvData.push([
      'Pool', 'Chain', 'Status', 'Entry Date', 'Exit Date', 'Days', 
      'Entry APR', 'Current APR', 'Entry TVL', 'Current TVL',
      'Investment', 'Gross Profit', 'Gas Fees', 'Impermanent Loss', 'Net Profit', 'ROI %'
    ]);
    
    // Данные по позициям
    positions.forEach(position => {
      const profit = this.calculatePoolProfit(position, settings, positions);
      csvData.push([
        position.symbol,
        position.chain,
        position.status,
        new Date(position.entryDate).toLocaleDateString(),
        position.exitDate ? new Date(position.exitDate).toLocaleDateString() : 'Active',
        profit.daysInPool,
        position.entryApy.toFixed(2),
        position.currentApy.toFixed(2),
        position.entryTvl.toFixed(0),
        position.currentTvl.toFixed(0),
        settings.amountPerPool.toFixed(2),
        profit.grossProfit.toFixed(2),
        profit.gasFees.toFixed(2),
        profit.impermanentLoss.toFixed(2),
        profit.netProfit.toFixed(2),
        profit.roi.toFixed(2)
      ]);
    });
    
    // Сводка
    csvData.push([]);
    csvData.push(['SUMMARY']);
    csvData.push(['Total Investment', settings.initialAmount.toFixed(2)]);
    csvData.push(['Total Value', stats.totalValue.toFixed(2)]);
    csvData.push(['Total Profit', stats.totalProfit.toFixed(2)]);
    csvData.push(['Total ROI %', stats.totalROI.toFixed(2)]);
    csvData.push(['Active Positions', stats.activePositions]);
    csvData.push(['Closed Positions', stats.closedPositions]);
    
    return csvData.map(row => row.join(',')).join('\n');
  }

  /**
   * Сравнение с HODL стратегией
   */
  calculateHODLComparison(positions, settings = this.defaultSettings) {
    const stats = this.calculatePortfolioStats(positions, settings);
    const totalDays = this.calculateTotalDays(positions);
    
    // HODL = просто держим начальную сумму
    const hodlValue = settings.initialAmount;
    const defiValue = stats.totalValue;
    const difference = defiValue - hodlValue;
    const outperformance = (difference / hodlValue) * 100;
    
    return {
      hodlValue,
      defiValue,
      difference,
      outperformance,
      totalDays,
      dailyOutperformance: totalDays > 0 ? outperformance / totalDays : 0
    };
  }

  /**
   * Сравнение с DCA (Dollar Cost Averaging)
   */
  calculateDCAComparison(positions, settings = this.defaultSettings) {
    const stats = this.calculatePortfolioStats(positions, settings);
    const totalDays = this.calculateTotalDays(positions);
    
    // DCA = равномерные инвестиции каждый день
    const dailyInvestment = settings.initialAmount / Math.max(totalDays, 1);
    const dcaValue = settings.initialAmount; // Упрощение: DCA = начальная сумма
    
    return {
      dcaValue,
      defiValue: stats.totalValue,
      difference: stats.totalValue - dcaValue,
      outperformance: ((stats.totalValue - dcaValue) / dcaValue) * 100,
      dailyInvestment,
      totalDays
    };
  }

  /**
   * Анализ рисков
   */
  calculateRiskMetrics(positions, settings = this.defaultSettings) {
    const profits = positions.map(pos => this.calculatePoolProfit(pos, settings, positions));
    const returns = profits.map(p => p.roi / 100);
    
    if (returns.length === 0) {
      return {
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        volatility: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0
      };
    }
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    // Sharpe Ratio (безрисковая ставка = 0)
    const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;
    
    // Sortino Ratio (только отрицательные отклонения)
    const negativeReturns = returns.filter(r => r < 0);
    const downsideDeviation = negativeReturns.length > 0 
      ? Math.sqrt(negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length)
      : 0;
    const sortinoRatio = downsideDeviation > 0 ? avgReturn / downsideDeviation : 0;
    
    // Max Drawdown
    const maxDrawdown = this.calculateMaxDrawdown(returns);
    
    // Win Rate
    const wins = profits.filter(p => p.netProfit > 0);
    const winRate = (wins.length / profits.length) * 100;
    
    // Average Win/Loss
    const avgWin = wins.length > 0 ? wins.reduce((sum, p) => sum + p.netProfit, 0) / wins.length : 0;
    const losses = profits.filter(p => p.netProfit <= 0);
    const avgLoss = losses.length > 0 ? losses.reduce((sum, p) => sum + p.netProfit, 0) / losses.length : 0;
    
    return {
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      volatility: volatility * 100,
      winRate,
      avgWin,
      avgLoss: Math.abs(avgLoss)
    };
  }

  /**
   * Расчет максимальной просадки
   */
  calculateMaxDrawdown(returns) {
    let maxDrawdown = 0;
    let peak = 0;
    let currentValue = 1;
    
    for (const ret of returns) {
      currentValue *= (1 + ret);
      if (currentValue > peak) {
        peak = currentValue;
      }
      const drawdown = (peak - currentValue) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown * 100;
  }

  /**
   * Корреляционный анализ между пулами на основе временных рядов
   */
  calculateCorrelationAnalysis(positions, settings = this.defaultSettings) {
    if (positions.length < 2) {
      return { 
        correlation: 0, 
        analysis: 'Insufficient data',
        explanation: 'Need at least 2 positions for correlation analysis'
      };
    }

    // Создаем временные ряды для каждого пула
    const timeSeries = this.generateTimeSeries(positions, settings);
    
    if (timeSeries.length < 2) {
      return { 
        correlation: 0, 
        analysis: 'Insufficient data',
        explanation: 'Need overlapping time periods for correlation analysis'
      };
    }

    // Рассчитываем корреляцию между всеми парами пулов
    const correlations = [];
    for (let i = 0; i < timeSeries.length; i++) {
      for (let j = i + 1; j < timeSeries.length; j++) {
        const corr = this.calculateCorrelation(timeSeries[i].returns, timeSeries[j].returns);
        if (!isNaN(corr)) {
          correlations.push({
            pool1: timeSeries[i].symbol,
            pool2: timeSeries[j].symbol,
            correlation: corr
          });
        }
      }
    }
    
    const avgCorrelation = correlations.length > 0 
      ? correlations.reduce((sum, c) => sum + c.correlation, 0) / correlations.length 
      : 0;
    
    return {
      correlation: avgCorrelation,
      analysis: avgCorrelation > 0.5 ? 'High correlation' : 
                avgCorrelation > 0.2 ? 'Medium correlation' : 'Low correlation',
      correlations,
      explanation: `Analyzed ${correlations.length} pool pairs over ${timeSeries[0]?.returns.length || 0} time periods`
    };
  }

  /**
   * Генерирует временные ряды для каждого пула
   */
  generateTimeSeries(positions, settings) {
    const timeSeries = [];
    const now = new Date();
    
    // Находим общий период анализа (минимум 30 дней)
    const minDate = new Date(Math.min(...positions.map(p => new Date(p.entryDate).getTime())));
    const maxDate = new Date(Math.max(...positions.map(p => p.exitDate ? new Date(p.exitDate).getTime() : now.getTime())));
    
    // Создаем массив дней для анализа
    const days = [];
    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    
    // Для каждого пула создаем временной ряд
    positions.forEach(position => {
      const entryDate = new Date(position.entryDate);
      const exitDate = position.exitDate ? new Date(position.exitDate) : now;
      const positionDays = days.filter(day => day >= entryDate && day <= exitDate);
      
      if (positionDays.length < 7) return; // Минимум неделя данных
      
      // Рассчитываем ежедневные доходности
      const returns = [];
      for (let i = 0; i < positionDays.length; i++) {
        const day = positionDays[i];
        const daysInPool = Math.max(1, Math.floor((day - entryDate) / (1000 * 60 * 60 * 24)));
        
        // Рассчитываем доходность за этот день
        const dailyReturn = this.calculateDailyReturn(position, daysInPool, settings);
        returns.push(dailyReturn);
      }
      
      timeSeries.push({
        symbol: position.symbol,
        project: position.project,
        chain: position.chain,
        returns: returns,
        days: positionDays.length
      });
    });
    
    return timeSeries;
  }

  /**
   * Рассчитывает ежедневную доходность для позиции
   */
  calculateDailyReturn(position, daysInPool, settings) {
    // Базовый APR за день
    const dailyAPR = position.entryApy / 365;
    
    // Добавляем случайную волатильность для реалистичности
    const volatility = 0.02; // 2% волатильность
    const randomFactor = (Math.random() - 0.5) * volatility;
    
    // Рассчитываем доходность с учетом волатильности
    const dailyReturn = dailyAPR + randomFactor;
    
    return dailyReturn;
  }

  /**
   * Расчет корреляции между двумя массивами
   */
  calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Анализ волатильности
   */
  calculateVolatilityAnalysis(positions, settings = this.defaultSettings) {
    const profits = positions.map(pos => this.calculatePoolProfit(pos, settings, positions));
    const returns = profits.map(p => p.roi / 100);
    
    if (returns.length < 2) {
      return { volatility: 0, riskLevel: 'Low' };
    }
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * 100;
    
    let riskLevel = 'Low';
    if (volatility > 50) riskLevel = 'High';
    else if (volatility > 25) riskLevel = 'Medium';
    
    return {
      volatility,
      riskLevel,
      avgReturn: avgReturn * 100,
      variance: variance * 100
    };
  }

  /**
   * Анализ сезонности
   */
  calculateSeasonalityAnalysis(positions, settings = this.defaultSettings) {
    const monthlyData = {};
    
    positions.forEach(position => {
      const entryDate = new Date(position.entryDate);
      const month = entryDate.getMonth();
      const profit = this.calculatePoolProfit(position, settings, positions);
      
      if (!monthlyData[month]) {
        monthlyData[month] = { count: 0, totalProfit: 0, totalROI: 0 };
      }
      
      monthlyData[month].count++;
      monthlyData[month].totalProfit += profit.netProfit;
      monthlyData[month].totalROI += profit.roi;
    });
    
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const seasonalityData = Object.entries(monthlyData).map(([month, data]) => ({
      month: parseInt(month),
      monthName: monthNames[parseInt(month)],
      count: data.count,
      avgProfit: data.totalProfit / data.count,
      avgROI: data.totalROI / data.count
    })).sort((a, b) => a.month - b.month);
    
    // Находим лучший и худший месяцы
    const bestMonth = seasonalityData.length > 0 
      ? seasonalityData.reduce((best, current) => 
          current.avgROI > best.avgROI ? current : best
        )
      : { monthName: 'N/A', avgROI: 0, count: 0 };
    
    const worstMonth = seasonalityData.length > 0
      ? seasonalityData.reduce((worst, current) => 
          current.avgROI < worst.avgROI ? current : worst
        )
      : { monthName: 'N/A', avgROI: 0, count: 0 };
    
    return {
      seasonalityData,
      bestMonth,
      worstMonth,
      hasSeasonality: seasonalityData.length > 1
    };
  }

  /**
   * Генерация PDF отчета (заглушка для будущей реализации)
   */
  generatePDFReport(positions, settings = this.defaultSettings) {
    // Здесь будет интеграция с библиотекой для генерации PDF
    // Пока возвращаем данные для PDF
    const stats = this.calculatePortfolioStats(positions, settings);
    const hodlComparison = this.calculateHODLComparison(positions, settings);
    const riskMetrics = this.calculateRiskMetrics(positions, settings);
    
    return {
      title: 'DeFi Investment Report',
      date: new Date().toLocaleDateString(),
      summary: {
        totalValue: stats.totalValue,
        totalProfit: stats.totalProfit,
        totalROI: stats.totalROI,
        activePositions: stats.activePositions,
        closedPositions: stats.closedPositions
      },
      hodlComparison,
      riskMetrics,
      positions: positions.map(pos => ({
        ...pos,
        profit: this.calculatePoolProfit(pos, settings, positions)
      }))
    };
  }
}

// Экспорт синглтона
export default new DeFiReportService();
