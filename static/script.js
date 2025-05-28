// State management
const state = {
    assets: [],
    initialInvestment: 10000,
    recurringAmount: 500,
    recurringFrequency: 'monthly',
    changeYear: 3,
    newRecurringAmount: 1000,
    portfolioHistory: [],
    portfolioProjections: {},
    news: [],
    portfolioSentiment: 0.5, // 0 to 1, with 0.5 being neutral
    charts: {},
    loading: false
};

// Yahoo Finance API functions
async function fetchHistoricalData(symbol, period = '10y', interval = '1mo') {
    try {
        setLoading(true);
        
        // Use your own proxy endpoint instead of direct access
        const proxyUrl = '/api/yahoo-finance/chart'; // Your backend endpoint
        const url = `${proxyUrl}?symbol=${symbol}&period=${period}&interval=${interval}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch data for ${symbol}: ${response.status}`);
        }
        
        const data = await response.json();
        const result = data.chart.result[0];
        
        if (!result || !result.timestamp || !result.indicators || !result.indicators.quote || !result.indicators.quote[0].close) {
            console.error('Invalid data structure from Yahoo Finance API:', data);
            throw new Error(`No valid data returned for ${symbol}`);
        }
        
        const timestamps = result.timestamp;
        const closePrices = result.indicators.quote[0].close;
        
        // Format data for Chart.js
        const historicalData = [];
        for (let i = 0; i < timestamps.length; i++) {
            if (closePrices[i] !== null) {
                const date = new Date(timestamps[i] * 1000);
                historicalData.push({
                    date: date.toISOString().split('T')[0],
                    price: closePrices[i]
                });
            }
        }
        
        return historicalData;
    } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        
        // For errors or rate limits, use alternative approach
        try {
            // Fallback approach NOT YET  WORKING
            
            // const fallbackUrl = `https://your-own-fallback-api.com/stock-data/${symbol}`;
            
            const response = await fetch(fallbackUrl);
            if (!response.ok) {
                throw new Error("Fallback API request failed");
            }
            
            const data = await response.json();
            // Process your fallback data format appropriately
            
            const historicalData = data.map(item => ({
                date: item.date,
                price: item.price
            }));
            
            if (historicalData.length > 0) {
                return historicalData;
            }
            
            throw new Error("No data from fallback source");
        } catch (fallbackError) {
            console.error(`Fallback also failed for ${symbol}:`, fallbackError);
            
            // If all fails, return empty array to handle in UI
            return [];
        }
    } finally {
        setLoading(false);
    }
}



