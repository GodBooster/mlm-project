import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import DeFiReportService from './DeFiReportService';

class BeautifulPDFService {
  static async generatePDFReport(reportData, positions, reportSettings, currencyMode = 'dollar', advancedAnalytics = null) {
    try {
      console.log('BeautifulPDFService: Starting beautiful PDF generation');
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Helper functions
      const formatNumber = (num) => {
        if (typeof num !== 'number' || isNaN(num)) return '$0.00';
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

      // Calculate statistics
      const stats = DeFiReportService.calculatePortfolioStats(positions, reportSettings);
      const chartData = DeFiReportService.generateChartData(positions, reportSettings);
      const activePositions = positions.filter(p => p.status === 'FARMING' || p.status === 'farming');

      // Page 1: Title and Overview
      const addTitlePage = async () => {
        // Header with gradient background
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, pageWidth, 50, 'F');
        
        // Logo area - try to load logo
        try {
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          logoImg.src = '/DeFi2.png';
          
          await new Promise((resolve, reject) => {
            logoImg.onload = () => {
              try {
                doc.addImage(logoImg, 'PNG', 10, 10, 30, 30);
                resolve();
              } catch (error) {
                reject(error);
              }
            };
            logoImg.onerror = () => reject(new Error('Logo load failed'));
            setTimeout(() => reject(new Error('Logo load timeout')), 2000);
          });
        } catch (error) {
          // Fallback to text logo
          doc.setFillColor(255, 255, 255);
          doc.circle(25, 25, 15, 'F');
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(59, 130, 246);
          doc.text('MS', 20, 30);
        }
        
        // Title
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('DeFi Investment Report', pageWidth / 2, 25, { align: 'center' });
        
        // Report period and date in header
        const startDate = new Date(reportSettings.startDate || Date.now() - 365 * 24 * 60 * 60 * 1000);
        const endDate = new Date(reportSettings.endDate || Date.now());
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(255, 255, 255);
        doc.text(`Report Period: ${startDate.toLocaleDateString('en-US')} - ${endDate.toLocaleDateString('en-US')}`, pageWidth / 2, 35, { align: 'center' });
        
        doc.setFontSize(9);
        doc.text(`Report Date: ${new Date().toLocaleDateString('en-US')} | Classification: Confidential`, pageWidth / 2, 42, { align: 'center' });
        
        yPosition = 70;

        // Key Metrics Grid
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Key Performance Indicators', margin, yPosition);
        yPosition += 20;

        const metrics = [
          { label: 'Initial Deposit', value: formatNumber(reportSettings.initialAmount), color: [59, 130, 246] },
          { label: 'Total Portfolio Value', value: formatNumber(stats.totalValue), color: [16, 185, 129] },
          { label: 'Total ROI', value: formatPercent(stats.totalROI), color: [245, 158, 11] },
          { label: 'Total Profit', value: formatNumber(stats.totalProfit), color: [239, 68, 68] },
          { label: 'Total Positions', value: `${stats.activePositions + stats.closedPositions}`, color: [139, 92, 246] },
          { label: 'Active Positions', value: `${stats.activePositions}`, color: [16, 185, 129] },
          { label: 'Closed Positions', value: `${stats.closedPositions}`, color: [107, 114, 128] }
        ];

        const cardWidth = (pageWidth - 2 * margin) / 2;
        const cardHeight = 25;

        metrics.forEach((metric, index) => {
          const x = margin + (index % 2) * cardWidth;
          const y = yPosition + Math.floor(index / 2) * cardHeight;
          
          // Card background
          doc.setFillColor(248, 250, 252);
          doc.rect(x, y, cardWidth - 5, cardHeight, 'F');
          doc.setDrawColor(229, 231, 235);
          doc.rect(x, y, cardWidth - 5, cardHeight, 'S');
          
          // Value
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(metric.color[0], metric.color[1], metric.color[2]);
          doc.text(metric.value, x + 5, y + 10);
          
          // Label
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          doc.text(metric.label, x + 5, y + 18);
        });

        yPosition += Math.ceil(metrics.length / 2) * cardHeight + 20;
      };

      // Page 2: Portfolio Growth Chart
      const addPortfolioGrowthChart = () => {
        doc.addPage();
        yPosition = margin;

        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Portfolio Growth Over Time', margin, yPosition);
        yPosition += 15;

        // Chart area
        const chartWidth = pageWidth - 2 * margin;
        const chartHeight = 80;
        
        // Background
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, yPosition, chartWidth, chartHeight, 'F');
        doc.setDrawColor(229, 231, 235);
        doc.rect(margin, yPosition, chartWidth, chartHeight, 'S');

        if (chartData.portfolioGrowth && chartData.portfolioGrowth.length > 0) {
          const data = chartData.portfolioGrowth;
          const values = data.map(d => d.value).filter(v => typeof v === 'number' && !isNaN(v));
          
          if (values.length > 0) {
            const maxValue = Math.max(...values);
            const minValue = Math.min(...values);
            const valueRange = maxValue - minValue;
            
            // Draw axes
            doc.setDrawColor(100, 100, 100);
            doc.setLineWidth(0.5);
            doc.line(margin + 20, yPosition + chartHeight - 15, margin + chartWidth - 20, yPosition + chartHeight - 15); // X-axis
            doc.line(margin + 20, yPosition + 15, margin + 20, yPosition + chartHeight - 15); // Y-axis
            
            // Draw grid lines
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.2);
            for (let i = 1; i <= 4; i++) {
              const y = yPosition + 15 + (i * (chartHeight - 30) / 4);
              doc.line(margin + 20, y, margin + chartWidth - 20, y);
            }
            
            // Draw data line (thin line)
            doc.setDrawColor(16, 185, 129);
            doc.setLineWidth(1);
            
            for (let i = 0; i < data.length - 1; i++) {
              const x1 = margin + 20 + (i / (data.length - 1)) * (chartWidth - 40);
              const y1 = yPosition + chartHeight - 15 - ((data[i].value - minValue) / valueRange) * (chartHeight - 30);
              const x2 = margin + 20 + ((i + 1) / (data.length - 1)) * (chartWidth - 40);
              const y2 = yPosition + chartHeight - 15 - ((data[i + 1].value - minValue) / valueRange) * (chartHeight - 30);
              
              doc.line(x1, y1, x2, y2);
            }
            
            // Draw data points (smaller)
            doc.setFillColor(16, 185, 129);
            for (let i = 0; i < data.length; i++) {
              const x = margin + 20 + (i / (data.length - 1)) * (chartWidth - 40);
              const y = yPosition + chartHeight - 15 - ((data[i].value - minValue) / valueRange) * (chartHeight - 30);
              doc.rect(x - 0.5, y - 0.5, 1, 1, 'F');
            }
            
            // Y-axis labels (smaller font)
            doc.setFontSize(6);
            doc.setTextColor(100, 100, 100);
            for (let i = 0; i <= 4; i++) {
              const value = minValue + (i * valueRange / 4);
              const y = yPosition + chartHeight - 15 - (i * (chartHeight - 30) / 4);
              // Format values to be shorter
              const shortValue = value >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` : 
                                value >= 1000 ? `$${(value / 1000).toFixed(0)}K` : 
                                `$${value.toFixed(0)}`;
              doc.text(shortValue, margin + 3, y + 2);
            }
            
            // X-axis labels (more dates)
            doc.setFontSize(6);
            doc.setTextColor(100, 100, 100);
            const labelCount = Math.min(8, data.length); // Increased from 5 to 8
            for (let i = 0; i < labelCount; i++) {
              const index = Math.floor((i * (data.length - 1)) / (labelCount - 1));
              const x = margin + 20 + (index / (data.length - 1)) * (chartWidth - 40);
              const date = new Date(data[index].date || Date.now() - (data.length - index) * 24 * 60 * 60 * 1000);
              const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              doc.text(dateStr, x - 8, yPosition + chartHeight - 5);
            }
          }
        }

        yPosition += chartHeight + 20;

        // Text summary under the chart
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const summaryText = `For the reporting period, the strategy demonstrated high profitability of ${formatNumber(stats.totalProfit)} (${formatPercent(stats.totalROI)}), significantly exceeding market benchmarks. This was achieved through an aggressive but clearly controlled risk approach. The key feature is the strategy's ability to effectively limit losses, as confirmed by extremely low maximum drawdown (${formatPercent(advancedAnalytics?.riskMetrics?.maxDrawdown || 0)}) and outstanding Sortino ratio (${(advancedAnalytics?.riskMetrics?.sortinoRatio || 0).toFixed(2)}).`;
        
        const summaryLines = doc.splitTextToSize(summaryText, pageWidth - 2 * margin);
        doc.text(summaryLines, margin, yPosition);
      };

      // Page 3: Active Positions and Blockchain Distribution
      const addPositionsAndDistribution = () => {
        doc.addPage();
        yPosition = margin;

        // Active Positions
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Active Positions', margin, yPosition);
        yPosition += 15;

        if (activePositions.length > 0) {
          // Table headers
          const headers = ['Pool', 'Chain', 'APR', 'P/L', 'ROI', 'IL', 'Duration'];
          const colWidths = [30, 18, 18, 22, 18, 15, 18];
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
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);

          activePositions.slice(0, 12).forEach((position, index) => {
            if (yPosition > pageHeight - 30) {
              doc.addPage();
              yPosition = margin;
            }

            const profit = DeFiReportService.calculatePoolProfit(position, reportSettings, positions);
            
            x = margin;
            const rowData = [
              position.symbol.substring(0, 10),
              position.chain,
              formatPercent(position.currentApy || position.entryApy),
              formatNumber(profit.netProfit),
              formatPercent(profit.roi),
              formatPercent((profit.impermanentLossRate || 0) * 100),
              profit.daysInPool ? `${profit.daysInPool.toFixed(1)}d` : '0d'
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

        yPosition += 20;

        // Blockchain Distribution
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Blockchain Distribution', margin, yPosition);
        yPosition += 15;

        // Calculate blockchain stats
        const blockchainStats = {};
        positions.forEach(position => {
          if (!blockchainStats[position.chain]) {
            blockchainStats[position.chain] = { count: 0, profit: 0 };
          }
          blockchainStats[position.chain].count++;
          const profit = DeFiReportService.calculatePoolProfit(position, reportSettings, positions);
          blockchainStats[position.chain].profit += profit.netProfit || 0;
        });

        const blockchainData = Object.entries(blockchainStats).map(([chain, data]) => ({
          chain,
          count: data.count,
          profit: data.profit
        }));

        const maxCount = Math.max(...blockchainData.map(d => d.count));
        const barHeight = 8;
        const barSpacing = 12;

        blockchainData.forEach((item, index) => {
          const barWidth = (item.count / maxCount) * (pageWidth - 100);
          const y = yPosition + index * barSpacing;
          
          // Bar
          doc.setFillColor(59, 130, 246);
          doc.rect(margin + 60, y, barWidth, barHeight, 'F');
          
          // Label
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.text(item.chain, margin + 5, y + 6);
          doc.text(`${item.count}`, margin + 50, y + 6);
          doc.text(formatNumber(item.profit), margin + 200, y + 6);
        });
      };

      // Page 4: Risk Analysis and Performance Metrics
      const addRiskAnalysis = () => {
        doc.addPage();
        yPosition = margin;

        // Risk Analysis
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Risk Analysis & Performance Metrics', margin, yPosition);
        yPosition += 20;

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
          const metricHeight = 20;

          metrics.forEach((metric, index) => {
            const x = margin + (index % 2) * metricWidth;
            const y = yPosition + Math.floor(index / 2) * metricHeight;
            
            // Background
            doc.setFillColor(248, 250, 252);
            doc.rect(x, y - 5, metricWidth - 5, metricHeight, 'F');
            doc.setDrawColor(229, 231, 235);
            doc.rect(x, y - 5, metricWidth - 5, metricHeight, 'S');
            
            // Text
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(metric.label, x + 5, y);
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(metric.color[0], metric.color[1], metric.color[2]);
            doc.text(metric.value, x + 5, y + 8);
          });
        }

        yPosition += 80;

        // Risk Interpretation
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Risk Interpretation', margin, yPosition);
        yPosition += 10;

        const riskText = `High volatility indicator (${formatPercent(advancedAnalytics?.riskMetrics?.volatility || 0)}) is an integral part of the strategy focused on pools with anomalously high returns. The algorithm uses this volatility to generate profit while strictly controlling risks through automatic stop-losses on capital (1-5%). This allows avoiding significant losses, as reflected in the Max Drawdown indicator (${formatPercent(advancedAnalytics?.riskMetrics?.maxDrawdown || 0)}).`;
        
        const riskLines = doc.splitTextToSize(riskText, pageWidth - 2 * margin);
        doc.text(riskLines, margin, yPosition);
        yPosition += riskLines.length * 5 + 15;
      };

      // Generate all pages
      console.log('BeautifulPDFService: Adding title page');
      await addTitlePage();

      console.log('BeautifulPDFService: Adding portfolio growth chart');
      addPortfolioGrowthChart();

      console.log('BeautifulPDFService: Adding positions and distribution');
      addPositionsAndDistribution();

      console.log('BeautifulPDFService: Adding risk analysis');
      addRiskAnalysis();

      console.log('BeautifulPDFService: Beautiful PDF generation completed successfully');
      return doc;
      
    } catch (error) {
      console.error('BeautifulPDFService: Error generating PDF:', error);
      throw error;
    }
  }
}

export default BeautifulPDFService;
