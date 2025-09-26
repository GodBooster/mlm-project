import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import DeFiReportService from './DeFiReportService';

class HTMLPDFService {
  static async generatePDFReport(reportData, positions, reportSettings, currencyMode = 'dollar', advancedAnalytics = null) {
    try {
      console.log('HTMLPDFService: Starting HTML-based PDF generation');
      
      // Create HTML content
      const htmlContent = this.generateHTMLContent(reportData, positions, reportSettings, currencyMode, advancedAnalytics);
      
      // Create a temporary container
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = htmlContent;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '1200px';
      tempContainer.style.backgroundColor = 'white';
      document.body.appendChild(tempContainer);
      
      // Wait for fonts and images to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 1200,
        height: tempContainer.scrollHeight
      });
      
      // Remove temporary container
      document.body.removeChild(tempContainer);
      
      // Create PDF
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(canvas, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      console.log('HTMLPDFService: PDF generation completed successfully');
      return pdf;
      
    } catch (error) {
      console.error('HTMLPDFService: Error generating PDF:', error);
      throw error;
    }
  }
  
  static generateHTMLContent(reportData, positions, reportSettings, currencyMode, advancedAnalytics) {
    const stats = DeFiReportService.calculatePortfolioStats(positions, reportSettings);
    const chartData = DeFiReportService.generateChartData(positions, reportSettings);
    const activePositions = positions.filter(p => p.status === 'FARMING' || p.status === 'farming');
    
    // Format currency
    const formatCurrency = (amount) => {
      if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
      if (amount >= 1000000) {
        return '$' + (amount / 1000000).toFixed(2) + 'M';
      } else if (amount >= 1000) {
        return '$' + (amount / 1000).toFixed(2) + 'K';
      } else {
        return '$' + amount.toFixed(2);
      }
    };
    
    // Format percentage
    const formatPercent = (value) => {
      if (typeof value !== 'number' || isNaN(value)) return '0.00%';
      return value.toFixed(2) + '%';
    };
    
    // Generate blockchain distribution data
    const blockchainStats = {};
    positions.forEach(position => {
      if (!blockchainStats[position.chain]) {
        blockchainStats[position.chain] = { count: 0, profit: 0, totalValue: 0 };
      }
      blockchainStats[position.chain].count++;
      const profit = DeFiReportService.calculatePoolProfit(position, reportSettings, positions);
      blockchainStats[position.chain].profit += profit.netProfit || 0;
      blockchainStats[position.chain].totalValue += reportSettings.amountPerPool || 20000;
    });
    
    const blockchainDistribution = Object.entries(blockchainStats).map(([chain, data]) => ({
      name: chain,
      positions: data.count,
      profit: data.profit,
      roi: data.totalValue > 0 ? (data.profit / data.totalValue) * 100 : 0
    }));
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DeFi Portfolio Report</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 40px;
            margin-bottom: 30px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .title {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-align: center;
            margin-bottom: 20px;
        }
        
        .subtitle {
            text-align: center;
            color: #666;
            font-size: 1.1rem;
            margin-bottom: 30px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .metric-card {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .metric-value {
            font-size: 2rem;
            font-weight: 700;
            color: #2563eb;
            margin-bottom: 8px;
        }
        
        .metric-label {
            color: #666;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .section {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .section-title {
            font-size: 1.8rem;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 25px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .chart-container {
            background: rgba(255, 255, 255, 0.8);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
            min-height: 300px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px dashed #e5e7eb;
        }
        
        .positions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .position-card {
            background: rgba(255, 255, 255, 0.9);
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .position-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .position-name {
            font-weight: 600;
            color: #1f2937;
            font-size: 1.1rem;
        }
        
        .position-chain {
            background: #3b82f6;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        .position-metrics {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        
        .position-metric {
            text-align: center;
        }
        
        .position-metric-value {
            font-size: 1.2rem;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 4px;
        }
        
        .position-metric-value.negative {
            color: #ef4444;
        }
        
        .position-metric-label {
            font-size: 0.8rem;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .blockchain-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .blockchain-card {
            background: rgba(255, 255, 255, 0.9);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .blockchain-name {
            font-weight: 600;
            color: #1f2937;
            font-size: 1.1rem;
            margin-bottom: 10px;
        }
        
        .blockchain-stats {
            color: #6b7280;
            font-size: 0.9rem;
            margin-bottom: 5px;
        }
        
        .risk-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .risk-metric {
            background: rgba(255, 255, 255, 0.9);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .risk-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 8px;
        }
        
        .risk-label {
            color: #6b7280;
            font-size: 0.9rem;
            margin-bottom: 5px;
        }
        
        .risk-status {
            font-size: 0.8rem;
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: 500;
        }
        
        .risk-status.good {
            background: #dcfce7;
            color: #166534;
        }
        
        .risk-status.medium {
            background: #fef3c7;
            color: #92400e;
        }
        
        .risk-status.high {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .report-date {
            text-align: center;
            color: #6b7280;
            font-size: 0.9rem;
            margin-top: 20px;
        }
        
        @media print {
            body {
                background: white !important;
            }
            
            .container {
                max-width: none;
                padding: 0;
            }
            
            .header, .section {
                box-shadow: none;
                border: 1px solid #e5e7eb;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">DeFi Investment Report</h1>
            
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${formatCurrency(reportSettings.initialAmount)}</div>
                    <div class="metric-label">Initial Deposit</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${formatCurrency(stats.totalValue)}</div>
                    <div class="metric-label">Total Portfolio Value</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${formatPercent(stats.totalROI)}</div>
                    <div class="metric-label">Total ROI</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${formatCurrency(stats.totalProfit)}</div>
                    <div class="metric-label">Total Profit</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${stats.activePositions + stats.closedPositions}</div>
                    <div class="metric-label">Total Positions</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${stats.activePositions}</div>
                    <div class="metric-label">Active Positions</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${stats.closedPositions}</div>
                    <div class="metric-label">Closed Positions</div>
                </div>
            </div>
            
            <div class="report-date">
                Report Generated: ${new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">📈 Portfolio Growth</h2>
            <div class="chart-container">
                <div style="text-align: center; color: #6b7280;">
                    <div style="font-size: 1.2rem; margin-bottom: 10px;">Portfolio Growth Chart</div>
                    <div>Data points: ${chartData.portfolioGrowth ? chartData.portfolioGrowth.length : 0}</div>
                    <div>Current value: ${formatCurrency(stats.totalValue)}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">🎯 Active Positions</h2>
            <div class="positions-grid">
                ${activePositions.map(position => {
                  const profit = DeFiReportService.calculatePoolProfit(position, reportSettings, positions);
                  return `
                    <div class="position-card">
                        <div class="position-header">
                            <div class="position-name">${position.symbol}</div>
                            <div class="position-chain">${position.chain}</div>
                        </div>
                        <div class="position-metrics">
                            <div class="position-metric">
                                <div class="position-metric-value">${formatCurrency(reportSettings.amountPerPool || 20000)}</div>
                                <div class="position-metric-label">Position Size</div>
                            </div>
                            <div class="position-metric">
                                <div class="position-metric-value ${profit.netProfit >= 0 ? '' : 'negative'}">${formatCurrency(profit.netProfit)}</div>
                                <div class="position-metric-label">Current P/L</div>
                            </div>
                            <div class="position-metric">
                                <div class="position-metric-value">${formatPercent(profit.roi)}</div>
                                <div class="position-metric-label">ROI</div>
                            </div>
                            <div class="position-metric">
                                <div class="position-metric-value">${formatPercent(position.currentApy || position.entryApy)}</div>
                                <div class="position-metric-label">Projected APR</div>
                            </div>
                            <div class="position-metric">
                                <div class="position-metric-value">${formatPercent(profit.impermanentLossRate * 100)}</div>
                                <div class="position-metric-label">Impermanent Loss</div>
                            </div>
                            <div class="position-metric">
                                <div class="position-metric-value">${profit.daysInPool ? profit.daysInPool.toFixed(1) + 'd' : '0d'}</div>
                                <div class="position-metric-label">Duration</div>
                            </div>
                        </div>
                    </div>
                  `;
                }).join('')}
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">⛓️ Blockchain Distribution</h2>
            <div class="blockchain-grid">
                ${blockchainDistribution.map(blockchain => `
                    <div class="blockchain-card">
                        <div class="blockchain-name">${blockchain.name}</div>
                        <div class="blockchain-stats">${blockchain.positions} positions</div>
                        <div class="blockchain-stats">Profit: ${formatCurrency(blockchain.profit)}</div>
                        <div class="blockchain-stats">ROI: ${formatPercent(blockchain.roi)}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">📊 Performance Metrics</h2>
            <div class="risk-grid">
                <div class="risk-metric">
                    <div class="risk-value">${advancedAnalytics?.riskMetrics?.sharpeRatio?.toFixed(2) || '0.00'}</div>
                    <div class="risk-label">Sharpe Ratio</div>
                    <div class="risk-status good">Good</div>
                </div>
                <div class="risk-metric">
                    <div class="risk-value">${advancedAnalytics?.riskMetrics?.sortinoRatio?.toFixed(2) || '0.00'}</div>
                    <div class="risk-label">Sortino Ratio</div>
                    <div class="risk-status good">Good</div>
                </div>
                <div class="risk-metric">
                    <div class="risk-value">${formatPercent(advancedAnalytics?.riskMetrics?.maxDrawdown || 0)}</div>
                    <div class="risk-label">Max Drawdown</div>
                    <div class="risk-status medium">Medium</div>
                </div>
                <div class="risk-metric">
                    <div class="risk-value">${formatPercent(advancedAnalytics?.riskMetrics?.volatility || 0)}</div>
                    <div class="risk-label">Volatility</div>
                    <div class="risk-status high">High Risk</div>
                </div>
                <div class="risk-metric">
                    <div class="risk-value">${formatPercent(advancedAnalytics?.riskMetrics?.winRate || 0)}</div>
                    <div class="risk-label">Win Rate</div>
                    <div class="risk-status good">Good</div>
                </div>
                <div class="risk-metric">
                    <div class="risk-value">${formatCurrency(advancedAnalytics?.riskMetrics?.avgWin || 0)}</div>
                    <div class="risk-label">Avg Win</div>
                    <div class="risk-status good">Good</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">📈 Seasonality Analysis</h2>
            <div class="chart-container">
                <div style="text-align: center; color: #6b7280;">
                    <div style="font-size: 1.2rem; margin-bottom: 10px;">Monthly Performance</div>
                    <div>Best month: ${advancedAnalytics?.seasonalityAnalysis?.bestMonth || 'N/A'}</div>
                    <div>Worst month: ${advancedAnalytics?.seasonalityAnalysis?.worstMonth || 'N/A'}</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }
}

export default HTMLPDFService;
