// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Current mode tracking
    window.currentMode = 'simple';
    // Image storage - store on window object for global access
    window.simpleImage = null;
    window.advancedImages = [null, null, null, null];
    // Labels for advanced mode timeframes
    const timeframeLabels = ['Weekly', 'Daily', '4H', '1H'];

    // DOM Elements
    const simpleMode = document.getElementById('simpleMode');
    const advancedMode = document.getElementById('advancedMode');
    const simpleModeSection = document.getElementById('simpleModeSection');
    const advancedModeSection = document.getElementById('advancedModeSection');
    const simpleUploadArea = document.getElementById('simpleUploadArea');
    const simpleFileInput = document.getElementById('simpleFileInput');
    const simpleImagePreview = document.getElementById('simpleImagePreview');
    const simpleRemoveBtn = document.getElementById('simpleRemoveBtn');
    const advancedImagePreviews = document.getElementById('advancedImagePreviews');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeAdvancedBtn = document.getElementById('analyzeAdvancedBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsSection = document.getElementById('resultsSection');
    const helpCard = document.getElementById('helpCard');
    const drawLinesBtn = document.getElementById('drawLinesBtn');
    const drawnChartSection = document.getElementById('drawnChartSection');
    const drawnChartContainer = document.getElementById('drawnChartContainer');
    const verificationMessage = document.getElementById('verificationMessage');
    const currentYear = document.getElementById('currentYear');

    // Check if all required elements exist
    const requiredElements = [simpleMode, advancedMode, simpleModeSection, simpleUploadArea, simpleFileInput];
    if (requiredElements.some(el => !el)) {
        console.error('Some required DOM elements are missing!');
        // Debug: Log which elements are missing
        requiredElements.forEach((el, index) => {
            const elementNames = ['simpleMode', 'advancedMode', 'simpleModeSection', 'simpleUploadArea', 'simpleFileInput'];
            if (!el) {
                console.error(`Missing element: ${elementNames[index]}`);
            }
        });
        return; // Exit if elements are missing
    }

    // Set current year in footer
    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    // Tab switching functionality
    const tabContentPairs = [
        { tab: document.getElementById('tab-summary'), content: document.getElementById('content-summary') },
        { tab: document.getElementById('tab-details'), content: document.getElementById('content-details') },
        { tab: document.getElementById('tab-drawn'), content: document.getElementById('content-drawn') }
    ];

    tabContentPairs.forEach(({tab, content}) => {
        if (tab && content) {
            tab.addEventListener('click', () => {
                // Hide all content
                tabContentPairs.forEach(pair => {
                    if (pair.content && pair.tab) {
                        pair.content.classList.add('hidden');
                        pair.tab.classList.remove('active');
                    }
                });
                
                // Show selected content
                content.classList.remove('hidden');
                tab.classList.add('active');
            });
        }
    });

    // Mode switching logic
    simpleMode.addEventListener('click', () => {
        window.currentMode = 'simple';
        simpleMode.classList.remove('btn-secondary');
        simpleMode.classList.add('btn-primary');
        
        advancedMode.classList.remove('btn-primary');
        advancedMode.classList.add('btn-secondary');
        
        simpleModeSection.classList.remove('hidden');
        advancedModeSection.classList.add('hidden');
        
        updateAnalyzeButton();
    });

    advancedMode.addEventListener('click', () => {
        window.currentMode = 'advanced';
        advancedMode.classList.remove('btn-secondary');
        advancedMode.classList.add('btn-primary');
        
        simpleMode.classList.remove('btn-primary');
        simpleMode.classList.add('btn-secondary');
        
        simpleModeSection.classList.add('hidden');
        advancedModeSection.classList.remove('hidden');
        
        updateAnalyzeButton();
    });

    // Portfolio link functionality
    // document.getElementById('portfolioLink').addEventListener('click', function(e) {
    //     e.preventDefault();
    //     // In a real implementation, this would navigate to your portfolio page
    //     alert("This would navigate to your Eavest Portfolio Analyst page");
    // });

    // document.getElementById('portfolioBtn').addEventListener('click', function(e) {
    //     e.preventDefault();
    //     // In a real implementation, this would add the current analysis to your portfolio
    //     alert("This would add the current analysis to your Eavest Portfolio");
    // });

    // Simple Mode Image Upload - fixed implementation
    // Check again for upload area and file input
    console.log('Simple upload area element:', simpleUploadArea);
    console.log('Simple file input element:', simpleFileInput);
    
    // Add fallback button functionality
    const fallbackUploadBtn = document.getElementById('fallbackUploadBtn');
    if (fallbackUploadBtn && simpleFileInput) {
        fallbackUploadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Fallback upload button clicked');
            simpleFileInput.click();
        });
    }
    
    if (simpleUploadArea && simpleFileInput) {
        simpleUploadArea.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Upload area clicked');
            // Make sure the click doesn't propagate to parent elements
            
            // Direct click method
            setTimeout(function() {
                try {
                    console.log('Trying to click file input');
                    simpleFileInput.click();
                } catch (err) {
                    console.error('Error clicking file input:', err);
                    // Fallback method
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    simpleFileInput.dispatchEvent(clickEvent);
                }
            }, 0);
        });

        // Make sure the file input change handler is attached
        simpleFileInput.addEventListener('change', function(e) {
            console.log('File input change', e.target.files);
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                handleSimpleImageUpload(file);
            }
        });
    } else {
        console.error('Upload area or file input not found');
    }

    simpleRemoveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.simpleImage = null;
        simpleImagePreview.classList.add('hidden');
        simpleUploadArea.classList.remove('hidden');
        updateAnalyzeButton();
    });

    // Simple Mode Drag & Drop
    simpleUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        simpleUploadArea.classList.add('active');
    });

    simpleUploadArea.addEventListener('dragleave', () => {
        simpleUploadArea.classList.remove('active');
    });

    simpleUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        simpleUploadArea.classList.remove('active');
        
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            handleSimpleImageUpload(file);
        }
    });

    // Advanced Mode Image Upload
    document.querySelectorAll('.dropzone[data-index]').forEach(area => {
        const index = parseInt(area.dataset.index);
        const input = area.querySelector('.advanced-file-input');
        
        // Click to upload
        area.addEventListener('click', () => {
            input.click();
        });
        
        // File input change
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                handleAdvancedImageUpload(file, index);
            }
        });
        
        // Drag & Drop
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('active');
        });
        
        area.addEventListener('dragleave', () => {
            area.classList.remove('active');
        });
        
        area.addEventListener('drop', (e => {
            e.preventDefault();
            area.classList.remove('active');
            
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                handleAdvancedImageUpload(file, index);
            }
        }));
    });

    // Clipboard paste for the entire document - enhanced for better reliability
    window.addEventListener('paste', (e) => {
        console.log('Paste event detected');
        e.preventDefault();
        const items = e.clipboardData.items;
        
        for (let i = 0; i < items.length; i++) {
            console.log('Clipboard item:', items[i].type);
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                
                if (window.currentMode === 'simple') {
                    console.log('Pasting image in simple mode');
                    handleSimpleImageUpload(file);
                } else {
                    console.log('Pasting image in advanced mode');
                    // Find the first empty slot in advanced mode
                    const emptyIndex = window.advancedImages.findIndex(img => img === null);
                    if (emptyIndex !== -1) {
                        handleAdvancedImageUpload(file, emptyIndex);
                    }
                }
                break;
            }
        }
    });

    // Handle image uploads
    function handleSimpleImageUpload(file) {
        if (!file || !file.type.match('image.*')) {
            console.error('Invalid file type');
            return;
        }
        
        console.log('Processing simple image upload:', file.name, file.type);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const simpleImagePreview = document.getElementById('simpleImagePreview');
            const simpleUploadArea = document.getElementById('simpleUploadArea');
            
            if (!simpleImagePreview || !simpleUploadArea) {
                console.error('Image preview elements not found');
                return;
            }
            
            window.simpleImage = {
                file: file,
                dataUrl: e.target.result
            };
            
            console.log('Image loaded successfully, updating UI');
            
            const img = simpleImagePreview.querySelector('img');
            if (img) {
                img.src = e.target.result;
            }
            
            simpleImagePreview.classList.remove('hidden');
            simpleUploadArea.classList.add('hidden');
            
            updateAnalyzeButton();
        };
        
        reader.onerror = (e) => {
            console.error('Error reading file:', e);
        };
        
        reader.readAsDataURL(file);
    }

    function handleAdvancedImageUpload(file, index) {
        if (!file || !file.type.match('image.*')) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            window.advancedImages = window.advancedImages || [null, null, null, null];
            window.advancedImages[index] = {
                file: file,
                dataUrl: e.target.result
            };
            
            updateAdvancedPreview();
            updateAnalyzeButton();
        };
        
        reader.readAsDataURL(file);
    }

    function updateAdvancedPreview() {
        const advancedImagePreviews = document.getElementById('advancedImagePreviews');
        if (!advancedImagePreviews) return;
        
        // Clear previous previews
        advancedImagePreviews.innerHTML = '';
        
        // Add new previews
        const timeframeLabels = ['Weekly', 'Daily', '4H', '1H'];
        window.advancedImages = window.advancedImages || [null, null, null, null];
        
        window.advancedImages.forEach((image, index) => {
            if (image) {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'relative';
                previewDiv.innerHTML = `
                    <div class="absolute top-0 left-0 bg-primary-500 text-white px-2 py-1 text-xs font-bold rounded-br">${timeframeLabels[index]}</div>
                    <img src="${image.dataUrl}" alt="${timeframeLabels[index]} Chart" class="w-full h-auto rounded-lg shadow-md">
                    <button class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors remove-advanced-image" data-index="${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                `;
                advancedImagePreviews.appendChild(previewDiv);
            }
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-advanced-image').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                window.advancedImages[index] = null;
                updateAdvancedPreview();
                updateAnalyzeButton();
            });
        });
    }

    function updateAnalyzeButton() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        const analyzeAdvancedBtn = document.getElementById('analyzeAdvancedBtn');
        const currentMode = window.currentMode || 'simple';
        
        if (!analyzeBtn || !analyzeAdvancedBtn) return;
        
        if (currentMode === 'simple') {
            analyzeBtn.disabled = !window.simpleImage;
        } else {
            window.advancedImages = window.advancedImages || [null, null, null, null];
            analyzeAdvancedBtn.disabled = !window.advancedImages.some(img => img !== null);
        }
    }

    // Main analysis function using the Flask backend API
    async function performAnalysis() {
        try {
            // Show loading
            const loadingIndicator = document.getElementById('loadingIndicator');
            const helpCard = document.getElementById('helpCard');
            
            if (loadingIndicator) loadingIndicator.classList.remove('hidden');
            if (helpCard) helpCard.classList.add('hidden');
            
            // Get current mode and options
            const mode = window.currentMode || 'simple';
            const showSupport = document.getElementById('showSupport')?.checked || true;
            const showTrend = document.getElementById('showTrend')?.checked || true;
            const showPoints = document.getElementById('showPoints')?.checked || true;
            
            // Prepare form data
            const formData = new FormData();
            formData.append('mode', mode);
            formData.append('draw_lines', showSupport || showTrend);
            formData.append('include_entry_exit', showPoints);
            
            console.log(`Analysis mode: ${mode}`);
            // Add images based on mode
            if (mode === 'simple') {
                console.log('Simple image:', window.simpleImage);
                if (window.simpleImage && window.simpleImage.file) {
                    formData.append('chart', window.simpleImage.file);
                    console.log('Added simple chart to form data');
                } else {
                    throw new Error('No chart image provided');
                }
            } else {
                // Advanced mode - multiple timeframes
                let hasImages = false;
                window.advancedImages.forEach((imageData, index) => {
                    if (imageData && imageData.file) {
                        const timeframes = ['weekly_chart', 'daily_chart', 'four_hour_chart', 'one_hour_chart'];
                        formData.append(timeframes[index], imageData.file);
                        hasImages = true;
                        console.log(`Added ${timeframes[index]} to form data`);
                    }
                });
                
                if (!hasImages) {
                    throw new Error('No chart images provided');
                }
            }
            
            // Make request to Flask backend
            console.log(`Making ${mode} mode analysis request to backend...`);
            const response = await fetch('/api/technical-analysis', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Analysis failed');
            }
            
            // Process the successful response
            console.log('Analysis completed successfully:', result);
            processApiResponse(result.analysis);
            
            // Show results
            resultsSection.classList.remove('hidden');
            
        } catch (error) {
            console.error('Analysis error:', error);
            
            // Show error in insights section
            const insightsContent = document.getElementById('insightsContent');
            if (insightsContent) {
                insightsContent.innerHTML = `
                <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p class="text-red-700 font-semibold">Analysis Error</p>
                    <p class="text-red-600 text-sm mt-1">${error.message}</p>
                    <p class="text-red-500 text-xs mt-2">Please try again with a different chart or check your internet connection.</p>
                </div>`;
            }
            
            // Still show results section so user can see the error
            resultsSection.classList.remove('hidden');
            
        } finally {
            // Hide loading
            loadingIndicator.classList.add('hidden');
        }
    }

    // Process API response and update UI
    function processApiResponse(analysis) {
        try {
            console.log('Processing API response:', analysis);
            
            const { sentiment, volatility, insights, trading_opportunity } = analysis;
            
            // Log detailed volatility data for debugging
            console.log('Volatility data:', volatility);
            
            // Update sentiment indicators
            if (sentiment) {
                updateSentimentIndicators(sentiment.verdict, sentiment.strength);
            }
            
            // Update volatility meter
            if (volatility) {
                console.log('Updating volatility meter with level:', volatility.level, 'strength:', volatility.strength);
                updateVolatilityMeter(volatility.level, volatility.strength);
            } else {
                console.warn('No volatility data found in API response');
            }
            
            // Update insights
            if (insights) {
                updateInsights(insights);
            }
            
            // Update trading opportunities
            if (trading_opportunity) {
                updateTradingOpportunities(trading_opportunity);
            }
            
            // Update technical content (combination of insights and opportunities)
            updateTechnicalContent(insights, trading_opportunity);
            
            console.log('Analysis results updated successfully');
            
        } catch (error) {
            console.error('Error processing API response:', error);
            const insightsContent = document.getElementById('insightsContent');
            if (insightsContent) {
                insightsContent.innerHTML = `
                <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p class="text-red-700 font-semibold">Processing Error</p>
                    <p class="text-red-600 text-sm mt-1">Failed to process analysis results</p>
                </div>`;
            }
        }
    }

    // Update sentiment indicators
    function updateSentimentIndicators(verdict, strength) {
        // Hide all indicators first
        document.getElementById('neutralIndicator')?.classList.add('hidden');
        document.getElementById('bullishIndicator')?.classList.add('hidden');
        document.getElementById('bearishIndicator')?.classList.add('hidden');
        
        // Show the appropriate indicator
        const indicatorId = verdict?.toLowerCase() === 'bullish' ? 'bullishIndicator' :
                            verdict?.toLowerCase() === 'bearish' ? 'bearishIndicator' : 'neutralIndicator';
        
        const indicator = document.getElementById(indicatorId);
        if (indicator) {
            indicator.classList.remove('hidden');
        }
        
        // Update sentiment meter if it exists
        const sentimentMeter = document.querySelector('.sentiment-meter .meter-fill');
        if (sentimentMeter && strength !== undefined) {
            sentimentMeter.style.width = `${Math.max(0, Math.min(100, strength))}%`;
        }
        
        console.log(`Sentiment updated: ${verdict} (${strength}%)`);
    }

    // Update volatility meter
    function updateVolatilityMeter(level, strength) {
        console.log('updateVolatilityMeter called with:', level, strength);
        
        // Get DOM elements
        const volatilityMeter = document.querySelector('.volatility-meter');
        const volatilityIndicator = document.getElementById('volatilityIndicator');
        
        console.log('Volatility meter element:', volatilityMeter);
        console.log('Volatility indicator element:', volatilityIndicator);
        
        if (volatilityIndicator) {
            // Position indicator based on volatility level
            let position = 50; // Default to middle
            if (level?.toLowerCase() === 'low') position = 25;
            else if (level?.toLowerCase() === 'high') position = 75;
            
            console.log('Setting volatility indicator position to:', position + '%');
            volatilityIndicator.style.left = `${position}%`;
        } else {
            console.error('Volatility indicator element not found');
        }
        
        console.log(`Volatility updated: ${level} (${strength}%)`);
    }

    // Update insights section
    function updateInsights(insights) {
        const insightsContent = document.getElementById('insightsContent');
        if (!insightsContent) return;
        
        if (insights && Array.isArray(insights) && insights.length > 0) {
            const insightsHtml = `
                <ul class="list-disc pl-5 space-y-2">
                ${insights.map(insight => `<li class="text-gray-700">${insight}</li>`).join('')}
                </ul>`;
            insightsContent.innerHTML = insightsHtml;
        } else {
            insightsContent.innerHTML = '<p class="text-gray-500 italic">No specific insights available from this analysis.</p>';
        }
        
        console.log(`Insights updated: ${insights?.length || 0} items`);
    }

    // Update trading opportunities section
    function updateTradingOpportunities(tradingOpportunity) {
        const opportunitiesContent = document.getElementById('opportunitiesContent');
        if (!opportunitiesContent) return;
        
        if (tradingOpportunity && tradingOpportunity.trim()) {
            opportunitiesContent.innerHTML = tradingOpportunity;
        } else {
            opportunitiesContent.innerHTML = '<p class="text-gray-500 italic">No specific trading opportunities identified from this analysis.</p>';
        }
        
        console.log('Trading opportunities updated');
    }

    // Update technical content section
    function updateTechnicalContent(insights, tradingOpportunity) {
        const technicalContent = document.getElementById('technicalContent');
        if (!technicalContent) return;
        
        let content = '';
        
        // Add insights
        if (insights && Array.isArray(insights) && insights.length > 0) {
            content += `
                <div class="mb-4">
                <h4 class="font-semibold mb-2 text-gray-800">Key Technical Insights:</h4>
                <ul class="list-disc pl-5 space-y-1">
                    ${insights.map(insight => `<li class="text-gray-700">${insight}</li>`).join('')}
                </ul>
                </div>`;
        }
        
        // Add trading opportunities
        if (tradingOpportunity && tradingOpportunity.trim()) {
            content += `
                <div>
                <h4 class="font-semibold mb-2 text-gray-800">Trading Opportunities:</h4>
                <div class="text-gray-700">${tradingOpportunity}</div>
                </div>`;
        }
        
        if (!content) {
            content = '<p class="text-gray-500 italic">Technical analysis is being processed. Please wait for detailed results.</p>';
        }
        
        technicalContent.innerHTML = content;
        
        console.log('Technical content updated');
    }

    // Draw lines functionality using backend analysis
    async function drawSupportResistanceLines() {
        try {
            // Show loading state
            drawLinesBtn.disabled = true;
            drawLinesBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Drawing Lines...';
            
            // Get the current chart image
            let chartImage = null;
            
            if (window.currentMode === 'simple') {
                chartImage = window.simpleImage;
            } else {
                // For advanced mode, use the first available image
                chartImage = window.advancedImages.find(img => img !== null);
            }
            
            if (!chartImage || !chartImage.file) {
                throw new Error('No chart image available for line drawing');
            }
            
            // Prepare form data for line drawing request
            const formData = new FormData();
            formData.append('chart', chartImage.file);
            
            // Get current analysis insights to inform the drawing
            const insightsContent = document.getElementById('insightsContent');
            if (insightsContent && insightsContent.textContent) {
                formData.append('existing_analysis', insightsContent.textContent);
            }
            
            console.log('Requesting support/resistance line analysis...');
            
            // Make request to draw lines endpoint
            const response = await fetch('/api/technical-analysis/draw', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Line drawing failed');
            }
            
            console.log('Line drawing analysis completed:', result);
            
            // Process the line drawing results
            await processLineDrawingResults(result.annotations, chartImage);
            
            // Switch to the drawn tab
            document.getElementById('tab-drawn')?.click();
            
            // Show verification message
            const verificationMessage = document.getElementById('verificationMessage');
            if (verificationMessage) {
                verificationMessage.classList.remove('hidden');
            }
            
        } catch (error) {
            console.error('Line drawing error:', error);
            alert(`Failed to draw lines: ${error.message}`);
        } finally {
            // Re-enable button
            drawLinesBtn.disabled = false;
            drawLinesBtn.innerHTML = '<i class="fas fa-pencil-alt mr-2"></i>Redraw Support & Resistance Lines';
        }
    }

    // Process line drawing results and render them
    async function processLineDrawingResults(annotationsArray, chartImage) {
        const drawnChartContainer = document.getElementById('drawnChartContainer');
        if (!drawnChartContainer) {
            console.error("drawnChartContainer not found");
            return;
        }

        const annotations = Array.isArray(annotationsArray) ? annotationsArray : [];

        try {
            const img = new Image();
            img.src = chartImage.dataUrl;
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            
            const supportLevels = annotations.filter(a => a.type === 'support').length;
            const resistanceLevels = annotations.filter(a => a.type === 'resistance').length;
            const trendLines = annotations.filter(a => a.type === 'trendline').length;
            const keyPatterns = annotations.filter(a => a.type === 'pattern').length;
            const entryPoints = annotations.filter(a => a.type === 'entry').length;
            const exitPoints = annotations.filter(a => a.type === 'exit').length;
            const signals = annotations.filter(a => a.type === 'signal').length;

            drawnChartContainer.innerHTML = `
                <div class="relative">
                    <img src="${chartImage.dataUrl}" alt="Original Chart" class="w-full h-auto rounded-lg shadow-md">
                    <canvas id="annotationCanvas" class="absolute top-0 left-0 w-full h-full"></canvas>
                </div>
                <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 class="font-semibold text-blue-800 mb-2">Analysis Summary</h4>
                    <div class="text-sm text-blue-700 grid grid-cols-2 gap-x-4 gap-y-1">
                        <p><strong>Support Levels:</strong> ${supportLevels}</p>
                        <p><strong>Resistance Levels:</strong> ${resistanceLevels}</p>
                        <p><strong>Trend Lines:</strong> ${trendLines}</p>
                        <p><strong>Key Patterns:</strong> ${keyPatterns}</p>
                        <p><strong>Entry Points:</strong> ${entryPoints}</p>
                        <p><strong>Exit Points:</strong> ${exitPoints}</p>
                        <p><strong>Signals:</strong> ${signals}</p>
                    </div>
                </div>
                <div class="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 class="font-semibold text-gray-800 mb-2">Toggle Elements:</h4>
                    <div class="flex flex-wrap gap-2 items-center">
                        <button id="toggleSupport" class="px-3 py-1 rounded-full text-sm" style="background: rgba(94, 170, 216, 0.2); color: #5eaad8;">
                            <i class="fas fa-minus-square mr-1"></i>Support
                        </button>
                        <button id="toggleResistance" class="px-3 py-1 rounded-full text-sm" style="background: rgba(254, 178, 178, 0.2); color: #FEB2B2;">
                            <i class="fas fa-minus-square mr-1"></i>Resistance
                        </button>
                        <button id="toggleTrend" class="px-3 py-1 rounded-full text-sm" style="background: rgba(125, 125, 125, 0.2); color: #718096;">
                            <i class="fas fa-arrow-trend-up mr-1"></i>Trend Lines
                        </button>
                        <button id="togglePatterns" class="px-3 py-1 rounded-full text-sm" style="background: rgba(251, 211, 141, 0.2); color: #FBD38D;">
                            <i class="fas fa-chart-line mr-1"></i>Patterns
                        </button>
                        <button id="toggleEntries" class="px-3 py-1 rounded-full text-sm" style="background: rgba(88, 216, 133, 0.2); color: #58d885;">
                            <i class="fas fa-arrow-down-up-across-line mr-1"></i>Entries
                        </button>
                        <button id="toggleExits" class="px-3 py-1 rounded-full text-sm" style="background: rgba(254, 178, 178, 0.2); color: #FEB2B2;"> 
                            <i class="fas fa-right-from-bracket mr-1"></i>Exits
                        </button>
                        <button id="toggleSignals" class="px-3 py-1 rounded-full text-sm" style="background: rgba(93, 92, 222, 0.2); color: #5D5CDE;">
                            <i class="fas fa-bolt mr-1"></i>Signals
                        </button>
                    </div>
                </div>`;
            
            const canvas = document.getElementById('annotationCanvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                
                console.log('Chart annotations ready for drawing. Annotations:', annotations);
                // Initial draw is handled by setupToggleButtons ensuring all are active first
                setupToggleButtons(ctx, annotations, img.width, img.height); 
            } else {
                console.error("annotationCanvas not found after innerHTML update");
            }
            
        } catch (error) {
            console.error('Error processing line drawing results:', error);
            drawnChartContainer.innerHTML = `
                <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p class="text-red-700 font-semibold">Error Processing Results</p>
                    <p class="text-red-600 text-sm mt-1">Unable to process line drawing results: ${error.message}</p>
                </div>`;
        }
    }

    // Function to draw annotations on the canvas (from he.html)
    function drawAnnotations(ctx, annotations, imgWidth, imgHeight) {
        ctx.clearRect(0, 0, imgWidth, imgHeight);
        annotations.forEach(annotation => {
            if (!annotation || !annotation.type) return; // Skip if annotation is malformed
            switch(annotation.type.toLowerCase()) {
                case 'support':
                    drawHorizontalLine(ctx, annotation, imgWidth, imgHeight, annotation.color || '#5eaad8', 3);
                    break;
                case 'resistance':
                    drawHorizontalLine(ctx, annotation, imgWidth, imgHeight, annotation.color || '#FEB2B2', 3);
                    break;
                case 'trendline':
                    drawLine(ctx, annotation, imgWidth, imgHeight, annotation.color || '#718096', 2);
                    break;
                case 'pattern':
                    drawPattern(ctx, annotation, imgWidth, imgHeight);
                    break;
                case 'entry':
                    drawPoint(ctx, annotation, imgWidth, imgHeight, annotation.color || '#58d885');
                    break;
                case 'exit':
                    drawPoint(ctx, annotation, imgWidth, imgHeight, annotation.color || '#FEB2B2');
                    break;
                case 'signal':
                    drawSignal(ctx, annotation, imgWidth, imgHeight);
                    break;
                default:
                    console.warn("Unknown annotation type:", annotation.type);
            }
        });
    }

    function drawHorizontalLine(ctx, annotation, imgWidth, imgHeight, color, lineWidth) {
        if (!annotation.coordinates || annotation.coordinates.length < 4) return;
        const [x1_perc, y1_perc, x2_perc, y2_perc] = annotation.coordinates;
        const x1 = (x1_perc / 100) * imgWidth;
        const y1 = (y1_perc / 100) * imgHeight;
        const x2 = (x2_perc / 100) * imgWidth;
        const y2 = (y2_perc / 100) * imgHeight;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([5, 3]);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.font = '16px Arial';
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(annotation.label || '', Math.min(x1, x2) + 5, Math.min(y1, y2) - 5);
    }

    function drawLine(ctx, annotation, imgWidth, imgHeight, color, lineWidth) {
        if (!annotation.coordinates || annotation.coordinates.length < 4) return;
        const [x1_perc, y1_perc, x2_perc, y2_perc] = annotation.coordinates;
        const x1 = (x1_perc / 100) * imgWidth;
        const y1 = (y1_perc / 100) * imgHeight;
        const x2 = (x2_perc / 100) * imgWidth;
        const y2 = (y2_perc / 100) * imgHeight;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        ctx.font = '14px Arial';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        ctx.fillText(annotation.label || '', midX, midY - 5);
    }

    function drawPattern(ctx, annotation, imgWidth, imgHeight) {
        if (!annotation.coordinates || annotation.coordinates.length < 4) return;
        const [x_perc, y_perc, w_perc, h_perc] = annotation.coordinates;
        const x = (x_perc / 100) * imgWidth;
        const y = (y_perc / 100) * imgHeight;
        const width = (w_perc / 100) * imgWidth;
        const height = (h_perc / 100) * imgHeight;
        
        ctx.beginPath();
        ctx.strokeStyle = annotation.color || '#FBD38D';
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 2]);
        ctx.rect(x, y, width, height);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.font = '14px Arial';
        ctx.fillStyle = annotation.color || '#FBD38D';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(annotation.label || '', x + width / 2, y - 5);
    }

    function drawPoint(ctx, annotation, imgWidth, imgHeight, color) {
        if (!annotation.coordinates || annotation.coordinates.length < 2) return;
        const [x_perc, y_perc] = annotation.coordinates;
        const x = (x_perc / 100) * imgWidth;
        const y = (y_perc / 100) * imgHeight;

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.font = '14px Arial';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(annotation.label || '', x, y - 10);

        if (annotation.type.toLowerCase() === 'entry') {
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.moveTo(x, y - 15); ctx.lineTo(x - 8, y - 5); ctx.lineTo(x + 8, y - 5);
            ctx.closePath(); ctx.fill();
        }
        if (annotation.type.toLowerCase() === 'exit') {
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.moveTo(x, y + 15); ctx.lineTo(x - 8, y + 5); ctx.lineTo(x + 8, y + 5);
            ctx.closePath(); ctx.fill();
        }
    }

    function drawSignal(ctx, annotation, imgWidth, imgHeight) {
        if (!annotation.coordinates || annotation.coordinates.length < 2) return;
        const [x_perc, y_perc] = annotation.coordinates;
        const x = (x_perc / 100) * imgWidth;
        const y = (y_perc / 100) * imgHeight;

        ctx.beginPath();
        ctx.fillStyle = annotation.color || '#5D5CDE';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', x, y);
        
        const label = annotation.label || '';
        ctx.font = '14px Arial';
        const metrics = ctx.measureText(label);
        const labelWidth = metrics.width + 10;
        const labelHeight = 20;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(x - labelWidth / 2, y - 25 - labelHeight /2 , labelWidth, labelHeight);
        ctx.fillStyle = annotation.color || '#5D5CDE';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y - 15 - labelHeight / 2);
    }

    function setupToggleButtons(ctx, allAnnotations, imgWidth, imgHeight) {
        const buttonTypeMapping = {
            'toggleSupport': { type: 'support', active: true },
            'toggleResistance': { type: 'resistance', active: true },
            'toggleTrend': { type: 'trendline', active: true },
            'togglePatterns': { type: 'pattern', active: true },
            'toggleEntries': { type: 'entry', active: true },
            'toggleExits': { type: 'exit', active: true },
            'toggleSignals': { type: 'signal', active: true }
        };

        function redrawVisibleAnnotations() {
            const visibleAnnotations = allAnnotations.filter(anno => {
                if (!anno || !anno.type) return false;
                const annotationType = anno.type.toLowerCase();
                // Find which button controls this type
                for (const btnId in buttonTypeMapping) {
                    if (buttonTypeMapping[btnId].type === annotationType) {
                        return buttonTypeMapping[btnId].active; // Only draw if its controlling button is active
                    }
                }
                return false; // If no button controls this type, don't draw (should not happen with current setup)
            });
            drawAnnotations(ctx, visibleAnnotations, imgWidth, imgHeight);
        }

        for (const [buttonId, config] of Object.entries(buttonTypeMapping)) {
            const button = document.getElementById(buttonId);
            if (button) {
                // Set initial style for active
                button.style.opacity = '1';

                button.addEventListener('click', function() {
                    config.active = !config.active; // Toggle state
                    
                    // Update button style
                    this.style.opacity = config.active ? '1' : '0.5';
                    
                    redrawVisibleAnnotations();
                });
            } else {
                console.warn(`Toggle button with ID ${buttonId} not found.`);
            }
        }
        redrawVisibleAnnotations(); // Initial draw with all types active
    }

    // Analysis Button Action - connect to new API
    analyzeBtn.addEventListener('click', async () => {
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        analyzeBtn.disabled = true;
        resultsSection.classList.add('hidden');
        helpCard.classList.add('hidden');
        
        try {
            await performAnalysis();
            // Show results section after successful analysis
            resultsSection.classList.remove('hidden');
            helpCard.classList.add('hidden');
        } catch (error) {
            console.error('Analysis error:', error);
            alert('An error occurred during analysis. Please try again.');
        } finally {
            loadingIndicator.classList.add('hidden');
            analyzeBtn.disabled = false;
        }
    });

    analyzeAdvancedBtn.addEventListener('click', async () => {
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        analyzeAdvancedBtn.disabled = true;
        resultsSection.classList.add('hidden');
        helpCard.classList.add('hidden');
        
        try {
            await performAnalysis();
            // Show results section after successful analysis
            resultsSection.classList.remove('hidden');
            helpCard.classList.add('hidden');
        } catch (error) {
            console.error('Analysis error:', error);
            alert('An error occurred during analysis. Please try again.');
        } finally {
            loadingIndicator.classList.add('hidden');
            analyzeAdvancedBtn.disabled = false;
        }
    });

    // Draw Lines Button Action - connect to new API
    drawLinesBtn.addEventListener('click', async () => {
        // Show loading
        drawLinesBtn.disabled = true;
        drawLinesBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Drawing Lines...';
        
        try {
            await drawSupportResistanceLines();
        } catch (error) {
            console.error('Error drawing lines:', error);
            alert('An error occurred while drawing support and resistance lines. Please try again.');
        } finally {
            drawLinesBtn.disabled = false;
            drawLinesBtn.innerHTML = '<i class="fas fa-pencil-alt mr-2"></i>Redraw Support & Resistance Lines';
        }
    });

    let currentChart = null; // Keep a reference to the current chart

    function clearChart() {
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
        const canvas = document.getElementById('stockGraph');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    }

    function drawLines(jsonData) {
        clearChart(); // Clear previous chart before drawing a new one

        const data = JSON.parse(jsonData);
        const dates = data.dates;
        const prices = data.prices;
        const lines = data.lines; // Array of line objects

        const canvas = document.getElementById('stockGraph');
        const ctx = canvas.getContext('2d');

        // Create the chart
        currentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Stock Price',
                    data: prices,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    fill: false
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        }
                    },
                    y: {
                        beginAtZero: false
                    }
                },
                //responsive: true,
                //maintainAspectRatio: false,
                plugins: {
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x',
                        },
                        zoom: {
                            wheel: {
                                enabled: true,
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x',
                        }
                    },
                    annotation: {
                        annotations: lines.map(line => {
                            let annotationProps = {
                                type: 'line',
                                scaleID: 'y',
                                value: line.y, // For horizontal lines
                                borderColor: line.color || 'red', // Default to red if no color
                                borderWidth: line.width || 2, // Default to 2 if no width
                                label: {
                                    content: line.label || '', // Empty if no label
                                    enabled: true,
                                    position: 'start'
                                }
                            };
                            if (line.x1 && line.x2) { // If it's a trend line with x-coordinates
                                annotationProps.scaleID = 'x';
                                annotationProps.xMin = line.x1;
                                annotationProps.xMax = line.x2;
                                annotationProps.yMin = line.y1; // Assuming y1 and y2 for trend lines
                                annotationProps.yMax = line.y2;
                                // For non-horizontal lines, 'value' is not used.
                                // Instead, xMin, xMax, yMin, yMax define the line.
                                delete annotationProps.value; // Remove 'value' for trend lines
                            } else if (line.x) { // Vertical line
                                annotationProps.scaleID = 'x';
                                annotationProps.value = line.x;
                                delete annotationProps.y; // Vertical lines don't have a 'y' value in this context
                            }

                            return annotationProps;
                        })
                    }
                }
            }
        });
    }

    async function fetchData(symbol) {
        const loadingDiv = document.getElementById('loading');
        const dataDiv = document.getElementById('data');
        const graphDiv = document.getElementById('graphContainer'); // Assuming you have a container for the graph
        const symbolDetailDiv = document.getElementById('symbolDetail'); // To display symbol details

        loadingDiv.style.display = 'block';
        dataDiv.innerHTML = ''; // Clear previous data
        graphDiv.style.display = 'none'; // Hide graph initially
        symbolDetailDiv.innerHTML = ''; // Clear previous symbol details

        try {
            const response = await fetch(`https://eavest.com/api/get_stock_data/${symbol}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();

            if (result.error) {
                dataDiv.innerHTML = `<p>Error: ${result.error}</p>`;
            } else {
                // Display symbol and company name
                symbolDetailDiv.innerHTML = `<h2>${result.symbol} - ${result.companyName}</h2>`;

                // Prepare data for drawing lines - assuming result.graph_data is the JSON string
                if (result.graph_data) {
                    drawLines(result.graph_data); // Call drawLines with the graph data
                    graphDiv.style.display = 'block'; // Show graph
                } else {
                    // Fallback or error if no graph_data
                    dataDiv.innerHTML += '<p>No graph data available.</p>';
                }

                // Display other analysis if available (e.g., financial ratios, news)
                // This part remains similar to your existing structure
                if (result.financial_ratios) {
                    let financialContent = '<h3>Financial Ratios</h3><table>';
                    for (const [key, value] of Object.entries(result.financial_ratios)) {
                        financialContent += `<tr><td>${key}</td><td>${value}</td></tr>`;
                    }
                    financialContent += '</table>';
                    dataDiv.innerHTML += financialContent;
                }

                if (result.news && result.news.length > 0) {
                    let newsContent = '<h3>Recent News</h3><ul>';
                    result.news.forEach(article => {
                        newsContent += `<li><a href="${article.url}" target="_blank">${article.title}</a> (${article.source})</li>`;
                    });
                    newsContent += '</ul>';
                    dataDiv.innerHTML += newsContent;
                }
                 // Display volatility if available
                if (typeof result.volatility !== 'undefined' && result.volatility !== null) {
                    updateVolatilityMeter(result.volatility);
                } else {
                     // Optionally hide or show a default state for the meter
                    document.getElementById('volatilityMeter').style.display = 'none';
                }
            }
        } catch (error) {
            dataDiv.innerHTML = `<p>Failed to fetch data: ${error.message}</p>`;
        } finally {
            loadingDiv.style.display = 'none';
        }
    }

    async function sendMessage() {
        const userInput = document.getElementById('userInput').value;
        const conversationDiv = document.getElementById('conversation');
        const symbol = document.getElementById('stockSymbol').value.toUpperCase(); // Assuming symbol is from an input

        if (!userInput.trim()) return;

        // Append user message
        conversationDiv.innerHTML += `<div class="message user-message"><p>${userInput}</p></div>`;

        // Call backend API
        try {
            // Using the /api/chat endpoint
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message: userInput,
                    symbol: symbol, // Send current symbol
                    // portfolio_data is removed as per previous updates, assuming it's fetched server-side if needed
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Append bot response
            // Assuming data.response is the text from the LLM
            conversationDiv.innerHTML += `<div class="message bot-message"><p>${data.response}</p></div>`;

            // If the response contains graph data, draw it
            if (data.graph_data) {
                drawLines(data.graph_data);
                 document.getElementById('graphContainer').style.display = 'block';
            }


        } catch (error) {
            console.error('Error sending message:', error);
            conversationDiv.innerHTML += `<div class="message bot-message"><p>Error: Could not get a response.</p></div>`;
        }

        // Clear input and scroll down
        document.getElementById('userInput').value = '';
        conversationDiv.scrollTop = conversationDiv.scrollHeight;
    }
});