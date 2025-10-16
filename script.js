let apiKey = '';
let selectedModel = 'claude-sonnet-4-5-20250929';
let isTyping = false;

// This will be handled in the main DOMContentLoaded event below

function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('show');
}

function loadSettings() {
    const savedApiKey = localStorage.getItem('claude_api_key');
    const savedModel = localStorage.getItem('claude_model');

    if (savedApiKey) {
        document.getElementById('apiKey').value = savedApiKey;
        apiKey = savedApiKey;
    }

    if (savedModel) {
        document.getElementById('modelSelect').value = savedModel;
        selectedModel = savedModel;
    }
}

function saveSettings() {
    const apiKeyInput = document.getElementById('apiKey');
    const modelSelect = document.getElementById('modelSelect');

    apiKey = apiKeyInput.value.trim();
    selectedModel = modelSelect.value;

    if (apiKey) {
        localStorage.setItem('claude_api_key', apiKey);
        localStorage.setItem('claude_model', selectedModel);

        addMessage('Settings saved successfully!', 'assistant');
        toggleSettings();
    } else {
        alert('Please enter your Claude API key');
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message) return;

    if (!apiKey) {
        addMessage('Please set your Claude API key in settings first.', 'error');
        return;
    }

    // Add user message
    addMessage(message, 'user');
    input.value = '';

    // Show typing indicator
    showTypingIndicator();

    // Send to Claude API
    sendToClaude(message);
}


