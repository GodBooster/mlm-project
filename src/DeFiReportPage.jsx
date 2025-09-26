import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Settings, 
  RefreshCw,
  Calendar,
  PieChart,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Percent,
  Download,
  FileText,
  BarChart2,
  Shield,
  TrendingUp as TrendingUpIcon,
  Target
} from 'lucide-react';
import DeFiReportService from './services/DeFiReportService';
import PDFReportService from './services/PDFReportService';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const DeFiReportPage = () => {
  const [positions, setPositions] = useState([]);
  const [reportSettings, setReportSettings] = useState({
    initialAmount: 100000,        // $100,000
    maxActivePositions: 5,        // 5 пулов
    amountPerPool: 20000,         // $20,000 на пул
    gasFees: {
      ethereum: 10,               // $10 за депозит/вывод
      other: 1                    // $1 для других блокчейнов
    },
    impermanentLoss: true,        // учитывать имперманент лосс
    compound: true,               // реинвестирование
    startDate: '2024-01-01',      // дата начала
    endDate: null,                // null = текущая дата
    minMonthlyAPR: 50,            // минимум 50% в месяц
    minTVL: 500000,               // минимум $500K TVL
    exitMonthlyAPR: 48,           // выход при падении ниже 48%
    exitTVL: 450000,              // выход при падении ниже $450K
    calculationPeriodDays: 365    // период расчета в днях
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [chartType, setChartType] = useState('portfolio'); // portfolio, roi, distribution, metrics
  const [currencyMode, setCurrencyMode] = useState('dollar'); // dollar, percent
  const [timeRange, setTimeRange] = useState('all'); // 24h, 7d, 1m, all
  const [activityFeed, setActivityFeed] = useState([]);


  // Используем сервис для расчетов
  const calculatePoolProfit = (position) => {
    return DeFiReportService.calculatePoolProfit(position, reportSettings, positions);
  };

  // Расчет текущей годовой доходности (APY) на основе активных позиций
  const calculateCurrentAPY = () => {
    const activePositions = positions.filter(p => p.status === 'FARMING' || p.status === 'farming');
    if (activePositions.length === 0) return 0;
    
    // Средневзвешенная APY по активным позициям
    const totalInvestment = activePositions.length * reportSettings.amountPerPool;
    const weightedAPY = activePositions.reduce((sum, position) => {
      return sum + (position.currentApy * reportSettings.amountPerPool);
    }, 0);
    
    return weightedAPY / totalInvestment;
  };

  // Функция для фильтрации данных по времени
  const filterDataByTimeRange = (data, timeRange) => {
    if (!data || data.length === 0) return data;
    
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        return data;
    }
    
    return data.filter(item => {
      const itemDate = new Date(item.date || item.entryDate);
      return itemDate >= startDate;
    });
  };

  // Функция для генерации Activity Feed
  const generateActivityFeed = (positions) => {
    const activities = [];
    const now = new Date();
    
    // Сортируем позиции по дате входа
    const sortedPositions = [...positions].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
    
    sortedPositions.forEach((position, index) => {
      const entryTime = new Date(position.entryDate);
      const exitTime = position.exitDate ? new Date(position.exitDate) : null;
      const profit = calculatePoolProfit(position);
      
      // Вход в пул
      activities.push({
        id: `entry_${position.id}`,
        type: 'entry',
        time: entryTime,
        symbol: position.symbol,
        project: position.project,
        chain: position.chain,
        apr: position.entryApy,
        reason: `APR > ${reportSettings.minMonthlyAPR}%`,
        color: 'green'
      });
      
      // Выход из пула (если есть)
      if (exitTime) {
        const exitReason = profit.netProfit < 0 
          ? `Stop-Loss triggered (${profit.roi.toFixed(1)}%)`
          : `APR < ${reportSettings.exitMonthlyAPR}%`;
        
        activities.push({
          id: `exit_${position.id}`,
          type: 'exit',
          time: exitTime,
          symbol: position.symbol,
          project: position.project,
          chain: position.chain,
          profit: profit.netProfit,
          roi: profit.roi,
          reason: exitReason,
          color: profit.netProfit < 0 ? 'red' : 'yellow'
        });
      }
      
      // Реинвестирование прибыли (каждые 7 дней)
      if (profit.netProfit > 0) {
        const reinvestTime = new Date(entryTime.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (reinvestTime <= now) {
          activities.push({
            id: `reinvest_${position.id}`,
            type: 'reinvest',
            time: reinvestTime,
            amount: profit.netProfit * 0.1, // 10% реинвестируется
            color: 'blue'
          });
        }
      }
    });
    
    // Ребалансировка (каждые 3 дня)
    for (let i = 0; i < 30; i += 3) {
      const rebalanceTime = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      if (rebalanceTime >= new Date(sortedPositions[0]?.entryDate || now)) {
        activities.push({
          id: `rebalance_${i}`,
          type: 'rebalance',
          time: rebalanceTime,
          color: 'yellow'
        });
      }
    }
    
    // Сортируем по времени (новые сверху)
    return activities.sort((a, b) => b.time - a.time).slice(0, 20);
  };

  // Загрузка позиций
  const loadPositions = async () => {
    try {
      setLoading(true);
      console.log('DeFiReportPage: Fetching from API:', `${API}/api/defi-positions/system`);
      const response = await fetch(`${API}/api/defi-positions/system`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('DeFiReportPage: API response status:', response.status);
      console.log('DeFiReportPage: API response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('DeFiReportPage: Received data:', data);
        console.log('DeFiReportPage: Data length:', data ? data.length : 'undefined');
        setPositions(data);
        setLastUpdate(new Date());
        // Генерируем Activity Feed
        setActivityFeed(generateActivityFeed(data));
      } else {
        console.error('DeFiReportPage: API error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('DeFiReportPage: Error response:', errorText);
      }
    } catch (error) {
      console.error('DeFiReportPage: Error loading positions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Расчет общей статистики через сервис
  const reportStats = useMemo(() => {
    console.log('DeFiReportPage: Recalculating reportStats with settings:', reportSettings);
    const stats = DeFiReportService.calculatePortfolioStats(positions, reportSettings);
    console.log('DeFiReportPage: Calculated stats:', stats);
    return stats;
  }, [positions, reportSettings]);

  // Дополнительные расчеты
  const advancedAnalytics = useMemo(() => {
    // Проверяем, есть ли данные
    if (!positions || positions.length === 0) {
      console.log('DeFiReportPage: No positions available for advanced analytics');
      return {
        hodlComparison: { hodlValue: 0, defiValue: 0, difference: 0, outperformance: 0, totalDays: 0, dailyOutperformance: 0 },
        dcaComparison: { dcaValue: 0, defiValue: 0, difference: 0, outperformance: 0, dailyInvestment: 0, totalDays: 0 },
        riskMetrics: { sharpeRatio: 0, sortinoRatio: 0, maxDrawdown: 0, volatility: 0, winRate: 0, avgWin: 0, avgLoss: 0, avgWinLossRatio: 0 },
        correlationAnalysis: { correlation: 0, analysis: 'No data' },
        volatilityAnalysis: { volatility: 0, riskLevel: 'Low', avgReturn: 0, variance: 0 },
        seasonalityAnalysis: { seasonalityData: [], bestMonth: { monthName: 'N/A', avgROI: 0, count: 0 }, worstMonth: { monthName: 'N/A', avgROI: 0, count: 0 }, hasSeasonality: false }
      };
    }

    console.log('DeFiReportPage: Calculating advanced analytics for', positions.length, 'positions');
    const analytics = {
      hodlComparison: DeFiReportService.calculateHODLComparison(positions, reportSettings),
      dcaComparison: DeFiReportService.calculateDCAComparison(positions, reportSettings),
      riskMetrics: DeFiReportService.calculateRiskMetrics(positions, reportSettings),
      correlationAnalysis: DeFiReportService.calculateCorrelationAnalysis(positions, reportSettings),
      volatilityAnalysis: DeFiReportService.calculateVolatilityAnalysis(positions, reportSettings),
      seasonalityAnalysis: DeFiReportService.calculateSeasonalityAnalysis(positions, reportSettings)
    };
    
    console.log('DeFiReportPage: Advanced analytics calculated:', analytics);
    return analytics;
  }, [positions, reportSettings]);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadPositions();
    
    // Загружаем сохраненные настройки
    const savedSettings = localStorage.getItem('defiReportSettings');
    if (savedSettings) {
      setReportSettings(JSON.parse(savedSettings));
    }
    
    const savedCurrencyMode = localStorage.getItem('defiReportCurrencyMode');
    if (savedCurrencyMode) {
      setCurrencyMode(savedCurrencyMode);
    }
  }, []);

  // Сохранение настроек при изменении
  useEffect(() => {
    console.log('DeFiReportPage: Settings changed:', reportSettings);
    localStorage.setItem('defiReportSettings', JSON.stringify(reportSettings));
  }, [reportSettings]);

  useEffect(() => {
    localStorage.setItem('defiReportCurrencyMode', currencyMode);
  }, [currencyMode]);

  // Используем функции форматирования из сервиса
  const formatNumber = DeFiReportService.formatNumber;
  const formatPercent = DeFiReportService.formatPercent;
  const getChainClass = DeFiReportService.getChainClass;

  // Функции экспорта
  const exportToCSV = () => {
    const csvData = DeFiReportService.exportToCSV(positions, reportSettings);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `defi-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    try {
      setLoading(true);
      console.log('Starting PDF generation...');
      
      // Prepare data for PDF
      const pdfData = {
        totalValue: reportStats.totalValue || 0,
        totalProfit: reportStats.totalProfit || 0,
        totalROI: reportStats.totalROI || 0,
        activePositions: reportStats.activePositions || 0,
        closedPositions: reportStats.closedPositions || 0,
        chainStats: reportStats.chainStats || {}
      };

      console.log('PDF Data prepared:', pdfData);
      console.log('Positions count:', positions.length);
      console.log('Advanced Analytics:', advancedAnalytics);

      // Generate PDF
      const doc = await PDFReportService.generatePDFReport(
        pdfData,
        positions,
        reportSettings,
        currencyMode,
        advancedAnalytics
      );

      console.log('PDF document created successfully');

      // Save PDF
      const fileName = `DeFi_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      console.log('PDF saved successfully:', fileName);
      alert('PDF report generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      console.error('Error stack:', error.stack);
      alert(`Error generating PDF report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Генерация данных для графиков
  const chartData = useMemo(() => {
    if (!positions || positions.length === 0) {
      console.log('DeFiReportPage: No positions, returning empty chart data');
      return {
        portfolioGrowth: [],
        poolROI: [],
        chainDistribution: [],
        timeline: [],
        hodlComparison: { hodlValue: 0, defiValue: 0, difference: 0, differencePercent: 0, totalDays: 0 }
      };
    }
    console.log('DeFiReportPage: Recalculating chart data with settings:', reportSettings);
    const data = DeFiReportService.generateChartData(positions, reportSettings);
    console.log('DeFiReportPage: Generated chart data:', data);
    return data;
  }, [positions, reportSettings]);

  // Отдельные данные для Portfolio Growth с фильтрацией по времени
  const portfolioGrowthData = useMemo(() => {
    if (!positions || positions.length === 0) return chartData.portfolioGrowth;
    
    const filteredPositions = filterDataByTimeRange(positions, timeRange);
    const filteredChartData = DeFiReportService.generateChartData(filteredPositions, reportSettings);
    return filteredChartData.portfolioGrowth;
  }, [positions, reportSettings, timeRange, chartData.portfolioGrowth]);

  // Настройки графиков
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    aspectRatio: 2,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#ffffff',
          font: {
            size: 14,
            weight: 'bold'
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#10b981',
        borderWidth: 2,
        cornerRadius: 8,
        displayColors: true,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        padding: 12
      }
    },
    scales: {
      x: {
        ticks: { 
          color: '#d1d5db',
          font: {
            size: 12,
            weight: '500'
          }
        },
        grid: { 
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        }
      },
      y: {
        ticks: { 
          color: '#d1d5db',
          font: {
            size: 12,
            weight: '500'
          },
          callback: function(value) {
            return value.toLocaleString();
          }
        },
        grid: { 
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        }
      }
    },
    elements: {
      point: {
        hoverBackgroundColor: '#ffffff'
      }
    }
  };



  // Функция рендеринга графиков
  const renderChart = () => {
    switch (chartType) {
      case 'portfolio':
        return (
          <div id="portfolio-chart" className="h-full flex flex-col">
            {/* Time Range Selector */}
            <div className="flex justify-end mb-4 flex-shrink-0">
              <div className="flex bg-gray-800 rounded-lg p-1 flex-wrap gap-1">
                {[
                  { key: '24h', label: '24h' },
                  { key: '7d', label: '7d' },
                  { key: '1m', label: '1m' },
                  { key: 'all', label: 'All' }
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setTimeRange(option.key)}
                    className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      timeRange === option.key
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Chart Container with fixed height */}
            <div className="flex-1 min-h-0">
              {portfolioGrowthData && portfolioGrowthData.length > 0 ? (
                <Line data={{
                  labels: portfolioGrowthData.map(item => item.date),
                  datasets: [{
                    label: 'Portfolio Value',
                    data: portfolioGrowthData.map(item => item.value),
                    borderColor: 'rgba(16, 185, 129, 1)', // Emerald-500
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(16, 185, 129, 1)',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                  }]
                }} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No portfolio data available
                </div>
              )}
            </div>
          </div>
        );
      case 'roi':
        return (
          <div id="roi-chart" className="h-full">
            {chartData.poolROI && chartData.poolROI.length > 0 ? (
              <Bar data={{
                labels: chartData.poolROI.map(item => item.pool),
                datasets: [{
                  label: 'ROI %',
                  data: chartData.poolROI.map(item => item.roi),
                  backgroundColor: chartData.poolROI.map((item, index) => {
                    const colors = [
                      'rgba(16, 185, 129, 0.8)', // Emerald
                      'rgba(59, 130, 246, 0.8)', // Blue
                      'rgba(245, 158, 11, 0.8)', // Amber
                      'rgba(239, 68, 68, 0.8)', // Red
                      'rgba(139, 92, 246, 0.8)', // Violet
                      'rgba(236, 72, 153, 0.8)', // Pink
                      'rgba(14, 165, 233, 0.8)', // Sky
                      'rgba(34, 197, 94, 0.8)'  // Green
                    ];
                    return colors[index % colors.length];
                  }),
                  borderColor: chartData.poolROI.map((item, index) => {
                    const colors = [
                      'rgba(16, 185, 129, 1)',
                      'rgba(59, 130, 246, 1)',
                      'rgba(245, 158, 11, 1)',
                      'rgba(239, 68, 68, 1)',
                      'rgba(139, 92, 246, 1)',
                      'rgba(236, 72, 153, 1)',
                      'rgba(14, 165, 233, 1)',
                      'rgba(34, 197, 94, 1)'
                    ];
                    return colors[index % colors.length];
                  }),
                  borderWidth: 2,
                  borderRadius: 4,
                  borderSkipped: false
                }]
              }} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No ROI data available
              </div>
            )}
          </div>
        );
      case 'distribution':
        return (
          <div id="distribution-chart" className="h-full">
            {chartData.chainDistribution && chartData.chainDistribution.length > 0 ? (
              <Doughnut data={{
                labels: chartData.chainDistribution.map(item => item.chain),
                datasets: [{
                  data: chartData.chainDistribution.map(item => item.count),
                  backgroundColor: [
                    'rgba(16, 185, 129, 0.8)', // Emerald
                    'rgba(59, 130, 246, 0.8)', // Blue
                    'rgba(245, 158, 11, 0.8)', // Amber
                    'rgba(239, 68, 68, 0.8)', // Red
                    'rgba(139, 92, 246, 0.8)', // Violet
                    'rgba(236, 72, 153, 0.8)', // Pink
                    'rgba(14, 165, 233, 0.8)', // Sky
                    'rgba(34, 197, 94, 0.8)'  // Green
                  ],
                  borderColor: [
                    'rgba(16, 185, 129, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(239, 68, 68, 1)',
                    'rgba(139, 92, 246, 1)',
                    'rgba(236, 72, 153, 1)',
                    'rgba(14, 165, 233, 1)',
                    'rgba(34, 197, 94, 1)'
                  ],
                  borderWidth: 1
                }]
              }} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No distribution data available
              </div>
            )}
          </div>
        );
      case 'metrics':
        // Проверяем, есть ли данные для отображения
        if (!advancedAnalytics || !advancedAnalytics.riskMetrics) {
          return (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <div className="text-gray-400 text-lg mb-2">No Performance Data</div>
              <div className="text-gray-500 text-sm">Performance metrics will appear when DeFi positions are available</div>
            </div>
          );
        }

        const riskMetrics = advancedAnalytics.riskMetrics || {};
        const volatilityAnalysis = advancedAnalytics.volatilityAnalysis || {};

        return (
          <div id="metrics-chart" className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
              {/* Sharpe Ratio */}
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-4 border border-blue-500/30">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-white">
                    {(riskMetrics.sharpeRatio || 0).toFixed(2)}
                  </div>
                  <div className="text-blue-400 text-xs">Sharpe Ratio</div>
                </div>
              </div>
              <div className="text-gray-300 text-xs">
                {(riskMetrics.sharpeRatio || 0) > 1 ? 'Excellent risk-adjusted returns' : 
                 (riskMetrics.sharpeRatio || 0) > 0.5 ? 'Good risk-adjusted returns' : 'Poor risk-adjusted returns'}
              </div>
            </div>

              {/* Sortino Ratio */}
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-4 border border-green-500/30">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-white">
                    {(riskMetrics.sortinoRatio || 0).toFixed(2)}
                  </div>
                  <div className="text-green-400 text-xs">Sortino Ratio</div>
                </div>
              </div>
              <div className="text-gray-300 text-xs">
                {(riskMetrics.sortinoRatio || 0) > 1 ? 'Excellent downside protection' : 
                 (riskMetrics.sortinoRatio || 0) > 0.5 ? 'Good downside protection' : 'Poor downside protection'}
              </div>
            </div>

              {/* Max Drawdown */}
              <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl p-4 border border-red-500/30">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-red-400">
                    {formatPercent(riskMetrics.maxDrawdown || 0)}
                  </div>
                  <div className="text-red-400 text-xs">Max Drawdown</div>
                </div>
              </div>
              <div className="text-gray-300 text-xs">
                {(riskMetrics.maxDrawdown || 0) < 10 ? 'Low risk portfolio' : 
                 (riskMetrics.maxDrawdown || 0) < 25 ? 'Medium risk portfolio' : 'High risk portfolio'}
              </div>
            </div>

              {/* Volatility */}
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-4 border border-purple-500/30">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-white">
                    {formatPercent(volatilityAnalysis.volatility || 0)}
                  </div>
                  <div className="text-purple-400 text-xs">Volatility</div>
                </div>
              </div>
              <div className="text-gray-300 text-xs">
                {volatilityAnalysis.riskLevel || 'Unknown'} Risk Level
              </div>
            </div>

              {/* Win Rate */}
              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-xl p-4 border border-yellow-500/30">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-white">
                    {formatPercent(riskMetrics.winRate || 0)}
                  </div>
                  <div className="text-yellow-400 text-xs">Win Rate</div>
                </div>
              </div>
              <div className="text-gray-300 text-xs">
                {(riskMetrics.winRate || 0) > 70 ? 'Excellent success rate' : 
                 (riskMetrics.winRate || 0) > 50 ? 'Good success rate' : 'Poor success rate'}
              </div>
            </div>

              {/* Average Win/Loss */}
              <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 rounded-xl p-4 border border-indigo-500/30">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-white">
                    {(riskMetrics.avgWinLossRatio || 0).toFixed(2)}x
                  </div>
                  <div className="text-indigo-400 text-xs">Win/Loss Ratio</div>
                </div>
              </div>
              <div className="text-gray-300 text-xs">
                {(riskMetrics.avgWinLossRatio || 0) > 2 ? 'Excellent risk/reward' : 
                 (riskMetrics.avgWinLossRatio || 0) > 1 ? 'Good risk/reward' : 'Poor risk/reward'}
              </div>
              </div>
            </div>
          </div>
        );
      default:
        return <div>Select a chart type</div>;
    }
  };

  const Card = ({ children, className = "" }) => (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl p-6 w-full ${className}`}>
      {children}
    </div>
  );


  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/DeFi2.png" 
                alt="Margin Space Logo" 
                className="w-12 h-12 rounded-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div 
                className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{display: 'none'}}
              >
                MS
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-black mb-2">DeFi Investment Report</h1>
              <p className="text-black">
                <span className="text-sm text-gray-600">Powered by Margin Space</span>
                {lastUpdate && (
                  <span className="ml-2 text-xs text-black">
                    • Last updated: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {/* Currency Toggle */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setCurrencyMode('dollar')}
                className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
                  currencyMode === 'dollar' 
                    ? 'bg-orange-500 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <DollarSign size={14} />
              </button>
              <button
                onClick={() => setCurrencyMode('percent')}
                className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
                  currencyMode === 'percent' 
                    ? 'bg-orange-500 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Percent size={14} />
              </button>
            </div>
            
            <button 
              onClick={exportToCSV}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              <Download size={16} />
              CSV
            </button>
            <button 
              onClick={exportToPDF}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                loading ? 'bg-gray-500 cursor-not-allowed text-gray-300' : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              {loading ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <FileText size={16} />
              )}
              {loading ? 'Generating...' : 'PDF'}
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              <Settings size={16} />
              Settings
            </button>
            <button 
              onClick={loadPositions}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                loading ? 'bg-gray-500 cursor-not-allowed text-gray-300' : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>

        {/* Stats Cards - KPI Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Initial Deposit Amount */}
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center">
                <DollarSign className="text-white" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(reportSettings.initialAmount)}
                </div>
                <div className="text-gray-400 text-sm">
                  Initial Deposit
                </div>
              </div>
            </div>
          </Card>
          
          {/* Current Portfolio Value */}
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-white" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(reportStats.totalValue)}
                </div>
                <div className="text-gray-400 text-sm">
                  Total Portfolio Value
                </div>
              </div>
            </div>
          </Card>
          
          {/* Total ROI */}
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="text-white" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatPercent(reportStats.totalROI)}
                </div>
                <div className="text-gray-400 text-sm">
                  Total ROI, %
                </div>
              </div>
            </div>
          </Card>
          
          {/* Total Profit */}
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-white" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {currencyMode === 'dollar' 
                    ? formatNumber(reportStats.totalProfit)
                    : formatPercent(reportStats.totalNetROI)
                  }
                </div>
                <div className="text-gray-400 text-sm">
                  {currencyMode === 'dollar' ? 'Total Profit, $' : 'Total Profit, %'}
                </div>
              </div>
            </div>
          </Card>
          
          {/* Total Positions */}
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                <Activity className="text-white" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {reportStats.activePositions + reportStats.closedPositions}
                </div>
                <div className="text-gray-400 text-sm">Total Positions</div>
                <div className="text-gray-500 text-xs">
                  Active: {reportStats.activePositions} | Closed: {reportStats.closedPositions}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Chart Type Selector */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Performance Analytics</h3>
            <div className="flex gap-2">
              {[
                { id: 'portfolio', label: 'Portfolio Growth', icon: TrendingUp },
                { id: 'roi', label: 'ROI by Pool', icon: BarChart3 },
                { id: 'distribution', label: 'Chain Distribution', icon: PieChart },
                { id: 'metrics', label: 'Performance Metrics', icon: Target }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setChartType(id)}
                  className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    chartType === id 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Charts */}
          <div className="h-96 min-h-96">
            {positions && positions.length > 0 ? (
              <div className="h-full w-full">
                {renderChart()}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <div className="text-gray-400">No data available for charts</div>
                  <div className="text-gray-500 text-sm">Charts will appear when DeFi positions are available</div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Hidden charts for PDF export */}
        {positions && positions.length > 0 && (
          <div className="hidden">
            <div id="portfolio-chart" className="h-96 bg-gray-800 p-4 rounded-lg">
              {portfolioGrowthData && portfolioGrowthData.length > 0 ? (
                <Line data={{
                  labels: portfolioGrowthData.map(item => item.date),
                  datasets: [{
                    label: 'Portfolio Value',
                    data: portfolioGrowthData.map(item => item.value),
                    borderColor: 'rgba(16, 185, 129, 1)', // Emerald-500
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(16, 185, 129, 1)',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                  }]
                }} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No portfolio data available
                </div>
              )}
            </div>
            <div id="roi-chart" className="h-96 bg-gray-800 p-4 rounded-lg">
              {chartData.poolROI && chartData.poolROI.length > 0 ? (
                <Bar data={{
                  labels: chartData.poolROI.map(item => item.pool),
                  datasets: [{
                    label: 'ROI %',
                    data: chartData.poolROI.map(item => item.roi),
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                  }]
                }} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No ROI data available
                </div>
              )}
            </div>
            <div id="distribution-chart" className="h-96 bg-gray-800 p-4 rounded-lg">
              {chartData.chainDistribution && chartData.chainDistribution.length > 0 ? (
                <Doughnut data={{
                  labels: chartData.chainDistribution.map(item => item.chain),
                  datasets: [{
                    data: chartData.chainDistribution.map(item => item.count),
                    backgroundColor: [
                      'rgba(255, 99, 132, 0.5)',
                      'rgba(54, 162, 235, 0.5)',
                      'rgba(255, 205, 86, 0.5)',
                      'rgba(75, 192, 192, 0.5)',
                      'rgba(153, 102, 255, 0.5)',
                      'rgba(255, 159, 64, 0.5)'
                    ],
                    borderColor: [
                      'rgba(255, 99, 132, 1)',
                      'rgba(54, 162, 235, 1)',
                      'rgba(255, 205, 86, 1)',
                      'rgba(75, 192, 192, 1)',
                      'rgba(153, 102, 255, 1)',
                      'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                  }]
                }} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No distribution data available
                </div>
              )}
            </div>
            <div id="metrics-chart" className="h-64">
              {advancedAnalytics && advancedAnalytics.riskMetrics ? (
                <div className="max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                    {/* Sharpe Ratio */}
                    <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-4 border border-blue-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Target className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">
                            {(advancedAnalytics.riskMetrics.sharpeRatio || 0).toFixed(2)}
                          </div>
                          <div className="text-blue-400 text-xs">Sharpe Ratio</div>
                        </div>
                      </div>
                      <div className="text-gray-300 text-xs">
                        {(advancedAnalytics.riskMetrics.sharpeRatio || 0) > 1 ? 'Excellent risk-adjusted returns' : 
                         (advancedAnalytics.riskMetrics.sharpeRatio || 0) > 0.5 ? 'Good risk-adjusted returns' : 'Poor risk-adjusted returns'}
                      </div>
                    </div>
                    {/* Sortino Ratio */}
                    <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-4 border border-green-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <Shield className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">
                            {(advancedAnalytics.riskMetrics.sortinoRatio || 0).toFixed(2)}
                          </div>
                          <div className="text-green-400 text-xs">Sortino Ratio</div>
                        </div>
                      </div>
                      <div className="text-gray-300 text-xs">
                        {(advancedAnalytics.riskMetrics.sortinoRatio || 0) > 1.5 ? 'Excellent downside protection' : 
                         (advancedAnalytics.riskMetrics.sortinoRatio || 0) > 1 ? 'Good downside protection' : 'Poor downside protection'}
                      </div>
                    </div>
                    {/* Max Drawdown */}
                    <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl p-4 border border-red-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <TrendingDown className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">
                            {formatPercent(advancedAnalytics.riskMetrics.maxDrawdown || 0)}
                          </div>
                          <div className="text-red-400 text-xs">Max Drawdown</div>
                        </div>
                      </div>
                      <div className="text-gray-300 text-xs">
                        {(advancedAnalytics.riskMetrics.maxDrawdown || 0) < 5 ? 'Low risk' : 
                         (advancedAnalytics.riskMetrics.maxDrawdown || 0) < 15 ? 'Moderate risk' : 'High risk'}
                      </div>
                    </div>
                    {/* Volatility */}
                    <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-4 border border-purple-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Activity className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">
                            {formatPercent(advancedAnalytics.riskMetrics.volatility || 0)}
                          </div>
                          <div className="text-purple-400 text-xs">Volatility</div>
                        </div>
                      </div>
                      <div className="text-gray-300 text-xs">
                        {(advancedAnalytics.riskMetrics.volatility || 0) < 10 ? 'Low volatility' : 
                         (advancedAnalytics.riskMetrics.volatility || 0) < 25 ? 'Moderate volatility' : 'High volatility'}
                      </div>
                    </div>
                    {/* Win Rate */}
                    <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-xl p-4 border border-yellow-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">
                            {formatPercent(advancedAnalytics.riskMetrics.winRate || 0)}
                          </div>
                          <div className="text-yellow-400 text-xs">Win Rate</div>
                        </div>
                      </div>
                      <div className="text-gray-300 text-xs">
                        {(advancedAnalytics.riskMetrics.winRate || 0) > 70 ? 'Excellent success rate' : 
                         (advancedAnalytics.riskMetrics.winRate || 0) > 50 ? 'Good success rate' : 'Poor success rate'}
                      </div>
                    </div>
                    {/* Win/Loss Ratio */}
                    <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 rounded-xl p-4 border border-indigo-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                          <TrendingUpIcon className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">
                            {(advancedAnalytics.riskMetrics.avgWinLossRatio || 0).toFixed(2)}x
                          </div>
                          <div className="text-indigo-400 text-xs">Win/Loss Ratio</div>
                        </div>
                      </div>
                      <div className="text-gray-300 text-xs">
                        {(advancedAnalytics.riskMetrics.avgWinLossRatio || 0) > 2 ? 'Excellent ratio' : 
                         (advancedAnalytics.riskMetrics.avgWinLossRatio || 0) > 1 ? 'Good ratio' : 'Poor ratio'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="text-gray-400 text-lg mb-2">No Performance Data</div>
                  <div className="text-gray-500 text-sm">Performance metrics will appear when DeFi positions are available</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Positions */}
        <Card>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-2xl font-bold text-white">Active Positions</h3>
              <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-medium">
                {reportStats.activePositions} active
              </span>
            </div>
            <p className="text-gray-300 opacity-70 text-sm">Current DeFi positions with virtual $20,000 each</p>
          </div>
          
          {reportStats.activePositions === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No active positions</div>
              <div className="text-gray-500 text-sm">Waiting for suitable pools...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {positions
                .filter(p => p.status === 'FARMING' || p.status === 'farming')
                .map((position, index) => {
                  const profit = calculatePoolProfit(position);
                  return (
                    <div key={index} className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        {/* Pool Info */}
                        <div>
                          <div className="text-white font-medium text-lg">{position.symbol}</div>
                          <div className="text-gray-500 text-sm">{position.project}</div>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getChainClass(position.chain)}`}>
                            {position.chain}
                          </span>
                        </div>
                        
                        {/* Position Size */}
                        <div>
                          <div className="text-gray-400 text-xs uppercase tracking-wide">Position Size</div>
                          <div className="text-white font-semibold text-lg">
                            {currencyMode === 'dollar' 
                              ? `${formatNumber(reportSettings.amountPerPool)}`
                              : `${((reportSettings.amountPerPool / reportSettings.initialAmount) * 100).toFixed(1)}%`
                            }
                          </div>
                          <div className="text-gray-500 text-sm">
                            {((reportSettings.amountPerPool / reportSettings.initialAmount) * 100).toFixed(1)}% of portfolio
                          </div>
                        </div>
                        
                        {/* Current P/L */}
                        <div>
                          <div className="text-gray-400 text-xs uppercase tracking-wide">Current P/L</div>
                          <div className={`font-semibold text-xl ${profit.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {currencyMode === 'dollar' 
                              ? formatNumber(profit.netProfit)
                              : formatPercent(profit.roi)
                            }
                          </div>
                          <div className="text-gray-500 text-sm">
                            {currencyMode === 'dollar' 
                              ? `ROI: ${formatPercent(profit.roi)}`
                              : `Value: ${formatNumber(profit.totalValue)}`
                            }
                          </div>
                        </div>
                        
                        {/* Projected APR */}
                        <div>
                          <div className="text-gray-400 text-xs uppercase tracking-wide">Projected APR</div>
                          <div className="text-green-400 font-semibold text-xl">
                            {position.currentApy.toFixed(1)}%
                          </div>
                          <div className="text-gray-500 text-sm">
                            Entry: {position.entryApy.toFixed(1)}%
                          </div>
                        </div>
                        
                        {/* Impermanent Loss */}
                        <div>
                          <div className="text-gray-400 text-xs uppercase tracking-wide">Impermanent Loss</div>
                          <div className="text-red-400 font-semibold text-xl">
                            {formatPercent(profit.impermanentLossRate)}
                          </div>
                          <div className="text-gray-500 text-sm">
                            Amount: {formatNumber(profit.impermanentLoss)}
                          </div>
                        </div>
                        
                        {/* Duration */}
                        <div>
                          <div className="text-gray-400 text-xs uppercase tracking-wide">Duration</div>
                          <div className="text-white font-semibold text-xl">
                            {profit.daysInPool >= 1 
                              ? `${Math.floor(profit.daysInPool)}d ${Math.round((profit.daysInPool % 1) * 24)}h`
                              : `${Math.round(profit.daysInPool * 24)}h`
                            }
                          </div>
                          <div className="text-gray-500 text-sm">
                            Value: {formatNumber(profit.totalValue)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>

        {/* Impermanent Loss Analysis */}
        <Card>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-2xl font-bold text-white">Impermanent Loss Analysis</h3>
              <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-medium">
                Risk Metric
              </span>
            </div>
            <p className="text-gray-300 opacity-70 text-sm">Analysis of impermanent loss across all positions</p>
          </div>
          
          {positions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No positions available</div>
              <div className="text-gray-500 text-sm">Impermanent loss analysis will appear when positions are available</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left side - Statistics */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Average IL Rate</div>
                    <div className="text-white text-xl font-bold">
                      {(() => {
                        const activePositions = positions.filter(p => p.status === 'FARMING' || p.status === 'farming');
                        const closedPositions = positions.filter(p => p.status === 'UNSTAKED' || p.status === 'unstaked');
                        const allPositions = [...activePositions, ...closedPositions];
                        
                        if (allPositions.length === 0) return '0.00%';
                        
                        const totalIL = allPositions.reduce((sum, pos) => {
                          const profit = calculatePoolProfit(pos);
                          return sum + profit.impermanentLossRate;
                        }, 0);
                        
                        return formatPercent(totalIL / allPositions.length);
                      })()}
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Total IL Amount</div>
                    <div className="text-white text-xl font-bold">
                      {(() => {
                        const activePositions = positions.filter(p => p.status === 'FARMING' || p.status === 'farming');
                        const closedPositions = positions.filter(p => p.status === 'UNSTAKED' || p.status === 'unstaked');
                        const allPositions = [...activePositions, ...closedPositions];
                        
                        const totalILAmount = allPositions.reduce((sum, pos) => {
                          const profit = calculatePoolProfit(pos);
                          return sum + profit.impermanentLoss;
                        }, 0);
                        
                        return formatNumber(totalILAmount);
                      })()}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-2">Positions with IL</div>
                  <div className="text-white text-2xl font-bold mb-2">
                    {(() => {
                      const activePositions = positions.filter(p => p.status === 'FARMING' || p.status === 'farming');
                      const closedPositions = positions.filter(p => p.status === 'UNSTAKED' || p.status === 'unstaked');
                      const allPositions = [...activePositions, ...closedPositions];
                      
                      const positionsWithIL = allPositions.filter(pos => {
                        const profit = calculatePoolProfit(pos);
                        return profit.impermanentLoss > 0;
                      }).length;
                      
                      return `${positionsWithIL}/${allPositions.length}`;
                    })()}
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(() => {
                          const activePositions = positions.filter(p => p.status === 'FARMING' || p.status === 'farming');
                          const closedPositions = positions.filter(p => p.status === 'UNSTAKED' || p.status === 'unstaked');
                          const allPositions = [...activePositions, ...closedPositions];
                          
                          if (allPositions.length === 0) return 0;
                          
                          const positionsWithIL = allPositions.filter(pos => {
                            const profit = calculatePoolProfit(pos);
                            return profit.impermanentLoss > 0;
                          }).length;
                          
                          return (positionsWithIL / allPositions.length) * 100;
                        })()}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              {/* Right side - IL by Chain Chart */}
              <div>
                <h4 className="text-white font-semibold mb-3">IL by Blockchain</h4>
                <div className="space-y-3">
                  {(() => {
                    const chainStats = {};
                    const activePositions = positions.filter(p => p.status === 'FARMING' || p.status === 'farming');
                    const closedPositions = positions.filter(p => p.status === 'UNSTAKED' || p.status === 'unstaked');
                    const allPositions = [...activePositions, ...closedPositions];
                    
                    allPositions.forEach(pos => {
                      const profit = calculatePoolProfit(pos);
                      if (!chainStats[pos.chain]) {
                        chainStats[pos.chain] = {
                          count: 0,
                          totalIL: 0,
                          totalILRate: 0
                        };
                      }
                      chainStats[pos.chain].count++;
                      chainStats[pos.chain].totalIL += profit.impermanentLoss;
                      chainStats[pos.chain].totalILRate += profit.impermanentLossRate;
                    });
                    
                    const maxIL = Math.max(...Object.values(chainStats).map(stats => stats.totalIL));
                    
                    return Object.entries(chainStats).map(([chain, stats]) => (
                      <div key={chain} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getChainClass(chain)}`}>
                              {chain}
                            </span>
                            <span className="text-gray-400 text-sm">{stats.count} pos</span>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-semibold text-sm">
                              {formatNumber(stats.totalIL)}
                            </div>
                            <div className="text-gray-400 text-xs">
                              Avg: {formatPercent(stats.totalILRate / stats.count)}
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div 
                            className="bg-red-500 h-1.5 rounded-full transition-all duration-300"
                            style={{
                              width: `${maxIL > 0 ? (stats.totalIL / maxIL) * 100 : 0}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Activity Feed */}
        <Card>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-2xl font-bold text-white">System Activity Feed</h3>
              <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium">
                Live
              </span>
            </div>
            <p className="text-gray-300 opacity-70 text-sm">Real-time algorithm activity and decision making</p>
          </div>
          
          {activityFeed.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No recent activity</div>
              <div className="text-gray-500 text-sm">Algorithm will start working when suitable pools are found...</div>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activityFeed.map((activity, index) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  {/* Status Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.color === 'green' ? 'bg-green-500/20' :
                    activity.color === 'red' ? 'bg-red-500/20' :
                    activity.color === 'yellow' ? 'bg-yellow-500/20' :
                    'bg-blue-500/20'
                  }`}>
                    {activity.type === 'entry' && <div className="w-3 h-3 bg-green-400 rounded-full"></div>}
                    {activity.type === 'exit' && <div className="w-3 h-3 bg-red-400 rounded-full"></div>}
                    {activity.type === 'rebalance' && <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>}
                    {activity.type === 'reinvest' && <div className="w-3 h-3 bg-blue-400 rounded-full"></div>}
                  </div>
                  
                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-white font-medium">
                        {activity.type === 'entry' && `Entry into ${activity.symbol} pool`}
                        {activity.type === 'exit' && `Exit from ${activity.symbol} pool`}
                        {activity.type === 'rebalance' && 'Portfolio rebalancing'}
                        {activity.type === 'reinvest' && 'Profit reinvestment'}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {activity.time.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false 
                        })}
                      </div>
                    </div>
                    
                    <div className="text-gray-400 text-sm mt-1">
                      {activity.type === 'entry' && `${activity.project} • ${activity.chain} • APR: ${activity.apr.toFixed(1)}%`}
                      {activity.type === 'exit' && `${activity.project} • ${activity.chain} • P/L: ${activity.profit >= 0 ? '+' : ''}${activity.profit.toFixed(2)}$`}
                      {activity.type === 'rebalance' && 'Asset redistribution after pool exit'}
                      {activity.type === 'reinvest' && `Amount: $${activity.amount.toFixed(2)}`}
                    </div>
                    
                    <div className="text-gray-500 text-xs mt-1">
                      Reason: {activity.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Closed Positions History */}
        <Card>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-2xl font-bold text-white">Closed Positions History</h3>
              <span className="px-4 py-1 bg-red-600 text-white rounded-full text-sm font-medium">
                {reportStats.closedPositions} closed
              </span>
            </div>
            <p className="text-gray-300 opacity-70 text-sm">Historical performance of closed positions</p>
          </div>
          
          {reportStats.closedPositions === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No closed positions yet</div>
              <div className="text-gray-500 text-sm">History will appear when positions are closed</div>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {positions
                  .filter(p => p.status === 'UNSTAKED' || p.status === 'unstaked')
                  .map((position, index) => {
                    const profit = calculatePoolProfit(position);
                    return (
                      <div key={index} className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                          {/* Pool Info */}
                          <div>
                            <div className="text-white font-medium">{position.symbol}</div>
                            <div className="text-gray-500 text-sm">{position.project}</div>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getChainClass(position.chain)}`}>
                              {position.chain}
                            </span>
                          </div>
                          
                          {/* Entry APR */}
                          <div>
                            <div className="text-gray-400 text-xs uppercase tracking-wide">Entry APR</div>
                            <div className="text-gray-300 font-semibold">
                              {position.entryApy.toFixed(1)}%
                            </div>
                            <div className="text-gray-500 text-xs">
                              TVL: {formatNumber(position.entryTvl)}
                            </div>
                          </div>
                          
                          {/* Exit APR */}
                          <div>
                            <div className="text-gray-400 text-xs uppercase tracking-wide">Exit APR</div>
                            <div className="text-gray-300 font-semibold">
                              {position.exitApy?.toFixed(1) || '--'}%
                            </div>
                            <div className="text-gray-500 text-xs">
                              TVL: {formatNumber(position.exitTvl)}
                            </div>
                          </div>
                          
                          {/* Impermanent Loss */}
                          <div>
                            <div className="text-gray-400 text-xs uppercase tracking-wide">Impermanent Loss</div>
                            <div className="text-red-400 font-semibold">
                              {formatPercent(profit.impermanentLossRate)}
                            </div>
                            <div className="text-gray-500 text-xs">
                              Amount: {formatNumber(profit.impermanentLoss)}
                            </div>
                          </div>
                          
                          {/* Profit */}
                          <div>
                            <div className="text-gray-400 text-xs uppercase tracking-wide">Profit</div>
                            <div className={`font-semibold ${profit.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {currencyMode === 'dollar' ? formatNumber(profit.netProfit) : formatPercent(profit.roi)}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {currencyMode === 'dollar' ? `ROI: ${formatPercent(profit.roi)}` : `Value: ${formatNumber(profit.netProfit)}`}
                            </div>
                          </div>
                          
                          {/* Period & Reason */}
                          <div>
                            <div className="text-gray-400 text-xs uppercase tracking-wide">Period</div>
                            <div className="text-gray-300 font-semibold">
                              {profit.daysInPool} days
                            </div>
                            <div className="text-red-400 text-xs">
                              {position.exitReason}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </Card>

        {/* Chain Statistics */}
        <Card>
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-white">Blockchain Distribution</h3>
            <p className="text-gray-300 opacity-70 text-sm">Performance breakdown by blockchain</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(reportStats.chainStats).map(([chain, stats]) => (
              <div key={chain} className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getChainClass(chain)}`}>
                    {chain}
                  </span>
                  <span className="text-gray-400 text-sm">{stats.count} positions</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Total Profit:</span>
                    <span className={`font-semibold ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {currencyMode === 'dollar' ? formatNumber(stats.totalProfit) : formatPercent(stats.avgROI)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Total Value:</span>
                    <span className="text-white font-semibold">
                      {currencyMode === 'dollar' ? formatNumber(stats.totalValue) : formatPercent(stats.avgROI)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">ROI:</span>
                    <span className={`font-semibold ${stats.avgROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {currencyMode === 'dollar' ? formatPercent(stats.avgROI) : formatNumber(stats.totalProfit)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Advanced Analytics */}
        <div className="animate-fade-in-up space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-white">Advanced Analytics</h2>
              <p className="text-gray-300 opacity-70 text-sm">Comprehensive risk and performance analysis</p>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Live Data</span>
            </div>
          </div>

            {/* Risk Metrics */}
            <Card>
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-white">Risk Analysis</h3>
                <p className="text-gray-300 opacity-70 text-sm">Advanced risk metrics and volatility analysis</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="text-orange-400" size={16} />
                    <span className="text-gray-400 text-sm">Sharpe Ratio</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {advancedAnalytics.riskMetrics.sharpeRatio.toFixed(2)}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {advancedAnalytics.riskMetrics.sharpeRatio > 1 ? 'Good' : 
                     advancedAnalytics.riskMetrics.sharpeRatio > 0.5 ? 'Fair' : 'Poor'}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="text-green-400" size={16} />
                    <span className="text-gray-400 text-sm">Sortino Ratio</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {advancedAnalytics.riskMetrics.sortinoRatio.toFixed(2)}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {advancedAnalytics.riskMetrics.sortinoRatio > 1 ? 'Good' : 
                     advancedAnalytics.riskMetrics.sortinoRatio > 0.5 ? 'Fair' : 'Poor'}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="text-red-400" size={16} />
                    <span className="text-gray-400 text-sm">Max Drawdown</span>
                  </div>
                  <div className="text-2xl font-bold text-red-400">
                    {formatPercent(advancedAnalytics.riskMetrics.maxDrawdown)}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {advancedAnalytics.riskMetrics.maxDrawdown < 10 ? 'Low Risk' : 
                     advancedAnalytics.riskMetrics.maxDrawdown < 25 ? 'Medium Risk' : 'High Risk'}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="text-purple-400" size={16} />
                    <span className="text-gray-400 text-sm">Volatility</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {formatPercent(advancedAnalytics.volatilityAnalysis.volatility)}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {advancedAnalytics.volatilityAnalysis.riskLevel} Risk
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Win Rate</div>
                  <div className="text-xl font-bold text-green-400">
                    {formatPercent(advancedAnalytics.riskMetrics.winRate)}
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Avg Win</div>
                  <div className="text-xl font-bold text-green-400">
                    {formatNumber(advancedAnalytics.riskMetrics.avgWin)}
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Avg Loss</div>
                  <div className="text-xl font-bold text-red-400">
                    {formatNumber(advancedAnalytics.riskMetrics.avgLoss)}
                  </div>
                </div>
              </div>
            </Card>


            {/* Seasonality Analysis */}
            {advancedAnalytics.seasonalityAnalysis.hasSeasonality && (
              <Card>
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-white">Seasonality Analysis</h3>
                  <p className="text-gray-300 opacity-70 text-sm">Performance patterns by month</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="text-green-400" size={20} />
                      <h4 className="text-lg font-semibold text-white">Best Month</h4>
                    </div>
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      {advancedAnalytics.seasonalityAnalysis.bestMonth.monthName}
                    </div>
                    <div className="text-gray-400 text-sm">
                      Avg ROI: {formatPercent(advancedAnalytics.seasonalityAnalysis.bestMonth.avgROI)}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {advancedAnalytics.seasonalityAnalysis.bestMonth.count} positions
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingDown className="text-red-400" size={20} />
                      <h4 className="text-lg font-semibold text-white">Worst Month</h4>
                    </div>
                    <div className="text-2xl font-bold text-red-400 mb-1">
                      {advancedAnalytics.seasonalityAnalysis.worstMonth.monthName}
                    </div>
                    <div className="text-gray-400 text-sm">
                      Avg ROI: {formatPercent(advancedAnalytics.seasonalityAnalysis.worstMonth.avgROI)}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {advancedAnalytics.seasonalityAnalysis.worstMonth.count} positions
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-gray-400 text-sm mb-2">Monthly Performance</div>
                  <div className="grid grid-cols-6 gap-2">
                    {advancedAnalytics.seasonalityAnalysis.seasonalityData.map((month, index) => (
                      <div key={index} className="bg-gray-700/50 rounded p-2 text-center">
                        <div className="text-xs text-gray-400">{month.monthName}</div>
                        <div className={`text-sm font-semibold ${
                          month.avgROI >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatPercent(month.avgROI)}
                        </div>
                        <div className="text-xs text-gray-500">{month.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 p-8 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6">DeFi Report Settings</h3>
            
            <form onSubmit={(e) => { e.preventDefault(); setShowSettings(false); }} className="space-y-6">
              {/* Initial Amount */}
              <div>
                <label className="block text-gray-300 mb-2">Initial Investment Amount ($)</label>
                <input
                  type="number"
                  value={reportSettings.initialAmount}
                  onChange={(e) => setReportSettings(prev => ({ 
                    ...prev, 
                    initialAmount: parseFloat(e.target.value) || 100000,
                    amountPerPool: (parseFloat(e.target.value) || 100000) / prev.maxActivePositions
                  }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                  min="1000"
                  step="1000"
                />
              </div>

              {/* Max Active Positions */}
              <div>
                <label className="block text-gray-300 mb-2">Max Active Positions</label>
                <input
                  type="number"
                  value={reportSettings.maxActivePositions}
                  onChange={(e) => setReportSettings(prev => ({ 
                    ...prev, 
                    maxActivePositions: parseInt(e.target.value) || 5,
                    amountPerPool: prev.initialAmount / (parseInt(e.target.value) || 5)
                  }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                  min="1"
                  max="10"
                />
              </div>

              {/* Gas Fees */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">Ethereum Gas Fees ($)</label>
                  <input
                    type="number"
                    value={reportSettings.gasFees.ethereum}
                    onChange={(e) => setReportSettings(prev => ({ 
                      ...prev, 
                      gasFees: { ...prev.gasFees, ethereum: parseFloat(e.target.value) || 10 }
                    }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                    min="0"
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Other Chains Gas Fees ($)</label>
                  <input
                    type="number"
                    value={reportSettings.gasFees.other}
                    onChange={(e) => setReportSettings(prev => ({ 
                      ...prev, 
                      gasFees: { ...prev.gasFees, other: parseFloat(e.target.value) || 1 }
                    }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={reportSettings.startDate}
                    onChange={(e) => setReportSettings(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">End Date (leave empty for current)</label>
                  <input
                    type="date"
                    value={reportSettings.endDate || ''}
                    onChange={(e) => setReportSettings(prev => ({ ...prev, endDate: e.target.value || null }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* APR Thresholds */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">Min Monthly APR (%)</label>
                  <input
                    type="number"
                    value={reportSettings.minMonthlyAPR}
                    onChange={(e) => setReportSettings(prev => ({ ...prev, minMonthlyAPR: parseFloat(e.target.value) || 50 }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                    min="0"
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Exit Monthly APR (%)</label>
                  <input
                    type="number"
                    value={reportSettings.exitMonthlyAPR}
                    onChange={(e) => setReportSettings(prev => ({ ...prev, exitMonthlyAPR: parseFloat(e.target.value) || 48 }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                    min="0"
                    step="1"
                  />
                </div>
              </div>

              {/* TVL Thresholds */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">Min TVL ($)</label>
                  <input
                    type="number"
                    value={reportSettings.minTVL}
                    onChange={(e) => setReportSettings(prev => ({ ...prev, minTVL: parseFloat(e.target.value) || 500000 }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                    min="0"
                    step="10000"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Exit TVL ($)</label>
                  <input
                    type="number"
                    value={reportSettings.exitTVL}
                    onChange={(e) => setReportSettings(prev => ({ ...prev, exitTVL: parseFloat(e.target.value) || 450000 }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                    min="0"
                    step="10000"
                  />
                </div>
              </div>

              {/* Calculation Period */}
              <div>
                <label className="block text-gray-300 mb-2">Calculation Period (days)</label>
                <input
                  type="number"
                  value={reportSettings.calculationPeriodDays}
                  onChange={(e) => setReportSettings(prev => ({ ...prev, calculationPeriodDays: parseInt(e.target.value) || 365 }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                  min="1"
                  max="3650"
                />
              </div>

              {/* Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-gray-300">Include Impermanent Loss</label>
                  <input
                    type="checkbox"
                    checked={reportSettings.impermanentLoss}
                    onChange={(e) => setReportSettings(prev => ({ ...prev, impermanentLoss: e.target.checked }))}
                    className="w-4 h-4 text-orange-500 bg-gray-800 border-gray-700 rounded focus:ring-orange-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-gray-300">Compound Interest</label>
                  <input
                    type="checkbox"
                    checked={reportSettings.compound}
                    onChange={(e) => setReportSettings(prev => ({ ...prev, compound: e.target.checked }))}
                    className="w-4 h-4 text-orange-500 bg-gray-800 border-gray-700 rounded focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Save Settings
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeFiReportPage;