function calculateReturns(historicalData) {
    if (!historicalData || historicalData.length < 10) {
        return { avg: 0.05, volatility: 0.15 }; // Default values if not enough data
    }
    
    const prices = historicalData.map(d => d.price);
    const returns = [];
    
    for (let i = 1; i < prices.length; i++) {
        const periodReturn = (prices[i] - prices[i-1]) / prices[i-1];
        returns.push(periodReturn);
    }
    
    const sum = returns.reduce((a, b) => a + b, 0);
    const avg = sum / returns.length;
    
    // Calculate volatility (standard deviation)
    const squaredDiffs = returns.map(r => Math.pow(r - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    const volatility = Math.sqrt(avgSquaredDiff);
    
    // Annualize the monthly returns (assuming monthly data from API)
    const annualizedReturn = Math.pow(1 + avg, 12) - 1;
    const annualizedVolatility = volatility * Math.sqrt(12);
    
    return {
        avg: annualizedReturn,
        volatility: annualizedVolatility
    };
}

async function fetchCurrentPrice(symbol) {
    try {
        // Use your Flask proxy endpoint
        const proxyUrl = '/api/yahoo-finance/quote';
        const url = `${proxyUrl}?symbol=${symbol}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch current price for ${symbol}: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.quoteResponse || !data.quoteResponse.result || data.quoteResponse.result.length === 0) {
            throw new Error(`No quote data returned for ${symbol}`);
        }
        
        const quote = data.quoteResponse.result[0];
        return {
            price: quote.regularMarketPrice || quote.price,
            change: quote.regularMarketChangePercent || quote.changePercent,
            name: quote.shortName || quote.longName || symbol
        };
    } catch (error) {
        console.error(`Error fetching current price for ${symbol}:`, error);
        return {
            price: null,
            change: null,
            name: symbol
        };
    }
}

async function fetchNewsForAsset(asset) {
    return getNewsForPortfolio([asset]);
}

function projectPortfolioValue(years) {
    if (state.assets.length === 0) return [];
    
    const projectionData = [];
    let totalValue = Number(state.initialInvestment);
    let monthlyContribution = calculateMonthlyContribution();
    const today = new Date();
    
    for (let month = 0; month <= years * 12; month++) {
        const currentDate = new Date(today);
        currentDate.setMonth(today.getMonth() + month);
        
        // Check if we need to adjust the recurring amount
        if (month === state.changeYear * 12) {
            monthlyContribution = calculateMonthlyContribution(state.newRecurringAmount);
        }
        
        // Add monthly contribution
        if (month > 0) {
            totalValue += monthlyContribution;
        }
        
        // Apply asset growth for each asset
        let newTotalValue = 0;
        for (const asset of state.assets) {
            const allocation = asset.allocation / 100;
            const assetValue = totalValue * allocation;
            
            // Apply monthly growth rate
            const monthlyReturn = Math.pow(1 + asset.avgReturn, 1/12) - 1;
            const newAssetValue = assetValue * (1 + monthlyReturn);
            
            newTotalValue += newAssetValue;
        }
        
        totalValue = newTotalValue;
        
        projectionData.push({
            date: currentDate.toISOString().split('T')[0],
            value: totalValue
        });
    }
    
    return projectionData;
}

function calculateMonthlyContribution(amount = state.recurringAmount) {
    if (state.recurringFrequency === 'none') return 0;
    if (state.recurringFrequency === 'monthly') return amount;
    if (state.recurringFrequency === 'yearly') return amount / 12;
    if (state.recurringFrequency === 'weekly') return amount * 4.33; // Average weeks in a month
    return 0;
}

// UI Functions
function initializeUI() {
    // Asset type selection logic
    document.getElementById('assetType').addEventListener('change', function() {
        const assetType = this.value;
        document.getElementById('assetSubType').classList.toggle('hidden', assetType === 'stock');
        document.getElementById('commodityType').classList.toggle('hidden', assetType !== 'commodity');
        document.getElementById('bondType').classList.toggle('hidden', assetType !== 'bond');
        document.getElementById('indexType').classList.toggle('hidden', assetType !== 'index');
        document.getElementById('cryptoType').classList.toggle('hidden', assetType !== 'crypto');
        document.getElementById('currencyType').classList.toggle('hidden', assetType !== 'currency');

        
        // Reset asset symbol if switching to a predefined type
        if (assetType !== 'stock') {
            document.getElementById('assetSymbol').value = '';
        }
    });
    
    // Allocation slider and input sync
    const allocationSlider = document.getElementById('allocationSlider');
    const allocationInput = document.getElementById('allocationInput');
    
    allocationSlider.addEventListener('input', function() {
        allocationInput.value = this.value;
    });
    
    allocationInput.addEventListener('input', function() {
        let value = parseInt(this.value);
        if (isNaN(value) || value < 1) value = 1;
        if (value > 100) value = 100;
        this.value = value;
        allocationSlider.value = value;
    });
    
    // Add asset button
    document.getElementById('addAssetBtn').addEventListener('click', addAsset);
    
    // Analyse portfolio button
    document.getElementById('analyseBtn').addEventListener('click', analysePortfolio);
    
    // Tab navigation
    const tabs = ['overview', 'projections', 'news', 'report'];
    tabs.forEach(tab => {
        document.getElementById(`tab-${tab}`).addEventListener('click', () => selectTab(tab));
    });
    
    // Initial charts setup
    initializeCharts();

    // Trigger asset type change to set initial state correctly
    document.getElementById('assetType').dispatchEvent(new Event('change'));
}

async function addAsset() {
    const assetType = document.getElementById('assetType').value;
    let symbol = '';
    
    // Get symbol based on asset type
    if (assetType === 'stock') {
        symbol = document.getElementById('assetSymbol').value.trim().toUpperCase();
        if (!symbol) {
            alert('Please enter a stock symbol');
            return;
        }
    } else if (assetType === 'commodity') {
        symbol = document.getElementById('commodityType').value;
    } else if (assetType === 'bond') {
        symbol = document.getElementById('bondType').value;
    } else if (assetType === 'index') {
        symbol = document.getElementById('indexType').value;
    } else if (assetType === 'crypto') {
        symbol = document.getElementById('cryptoType').value;
    } else if (assetType === 'currency') {
        symbol = document.getElementById('currencyType').value;
    }
    
    // Prevent duplicate assets
    if (state.assets.some(asset => asset.symbol === symbol)) {
        alert('This asset is already in your portfolio');
        return;
    }
    
    const allocation = parseInt(document.getElementById('allocationInput').value);
    if (isNaN(allocation) || allocation < 1 || allocation > 100) {
        alert('Please enter a valid allocation percentage (1-100)');
        return;
    }
    
    setLoading(true);

    try {
        // Fetch historical data for the asset
        const historicalData = await fetchHistoricalData(symbol);
        
        if (historicalData.length === 0) {
            alert(`Unable to fetch data for ${symbol}. Please check the symbol and try again.`);
            setLoading(false);
            return;
        }
        
        const returns = calculateReturns(historicalData);
        
        // Get current price and name
        const currentData = await fetchCurrentPrice(symbol);
        
        // Add asset to state
        state.assets.push({
            symbol,
            name: currentData.name || symbol,
            allocation,
            type: assetType,
            historicalData,
            currentPrice: currentData.price || historicalData[historicalData.length - 1]?.price || 0,
            priceChange: currentData.change || 0,
            avgReturn: returns.avg,
            volatility: returns.volatility
        });
        
        // Update UI
        updateAssetList();
        checkAllocation();
        
        // Reset input fields
        if (assetType === 'stock') {
            document.getElementById('assetSymbol').value = '';
        }
        document.getElementById('allocationInput').value = '20';
        document.getElementById('allocationSlider').value = '20';
    } catch (error) {
        console.error(`Error adding asset ${symbol}:`, error);
        alert(`Error adding ${symbol}: ${error.message}`);
    } finally {
        setLoading(false);
    }
}

function removeAsset(index) {
    state.assets.splice(index, 1);
    updateAssetList();
    checkAllocation();
}

function updateAssetList() {


    const assetList = document.getElementById('assetList');
    assetList.innerHTML = '';
    if (state.assets.length === 0) {
        assetList.innerHTML = '<div class="text-sm text-gray-500 dark:text-gray-400">No assets added yet</div>';
        return;
    }
    
    state.assets.forEach((asset, index) => {
        const assetCard = document.createElement('div');
        assetCard.className = 'asset-card flex justify-between items-center p-2 border border-custom rounded hover:bg-gray-50 dark:hover:bg-gray-800';
        
        // Format price change
        const changeClass = asset.priceChange >= 0 ? 'text-green-600' : 'text-red-600';
        const changeSign = asset.priceChange >= 0 ? '+' : '';
        const changeText = asset.priceChange !== null ? 
            `<span class="${changeClass}">${changeSign}${asset.priceChange.toFixed(2)}%</span>` : '';
        
        assetCard.innerHTML = `
            <div class="flex items-center">
                <div class="w-3 h-3 rounded-full mr-2" style="background-color: ${getAssetColor(index)}"></div>
                <span class="font-medium">${asset.symbol}</span>
            </div>
            <div class="flex items-center">
                <span class="mr-2">${asset.allocation}%</span>
                <button class="text-red-500 hover:text-red-700 remove-asset" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        assetList.appendChild(assetCard);
        
        // Add hover effect to show historical chart
        assetCard.addEventListener('mouseenter', () => showAssetChart(asset, assetCard));
        assetCard.addEventListener('mouseleave', hideAssetChart);
    });
    
    // Add click handlers for remove buttons
    document.querySelectorAll('.remove-asset').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.getAttribute('data-index'));
            removeAsset(index);
        });
    });
}

