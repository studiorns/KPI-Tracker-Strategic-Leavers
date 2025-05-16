// Strategic Leavers Dashboard - Chart Configurations and Data Processing
// This file handles data processing and chart creation for the Strategic Leavers KPI Dashboard

console.log('Strategic Leavers.js loaded successfully');

// Constants for chart configuration
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const CHART_COLORS = {
  blue: 'rgba(54, 162, 235, 1)',      // Vibrant blue from Qatar dashboard
  lightBlue: 'rgba(116, 185, 255, 1)', // Lighter blue
  red: 'rgba(255, 99, 132, 1)',        // Vibrant pink-red
  green: 'rgba(75, 192, 192, 1)',      // Teal/green from Qatar dashboard
  purple: 'rgba(153, 102, 255, 1)',    // Vibrant purple
  orange: 'rgba(255, 159, 64, 1)',     // Vibrant orange from Qatar dashboard
  yellow: 'rgba(255, 205, 86, 1)',     // Vibrant yellow
  gray: 'rgba(201, 203, 207, 1)'       // Neutral gray
};

// Constants for frequently used values
const METRICS_CONTAINER_ID = 'metrics-container';
const LATEST_MONTH = 'April'; // Make sure this matches exactly with the month name in the CSV
const TOGGLE_DARK_MODE_ID = 'toggle-dark-mode';

/**
 * Parses CSV data into an array of objects
 * @param {string} csvData - The raw CSV data as a string
 * @returns {Array} - The parsed data as an array of objects
 */
function parseCSVData(csvData) {
  console.log('Raw CSV data first 100 chars:', csvData.substring(0, 100));
  
  // Handle CSV data with quoted fields that may contain commas
  function parseCSVLine(line) {
    const result = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    result.push(currentValue);
    return result;
  }
  
  try {
    const lines = csvData.trim().split('\n');
    console.log(`CSV has ${lines.length} lines`);
    
    if (lines.length <= 1) {
      console.error('CSV data has no data rows');
      return [];
    }
    
    const headers = parseCSVLine(lines[0]).map(header => header.trim());
    console.log('CSV headers:', headers);
    
    // Identify numeric columns (typically columns after the 3rd one, but not Month)
    const numericColumns = headers.slice(4).filter(header => header !== 'Month');
    
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      if (values.length === headers.length) {
        const entry = {};
        for (let j = 0; j < headers.length; j++) {
          const header = headers[j];
          const value = values[j].trim().replace(/^"|"$/g, '');
          
          // Special handling for Month column - always keep as string
          if (header === 'Month') {
            entry[header] = value;
            console.log(`Parsed Month: ${value}, type: ${typeof value}`);
          }
          // Clean numeric values by removing quotes and commas
          else if (numericColumns.includes(header)) {
            entry[header] = parseNumericValue(value);
          } else {
            entry[header] = value;
          }
        }
        result.push(entry);
      } else {
        console.warn(`Line ${i + 1} has ${values.length} values, expected ${headers.length}`);
      }
    }
    
    console.log(`Successfully parsed ${result.length} rows of data`);
    return result;
  } catch (error) {
    console.error('Error parsing CSV data:', error);
    return [];
  }
}

/**
 * Parses a numeric value from a string, removing commas and quotes
 * @param {string} value - The string value to parse
 * @returns {number} - The parsed numeric value
 */
