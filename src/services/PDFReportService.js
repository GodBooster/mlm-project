import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import DeFiReportService from './DeFiReportService';

class PDFReportService {
  static async generatePDFReport(reportData, positions, reportSettings, currencyMode = 'dollar', advancedAnalytics = null) {
    try {
      console.log('PDFReportService: Starting comprehensive PDF generation');
      console.log('Report data:', reportData);
      console.log('Positions:', positions);
      console.log('Settings:', reportSettings);
      console.log('Advanced analytics:', advancedAnalytics);
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Helper functions
      const formatNumber = (num) => {
        if (typeof num !== 'number' || isNaN(num)) return '0.00';
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(num);
      };

      const formatPercent = (num) => {
        if (typeof num !== 'number' || isNaN(num)) return '0.00%';
        return `${num.toFixed(2)}%`;
      };

      const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      };

      // Calculate all statistics
      const stats = DeFiReportService.calculatePortfolioStats(positions, reportSettings);
      const chartData = DeFiReportService.generateChartData(positions, reportSettings);
      
      // Page 1: Title Page
      const addTitlePage = async () => {
        // Header with logo area
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        // Try to add logo
        try {
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          logoImg.src = '/DeFi2.png';
          
          await new Promise((resolve, reject) => {
            logoImg.onload = () => {
              try {
                doc.addImage(logoImg, 'PNG', margin, 8, 24, 24);
                resolve();
              } catch (error) {
                console.log('Logo loading failed, using text fallback');
                resolve();
              }
            };
            logoImg.onerror = () => {
              console.log('Logo not found, using text fallback');
              resolve();
            };
            setTimeout(() => {
              console.log('Logo loading timeout, using text fallback');
              resolve();
            }, 2000);
          });
        } catch (error) {
          console.log('Logo loading error:', error);
        }
        
        // Platform name
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Margin Space', margin + 30, 25);
        
        // Confidential stamp
        doc.setFontSize(10);
        doc.setTextColor(200, 200, 200);
        doc.text('CONFIDENTIAL', pageWidth - margin - 30, 25);
        
        yPosition = 60;

        // Main title
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('DeFi Investment Report', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 15;
        
        doc.setFontSize(20);
        doc.setTextColor(59, 130, 246);
        doc.text('DeFi Investment Report', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 30;

        // Key metrics
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Key Performance Indicators', margin, yPosition);
        yPosition += 15;

        // KPI Grid
        const kpiData = [
          { label: 'Initial Deposit', value: formatNumber(reportSettings.initialAmount), color: [59, 130, 246] },
          { label: 'Total Portfolio Value', value: formatNumber(stats.totalValue), color: [16, 185, 129] },
          { label: 'Total ROI', value: formatPercent(stats.totalROI), color: [245, 158, 11] },
          { label: 'Total Profit', value: formatNumber(stats.totalProfit), color: [239, 68, 68] },
          { label: 'Total Positions', value: `${stats.activePositions + stats.closedPositions}`, color: [139, 92, 246] },
          { label: 'Active Positions', value: `${stats.activePositions}`, color: [16, 185, 129] },
          { label: 'Closed Positions', value: `${stats.closedPositions}`, color: [107, 114, 128] }
        ];

        const kpiWidth = (pageWidth - 2 * margin) / 2;
        const kpiHeight = 15;

        kpiData.forEach((kpi, index) => {
          const x = margin + (index % 2) * kpiWidth;
          const y = yPosition + Math.floor(index / 2) * kpiHeight;
          
          // Background
          doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2], 0.1);
          doc.rect(x, y - 5, kpiWidth - 5, kpiHeight, 'F');
          
          // Text
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          doc.text(kpi.label, x + 3, y);
          
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(kpi.value, x + 3, y + 6);
        });

        yPosition += Math.ceil(kpiData.length / 2) * kpiHeight + 20;

        // Report details
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Report Generated: ${new Date().toLocaleDateString('en-US')}`, margin, yPosition);
        yPosition += 5;
        doc.text(`Data Source: DeFi Position Database`, margin, yPosition);
        yPosition += 5;
        doc.text(`Strategy: Automated DeFi Yield Farming`, margin, yPosition);
      };

      // Page 2: Portfolio Overview with Charts
      const addPortfolioOverview = async () => {
        doc.addPage();
        yPosition = margin;

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Portfolio Overview', margin, yPosition);
        yPosition += 15;

        // Portfolio Growth Chart
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Portfolio Growth Over Time', margin, yPosition);
        yPosition += 10;

        // Create portfolio growth chart
        const chartWidth = pageWidth - 2 * margin;
        const chartHeight = 60;
        
        // Chart background
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, yPosition, chartWidth, chartHeight, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, yPosition, chartWidth, chartHeight, 'S');

        // Chart data
        if (chartData.portfolioGrowth && chartData.portfolioGrowth.length > 0) {
          const data = chartData.portfolioGrowth;
          const values = data.map(d => d.value).filter(v => typeof v === 'number' && !isNaN(v));
          if (values.length === 0) {
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text('No portfolio growth data available', margin + 10, yPosition + chartHeight / 2);
          } else {
            const maxValue = Math.max(...values);
            const minValue = Math.min(...values);
            const valueRange = maxValue - minValue;
          
          // Draw axes
          doc.setDrawColor(100, 100, 100);
          doc.line(margin + 20, yPosition + chartHeight - 10, margin + chartWidth - 10, yPosition + chartHeight - 10); // X-axis
          doc.line(margin + 20, yPosition + 10, margin + 20, yPosition + chartHeight - 10); // Y-axis
          
          // Draw data points and line
          doc.setDrawColor(16, 185, 129);
          doc.setLineWidth(2);
          
          for (let i = 0; i < data.length - 1; i++) {
            const x1 = margin + 20 + (i / (data.length - 1)) * (chartWidth - 30);
            const y1 = yPosition + chartHeight - 10 - ((data[i].value - minValue) / valueRange) * (chartHeight - 20);
            const x2 = margin + 20 + ((i + 1) / (data.length - 1)) * (chartWidth - 30);
            const y2 = yPosition + chartHeight - 10 - ((data[i + 1].value - minValue) / valueRange) * (chartHeight - 20);
            
            doc.line(x1, y1, x2, y2);
          }
          
          // Draw data points (small squares instead of circles)
          doc.setFillColor(16, 185, 129);
          for (let i = 0; i < data.length; i++) {
            const x = margin + 20 + (i / (data.length - 1)) * (chartWidth - 30);
            const y = yPosition + chartHeight - 10 - ((data[i].value - minValue) / valueRange) * (chartHeight - 20);
            doc.rect(x - 1, y - 1, 2, 2, 'F');
          }
          }
        } else {
          doc.setFontSize(12);
          doc.setTextColor(100, 100, 100);
          doc.text('No portfolio growth data available', margin + 10, yPosition + chartHeight / 2);
        }

        yPosition += chartHeight + 20;

        // ROI by Pool Chart
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('ROI by Pool', margin, yPosition);
        yPosition += 10;

        // Create ROI chart
        const roiChartHeight = 60;
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, yPosition, chartWidth, roiChartHeight, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, yPosition, chartWidth, roiChartHeight, 'S');

        if (chartData.poolROI && chartData.poolROI.length > 0) {
          const data = chartData.poolROI;
          const roiValues = data.map(d => d.roi).filter(v => typeof v === 'number' && !isNaN(v));
          if (roiValues.length === 0) {
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text('No ROI data available', margin + 10, yPosition + roiChartHeight / 2);
          } else {
            const maxROI = Math.max(...roiValues);
            const barWidth = (chartWidth - 40) / data.length;
            const colors = [
              [16, 185, 129], [59, 130, 246], [245, 158, 11], [239, 68, 68],
              [139, 92, 246], [236, 72, 153], [14, 165, 233], [34, 197, 94]
            ];

            data.forEach((item, index) => {
              const barHeight = (item.roi / maxROI) * (roiChartHeight - 20);
              const x = margin + 20 + index * barWidth;
              const y = yPosition + roiChartHeight - 10 - barHeight;
              
              // Bar
              doc.setFillColor(colors[index % colors.length][0], colors[index % colors.length][1], colors[index % colors.length][2], 0.8);
              doc.rect(x, y, barWidth - 2, barHeight, 'F');
              
              // Label
              doc.setFontSize(8);
              doc.setTextColor(0, 0, 0);
              doc.text(item.pool.substring(0, 6), x + barWidth/2 - 10, yPosition + roiChartHeight - 2, { angle: 45 });
            });
          }
        } else {
          doc.setFontSize(12);
          doc.setTextColor(100, 100, 100);
          doc.text('No ROI data available', margin + 10, yPosition + roiChartHeight / 2);
        }

        yPosition += roiChartHeight + 20;
      };

      // Page 3: Chain Distribution and Performance Metrics
      const addChainDistributionAndMetrics = async () => {
        doc.addPage();
        yPosition = margin;

        // Chain Distribution Chart
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Chain Distribution', margin, yPosition);
        yPosition += 15;

        // Create horizontal bar chart
        const chartWidth = pageWidth - 2 * margin;
        const chartHeight = 60;
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, yPosition, chartWidth, chartHeight, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, yPosition, chartWidth, chartHeight, 'S');

        if (chartData.chainDistribution && chartData.chainDistribution.length > 0) {
          const data = chartData.chainDistribution;
          const counts = data.map(d => d.count).filter(v => typeof v === 'number' && !isNaN(v));
          if (counts.length === 0) {
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text('No chain distribution data available', margin + 10, yPosition + chartHeight / 2);
          } else {
            const maxCount = Math.max(...counts);
            const colors = [
              [16, 185, 129], [59, 130, 246], [245, 158, 11], [239, 68, 68],
              [139, 92, 246], [236, 72, 153], [14, 165, 233], [34, 197, 94]
            ];

            const barHeight = 12;
            const barSpacing = 15;
            const startY = yPosition + 10;

            data.forEach((item, index) => {
              const barWidth = (item.count / maxCount) * (chartWidth - 80);
              const y = startY + index * barSpacing;
              
              // Bar
              doc.setFillColor(colors[index % colors.length][0], colors[index % colors.length][1], colors[index % colors.length][2], 0.8);
              doc.rect(margin + 60, y, barWidth, barHeight, 'F');
              
              // Label
              doc.setFontSize(10);
              doc.setTextColor(0, 0, 0);
              doc.text(item.chain, margin + 5, y + 8);
              doc.text(`${item.count}`, margin + 50, y + 8);
            });
          }
        } else {
          doc.setFontSize(12);
          doc.setTextColor(100, 100, 100);
          doc.text('No chain distribution data available', margin + 10, yPosition + chartHeight / 2);
        }

        yPosition += 120;

        // Performance Metrics
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Performance Metrics', margin, yPosition);
        yPosition += 15;

        if (advancedAnalytics && advancedAnalytics.riskMetrics) {
          const metrics = [
            { label: 'Sharpe Ratio', value: advancedAnalytics.riskMetrics.sharpeRatio?.toFixed(2) || '0.00', color: [59, 130, 246] },
            { label: 'Sortino Ratio', value: advancedAnalytics.riskMetrics.sortinoRatio?.toFixed(2) || '0.00', color: [16, 185, 129] },
            { label: 'Max Drawdown', value: formatPercent(advancedAnalytics.riskMetrics.maxDrawdown || 0), color: [239, 68, 68] },
            { label: 'Volatility', value: formatPercent(advancedAnalytics.riskMetrics.volatility || 0), color: [245, 158, 11] },
            { label: 'Win Rate', value: formatPercent(advancedAnalytics.riskMetrics.winRate || 0), color: [139, 92, 246] },
            { label: 'Avg Win', value: formatNumber(advancedAnalytics.riskMetrics.avgWin || 0), color: [16, 185, 129] }
          ];

          const metricWidth = (pageWidth - 2 * margin) / 2;
          const metricHeight = 15;

          metrics.forEach((metric, index) => {
            const x = margin + (index % 2) * metricWidth;
            const y = yPosition + Math.floor(index / 2) * metricHeight;
            
            // Background
            doc.setFillColor(metric.color[0], metric.color[1], metric.color[2], 0.1);
            doc.rect(x, y - 5, metricWidth - 5, metricHeight, 'F');
            
            // Text
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(metric.label, x + 3, y);
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(metric.value, x + 3, y + 6);
          });
        }
      };

      // Page 4: Impermanent Loss Analysis
      const addImpermanentLossAnalysis = async () => {
        doc.addPage();
        yPosition = margin;

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Impermanent Loss Analysis', margin, yPosition);
        yPosition += 15;

        // Calculate IL statistics
        const activePositions = positions.filter(p => p.status === 'FARMING' || p.status === 'farming');
        const closedPositions = positions.filter(p => p.status === 'UNSTAKED' || p.status === 'unstaked');
        
        let totalILAmount = 0;
        let totalILRate = 0;
        let positionsWithIL = 0;
        const chainILStats = {};

        [...activePositions, ...closedPositions].forEach(position => {
          const profit = DeFiReportService.calculatePoolProfit(position, reportSettings, positions);
          const ilRate = profit.impermanentLossRate || 0;
          const ilAmount = profit.impermanentLoss || 0;
          
          totalILAmount += ilAmount;
          totalILRate += ilRate;
          if (ilRate > 0) positionsWithIL++;
          
          if (!chainILStats[position.chain]) {
            chainILStats[position.chain] = { totalIL: 0, count: 0, avgIL: 0 };
          }
          chainILStats[position.chain].totalIL += ilAmount;
          chainILStats[position.chain].count++;
        });

        const avgILRate = positions.length > 0 ? (totalILRate / positions.length) * 100 : 0;
        const avgILAmount = totalILAmount / positions.length;

        // Overall IL Statistics
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Overall Statistics', margin, yPosition);
        yPosition += 15;

        const ilStats = [
          { label: 'Average IL Rate', value: formatPercent(avgILRate), color: [239, 68, 68] },
          { label: 'Total IL Amount', value: formatNumber(totalILAmount), color: [245, 158, 11] },
          { label: 'Positions with IL', value: `${positionsWithIL}/${positions.length}`, color: [139, 92, 246] }
        ];

        const ilStatWidth = (pageWidth - 2 * margin) / 3;
        ilStats.forEach((stat, index) => {
          const x = margin + index * ilStatWidth;
          
          // Background
          doc.setFillColor(stat.color[0], stat.color[1], stat.color[2], 0.1);
          doc.rect(x, yPosition - 5, ilStatWidth - 5, 20, 'F');
          
          // Text
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          doc.text(stat.label, x + 3, yPosition);
          
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(stat.value, x + 3, yPosition + 8);
        });

        yPosition += 40;

        // IL by Blockchain
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('IL by Blockchain', margin, yPosition);
        yPosition += 15;

        Object.entries(chainILStats).forEach(([chain, stats]) => {
          stats.avgIL = stats.count > 0 ? stats.totalIL / stats.count : 0;
          
          // Chain name
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(chain, margin, yPosition);
          
          // Progress bar
          const barWidth = 100;
          const barHeight = 8;
          const maxIL = 1000; // Max IL for scaling
          const barFill = Math.min((stats.avgIL / maxIL) * barWidth, barWidth);
          
          // Background
          doc.setFillColor(200, 200, 200);
          doc.rect(margin + 60, yPosition - 5, barWidth, barHeight, 'F');
          
          // Fill
          doc.setFillColor(239, 68, 68);
          doc.rect(margin + 60, yPosition - 5, barFill, barHeight, 'F');
          
          // Value
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.text(formatNumber(stats.avgIL), margin + 170, yPosition);
          
          yPosition += 15;
        });
      };

      // Page 5: Active Positions Table
      const addActivePositions = async () => {
        doc.addPage();
        yPosition = margin;

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Active Positions', margin, yPosition);
        yPosition += 15;

        const activePositions = positions.filter(p => p.status === 'FARMING' || p.status === 'farming');
        
        if (activePositions.length > 0) {
          // Table headers
          const headers = ['Pool', 'Chain', 'Entry APR', 'Current APR', 'Duration', 'P/L', 'IL Rate'];
          const colWidths = [30, 20, 20, 20, 20, 25, 20];
          let x = margin;

          // Header row
          doc.setFillColor(59, 130, 246);
          doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10, 'F');
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          
          headers.forEach((header, index) => {
            doc.text(header, x + 2, yPosition);
            x += colWidths[index];
          });

          yPosition += 15;

          // Data rows
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);

          activePositions.forEach((position, index) => {
            if (yPosition > pageHeight - 30) {
              doc.addPage();
              yPosition = margin;
            }

            const profit = DeFiReportService.calculatePoolProfit(position, reportSettings, positions);
            const duration = profit.daysInPool || 0;
            
            x = margin;
            const rowData = [
              position.symbol.substring(0, 12),
              position.chain,
              formatPercent(position.entryApy),
              formatPercent(position.currentApy),
              `${duration.toFixed(1)}d`,
              formatNumber(profit.netProfit),
              formatPercent(profit.impermanentLossRate * 100)
            ];

            // Alternating row colors
            if (index % 2 === 0) {
              doc.setFillColor(248, 250, 252);
              doc.rect(margin, yPosition - 3, pageWidth - 2 * margin, 8, 'F');
            }

            rowData.forEach((data, colIndex) => {
              doc.text(data, x + 2, yPosition);
              x += colWidths[colIndex];
            });

            yPosition += 10;
          });
        } else {
          doc.setFontSize(12);
          doc.setTextColor(100, 100, 100);
          doc.text('No active positions', margin, yPosition);
        }
      };

      // Page 6: Footer and Summary
      const addFooter = (pageNum, totalPages) => {
        const footerY = pageHeight - 10;
        
        // Footer line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
        
        // Page number
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
        
        // Platform info
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Generated by Margin Space DeFi Platform', margin, footerY);
        doc.text('defi-platform.com', pageWidth - margin - 40, footerY);
      };

      // Generate all pages
      console.log('PDFReportService: Adding title page');
      await addTitlePage();
      addFooter(1, 6);

      console.log('PDFReportService: Adding portfolio overview');
      await addPortfolioOverview();
      addFooter(2, 6);

      console.log('PDFReportService: Adding chain distribution and metrics');
      await addChainDistributionAndMetrics();
      addFooter(3, 6);

      console.log('PDFReportService: Adding impermanent loss analysis');
      await addImpermanentLossAnalysis();
      addFooter(4, 6);

      console.log('PDFReportService: Adding active positions');
      await addActivePositions();
      addFooter(5, 6);

      console.log('PDFReportService: Comprehensive PDF generation completed successfully');
      return doc;
    } catch (error) {
      console.error('PDFReportService: Error generating PDF:', error);
      console.error('PDFReportService: Error stack:', error.stack);
      throw error;
    }
  }
}

export default PDFReportService;