function checkAllocation() {
    const totalAllocation = state.assets.reduce((total, asset) => total + asset.allocation, 0);
    const warning = document.getElementById('allocationWarning');
    
    if (totalAllocation !== 100 && state.assets.length > 0) {
        warning.textContent = `Warning: Total allocation is ${totalAllocation}% (should be 100%)`;
        warning.classList.remove('hidden');
    } else {
        warning.classList.add('hidden');
    }
}

async function analysePortfolio() {
    if (state.assets.length === 0) {
        alert('Please add at least one asset to your portfolio');
        return;
    }
    
    setLoading(true);
    
    try {
        // Update state values
        state.initialInvestment = Number(document.getElementById('initialInvestment').value);
        state.recurringAmount = Number(document.getElementById('recurringAmount').value);
        state.recurringFrequency = document.getElementById('recurringFrequency').value;
        state.changeYear = Number(document.getElementById('changeYear').value);
        state.newRecurringAmount = Number(document.getElementById('newRecurringAmount').value);
        
        // Generate projections
        state.portfolioProjections.fiveYear = projectPortfolioValue(5);
        state.portfolioProjections.tenYear = projectPortfolioValue(10);
        
        // Show news loading state
        const newsContainer = document.getElementById('newsContainer');
        newsContainer.innerHTML = '<div class="flex justify-center p-4"><div class="spinner"></div></div>';
        
        // Show report loading state
        const reportContainer = document.getElementById('portfolioReport');
        reportContainer.innerHTML = '<div class="flex justify-center p-4"><div class="spinner"></div></div>';
        
        // Update UI with results (projections, charts)
        updatePortfolioCharts();
        updateProjectionsTab();
        updateSentimentMeter(0.5); // Initial neutral sentiment
        updatePortfolioSummary();
        
        // Switch to overview tab to show initial results
        selectTab('overview');
        
        // Fetch real market news
        await getNewsForPortfolio();
        
        // Generate portfolio report
        await generatePortfolioAnalysisWithLLM();
    } catch (error) {
        console.error('Error analysing portfolio:', error);
        alert('An error occurred while analysing your portfolio: ' + error.message);
    } finally {
        setLoading(false);
    }
}

function setLoading(isLoading) {
    state.loading = isLoading;
    const charts = document.querySelectorAll('.chart-container, .portfolio-composition');
    
    charts.forEach(chart => {
        let loadingElement = chart.querySelector('.loading');
        
        if (isLoading) {
            if (!loadingElement) {
                loadingElement = document.createElement('div');
                loadingElement.className = 'loading';
                loadingElement.innerHTML = '<div class="spinner"></div>';
                chart.appendChild(loadingElement);
            }
        } else if (loadingElement) {
            chart.removeChild(loadingElement);
        }
    });
}

function selectTab(tabName) {
    // Update tab styling
    document.querySelectorAll('.tab').forEach(tab => {
        const isActive = tab.id === `tab-${tabName}`;
        tab.classList.toggle('active', isActive);
        tab.classList.toggle('border-b-2', isActive);
        tab.classList.toggle('border-primary-500', isActive);
    });
    
    // Show/hide content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('hidden', content.id !== `content-${tabName}`);
    });
}

function getAssetColor(index) {
    const colors = [
        '#4C6EF5', '#51CF66', '#FA5252', '#BE4BDB', '#15AABF', 
        '#FCC419', '#FF922B', '#20C997', '#7950F2', '#FF6B6B'
    ];
    return colors[index % colors.length];
}