function parseNumericValue(value) {
  if (!value || value.trim() === '') return 0;
  return parseFloat(value.replace(/[",]/g, '')) || 0;
}

/**
 * Process data for charts
 * @param {Array} data - The parsed CSV data
 * @returns {Object} - The processed data structure
 */
function processData(data) {
  console.log('Processing data...');
  
  // Get unique initiatives, sub-initiatives, and metrics
  const initiatives = [...new Set(data.map(item => item['Initiative Cards']))];
  const subInitiatives = [...new Set(data.map(item => item['Sub Initiative']))];
  const metrics = [...new Set(data.map(item => item['Metric']))];
  
  console.log(`Found ${initiatives.length} initiatives, ${subInitiatives.length} sub-initiatives, and ${metrics.length} metrics`);
  
  // Create structured data for each initiative, sub-initiative, metric combination
  const structuredData = {};
  
  initiatives.forEach(initiative => {
    structuredData[initiative] = {};
    
    subInitiatives.forEach(subInitiative => {
      if (data.some(item => item['Initiative Cards'] === initiative && item['Sub Initiative'] === subInitiative)) {
        structuredData[initiative][subInitiative] = {};
        
        metrics.forEach(metric => {
          const metricData = data.filter(item => 
            item['Initiative Cards'] === initiative && 
            item['Sub Initiative'] === subInitiative && 
            item['Metric'] === metric
          );
          
          if (metricData.length > 0) {
            structuredData[initiative][subInitiative][metric] = {
              actual: {},
              forecast: {},
              ytdActual: {},
              ytdForecast: {}
            };
            
            metricData.forEach(item => {
              const month = item['Month'];
              console.log(`Month from CSV: ${month}, type: ${typeof month}`);
              
              // Make sure month is a valid string
              if (month && typeof month === 'string') {
                structuredData[initiative][subInitiative][metric].actual[month] = item['Actual'];
                structuredData[initiative][subInitiative][metric].forecast[month] = item['Forecast'];
                structuredData[initiative][subInitiative][metric].ytdActual[month] = item['YTD Actual Totals'];
                structuredData[initiative][subInitiative][metric].ytdForecast[month] = item['YTD Forecast Totals'];
              } else {
                console.error(`Invalid month: ${month}`);
              }
            });
            
            // Debug log for months
            const months = Object.keys(structuredData[initiative][subInitiative][metric].actual);
            console.log(`${initiative} - ${subInitiative} - ${metric} has data for months: ${months.join(', ')}`);
          }
        });
      }
    });
  });
  
  return {
    raw: data,
    initiatives,
    subInitiatives,
    metrics,
    structured: structuredData
  };
}

// Calculate Month-over-Month (MoM) changes
function calculateMoMChanges(data) {
  const momChanges = {};
  
  data.initiatives.forEach(initiative => {
    momChanges[initiative] = {};
    
    Object.keys(data.structured[initiative]).forEach(subInitiative => {
      momChanges[initiative][subInitiative] = {};
      
      Object.keys(data.structured[initiative][subInitiative]).forEach(metric => {
        momChanges[initiative][subInitiative][metric] = {};
        
        const months = Object.keys(data.structured[initiative][subInitiative][metric].actual);
        months.sort((a, b) => MONTHS.indexOf(a) - MONTHS.indexOf(b));
        
        for (let i = 1; i < months.length; i++) {
          const currentMonth = months[i];
          const previousMonth = months[i-1];
          
          const currentValue = data.structured[initiative][subInitiative][metric].actual[currentMonth];
          const previousValue = data.structured[initiative][subInitiative][metric].actual[previousMonth];
          
          if (previousValue !== 0) {
            const percentChange = ((currentValue - previousValue) / previousValue) * 100;
            momChanges[initiative][subInitiative][metric][currentMonth] = percentChange;
          } else {
            momChanges[initiative][subInitiative][metric][currentMonth] = currentValue > 0 ? 100 : 0;
          }
        }
      });
    });
  });
  
  return momChanges;
}

// Calculate totals across all sub-initiatives
function calculateTotals(data) {
  console.log('Calculating totals across all sub-initiatives...');
  
  const totals = {
    Impressions: {
      actual: {},
      forecast: {},
      ytdActual: {},
      ytdForecast: {},
      momChange: {}
    },
    Engagement: {
      actual: {},
      forecast: {},
      ytdActual: {},
      ytdForecast: {},
      momChange: {}
    },
    'Paid Sessions': {
      actual: {},
      forecast: {},
      ytdActual: {},
      ytdForecast: {},
      momChange: {}
    }
  };
  
  // Get all months with data
  const allMonths = [];
  data.initiatives.forEach(initiative => {
    Object.keys(data.structured[initiative]).forEach(subInitiative => {
      Object.keys(data.structured[initiative][subInitiative]).forEach(metric => {
        const months = Object.keys(data.structured[initiative][subInitiative][metric].actual);
        months.forEach(month => {
          if (!allMonths.includes(month)) {
            allMonths.push(month);
          }
        });
      });
    });
  });
  
  // Sort months chronologically
  allMonths.sort((a, b) => MONTHS.indexOf(a) - MONTHS.indexOf(b));
  console.log(`Found ${allMonths.length} months of data: ${allMonths.join(', ')}`);
  
  // Initialize totals for each month and metric
  allMonths.forEach(month => {
    Object.keys(totals).forEach(metric => {
      totals[metric].actual[month] = 0;
      totals[metric].forecast[month] = 0;
      totals[metric].ytdActual[month] = 0;
      totals[metric].ytdForecast[month] = 0;
    });
  });
  
  // Calculate totals for each metric and month
  data.initiatives.forEach(initiative => {
    Object.keys(data.structured[initiative]).forEach(subInitiative => {
      Object.keys(data.structured[initiative][subInitiative]).forEach(metric => {
        if (totals[metric]) {
          allMonths.forEach(month => {
            const actual = data.structured[initiative][subInitiative][metric].actual[month] || 0;
            const forecast = data.structured[initiative][subInitiative][metric].forecast[month] || 0;
            const ytdActual = data.structured[initiative][subInitiative][metric].ytdActual[month] || 0;
            const ytdForecast = data.structured[initiative][subInitiative][metric].ytdForecast[month] || 0;
            
            totals[metric].actual[month] += actual;
            totals[metric].forecast[month] += forecast;
            totals[metric].ytdActual[month] += ytdActual;
            totals[metric].ytdForecast[month] += ytdForecast;
          });
        }
      });
    });
  });
  
  // Calculate MoM changes for totals
  Object.keys(totals).forEach(metric => {
    allMonths.forEach((month, index) => {
      if (index > 0) {
        const currentValue = totals[metric].actual[month];
        const previousValue = totals[metric].actual[allMonths[index - 1]];
        
        if (previousValue !== 0) {
          const percentChange = ((currentValue - previousValue) / previousValue) * 100;
          totals[metric].momChange[month] = percentChange;
        } else {
          totals[metric].momChange[month] = currentValue > 0 ? 100 : 0;
        }
      } else {
        totals[metric].momChange[month] = 0; // No MoM change for first month
      }
    });
  });
  
  console.log('Totals calculated successfully');
  return totals;
}

// Calculate YTD Achievement percentages
function calculateYTDAchievement(data) {
  const ytdAchievement = {};
  
  data.initiatives.forEach(initiative => {
    ytdAchievement[initiative] = {};
    
    Object.keys(data.structured[initiative]).forEach(subInitiative => {
      ytdAchievement[initiative][subInitiative] = {};
      
      Object.keys(data.structured[initiative][subInitiative]).forEach(metric => {
        ytdAchievement[initiative][subInitiative][metric] = {};
        
        const months = Object.keys(data.structured[initiative][subInitiative][metric].actual);
        months.sort((a, b) => MONTHS.indexOf(a) - MONTHS.indexOf(b));
        
        months.forEach(month => {
          const actual = data.structured[initiative][subInitiative][metric].ytdActual[month];
          const forecast = data.structured[initiative][subInitiative][metric].ytdForecast[month];
          
          if (forecast !== 0) {
            const achievement = (actual / forecast) * 100;
            ytdAchievement[initiative][subInitiative][metric][month] = achievement;
          } else {
            ytdAchievement[initiative][subInitiative][metric][month] = 0;
          }
        });
      });
    });
  });
  
  return ytdAchievement;
}

// Format numbers for display
function formatNumber(number, metric) {
  if (number === 0) return '0';
  
  if (number >= 1000000000) {
    return (number / 1000000000).toFixed(1) + 'B';
  } else if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + 'M';
  } else if (number >= 1000) {
    return (number / 1000).toFixed(1) + 'K';
  }
  
  return number.toFixed(0);
}

// Common chart options
const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        padding: 20,
        color: '#e2e8f0',
        font: {
          family: "'Inter', sans-serif",
          size: 12
        }
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(26, 32, 44, 0.9)',
      titleColor: '#e2e8f0',
      bodyColor: '#e2e8f0',
      borderColor: '#4a5568',
      borderWidth: 1,
      padding: 10,
      boxPadding: 5,
      usePointStyle: true,
      titleFont: {
        family: "'Inter', sans-serif",
        size: 14,
        weight: 'bold'
      },
      bodyFont: {
        family: "'Inter', sans-serif",
        size: 13
      },
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            // Use the formatNumber function for tooltip values
            if (typeof formatNumber === 'function') {
              label += formatNumber(context.parsed.y);
            } else {
              label += new Intl.NumberFormat().format(context.parsed.y);
            }
          }
          return label;
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.05)'
      },
      ticks: {
        color: '#e2e8f0',
        font: {
          family: "'Inter', sans-serif",
          size: 12
        }
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(255, 255, 255, 0.05)'
      },
      ticks: {
        color: '#e2e8f0',
        font: {
          family: "'Inter', sans-serif",
          size: 12
        },
        callback: function(value) {
          if (value >= 1000000000) {
            return (value / 1000000000).toFixed(1) + 'B';
          } else if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
          } else if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
          }
          return value;
        }
      }
    }
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false
  },
  elements: {
    line: {
      tension: 0.3
    },
    point: {
      radius: 4,
      hoverRadius: 6
    }
  }
};

