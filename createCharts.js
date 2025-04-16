/**
 * Creates all charts for the dashboard
 * - Actual vs Forecast charts: Line charts
 * - Monthly Trend charts: Line charts
 * - YTD Achievement chart: Bar chart
 * - Performance Heatmap: Bar chart
 */
function createCharts() {
  try {
    // Create charts for each metric
    dashboardData.metrics.forEach(metric => {
      try {
        console.log(`Creating monthly trend chart for ${metric}...`);
        const chartId = `${metric.toLowerCase().replace(/\s+/g, '-')}-trend-chart`;
        const chartElement = document.getElementById(chartId);
        
        if (!chartElement) {
          console.warn(`Chart element with ID '${chartId}' not found in the DOM`);
          return; // Skip this chart
        }
        
        charts[`${metric}TrendChart`] = createMonthlyTrendChart(chartId, dashboardData, metric);
        console.log(`Successfully created trend chart for ${metric}`);
      } catch (error) {
        console.error(`Error creating trend chart for ${metric}:`, error);
      }
    });
    
    // Create YTD achievement chart
    try {
      console.log('Creating YTD achievement chart...');
      const chartElement = document.getElementById('ytd-achievement-chart');
      
      if (!chartElement) {
        console.warn("Chart element with ID 'ytd-achievement-chart' not found in the DOM");
      } else {
        charts.ytdAchievementChart = createYTDAchievementChart('ytd-achievement-chart', dashboardData, ytdAchievement);
        console.log('Successfully created YTD achievement chart');
      }
    } catch (error) {
      console.error('Error creating YTD achievement chart:', error);
    }
    
    // Create performance heatmap
    try {
      console.log('Creating performance heatmap...');
      const chartElement = document.getElementById('performance-heatmap-chart');
      
      if (!chartElement) {
        console.warn("Chart element with ID 'performance-heatmap-chart' not found in the DOM");
      } else {
        charts.performanceHeatmap = createPerformanceHeatmap('performance-heatmap-chart', dashboardData, ytdAchievement);
        console.log('Successfully created performance heatmap');
      }
    } catch (error) {
      console.error('Error creating performance heatmap:', error);
    }
    
    // Create individual charts for each initiative, sub-initiative, metric combination
    dashboardData.initiatives.forEach(initiative => {
      Object.keys(dashboardData.structured[initiative]).forEach(subInitiative => {
        Object.keys(dashboardData.structured[initiative][subInitiative]).forEach(metric => {
          try {
            // Convert subInitiative name to kebab-case for use in IDs
            const subInitiativeKebab = subInitiative.toLowerCase().replace(/\s+/g, '-');
            
            const chartId = `initiative-cards-${subInitiativeKebab}-${metric.toLowerCase().replace(/\s+/g, '-')}-chart`;
            console.log(`Creating chart for ${subInitiative} - ${metric} (ID: ${chartId})...`);
            
            const chartElement = document.getElementById(chartId);
            if (!chartElement) {
              console.warn(`Chart element with ID '${chartId}' not found in the DOM`);
              return; // Skip this chart
            }
            
            charts[chartId] = createActualVsForecastChart(chartId, dashboardData, initiative, subInitiative, metric);
            console.log(`Successfully created chart for ${subInitiative} - ${metric}`);
          } catch (error) {
            console.error(`Error creating chart for ${subInitiative} - ${metric}:`, error);
          }
        });
      });
    });
    
    console.log(`Successfully created ${Object.keys(charts).length} charts`);
  } catch (error) {
    console.error('Error in createCharts function:', error);
    throw error;
  }
}

/**
 * Adds event listeners for interactivity
 */
function addEventListeners() {
  // Toggle between dark and light mode
  const toggleDarkMode = document.getElementById(TOGGLE_DARK_MODE_ID);
  if (toggleDarkMode) {
    toggleDarkMode.addEventListener('click', function(e) {
      e.preventDefault();
      document.body.classList.toggle('light-mode');
      
      // Update chart colors based on theme
      const isLightMode = document.body.classList.contains('light-mode');
      updateChartsForTheme(isLightMode);
      
      // Update button text
      this.textContent = isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode';
    });
  }
}

/**
 * Updates chart colors based on theme
 * @param {boolean} isLightMode - Whether the theme is light mode
 */
function updateChartsForTheme(isLightMode) {
  const textColor = isLightMode ? '#2c3e50' : '#e2e8f0';
  const gridColor = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)';
  
  // Update all charts
  Object.values(charts).forEach(chart => {
    // Update scales
    chart.options.scales.x.grid.color = gridColor;
    chart.options.scales.y.grid.color = gridColor;
    chart.options.scales.x.ticks.color = textColor;
    chart.options.scales.y.ticks.color = textColor;
    
    // Update title if present
    if (chart.options.plugins.title) {
      chart.options.plugins.title.color = textColor;
    }
    
    // Update legend
    chart.options.plugins.legend.labels.color = textColor;
    
    // Update the chart
    chart.update();
  });
}

// Export functions for use in the HTML file
window.dashboardFunctions = {
  initializeDashboard,
  formatNumber
};
