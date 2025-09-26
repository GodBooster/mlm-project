import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import DeFiReportService from './DeFiReportService';

class TemplatePDFService {
  static async generatePDFReport(reportData, positions, reportSettings, currencyMode = 'dollar', advancedAnalytics = null) {
    try {
      console.log('TemplatePDFService: Starting template-based PDF generation');
      
      // Load the HTML template
      const response = await fetch('/pdf.html');
      let htmlContent = await response.text();
      
      // Calculate all statistics
      const stats = DeFiReportService.calculatePortfolioStats(positions, reportSettings);
      const chartData = DeFiReportService.generateChartData(positions, reportSettings);
      const activePositions = positions.filter(p => p.status === 'FARMING' || p.status === 'farming');
      
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
      
      // Prepare data for template
      const templateData = {
        initialDeposit: reportSettings.initialAmount,
        totalValue: stats.totalValue,
        totalROI: stats.totalROI,
        totalProfit: stats.totalProfit,
        totalPositions: stats.activePositions + stats.closedPositions,
        activePositions: activePositions.map(position => {
          const profit = DeFiReportService.calculatePoolProfit(position, reportSettings, positions);
          return {
            name: position.symbol,
            chain: position.chain,
            positionSize: reportSettings.amountPerPool || 20000,
            pnl: profit.netProfit || 0,
            roi: profit.roi || 0,
            apr: position.currentApy || position.entryApy || 0,
            impermanentLoss: (profit.impermanentLossRate || 0) * 100,
            duration: profit.daysInPool ? `${profit.daysInPool.toFixed(1)}d` : '0d'
          };
        }),
        blockchainDistribution: blockchainDistribution,
        riskMetrics: advancedAnalytics?.riskMetrics || {},
        seasonalityAnalysis: advancedAnalytics?.seasonalityAnalysis || {}
      };
      
      // Update HTML content with real data
      htmlContent = this.updateHTMLWithData(htmlContent, templateData);
      
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
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 1200,
        height: tempContainer.scrollHeight,
        logging: false
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
      
      console.log('TemplatePDFService: PDF generation completed successfully');
      return pdf;
      
    } catch (error) {
      console.error('TemplatePDFService: Error generating PDF:', error);
      throw error;
    }
  }
  