// Create actual vs forecast chart
function createActualVsForecastChart(canvasId, data, initiative, subInitiative, metric) {
  try {
    console.log(`Creating actual vs forecast chart for ${initiative} - ${subInitiative} - ${metric}...`);
    
    // Get canvas element
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error(`Canvas element with ID '${canvasId}' not found`);
      throw new Error(`Canvas element with ID '${canvasId}' not found`);
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error(`Failed to get 2D context for canvas '${canvasId}'`);
      throw new Error(`Failed to get 2D context for canvas '${canvasId}'`);
    }
    
    // Check if metric data exists
    if (!data.structured[initiative] || 
        !data.structured[initiative][subInitiative] || 
        !data.structured[initiative][subInitiative][metric]) {
      console.error(`Data not found for ${initiative} - ${subInitiative} - ${metric}`);
      throw new Error(`Data not found for ${initiative} - ${subInitiative} - ${metric}`);
    }
    
    const metricData = data.structured[initiative][subInitiative][metric];
    
    // Get all months with data
    const allMonths = Object.keys(metricData.actual);
    console.log(`All months in data: ${allMonths.join(', ')}`);
    
    // Filter for months January through April
    const displayMonths = ['January', 'February', 'March', 'April'];
    const months = allMonths.filter(month => displayMonths.includes(month));
    
    if (months.length === 0) {
      console.warn(`No monthly data found for ${initiative} - ${subInitiative} - ${metric}`);
    }
    
    // Sort months chronologically
    months.sort((a, b) => displayMonths.indexOf(a) - displayMonths.indexOf(b));
    console.log(`Found ${months.length} months of data: ${months.join(', ')}`);
    
    // Extract actual and forecast data
    const actualData = [];
    const forecastData = [];
    
    for (const month of months) {
      const actualValue = metricData.actual[month];
      const forecastValue = metricData.forecast[month];
      
      console.log(`${month} - Actual: ${actualValue}, Forecast: ${forecastValue}`);
      
      actualData.push(actualValue);
      forecastData.push(forecastValue);
    }
    
    console.log(`Actual data: ${actualData.join(', ')}`);
    console.log(`Forecast data: ${forecastData.join(', ')}`);
    
    // Define specific colors for each sub-initiative for consistency
    const subInitiativeColors = {
      'Strategic Levers': CHART_COLORS.blue,
      'Strategic Levers UAE': CHART_COLORS.green
    };
    
    // Use the predefined color for this sub-initiative or fall back to a default
    const color = subInitiativeColors[subInitiative] || CHART_COLORS.blue;
    
    // Create chart
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Actual',
            data: actualData,
            borderColor: color,
            backgroundColor: color.replace('1)', '0.1)'),
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: false
          },
          {
            label: 'Forecast',
            data: forecastData,
            borderColor: CHART_COLORS.gray,
            backgroundColor: CHART_COLORS.gray.replace('1)', '0.1)'),
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: false,
            borderDash: [5, 5] // Add dashed line for forecast
          }
        ]
      },
      options: {
        ...commonChartOptions,
        plugins: {
          ...commonChartOptions.plugins,
          title: {
            display: true,
            text: `${subInitiative} - ${metric}`,
            color: '#e2e8f0',
            font: {
              family: "'Inter', sans-serif",
              size: 16,
              weight: 'bold'
            }
          }
        }
      }
    });
    
    console.log(`Successfully created chart for ${initiative} - ${subInitiative} - ${metric}`);
    return chart;
  } catch (error) {
    console.error(`Error creating chart for ${initiative} - ${subInitiative} - ${metric}:`, error);
    throw error;
  }
}

