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

    // Simple Mode Image Upload - modified to ensure it works
    if (simpleUploadArea && simpleFileInput) {
        simpleUploadArea.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Upload area clicked');
            simpleFileInput.click();
        });

        simpleFileInput.addEventListener('change', (e) => {
            console.log('File input change', e.target.files);
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                handleSimpleImageUpload(file);
            }
        });
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
            
            // Update sentiment indicators
            if (sentiment) {
                updateSentimentIndicators(sentiment.verdict, sentiment.strength);
            }
            
            // Update volatility meter
            if (volatility) {
                updateVolatilityMeter(volatility.level, volatility.strength);
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
        const volatilityIndicator = document.getElementById('volatilityIndicator');
        if (volatilityIndicator) {
            // Position indicator based on volatility level
            let position = 50; // Default to middle
            if (level?.toLowerCase() === 'low') position = 25;
            else if (level?.toLowerCase() === 'high') position = 75;
            
            volatilityIndicator.style.left = `${position}%`;
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
            const response = await fetch('/api/technical-analysis-draw', {
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
    async function processLineDrawingResults(annotations, chartImage) {
        const drawnChartContainer = document.getElementById('drawnChartContainer');
        if (!drawnChartContainer) return;
        
        try {
            // Create an image element to get dimensions
            const img = new Image();
            img.src = chartImage.dataUrl;
            
            await new Promise((resolve) => {
                img.onload = resolve;
            });
            
            // Create the canvas container
            drawnChartContainer.innerHTML = `
                <div class="relative">
                <img src="${chartImage.dataUrl}" alt="Original Chart" class="w-full h-auto rounded-lg shadow-md">
                <canvas id="annotationCanvas" class="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
                </div>
                <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 class="font-semibold text-blue-800 mb-2">Analysis Summary</h4>
                <div class="text-sm text-blue-700">
                    <p><strong>Support Levels:</strong> ${annotations.support_levels?.length || 0} identified</p>
                    <p><strong>Resistance Levels:</strong> ${annotations.resistance_levels?.length || 0} identified</p>
                    <p><strong>Trend Lines:</strong> ${annotations.trend_lines?.length || 0} identified</p>
                    <p><strong>Key Patterns:</strong> ${annotations.key_patterns?.length || 0} identified</p>
                </div>
                </div>`;
            
            // Setup canvas for annotations (placeholder - would need actual drawing logic)
            const canvas = document.getElementById('annotationCanvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                // Set canvas dimensions to match the image
                canvas.width = img.width;
                canvas.height = img.height;
                
                console.log('Chart annotations ready for drawing');
                // Note: Actual line drawing would require coordinate mapping from price levels to pixel positions
                // This would need additional chart analysis to determine the price scale and time scale
            }
            
        } catch (error) {
            console.error('Error processing line drawing results:', error);
            drawnChartContainer.innerHTML = `
                <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p class="text-red-700 font-semibold">Error Processing Results</p>
                <p class="text-red-600 text-sm mt-1">Unable to process line drawing results</p>
                </div>`;
        }
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
});