function showAssetChart(asset, element) {
    const tooltip = document.getElementById('tooltip');
    const rect = element.getBoundingClientRect();
    
    // Create chart inside tooltip
    tooltip.innerHTML = `
        <div class="p-1">
            <strong>${asset.name || asset.symbol}</strong>
            <div style="width: 250px; height: 150px;">
                <canvas id="hoverChart"></canvas>
            </div>
            <div class="text-xs mt-1">
                Avg. Annual Return: ${(asset.avgReturn * 100).toFixed(2)}%
            </div>
        </div>
    `;
    
    // Position tooltip
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
    tooltip.style.opacity = '1';
    
    // Get historical data
    const historicalData = asset.historicalData;
    
    // Create chart
    const ctx = document.getElementById('hoverChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: historicalData.map(d => d.date),
            datasets: [{
                label: asset.symbol,
                data: historicalData.map(d => d.price),
                borderColor: getAssetColor(state.assets.indexOf(asset)),
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function hideAssetChart() {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.opacity = '0';
}

function initializeCharts() {
    // Portfolio allocation chart (initially empty)
    const portfolioCtx = document.getElementById('portfolioChart').getContext('2d');
    state.charts.portfolio = new Chart(portfolioCtx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: []
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Portfolio value chart (initially empty)
    const valueCtx = document.getElementById('portfolioValueChart').getContext('2d');
    state.charts.value = new Chart(valueCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Portfolio Value',
                data: [],
                borderColor: '#4C6EF5',
                backgroundColor: 'rgba(76, 110, 245, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `Value: $${Number(context.raw).toLocaleString()}`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 6
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
    
    // Growth projection chart (initially empty)
    const projectionCtx = document.getElementById('growthProjectionChart').getContext('2d');
    state.charts.projection = new Chart(projectionCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Portfolio Value',
                data: [],
                borderColor: '#4C6EF5',
                backgroundColor: 'rgba(76, 110, 245, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `Value: $${Number(context.raw).toLocaleString()}`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 6
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function updatePortfolioCharts() {
    // Update allocation chart
    const allocationLabels = state.assets.map(asset => asset.symbol);
    const allocationData = state.assets.map(asset => asset.allocation);
    const allocationColors = state.assets.map((_, index) => getAssetColor(index));
    
    state.charts.portfolio.data.labels = allocationLabels;
    state.charts.portfolio.data.datasets[0].data = allocationData;
    state.charts.portfolio.data.datasets[0].backgroundColor = allocationColors;
    state.charts.portfolio.update();
    
    // Update portfolio value chart
    const projectionData = state.portfolioProjections.tenYear;
    if (projectionData) {
        const labels = [];
        const data = [];
        
        // Show fewer points for clearer visualization
        const step = Math.max(1, Math.floor(projectionData.length / 24));
        for (let i = 0; i < projectionData.length; i += step) {
            const point = projectionData[i];
            labels.push(point.date);
            data.push(point.value);
        }
        
        state.charts.value.data.labels = labels;
        state.charts.value.data.datasets[0].data = data;
        state.charts.value.update();
    }
}

function updateProjectionsTab() {
    const fiveYearData = state.portfolioProjections.fiveYear;
    const tenYearData = state.portfolioProjections.tenYear;
    
    if (!fiveYearData || !tenYearData) return;
    
    // Update projection chart
    const labels = [];
    const data = [];
    
    // Show fewer points for clearer visualization
    const step = Math.max(1, Math.floor(tenYearData.length / 24));
    for (let i = 0; i < tenYearData.length; i += step) {
        const point = tenYearData[i];
        labels.push(point.date);
        data.push(point.value);
    }
    
    state.charts.projection.data.labels = labels;
    state.charts.projection.data.datasets[0].data = data;
    state.charts.projection.update();
    
    // Update projection values
    const fiveYearValue = fiveYearData[fiveYearData.length - 1].value;
    const tenYearValue = tenYearData[tenYearData.length - 1].value;
    
    document.getElementById('fiveYearProjection').innerHTML = `
        <div class="text-2xl font-bold">$${Math.round(fiveYearValue).toLocaleString()}</div>
        <div class="text-sm">Estimated portfolio value in 5 years</div>
    `;
    
    document.getElementById('tenYearProjection').innerHTML = `
        <div class="text-2xl font-bold">$${Math.round(tenYearValue).toLocaleString()}</div>
        <div class="text-sm">Estimated portfolio value in 10 years</div>
    `;
    
    // Update individual asset details
    const assetDetailContainer = document.getElementById('assetDetailContainer');
    assetDetailContainer.innerHTML = '<h3 class="font-semibold mb-2">Individual Asset Performance</h3>';
    
    state.assets.forEach((asset, index) => {
        const assetCard = document.createElement('div');
        assetCard.className = 'asset-card border border-custom rounded-lg p-3';
        
        const avgAnnualReturn = (asset.avgReturn * 100).toFixed(2);
        const fiveYearGrowth = (Math.pow(1 + asset.avgReturn, 5) - 1) * 100;
        const tenYearGrowth = (Math.pow(1 + asset.avgReturn, 10) - 1) * 100;
        
        assetCard.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <div class="flex items-center">
                    <div class="w-3 h-3 rounded-full mr-2" style="background-color: ${getAssetColor(index)}"></div>
                    <h4 class="font-medium">${asset.name || asset.symbol}</h4>
                </div>
                <div class="text-sm font-medium ${avgAnnualReturn >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ${avgAnnualReturn >= 0 ? '+' : ''}${avgAnnualReturn}% Avg. Annual
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
                <div>
                    <div class="text-gray-600 dark:text-gray-400">5-Year Growth:</div>
                    <div class="font-medium ${fiveYearGrowth >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ${fiveYearGrowth >= 0 ? '+' : ''}${fiveYearGrowth.toFixed(2)}%
                    </div>
                </div>
                <div>
                    <div class="text-gray-600 dark:text-gray-400">10-Year Growth:</div>
                    <div class="font-medium ${tenYearGrowth >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ${tenYearGrowth >= 0 ? '+' : ''}${tenYearGrowth.toFixed(2)}%
                    </div>
                </div>
            </div>
            <div class="mt-2 text-sm">
                <div class="text-gray-600 dark:text-gray-400">Volatility:</div>
                <div class="font-medium">${(asset.volatility * 100).toFixed(2)}%</div>
            </div>
        `;
        
        assetDetailContainer.appendChild(assetCard);
    });
}

function updateNewsTab(news) {
    const newsContainer = document.getElementById('newsContainer');
    newsContainer.innerHTML = '';
    
    if (!news || news.length === 0) {
        newsContainer.innerHTML = '<p>No relevant news found for your portfolio assets.</p>';
        return;
    }
    
    news.forEach(item => {
        const newsItem = document.createElement('div');
        newsItem.className = 'news-item p-3 border border-custom rounded-lg';
        
        // Determine sentiment color
        let sentimentColor = 'text-gray-500'; // neutral
        if (item.sentiment > 0.7) sentimentColor = 'text-green-600'; // very positive
        else if (item.sentiment > 0.55) sentimentColor = 'text-green-500'; // positive
        else if (item.sentiment < 0.3) sentimentColor = 'text-red-600'; // very negative
        else if (item.sentiment < 0.45) sentimentColor = 'text-red-500'; // negative
        
        const sentimentIcon = item.sentiment > 0.55 ? '↑' : item.sentiment < 0.45 ? '↓' : '→';
        
        newsItem.innerHTML = `
            <div class="flex justify-between items-start mb-1">
                <h4 class="font-medium">${item.title}</h4>
                <span class="${sentimentColor} ml-2 whitespace-nowrap">${sentimentIcon}</span>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                ${item.source} • ${formatDate(item.date)}
            </div>
            <p class="text-sm">${item.summary}</p>
            ${item.url ? `<a href="${item.url}" target="_blank" class="text-blue-500 hover:underline text-xs mt-2 inline-block">Read more</a>` : ''}
        `;
        
        newsContainer.appendChild(newsItem);
    });
}

function updateSentimentMeter(sentiment) {
    const sentimentPercentage = sentiment * 100;
    document.getElementById('sentimentFill').style.width = `${sentimentPercentage}%`;
    document.getElementById('sentimentMarker').style.left = `${sentimentPercentage}%`;
}

function updatePortfolioSummary() {
    const summary = document.getElementById('portfolioSummary');
    
    if (state.assets.length === 0) {
        summary.innerHTML = '<h3 class="font-semibold mb-2">Portfolio Summary</h3><p>Add assets to your portfolio and click "Analyse Portfolio" to see insights.</p>';
        return;
    }
    
    const fiveYearData = state.portfolioProjections.fiveYear;
    const initialValue = state.initialInvestment;
    const fiveYearValue = fiveYearData[fiveYearData.length - 1].value;
    const growthPercentage = ((fiveYearValue - initialValue) / initialValue) * 100;
    
    // Get average annual return of portfolio
    const weightedReturn = state.assets.reduce((sum, asset) => {
        return sum + (asset.avgReturn * (asset.allocation / 100));
    }, 0);
    
    // Format as percentage
    const avgAnnualReturn = (weightedReturn * 100).toFixed(2);
    
    summary.innerHTML = `
        <h3 class="font-semibold mb-2">Portfolio Summary</h3>
        <div class="grid grid-cols-2 gap-4 mb-3">
            <div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Initial Investment</div>
                <div class="text-xl font-bold">$${initialValue.toLocaleString()}</div>
            </div>
            <div>
                <div class="text-sm text-gray-600 dark:text-gray-400">5-Year Projection</div>
                <div class="text-xl font-bold">$${Math.round(fiveYearValue).toLocaleString()}</div>
            </div>
            <div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Avg. Annual Return</div>
                <div class="text-xl font-bold ${avgAnnualReturn >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ${avgAnnualReturn >= 0 ? '+' : ''}${avgAnnualReturn}%
                </div>
            </div>
            <div>
                <div class="text-sm text-gray-600 dark:text-gray-400">5-Year Growth</div>
                <div class="text-xl font-bold ${growthPercentage >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ${growthPercentage >= 0 ? '+' : ''}${growthPercentage.toFixed(2)}%
                </div>
            </div>
        </div>
        <div class="text-sm">
            <p class="mb-2">Portfolio Composition:</p>
            <div class="flex flex-wrap gap-2">
                ${state.assets.map(asset => `
                    <div class="px-2 py-1 bg-green-200 dark:bg-green-200 rounded text-sm">
                        ${asset.symbol}: ${asset.allocation}%
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}


async function getNewsForPortfolio() {
    try {
        if (state.assets.length === 0) return [];
        
        const symbols = state.assets.map(a => a.symbol).join(', ');
        
        // Call the portfolio API endpoint with just the symbols, not the prompt
        const response = await fetch('/api/portfolio/news', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ symbols })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Process the response - same as before
        try {
            // Extract JSON from the response text
            let jsonStr = result.message;
            
            // More robust handling of potential markdown formatting
            if (jsonStr.includes('```json')) {
                jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
            } else if (jsonStr.includes('```')) {
                jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
            } else if (jsonStr.startsWith('[') && jsonStr.endsWith(']')) {
                // Already looks like JSON, use as is
            } else {
                // Try to find JSON array anywhere in the response
                const match = jsonStr.match(/\[\s*\{.*\}\s*\]/s);
                if (match) {
                    jsonStr = match[0];
                }
            }
            
            // Parse the JSON
            const newsData = JSON.parse(jsonStr);
            
            // Validate and process the news data
            if (Array.isArray(newsData) && newsData.length > 0) {
                console.log("Successfully retrieved news data:", newsData);
                
                // Normalize the data to ensure all expected fields exist
                const normalizedData = newsData.map(item => ({
                    title: item.title || item.Title || "Untitled",
                    source: item.source || item.Source || "Unknown Source",
                    date: item.date || item.Date || new Date().toISOString().split('T')[0],
                    url: item.url || item.URL || "",
                    summary: item.summary || item.Summary || "No summary available",
                    sentiment: parseFloat(item.sentiment || item.Sentiment || 0.5)
                }));
                
                // Update state
                state.news = normalizedData;
                
                // Calculate average sentiment
                const avgSentiment = normalizedData.reduce((sum, item) => sum + item.sentiment, 0) / normalizedData.length;
                state.portfolioSentiment = avgSentiment;
                
                // Update UI
                updateNewsTab(normalizedData);
                updateSentimentMeter(avgSentiment);
                
                return normalizedData;
            } else {
                throw new Error("Invalid news data format");
            }
        } catch (error) {
            console.error("Error parsing news data:", error, "Raw response:", result.message);
            const fallbackNews = [{
                title: "Error processing news data",
                date: new Date().toISOString().split('T')[0],
                source: "System",
                url: "",
                summary: "There was an error processing the news data for your portfolio.",
                sentiment: 0.5
            }];
            
            // Update state with fallback
            state.news = fallbackNews;
            state.portfolioSentiment = 0.5;
            
            updateNewsTab(fallbackNews);
            updateSentimentMeter(0.5);
            return fallbackNews;
        }
    } catch (err) {
        console.error("Error calling API for news:", err);
        
        // Fallback to empty news
        const fallbackNews = [{
            title: "Error fetching news",
            date: new Date().toISOString().split('T')[0],
            source: "System",
            url: "",
            summary: "There was an error connecting to the news service. Please try again later.",
            sentiment: 0.5
        }];
        
        // Update state with fallback
        state.news = fallbackNews;
        state.portfolioSentiment = 0.5;
        
        updateNewsTab(fallbackNews);
        updateSentimentMeter(0.5);
        return fallbackNews;
    }
}


async function generatePortfolioAnalysisWithLLM() {
    try {
        if (state.assets.length === 0) return;
        
        // Prepare portfolio data
        const portfolioData = {
            assets: state.assets.map(asset => ({
                symbol: asset.symbol,
                name: asset.name || asset.symbol,
                allocation: asset.allocation,
                avgReturn: asset.avgReturn,
                volatility: asset.volatility,
                fiveYearGrowth: (Math.pow(1 + asset.avgReturn, 5) - 1) * 100,
                tenYearGrowth: (Math.pow(1 + asset.avgReturn, 10) - 1) * 100
            })),
            initialInvestment: state.initialInvestment,
            recurringAmount: state.recurringAmount,
            recurringFrequency: state.recurringFrequency,
            fiveYearValue: state.portfolioProjections.fiveYear[state.portfolioProjections.fiveYear.length - 1].value,
            tenYearValue: state.portfolioProjections.tenYear[state.portfolioProjections.tenYear.length - 1].value,
            portfolioSentiment: state.portfolioSentiment,
            news: state.news
        };

        // Start loading indicator
        document.getElementById('portfolioReport').innerHTML = '<div class="loading">Generating portfolio analysis...</div>';
        
        // Call the portfolio API endpoint with just the portfolio data, not the prompt
        const response = await fetch('/api/portfolio/analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                portfolio: portfolioData 
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
        }

        const result = await response.json();
        
        // Get the message content from the result - same as before
        let content = result.message;
        
        // More robust handling of potential markdown formatting
        if (content.includes('```html')) {
            content = content.split('```html')[1].split('```')[0].trim();
        } else if (content.includes('```')) {
            content = content.split('```')[1].split('```')[0].trim();
        }
        
        // Update the report with the cleaned HTML content
        document.getElementById('portfolioReport').innerHTML = content;
        
    } catch (err) {
        console.error("Error calling API for report:", err);
        
        // Fallback to basic report
        document.getElementById('portfolioReport').innerHTML = generateBasicReport();
    }
}

function generateBasicReport() {
    if (state.assets.length === 0) {
        return "<p>Add assets to your portfolio to generate a report.</p>";
    }
    
    const fiveYearProjection = state.portfolioProjections.fiveYear;
    const tenYearProjection = state.portfolioProjections.tenYear;
    
    if (!fiveYearProjection || !tenYearProjection) {
        return "<p>Analysing portfolio data, please wait...</p>";
    }
    
    const startValue = fiveYearProjection[0].value;
    const fiveYearValue = fiveYearProjection[fiveYearProjection.length - 1].value;
    const tenYearValue = tenYearProjection[tenYearProjection.length - 1].value;
    
    const fiveYearGrowth = ((fiveYearValue - startValue) / startValue) * 100;
    const tenYearGrowth = ((tenYearValue - startValue) / startValue) * 100;
    
    const sentiment = state.portfolioSentiment;
    let sentimentText = "neutral";
    if (sentiment > 0.7) sentimentText = "very positive";
    else if (sentiment > 0.6) sentimentText = "positive";
    else if (sentiment < 0.3) sentimentText = "very negative";
    else if (sentiment < 0.4) sentimentText = "negative";
    
    // Get top and bottom performers
    const sortedAssets = [...state.assets].sort((a, b) => b.avgReturn - a.avgReturn);
    const topPerformer = sortedAssets[0];
    const bottomPerformer = sortedAssets[sortedAssets.length - 1];
    
    // Calculate total contributions over time
    const monthlyContribution = calculateMonthlyContribution();
    const fiveYearContributions = state.initialInvestment + (monthlyContribution * 12 * 5);
    const tenYearContributions = state.initialInvestment + (monthlyContribution * 12 * 10);
    
    // Calculate excess returns (returns beyond contributions)
    const fiveYearExcess = fiveYearValue - fiveYearContributions;
    const tenYearExcess = tenYearValue - tenYearContributions;
    
    // Format portfolio composition
    const portfolioComposition = state.assets.map(asset => 
        `${asset.symbol} (${asset.allocation}%)`
    ).join(", ");
    
    const report = `
        <div class="space-y-4">
            <p><strong>Portfolio Overview:</strong> Your portfolio consists of ${state.assets.length} assets: ${portfolioComposition}. Based on historical performance and current market conditions, the overall market sentiment for your portfolio is <strong>${sentimentText}</strong>.</p>
            
            <p><strong>Growth Projections:</strong> With an initial investment of $${state.initialInvestment.toLocaleString()} and ${state.recurringFrequency} contributions of $${state.recurringAmount.toLocaleString()}, your portfolio is projected to grow to <strong>$${Math.round(fiveYearValue).toLocaleString()}</strong> in 5 years (${fiveYearGrowth.toFixed(2)}% growth) and <strong>$${Math.round(tenYearValue).toLocaleString()}</strong> in 10 years (${tenYearGrowth.toFixed(2)}% growth).</p>
            
            <p><strong>Asset Performance:</strong> ${topPerformer.name || topPerformer.symbol} is your strongest performing asset with an average annual return of ${(topPerformer.avgReturn * 100).toFixed(2)}%, while ${bottomPerformer.name || bottomPerformer.symbol} has the lowest projected return at ${(bottomPerformer.avgReturn * 100).toFixed(2)}%.</p>
            
            <p><strong>Investment Returns:</strong> Over 5 years, your total contributions would be $${Math.round(fiveYearContributions).toLocaleString()}, with an estimated <strong>$${Math.round(fiveYearExcess).toLocaleString()}</strong> in investment gains. Over 10 years, with total contributions of $${Math.round(tenYearContributions).toLocaleString()}, your estimated investment gains would be <strong>$${Math.round(tenYearExcess).toLocaleString()}</strong>.</p>
            
            <p><strong>Recommendation:</strong> Based on your portfolio composition and market conditions, consider ${sentiment > 0.6 ? "maintaining your current allocation strategy" : sentiment < 0.4 ? "reviewing your portfolio for potential rebalancing" : "monitoring market conditions closely before making significant changes"}.</p>
        </div>
    `;
    
    return report;
}

// Chat functionality using your Flask backend
async function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Clear input
    chatInput.value = '';
    
    // Add user message to chat
    addChatMessage(message, 'user');
    
    // Show thinking message
    const thinkingId = 'thinking-' + Date.now();
    addChatMessage('Thinking...', 'assistant', thinkingId);
    
    try {
        // Create portfolio context for the assistant
        const portfolioContext = {
            assets: state.assets.map(asset => ({
                symbol: asset.symbol,
                name: asset.name || asset.symbol,
                allocation: asset.allocation,
                avgReturn: asset.avgReturn,
                volatility: asset.volatility
            })),
            initialInvestment: state.initialInvestment,
            recurringAmount: state.recurringAmount,
            recurringFrequency: state.recurringFrequency,
            projectedValue: {
                fiveYear: state.portfolioProjections.fiveYear ? 
                    state.portfolioProjections.fiveYear[state.portfolioProjections.fiveYear.length - 1].value : null,
                tenYear: state.portfolioProjections.tenYear ? 
                    state.portfolioProjections.tenYear[state.portfolioProjections.tenYear.length - 1].value : null
            },
            marketSentiment: state.portfolioSentiment
        };
        
        // Send request to portfolio API endpoint with portfolio data and user message only, not the prompt
        const response = await fetch('/api/portfolio/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                portfolio: portfolioContext,
                message: message
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Replace thinking message with final response - same as before
        removeChatMessage(thinkingId);
        addChatMessage(result.message, 'assistant');
        
        // Display sources and search suggestions if available
        displaySources(result.sources, result.search_suggestions);
        
    } catch (err) {
        console.error("Error sending chat message:", err);
        removeChatMessage(thinkingId);
        addChatMessage("I'm sorry, I'm having trouble connecting to the assistant service. Please try again later.", 'assistant');
    }
}


function openChatModal() {
    const modal = document.getElementById('chatModal');
    modal.classList.remove('hidden');
    document.getElementById('chatInput').focus();
    
    // Prevent scrolling on the body when modal is open
    document.body.style.overflow = 'hidden';
}

function closeChatModal() {
    const modal = document.getElementById('chatModal');
    modal.classList.add('hidden');
    
    // Re-enable scrolling
    document.body.style.overflow = '';
}


// Add to the existing JavaScript
function setupChatInterface() {
    const floatingBtn = document.getElementById('floatingChatBtn');
    const chatModal = document.getElementById('chatModal');
    const chatContainer = document.getElementById('chatContainer');
    const closeChatBtn = document.getElementById('closeChatBtn');
    
    // Open chat modal
    floatingBtn.addEventListener('click', function() {
        chatModal.classList.remove('hidden');
        floatingBtn.classList.add('active');
        setTimeout(() => {
            document.getElementById('chatInput').focus();
        }, 300);
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    });
    
    // Close chat modal
    function closeChat() {
        chatModal.classList.add('hidden');
        floatingBtn.classList.remove('active');
        document.body.style.overflow = ''; // Re-enable scrolling
    }
    
    closeChatBtn.addEventListener('click', closeChat);
    
    // Close when clicking outside the chat container
    chatModal.addEventListener('click', function(e) {
        if (e.target === chatModal) {
            closeChat();
        }
    });
    
    // Prevent propagation from chat container to modal
    chatContainer.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}


function addChatMessage(message, sender, messageId) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    
    // Apply different styling for user vs assistant messages with animation classes
    messageElement.className = sender === 'user' ? 
        'bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-sm ml-auto max-w-[75%] user-message' : 
        'bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm max-w-[75%] markdown-content assistant-message';
    
    if (messageId) {
        messageElement.id = messageId;
    }
    
    // Special handling for "Thinking..." message
    if (sender === 'assistant' && message === 'Thinking...') {
        messageElement.innerHTML = `
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
    } else if (sender === 'user') {
        // Regular user message
        messageElement.innerHTML = `<p>${message}</p>`;
    } else {
        // Assistant message with markdown - keep your original markdown parsing
        messageElement.innerHTML = marked.parse(message);
        
        // Preserve your markdown styling
        const style = document.createElement('style');
        if (!document.getElementById('markdown-styles')) {
            style.id = 'markdown-styles';
            style.textContent = `
                .markdown-content p { margin-bottom: 0.5rem; }
                .markdown-content p:last-child { margin-bottom: 0; }
                .markdown-content strong { font-weight: bold; color: var(--primary-color); }
                .markdown-content ul, .markdown-content ol { padding-left: 1.5rem; margin: 0.5rem 0; }
                .markdown-content li { margin-bottom: 0.25rem; }
                .markdown-content h1, .markdown-content h2, .markdown-content h3, 
                .markdown-content h4, .markdown-content h5, .markdown-content h6 { 
                    margin-top: 0.5rem; 
                    margin-bottom: 0.5rem; 
                    font-weight: bold; 
                }
                .markdown-content code {
                    background: rgba(0,0,0,0.05);
                    padding: 0.1rem 0.3rem;
                    border-radius: 3px;
                    font-family: monospace;
                }
                .markdown-content pre code {
                    display: block;
                    padding: 0.5rem;
                    overflow-x: auto;
                }
                .markdown-content blockquote {
                    border-left: 3px solid var(--primary-color);
                    padding-left: 0.5rem;
                    margin: 0.5rem 0;
                    color: rgba(0,0,0,0.6);
                }
                .markdown-content table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 0.5rem 0;
                }
                .markdown-content th, .markdown-content td {
                    padding: 0.25rem;
                    border: 1px solid #ddd;
                }
                @media (prefers-color-scheme: dark) {
                    .markdown-content blockquote { color: rgba(255,255,255,0.6); }
                    .markdown-content code { background: rgba(255,255,255,0.1); }
                    .markdown-content th, .markdown-content td { border-color: #444; }
                }
                
                /* Chat animation styles */
                @keyframes slideInRight {
                  from {
                    transform: translateX(30px) scale(0.9);
                    opacity: 0;
                  }
                  70% {
                    transform: translateX(-5px) scale(1.02);
                  }
                  to {
                    transform: translateX(0) scale(1);
                    opacity: 1;
                  }
                }
                
                @keyframes slideInLeft {
                  from {
                    transform: translateX(-30px) scale(0.9);
                    opacity: 0;
                  }
                  70% {
                    transform: translateX(5px) scale(1.02);
                  }
                  to {
                    transform: translateX(0) scale(1);
                    opacity: 1;
                  }
                }
                
                /* iMessage style for user messages */
                .user-message {
                  animation: slideInRight 0.3s ease-out forwards;
                  transform-origin: bottom right;
                  border-radius: 18px 18px 4px 18px !important;
                  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                }
                
                /* iMessage style for assistant messages */
                .assistant-message {
                  animation: slideInLeft 0.3s ease-out forwards;
                  transform-origin: bottom left;
                  border-radius: 18px 18px 18px 4px !important;
                  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                }
                
                /* Typing indicator when "Thinking..." */
                .typing-indicator {
                  display: inline-flex;
                  align-items: flex-end;
                  min-height: 16px;
                }
                
                .typing-indicator span {
                  width: 8px;
                  height: 8px;
                  margin: 0 1px;
                  background-color: var(--primary-color);
                  display: block;
                  border-radius: 50%;
                  opacity: 0.8;
                  z-index: 1;
                }
                
                .typing-indicator span:nth-child(1) {
                  animation: typing 1s infinite;
                }
                .typing-indicator span:nth-child(2) {
                  animation: typing 1s infinite 0.15s;
                }
                .typing-indicator span:nth-child(3) {
                  animation: typing 1s infinite 0.3s;
                }
                
                @keyframes typing {
                  0%, 100% {
                    transform: translateY(0);
                  }
                  50% {
                    transform: translateY(-6px);
                  }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    chatMessages.appendChild(messageElement);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeChatMessage(messageId) {
    const message = document.getElementById(messageId);
    if (message) {
        message.remove();
    }
}

/**
 * Display sources and search suggestions for AI responses
 * @param {Array} sources - Array of source objects with uri and title
 * @param {string} searchSuggestions - HTML content for search suggestions
 */
function displaySources(sources, searchSuggestions) {
    // Create sources container if it doesn't exist
    let sourcesContainer = document.getElementById('sourcesContainer');
    if (!sourcesContainer) {
        sourcesContainer = document.createElement('div');
        sourcesContainer.id = 'sourcesContainer';
        sourcesContainer.className = 'mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-custom';
        
        // Insert after the chatMessages container
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.parentNode.insertBefore(sourcesContainer, chatMessages.nextSibling);
        }
    }
    
    // Clear previous content
    sourcesContainer.innerHTML = '';
    
    // Add sources if available
    if (sources && sources.length > 0) {
        const sourcesTitle = document.createElement('h4');
        sourcesTitle.className = 'font-semibold mb-2';
        sourcesTitle.textContent = 'Sources:';
        sourcesContainer.appendChild(sourcesTitle);
        
        const sourcesList = document.createElement('ul');
        sourcesList.className = 'list-disc pl-5 text-sm';
        
        sources.forEach(source => {
            const sourceItem = document.createElement('li');
            const sourceLink = document.createElement('a');
            sourceLink.href = source.uri;
            sourceLink.textContent = source.title || source.uri;
            sourceLink.className = 'text-blue-600 dark:text-blue-400 hover:underline';
            sourceLink.target = '_blank';
            sourceItem.appendChild(sourceLink);
            sourcesList.appendChild(sourceItem);
        });
        
        sourcesContainer.appendChild(sourcesList);
    }
    
    // Add search suggestions if available
    if (searchSuggestions) {
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'mt-3 pt-3 border-t border-custom';
        suggestionsDiv.innerHTML = searchSuggestions;
        sourcesContainer.appendChild(suggestionsDiv);
    }
    
    // Show the container if it has content
    if (sourcesContainer.children.length > 0) {
        sourcesContainer.style.display = 'block';
    } else {
        sourcesContainer.style.display = 'none';
    }
}

// Replace your existing DOMContentLoaded listener with this:
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the UI components
    initializeUI();
    
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Initialize chat functionality - ONLY USE THIS APPROACH
    setupChatInterface();
    
    // Connect send button to existing send function
    document.getElementById('sendChatBtn').addEventListener('click', sendChatMessage);
    
    // Connect enter key to send
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendChatMessage();
        }
    });
});