// Create monthly trend chart
function createMonthlyTrendChart(canvasId, data, metric) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  
  const months = MONTHS.slice(0, 4); // January through April
  const datasets = [];
  
  // Define specific colors for each sub-initiative for consistency
  const subInitiativeColors = {
    'Strategic Levers': CHART_COLORS.blue,
    'Strategic Levers UAE': CHART_COLORS.green
  };
  
  data.subInitiatives.forEach((subInitiative, index) => {
    const subInitiativeData = [];
    
    // Find the initiative that contains this sub-initiative
    const initiative = data.initiatives.find(init => 
      Object.keys(data.structured[init]).includes(subInitiative)
    );
    
    if (initiative && data.structured[initiative][subInitiative][metric]) {
      months.forEach(month => {
        subInitiativeData.push(data.structured[initiative][subInitiative][metric].actual[month] || 0);
      });
      
      // Use the predefined color for this sub-initiative or fall back to a color from the palette
      const color = subInitiativeColors[subInitiative] || Object.values(CHART_COLORS)[index % Object.keys(CHART_COLORS).length];
      
      datasets.push({
        label: subInitiative,
        data: subInitiativeData,
        borderColor: color,
        backgroundColor: color.replace('1)', '0.2)'), // Add transparency for fill
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true // Enable area fill for better visualization
      });
    }
  });
  
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: datasets
    },
    options: {
      ...commonChartOptions,
      plugins: {
        ...commonChartOptions.plugins,
        title: {
          display: true,
          text: `Monthly ${metric} Trend - January-April 2025`,
          color: '#e2e8f0',
          font: {
            family: "'Inter', sans-serif",
            size: 16,
            weight: 'bold'
          }
        }
      }
    }
  });
  
  return chart;
}