function addMessage(content, type) {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);

    if (type === 'assistant') {
        // Try to detect and render charts for assistant messages
        console.log('=== CHART DETECTION START ===');
        console.log('Assistant message content:', content);
        console.log('Content length:', content.length);
        console.log('First 200 chars:', content.substring(0, 200));

        const chartData = detectChartData(content);
        console.log('Final chart data result:', chartData);

        if (chartData) {
            console.log('📊 RENDERING CHART with data:', chartData);
            renderChart(messageDiv, chartData, content);
        } else {
            console.log('❌ No chart detected - displaying as text');
            messageDiv.textContent = content;
        }
        console.log('=== CHART DETECTION END ===');
    } else {
        messageDiv.textContent = content;
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function detectChartData(text) {
    try {
        console.log('🔍 Starting chart pattern analysis...');

        // Look for markdown tables first (most structured)
        console.log('🔍 Checking for markdown tables...');
        if (text.includes('|') && text.includes('---')) {
            console.log('✅ Found pipe and dash characters - checking table structure');
            const tableData = parseTableData(text);
            if (tableData) {
                console.log('✅ Successfully parsed table data:', tableData);
                return tableData;
            } else {
                console.log('❌ Table parsing failed');
            }
        } else {
            console.log('❌ No table markers found');
        }

        // Look for bullet point lists with numbers
        console.log('🔍 Checking for bullet point patterns...');
        const bulletPattern = /[-*•]\s*([^:\n]+):\s*(\d+\.?\d*)/g;
        const bulletMatches = [...text.matchAll(bulletPattern)];
        console.log('Bullet pattern matches:', bulletMatches.length, bulletMatches);
        if (bulletMatches.length >= 2) {
            console.log('✅ Found bullet point pattern with', bulletMatches.length, 'matches');
            const hasPercentage = bulletMatches.some(m => text.includes(m[2] + '%'));
            return {
                type: hasPercentage ? 'pie' : 'bar',
                labels: bulletMatches.map(match => match[1].trim()),
                values: bulletMatches.map(match => parseFloat(match[2])),
                title: hasPercentage ? 'Distribution' : 'Comparison'
            };
        }

        // Look for numbered lists with data
        console.log('🔍 Checking for numbered list patterns...');
        const numberedPattern = /\d+\.\s*([^:\n]+):\s*(\d+\.?\d*)/g;
        const numberedMatches = [...text.matchAll(numberedPattern)];
        console.log('Numbered pattern matches:', numberedMatches.length, numberedMatches);
        if (numberedMatches.length >= 2) {
            console.log('✅ Found numbered list pattern');
            return {
                type: 'bar',
                labels: numberedMatches.map(match => match[1].trim()),
                values: numberedMatches.map(match => parseFloat(match[2])),
                title: 'Data Analysis'
            };
        }

        // Look for percentage data anywhere in text
        console.log('🔍 Checking for percentage patterns...');
        const percentPattern = /([A-Za-z\s]+):\s*(\d+\.?\d*)%/g;
        const percentMatches = [...text.matchAll(percentPattern)];
        console.log('Percentage pattern matches:', percentMatches.length, percentMatches);
        if (percentMatches.length >= 2) {
            console.log('✅ Found percentage pattern');
            return {
                type: 'pie',
                labels: percentMatches.map(match => match[1].trim()),
                values: percentMatches.map(match => parseFloat(match[2])),
                title: 'Percentage Breakdown'
            };
        }

        // Look for key-value pairs (flexible patterns)
        console.log('🔍 Checking for key-value patterns...');
        const kvPatterns = [
            { name: 'Colon-Dollar', pattern: /([A-Za-z][A-Za-z\s]+):\s*\$?(\d+\.?\d*)/g },
            { name: 'Colon-Units', pattern: /([A-Za-z][A-Za-z\s]+):\s*(\d+\.?\d*)\s*(million|billion|thousand|k|m|b)?/gi },
            { name: 'Dash', pattern: /([A-Za-z][A-Za-z\s]+)\s*[-–—]\s*(\d+\.?\d*)/g },
            { name: 'Equals', pattern: /([A-Za-z][A-Za-z\s]+)\s*=\s*(\d+\.?\d*)/g }
        ];

        for (const { name, pattern } of kvPatterns) {
            const matches = [...text.matchAll(pattern)];
            console.log(`${name} pattern matches:`, matches.length, matches);
            if (matches.length >= 2) {
                console.log(`✅ Found ${name} key-value pattern`);
                return {
                    type: 'bar',
                    labels: matches.map(match => match[1].trim()),
                    values: matches.map(match => parseFloat(match[2])),
                    title: 'Data Overview'
                };
            }
        }

        // Look for time series data
        console.log('🔍 Checking for time series patterns...');
        const datePatterns = [
            { name: 'ISO Date', pattern: /(\d{4}[-/]\d{1,2}[-/]\d{1,2})[^0-9]*(\d+\.?\d*)/g },
            { name: 'Month Year', pattern: /([A-Za-z]{3,9}\s+\d{4})[^0-9]*(\d+\.?\d*)/g },
            { name: 'Month Only', pattern: /([A-Za-z]{3})\s*(\d+\.?\d*)/g },
            { name: 'Quarter', pattern: /(Q[1-4]\s*\d{4})[^0-9]*(\d+\.?\d*)/g }
        ];

        for (const { name, pattern } of datePatterns) {
            const matches = [...text.matchAll(pattern)];
            console.log(`${name} pattern matches:`, matches.length, matches);
            if (matches.length >= 3) {
                console.log(`✅ Found ${name} time series pattern`);
                return {
                    type: 'line',
                    labels: matches.map(match => match[1]),
                    values: matches.map(match => parseFloat(match[2])),
                    title: 'Time Series Data'
                };
            }
        }

        console.log('❌ No chart patterns detected in text');
        return null;

    } catch (error) {
        console.error('❌ Chart detection error:', error);
        return null;
    }
}

function parseTableData(text) {
    const lines = text.split('\n').filter(line => line.includes('|'));
    if (lines.length < 3) return null;

    const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
    const dataRows = lines.slice(2).map(line =>
        line.split('|').map(cell => cell.trim()).filter(cell => cell)
    );

    if (headers.length >= 2 && dataRows.length >= 1) {
        // Find label column (first text column)
        let labelColumnIndex = 0;

        // Skip rank/number columns, find first text column
        for (let i = 0; i < dataRows[0].length; i++) {
            const firstCell = dataRows[0][i];
            // If not a pure number/rank, use this as label column
            if (!firstCell.match(/^[\d\-]+$/)) {
                labelColumnIndex = i;
                break;
            }
        }

        // Analyze all numeric columns to pick the best one
        const numericColumns = [];
        for (let colIdx = 0; colIdx < headers.length; colIdx++) {
            if (colIdx === labelColumnIndex) continue;

            const columnData = dataRows.map(row => {
                const cellText = row[colIdx] || '';

                // Handle percentages: "17.8%" -> 17.8
                if (cellText.includes('%')) {
                    const match = cellText.match(/(\d+\.?\d*)/);
                    return { value: match ? parseFloat(match[1]) : NaN, type: 'percentage' };
                }

                // Handle "billion", "million", "thousand": "1.44 billion" -> 1.44
                if (cellText.match(/billion|million|thousand|trillion/i)) {
                    const match = cellText.match(/(\d+\.?\d*)/);
                    let value = match ? parseFloat(match[1]) : NaN;
                    // Normalize to actual values
                    if (cellText.match(/billion/i)) value *= 1000;
                    else if (cellText.match(/million/i)) value *= 1;
                    else if (cellText.match(/thousand/i)) value *= 0.001;
                    else if (cellText.match(/trillion/i)) value *= 1000000;
                    return { value, type: 'large_number' };
                }

                // Handle plain numbers
                const num = parseFloat(cellText.replace(/,/g, ''));
                return { value: num, type: 'number' };
            });

            const values = columnData.map(d => d.value);
            const validCount = values.filter(v => !isNaN(v) && v !== 0).length;

            if (validCount > 0) {
                numericColumns.push({
                    index: colIdx,
                    header: headers[colIdx],
                    values: values.map(v => isNaN(v) ? 0 : v),
                    type: columnData[0].type,
                    validCount
                });
            }
        }

        if (numericColumns.length === 0) {
            console.log('❌ No valid numeric column found in table');
            return null;
        }

        // Prefer percentage columns for pie charts, otherwise use first valid column
        let selectedColumn = numericColumns.find(col => col.type === 'percentage') || numericColumns[0];

        // Extract labels
        const labels = dataRows.map(row => row[labelColumnIndex]);

        // Determine chart type
        const isPercentage = selectedColumn.type === 'percentage';
        const maxValue = Math.max(...selectedColumn.values);
        let chartType = 'bar';

        if (isPercentage && selectedColumn.values.length <= 8) {
            chartType = 'pie';
        } else if (maxValue > 1000 || selectedColumn.type === 'large_number') {
            chartType = 'bar';
        }

        console.log('✅ Parsed table - labels:', labels, 'values:', selectedColumn.values);
        console.log('📊 Using column:', selectedColumn.header, 'type:', chartType);

        // Create intelligent title
        const labelHeader = headers[labelColumnIndex];
        const valueHeader = selectedColumn.header;
        const title = `${valueHeader} by ${labelHeader}`;

        return {
            type: chartType,
            labels: labels,
            values: selectedColumn.values,
            title: title
        };
    }

    return null;
}

function parseTimeSeriesData(text, matches) {
    const data = matches.map(match => ({
        date: match[1],
        value: parseFloat(match[2])
    })).filter(item => !isNaN(item.value));

    if (data.length >= 3) {
        return {
            type: 'line',
            labels: data.map(item => item.date),
            values: data.map(item => item.value),
            title: 'Time Series Data'
        };
    }

    return null;
}

function parsePercentageData(text) {
    const lines = text.split('\n').filter(line => line.includes('%'));
    const data = [];

    for (const line of lines) {
        const match = line.match(/([A-Za-z\s]+).*?(\d+\.?\d*)%/);
        if (match) {
            data.push({
                label: match[1].trim(),
                value: parseFloat(match[2])
            });
        }
    }

    if (data.length >= 2) {
        return {
            type: 'pie',
            labels: data.map(item => item.label),
            values: data.map(item => item.value),
            title: 'Percentage Distribution'
        };
    }

    return null;
}

function parseKeyValueData(matches) {
    const data = matches.map(match => ({
        label: match[1].trim(),
        value: parseFloat(match[2])
    })).filter(item => !isNaN(item.value));

    if (data.length >= 3) {
        return {
            type: 'bar',
            labels: data.map(item => item.label),
            values: data.map(item => item.value),
            title: 'Data Comparison'
        };
    }

    return null;
}

function renderChart(container, chartData, originalText) {
    console.log('📊 === RENDER CHART START ===');
    console.log('📊 Container:', container);
    console.log('📊 Chart data:', chartData);
    console.log('📊 Chart labels:', chartData.labels);
    console.log('📊 Chart values:', chartData.values);

    try {
        // Clear container content first
        console.log('📊 Clearing container...');
        container.innerHTML = '';

        // Create chart container
        console.log('📊 Creating chart container...');
        const chartContainer = document.createElement('div');
        chartContainer.classList.add('chart-container');
        chartContainer.style.border = '2px solid red'; // Debug border
        chartContainer.style.minHeight = '400px';
        chartContainer.style.backgroundColor = '#f0f0f0';

        // Add original text above chart
        console.log('📊 Adding text div...');
        const textDiv = document.createElement('div');
        textDiv.classList.add('chart-text');
        textDiv.textContent = originalText;
        chartContainer.appendChild(textDiv);

        // Create canvas for chart with fixed dimensions
        console.log('📊 Creating canvas...');
        const canvas = document.createElement('canvas');
        canvas.id = 'chart-canvas-' + Date.now();
        canvas.style.width = '100%';
        canvas.style.height = '300px';
        canvas.style.maxHeight = '300px';
        canvas.style.border = '1px solid blue'; // Debug border
        chartContainer.appendChild(canvas);

        console.log('📊 Appending chart container to message...');
        container.appendChild(chartContainer);

        // Generate chart colors
        console.log('📊 Generating colors...');
        const colors = generateColors(chartData.values.length);
        console.log('📊 Generated colors:', colors);

        // Validate Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js not loaded!');
            return;
        }

        console.log('📊 Chart.js available, creating chart...');

        // Create Chart.js chart with timeout to ensure DOM is ready
        setTimeout(() => {
            console.log('📊 Timeout executing, creating Chart.js instance...');
            try {
                const chart = new Chart(canvas, {
                    type: chartData.type,
                    data: {
                        labels: chartData.labels,
                        datasets: [{
                            label: chartData.title,
                            data: chartData.values,
                            backgroundColor: chartData.type === 'pie' ? colors : colors[0],
                            borderColor: chartData.type === 'pie' ? colors.map(c => c.replace('0.8', '1')) : colors[0].replace('0.8', '1'),
                            borderWidth: 1,
                            fill: chartData.type === 'line' ? false : true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: chartData.title
                            },
                            legend: {
                                display: chartData.type === 'pie'
                            }
                        },
                        scales: chartData.type === 'pie' ? {} : {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
                console.log('✅ Chart created successfully!', chart);
            } catch (chartError) {
                console.error('❌ Chart creation failed:', chartError);
            }
        }, 100);

    } catch (error) {
        console.error('❌ Render chart error:', error);
    }

    console.log('📊 === RENDER CHART END ===');
}

function generateColors(count) {
    const baseColors = [
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(255, 205, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)',
        'rgba(199, 199, 199, 0.8)',
        'rgba(83, 102, 255, 0.8)'
    ];

    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }

    return colors;
}

function showTypingIndicator() {
    if (isTyping) return;

    isTyping = true;
    const messagesContainer = document.getElementById('messages');
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('typing-indicator');
    typingDiv.id = 'typingIndicator';
    typingDiv.textContent = 'Claude is typing...';
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Disable send button
    document.querySelector('.input-container button').disabled = true;
}

function hideTypingIndicator() {
    isTyping = false;
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }

    // Enable send button
    document.querySelector('.input-container button').disabled = false;
}

async function sendToClaude(message) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                apiKey: apiKey,
                model: selectedModel
            })
        });

        hideTypingIndicator();

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const assistantMessage = data.content[0].text;
        addMessage(assistantMessage, 'assistant');

    } catch (error) {
        hideTypingIndicator();
        console.error('Error calling Claude API:', error);

        let errorMessage = 'Error communicating with Claude API: ';
        if (error.message.includes('authentication')) {
            errorMessage += 'Invalid API key. Please check your settings.';
        } else if (error.message.includes('429')) {
            errorMessage += 'Rate limit exceeded. Please try again later.';
        } else if (error.message.includes('400')) {
            errorMessage += 'Bad request. Please try a different message.';
        } else {
            errorMessage += error.message;
        }

        addMessage(errorMessage, 'error');
    }
}

// Close settings panel when clicking outside
document.addEventListener('click', function(event) {
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsBtn = document.querySelector('.settings-btn');

    if (!settingsPanel.contains(event.target) && !settingsBtn.contains(event.target)) {
        settingsPanel.classList.remove('show');
    }
});

// Load settings from localStorage on page load
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
});