  static updateHTMLWithData(htmlContent, data) {
    // Update report date
    htmlContent = htmlContent.replace(
      /id="reportDate"/g,
      `id="reportDate">${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`
    );
    
    // Update main metrics
    htmlContent = htmlContent.replace(/id="initialDeposit"/g, `id="initialDeposit">${this.formatCurrency(data.initialDeposit)}`);
    htmlContent = htmlContent.replace(/id="totalValue"/g, `id="totalValue">${this.formatCurrency(data.totalValue)}`);
    htmlContent = htmlContent.replace(/id="totalROI"/g, `id="totalROI">${data.totalROI.toFixed(2)}%`);
    htmlContent = htmlContent.replace(/id="totalProfit"/g, `id="totalProfit">${this.formatCurrency(data.totalProfit)}`);
    htmlContent = htmlContent.replace(/id="totalPositions"/g, `id="totalPositions">${data.totalPositions}`);
    
    // Update active positions
    const activePositionsHTML = data.activePositions.map(position => `
      <div class="position-card">
        <div class="position-header">
          <div class="position-name">${position.name}</div>
          <div class="position-chain">${position.chain}</div>
        </div>
        <div class="position-metrics">
          <div class="position-metric">
            <div class="position-metric-value">${this.formatCurrency(position.positionSize)}</div>
            <div class="position-metric-label">Position Size</div>
          </div>
          <div class="position-metric">
            <div class="position-metric-value ${position.pnl >= 0 ? '' : 'negative'}">${this.formatCurrency(position.pnl)}</div>
            <div class="position-metric-label">Current P/L</div>
          </div>
          <div class="position-metric">
            <div class="position-metric-value ${position.roi >= 0 ? '' : 'negative'}">${position.roi.toFixed(2)}%</div>
            <div class="position-metric-label">ROI</div>
          </div>
          <div class="position-metric">
            <div class="position-metric-value">${position.apr.toFixed(1)}%</div>
            <div class="position-metric-label">Projected APR</div>
          </div>
          <div class="position-metric">
            <div class="position-metric-value">${position.impermanentLoss.toFixed(2)}%</div>
            <div class="position-metric-label">Impermanent Loss</div>
          </div>
          <div class="position-metric">
            <div class="position-metric-value">${position.duration}</div>
            <div class="position-metric-label">Duration</div>
          </div>
        </div>
      </div>
    `).join('');
    
    htmlContent = htmlContent.replace(/id="activePositions"/g, `id="activePositions">${activePositionsHTML}`);
    
    // Update blockchain distribution
    const blockchainHTML = data.blockchainDistribution.map(blockchain => `
      <div class="blockchain-card">
        <div class="blockchain-name">${blockchain.name}</div>
        <div class="blockchain-stats">${blockchain.positions} positions</div>
        <div class="blockchain-stats">Profit: ${this.formatCurrency(blockchain.profit)}</div>
        <div class="blockchain-stats">ROI: ${blockchain.roi.toFixed(2)}%</div>
      </div>
    `).join('');
    
    htmlContent = htmlContent.replace(/id="blockchainDistribution"/g, `id="blockchainDistribution">${blockchainHTML}`);
    
    // Update risk metrics
    const riskMetrics = data.riskMetrics;
    htmlContent = htmlContent.replace(/id="sharpeRatio"/g, `id="sharpeRatio">${(riskMetrics.sharpeRatio || 0).toFixed(2)}`);
    htmlContent = htmlContent.replace(/id="sortinoRatio"/g, `id="sortinoRatio">${(riskMetrics.sortinoRatio || 0).toFixed(2)}`);
    htmlContent = htmlContent.replace(/id="maxDrawdown"/g, `id="maxDrawdown">${this.formatPercent(riskMetrics.maxDrawdown || 0)}`);
    htmlContent = htmlContent.replace(/id="volatility"/g, `id="volatility">${this.formatPercent(riskMetrics.volatility || 0)}`);
    htmlContent = htmlContent.replace(/id="winRate"/g, `id="winRate">${this.formatPercent(riskMetrics.winRate || 0)}`);
    htmlContent = htmlContent.replace(/id="avgWin"/g, `id="avgWin">${this.formatCurrency(riskMetrics.avgWin || 0)}`);
    
    // Update seasonality analysis
    const seasonality = data.seasonalityAnalysis;
    htmlContent = htmlContent.replace(/id="bestMonth"/g, `id="bestMonth">${seasonality.bestMonth || 'N/A'}`);
    htmlContent = htmlContent.replace(/id="worstMonth"/g, `id="worstMonth">${seasonality.worstMonth || 'N/A'}`);
    htmlContent = htmlContent.replace(/id="bestMonthROI"/g, `id="bestMonthROI">ROI: ${this.formatPercent(seasonality.bestMonthROI || 0)}`);
    htmlContent = htmlContent.replace(/id="worstMonthROI"/g, `id="worstMonthROI">ROI: ${this.formatPercent(seasonality.worstMonthROI || 0)}`);
    
    return htmlContent;
  }
  
  static formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
    if (amount >= 1000000) {
      return '$' + (amount / 1000000).toFixed(2) + 'M';
    } else if (amount >= 1000) {
      return '$' + (amount / 1000).toFixed(2) + 'K';
    } else {
      return '$' + amount.toFixed(2);
    }
  }
  
  static formatPercent(value) {
    if (typeof value !== 'number' || isNaN(value)) return '0.00%';
    return value.toFixed(2) + '%';
  }
}

export default TemplatePDFService;