// Create YTD achievement chart
function createYTDAchievementChart(canvasId, data, ytdAchievement) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  
  const datasets = [];
  const latestMonth = 'April'; // Latest month with actual data
  
  console.log('Creating YTD achievement chart with data for month:', latestMonth);
  
  // Define specific colors for each sub-initiative for consistency
  const subInitiativeColors = {
    'Strategic Levers': CHART_COLORS.blue,
    'Strategic Levers UAE': CHART_COLORS.green
  };
  
  data.subInitiatives.forEach((subInitiative, index) => {
    // Find the initiative that contains this sub-initiative
    const initiative = data.initiatives.find(init => 
      Object.keys(data.structured[init]).includes(subInitiative)
    );
    
    if (initiative) {
      const subInitiativeData = [];
      
      console.log(`Processing ${subInitiative} under initiative ${initiative}:`);
      
      data.metrics.forEach(metric => {
        if (data.structured[initiative][subInitiative][metric] && 
            ytdAchievement[initiative][subInitiative][metric][latestMonth]) {
          const achievementValue = ytdAchievement[initiative][subInitiative][metric][latestMonth];
          subInitiativeData.push(achievementValue);
          
          // Log the actual values for debugging
          const ytdActual = data.structured[initiative][subInitiative][metric].ytdActual[latestMonth];
          const ytdForecast = data.structured[initiative][subInitiative][metric].ytdForecast[latestMonth];
          console.log(`  ${metric}: Achievement = ${achievementValue.toFixed(2)}% (YTD Actual: ${ytdActual}, YTD Forecast: ${ytdForecast})`);
        } else {
          subInitiativeData.push(0);
          console.log(`  ${metric}: No data available`);
        }
      });
      
      // Use the predefined color for this sub-initiative or fall back to a color from the palette
      const color = subInitiativeColors[subInitiative] || Object.values(CHART_COLORS)[index % Object.keys(CHART_COLORS).length];
      
      datasets.push({
        label: subInitiative,
        data: subInitiativeData,
        backgroundColor: color,
        borderColor: color,
        borderWidth: 1,
        hoverBackgroundColor: color.replace('1)', '0.8)') // Slightly transparent on hover
      });
    }
  });
  
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.metrics,
      datasets: datasets
    },
    options: {
      ...commonChartOptions,
      plugins: {
        ...commonChartOptions.plugins,
        title: {
          display: true,
          text: `YTD Achievement % (as of ${latestMonth} 2025)`,
          color: '#e2e8f0',
          font: {
            family: "'Inter', sans-serif",
            size: 16,
            weight: 'bold'
          }
        }
      },
      scales: {
        ...commonChartOptions.scales,
        y: {
          ...commonChartOptions.scales.y,
          min: 0,
          max: 200, // Increased from 120 to better visualize values that might be higher for Strategic Leavers
          grid: {
            ...commonChartOptions.scales.y.grid,
            color: function(context) {
              // Make the 100% line more prominent with a dotted white line
              if (context.tick.value === 100) {
                return 'rgba(255, 255, 255, 0.5)';
              }
              // Return the default grid color for other lines
              return 'rgba(255, 255, 255, 0.05)';
            },
            lineWidth: function(context) {
              // Make the 100% line slightly thicker
              if (context.tick.value === 100) {
                return 2;
              }
              return 1;
            },
            borderDash: function(context) {
              // Make the 100% line dotted
              if (context.tick.value === 100) {
                return [5, 5]; // Dotted line pattern [dash length, gap length]
              }
              return [0, 0]; // Solid line for other grid lines
            }
          },
          ticks: {
            ...commonChartOptions.scales.y.ticks,
            callback: function(value) {
              return value + '%';
            }
          }
        }
      }
    }
  });
  
  console.log('YTD achievement chart created successfully');
  
  return chart;
}

// Create performance heatmap
function createPerformanceHeatmap(canvasId, data, ytdAchievement) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  
  const latestMonth = 'April'; // Latest month with actual data
  const datasets = [];
  
  // Define performance color ranges using our new color palette
  const performanceColors = {
    excellent: CHART_COLORS.green.replace('1)', '0.8)'),    // >110%
    good: CHART_COLORS.green.replace('1)', '0.5)'),         // 100-110%
    warning: CHART_COLORS.yellow.replace('1)', '0.6)'),     // 90-100%
    poor: CHART_COLORS.orange.replace('1)', '0.6)'),        // 70-90%
    critical: CHART_COLORS.red.replace('1)', '0.8)')        // <70%
  };
  
  data.metrics.forEach((metric, index) => {
    const metricData = [];
    
    data.subInitiatives.forEach(subInitiative => {
      // Find the initiative that contains this sub-initiative
      const initiative = data.initiatives.find(init => 
        Object.keys(data.structured[init]).includes(subInitiative)
      );
      
      if (initiative && 
          data.structured[initiative][subInitiative][metric] && 
          ytdAchievement[initiative][subInitiative][metric][latestMonth]) {
        metricData.push(ytdAchievement[initiative][subInitiative][metric][latestMonth]);
      } else {
        metricData.push(0);
      }
    });
    
    // For line charts, we need to use borderColor instead of backgroundColor for the color coding
    const metricColor = Object.values(CHART_COLORS)[index % Object.keys(CHART_COLORS).length];
    
    datasets.push({
      label: metric,
      data: metricData,
      borderColor: metricColor,
      backgroundColor: metricColor.replace('1)', '0.1)'),
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.3,
      fill: false
    });
  });
  
  // For the performance data, it's better to revert to a bar chart
  // as line charts don't work well with the indexAxis: 'y' configuration
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.subInitiatives,
      datasets: datasets
    },
    options: {
      ...commonChartOptions,
      indexAxis: 'y',
      plugins: {
        ...commonChartOptions.plugins,
        title: {
          display: true,
          text: `Performance Heatmap (as of ${latestMonth} 2025)`,
          color: '#e2e8f0',
          font: {
            family: "'Inter', sans-serif",
            size: 16,
            weight: 'bold'
          }
        }
      },
      scales: {
        ...commonChartOptions.scales,
        x: {
          ...commonChartOptions.scales.x,
          stacked: true,
          ticks: {
            ...commonChartOptions.scales.x.ticks,
            callback: function(value) {
              return value + '%';
            }
          }
        },
        y: {
          ...commonChartOptions.scales.y,
          stacked: true
        }
      }
    }
  });
  
  return chart;
}

// Initialize dashboard
let dashboardData, momChanges, ytdAchievement, totalMetrics;
let charts = {};

// Function to initialize the dashboard with CSV data
function initializeDashboard(csvData) {
  console.log('Initializing dashboard with CSV data...');
  
  try {
    // Parse and process the data
    console.log('Parsing CSV data...');
    const parsedData = parseCSVData(csvData);
    console.log(`Parsed ${parsedData.length} rows of data`);
    
    console.log('Processing data...');
    dashboardData = processData(parsedData);
    console.log('Data processed successfully');
    console.log(`Found ${dashboardData.initiatives.length} initiatives, ${dashboardData.subInitiatives.length} sub-initiatives, and ${dashboardData.metrics.length} metrics`);
    
    // Calculate MoM changes and YTD achievement
    console.log('Calculating MoM changes...');
    momChanges = calculateMoMChanges(dashboardData);
    
    console.log('Calculating YTD achievement...');
    ytdAchievement = calculateYTDAchievement(dashboardData);
    
    // Calculate totals across all sub-initiatives
    console.log('Calculating totals across all sub-initiatives...');
    totalMetrics = calculateTotals(dashboardData);
    
    // Create total metric cards
    console.log('Creating total metric cards...');
    const totalMetricsContainer = document.getElementById('total-metrics-container');
    if (!totalMetricsContainer) {
      console.error('Error: total-metrics-container element not found in the DOM');
      console.warn('Will continue without total metrics');
    } else {
      createTotalMetricCards();
    }
    
    // Populate metric cards
    console.log('Populating metric cards...');
    const metricsContainer = document.getElementById('metrics-container');
    if (!metricsContainer) {
      console.error('Error: metrics-container element not found in the DOM');
      throw new Error('metrics-container element not found');
    }
    populateMetricCards();
    
    // Create charts
    console.log('Creating charts...');
    createCharts();
    
    // Add event listeners for interactivity
    console.log('Adding event listeners...');
    addEventListeners();
    
    console.log('Dashboard initialization complete');
  } catch (error) {
    console.error('Dashboard initialization failed:', error);
    
    // Display generic error message in the metrics container
    const metricsContainer = document.getElementById('metrics-container');
    if (metricsContainer) {
      metricsContainer.innerHTML = `
        <div class="metric-card">
          <div class="metric-name"><i class="fas fa-exclamation-triangle"></i> Error</div>
          <div class="metric-value">Failed to initialize dashboard</div>
          <div class="metric-stats">
            <div class="metric-stat">
              <span class="stat-label">Please try again later or contact support.</span>
            </div>
          </div>
        </div>
      `;
    }
    
    throw error;
  }
}

/**
 * Creates total metric cards for impressions, engagements, and clicks across all sub-initiatives
 */
function createTotalMetricCards() {
  try {
    console.log('Creating total metric cards...');
    
    // Get the total metrics container
    const totalMetricsContainer = document.getElementById('total-metrics-container');
    if (!totalMetricsContainer) {
      console.error("Element with ID 'total-metrics-container' not found");
      return;
    }
    
    // Clear existing cards
    totalMetricsContainer.innerHTML = '';
    
    // Define metrics to display
    const metricsToDisplay = ['Impressions', 'Engagement', 'Paid Sessions'];
    
    // Create YTD cards for each metric FIRST
    metricsToDisplay.forEach(metric => {
      try {
        console.log(`Creating YTD total card for ${metric}...`);
        
        if (!totalMetrics[metric]) {
          console.warn(`No total data found for metric: ${metric}`);
          return;
        }
        
        // Get YTD actual and forecast values
        const ytdActual = totalMetrics[metric].ytdActual[LATEST_MONTH] || 0;
        const ytdForecast = totalMetrics[metric].ytdForecast[LATEST_MONTH] || 0;
        
        // Calculate variance and achievement percentage
        const ytdVariance = ytdActual - ytdForecast;
        const ytdVariancePercent = ytdForecast !== 0 ? (ytdVariance / ytdForecast) * 100 : 0;
        const ytdAchievement = ytdForecast !== 0 ? (ytdActual / ytdForecast) * 100 : 0;
        
        // Create YTD card element
        const ytdCard = document.createElement('div');
        ytdCard.className = 'metric-card total-metric-card ytd-metric-card';
        
        // Determine status classes based on performance
        const ytdVarianceClass = ytdVariancePercent >= 0 ? 'positive' : 'negative';
        const ytdAchievementClass = ytdAchievement >= 100 ? 'positive' : ytdAchievement >= 90 ? 'warning' : 'negative';
        
        // Define icons for each metric
        const metricIcons = {
          'Impressions': 'fa-eye',
          'Engagement': 'fa-hand-pointer',
          'Paid Sessions': 'fa-mouse-pointer'
        };
        
        // Create card content
        ytdCard.innerHTML = `
          <div class="metric-name"><i class="fas ${metricIcons[metric] || 'fa-chart-line'}"></i> YTD Total ${metric}</div>
          <div class="metric-value">${formatNumber(ytdActual, metric)}</div>
          <div class="metric-stats">
            <div class="metric-stat">
              <span class="stat-label">vs YTD Forecast:</span>
              <span class="stat-value ${ytdVarianceClass}">
                ${ytdVariancePercent >= 0 ? '+' : ''}${ytdVariancePercent.toFixed(1)}%
              </span>
            </div>
            <div class="metric-stat">
              <span class="stat-label">YTD Achievement:</span>
              <span class="stat-value ${ytdAchievementClass}">
                ${ytdAchievement.toFixed(1)}%
              </span>
            </div>
          </div>
        `;
        
        // Add card to container
        totalMetricsContainer.appendChild(ytdCard);
        console.log(`Successfully created YTD total card for ${metric}`);
      } catch (error) {
        console.error(`Error creating YTD total card for ${metric}:`, error);
      }
    });
    
    // THEN create a monthly card for each metric
    metricsToDisplay.forEach(metric => {
      try {
        console.log(`Creating total card for ${metric}...`);
        
        if (!totalMetrics[metric]) {
          console.warn(`No total data found for metric: ${metric}`);
          return;
        }
        
        // Get actual and forecast values for the latest month
        const actual = totalMetrics[metric].actual[LATEST_MONTH] || 0;
        const forecast = totalMetrics[metric].forecast[LATEST_MONTH] || 0;
        
        // Get YTD actual and forecast values
        const ytdActual = totalMetrics[metric].ytdActual[LATEST_MONTH] || 0;
        const ytdForecast = totalMetrics[metric].ytdForecast[LATEST_MONTH] || 0;
        
        // Calculate variance and achievement percentage
        const variance = actual - forecast;
        const variancePercent = forecast !== 0 ? (variance / forecast) * 100 : 0;
        const achievement = ytdForecast !== 0 ? (ytdActual / ytdForecast) * 100 : 0;
        
        // Get MoM change
        const momChange = totalMetrics[metric].momChange[LATEST_MONTH] || 0;
        
        // Create card element
        const card = document.createElement('div');
        card.className = 'metric-card total-metric-card';
        
        // Determine status classes based on performance
        const varianceClass = variancePercent >= 0 ? 'positive' : 'negative';
        const achievementClass = achievement >= 100 ? 'positive' : achievement >= 90 ? 'warning' : 'negative';
        const momClass = momChange >= 0 ? 'positive' : 'negative';
        
        // Define icons for each metric
        const metricIcons = {
          'Impressions': 'fa-eye',
          'Engagement': 'fa-hand-pointer',
          'Paid Sessions': 'fa-mouse-pointer'
        };
        
        // Create card content
        card.innerHTML = `
          <div class="metric-name"><i class="fas ${metricIcons[metric] || 'fa-chart-line'}"></i> Monthly Total ${metric}</div>
          <div class="metric-value">${formatNumber(actual, metric)}</div>
          <div class="metric-stats">
            <div class="metric-stat">
              <span class="stat-label">vs Forecast:</span>
              <span class="stat-value ${varianceClass}">
                ${variancePercent >= 0 ? '+' : ''}${variancePercent.toFixed(1)}%
              </span>
            </div>
            <div class="metric-stat">
              <span class="stat-label">MoM:</span>
              <span class="stat-value ${momClass}">
                ${momChange >= 0 ? '+' : ''}${momChange.toFixed(1)}%
              </span>
            </div>
          </div>
        `;
        
        // Add card to container
        totalMetricsContainer.appendChild(card);
        console.log(`Successfully created total card for ${metric}`);
      } catch (error) {
        console.error(`Error creating total card for ${metric}:`, error);
      }
    });
    
    console.log('Total metric cards created successfully');
  } catch (error) {
    console.error('Error in createTotalMetricCards function:', error);
    throw new Error(`Failed to create total metric cards: ${error.message}`);
  }
}

/**
 * Populates the metrics container with cards for each initiative, sub-initiative, metric combination
 */
function populateMetricCards() {
  try {
    console.log('Starting to populate metric cards...');
    
    // Get metrics container
    const metricsContainer = document.getElementById(METRICS_CONTAINER_ID);
    if (!metricsContainer) {
      console.error(`Element with ID '${METRICS_CONTAINER_ID}' not found`);
      return;
    }
    
    // Clear existing cards
    metricsContainer.innerHTML = '';
    
    // Log data structure for debugging
    console.log('Dashboard data structure:', {
      initiatives: dashboardData.initiatives,
      subInitiatives: dashboardData.subInitiatives,
      metrics: dashboardData.metrics
    });
    
    // Create cards for each initiative, sub-initiative, metric combination
    let cardCount = 0;
    
    dashboardData.initiatives.forEach(initiative => {
      console.log(`Processing initiative: ${initiative}`);
      
      if (!dashboardData.structured[initiative]) {
        console.warn(`No structured data found for initiative: ${initiative}`);
        return;
      }
      
      const subInitiatives = Object.keys(dashboardData.structured[initiative]);
      console.log(`Found ${subInitiatives.length} sub-initiatives for ${initiative}`);
      
      subInitiatives.forEach(subInitiative => {
        console.log(`Processing sub-initiative: ${subInitiative}`);
        
        if (!dashboardData.structured[initiative][subInitiative]) {
          console.warn(`No data found for sub-initiative: ${subInitiative}`);
          return;
        }
        
        const metrics = Object.keys(dashboardData.structured[initiative][subInitiative]);
        console.log(`Found ${metrics.length} metrics for ${subInitiative}`);
        
        metrics.forEach(metric => {
          try {
            console.log(`Creating card for ${initiative} - ${subInitiative} - ${metric}`);
            
            const metricData = dashboardData.structured[initiative][subInitiative][metric];
            if (!metricData) {
              console.warn(`No data found for metric: ${metric}`);
              return;
            }
            
            // Get actual and forecast values for the latest month
            const actual = metricData.actual[LATEST_MONTH] || 0;
            const forecast = metricData.forecast[LATEST_MONTH] || 0;
            
            // Get YTD actual and forecast values
            const ytdActual = metricData.ytdActual[LATEST_MONTH] || 0;
            const ytdForecast = metricData.ytdForecast[LATEST_MONTH] || 0;
            
            // Calculate variance and achievement percentage
            const variance = actual - forecast;
            const variancePercent = forecast !== 0 ? (variance / forecast) * 100 : 0;
            const achievement = ytdForecast !== 0 ? (ytdActual / ytdForecast) * 100 : 0;
            
            // Get MoM change
            if (!momChanges[initiative]) {
              console.warn(`No MoM changes found for initiative: ${initiative}`);
              return;
            }
            
            if (!momChanges[initiative][subInitiative]) {
              console.warn(`No MoM changes found for sub-initiative: ${subInitiative}`);
              return;
            }
            
            if (!momChanges[initiative][subInitiative][metric]) {
              console.warn(`No MoM changes found for metric: ${metric}`);
              return;
            }
            
            const momChange = momChanges[initiative][subInitiative][metric][LATEST_MONTH] || 0;
            
            // Create card element
            const card = document.createElement('div');
            card.className = 'metric-card';
            
            // Determine status classes based on performance
            const varianceClass = variancePercent >= 0 ? 'positive' : 'negative';
            const achievementClass = achievement >= 100 ? 'positive' : achievement >= 90 ? 'warning' : 'negative';
            const momClass = momChange >= 0 ? 'positive' : 'negative';
            
            // Create card content
            card.innerHTML = `
              <div class="metric-name"><i class="fas fa-chart-line"></i> ${subInitiative} - ${metric}</div>
              <div class="metric-value">${formatNumber(actual, metric)}</div>
              <div class="metric-stats">
                <div class="metric-stat">
                  <span class="stat-label">vs Forecast:</span>
                  <span class="stat-value ${varianceClass}">
                    ${variancePercent >= 0 ? '+' : ''}${variancePercent.toFixed(1)}%
                  </span>
                </div>
                <div class="metric-stat">
                  <span class="stat-label">MoM:</span>
                  <span class="stat-value ${momClass}">
                    ${momChange >= 0 ? '+' : ''}${momChange.toFixed(1)}%
                  </span>
                </div>
                <div class="metric-stat">
                  <span class="stat-label">YTD Achievement:</span>
                  <span class="stat-value ${achievementClass}">
                    ${achievement.toFixed(1)}%
                  </span>
                </div>
              </div>
            `;
            
            // Add card to container
            metricsContainer.appendChild(card);
            cardCount++;
          } catch (error) {
            console.error(`Error creating card for ${initiative} - ${subInitiative} - ${metric}:`, error);
          }
        });
      });
    });
    
    console.log(`Successfully created ${cardCount} metric cards`);
    
    // If no cards were created, show a message
    if (cardCount === 0) {
      metricsContainer.innerHTML = `
        <div class="metric-card">
          <div class="metric-name"><i class="fas fa-info-circle"></i> No Data</div>
          <div class="metric-value">No metrics available</div>
          <div class="metric-stats">
            <div class="metric-stat">
              <span class="stat-label">Please check the data source.</span>
            </div>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error in populateMetricCards function:', error);
    throw new Error(`Failed to populate metric cards: ${error.message}`);
  }
}

// Export functions for use in the HTML file
window.dashboardFunctions = {
  initializeDashboard,
  formatNumber
};
