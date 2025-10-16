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
        console.log('First 300 chars:', content.substring(0, 300));
        console.log('Has pipe (|)?', content.includes('|'));
        console.log('Has dashes (---)?', content.includes('---'));

        const chartData = detectChartData(content);
        console.log('Final chart data result:', chartData);

        if (chartData) {
            console.log('✅ RENDERING CHART with data:', chartData);
            renderChart(messageDiv, chartData, content);
        } else {
            console.log('❌ No chart detected - displaying as formatted text');
            messageDiv.innerHTML = formatText(content);
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
        line.split('|').map(cell => cell.trim()).filter(cell => {
            // Filter out empty cells and separator cells (lines with only dashes, colons, spaces)
            return cell && !cell.match(/^[-:\s]+$/);
        })
    );

    if (headers.length >= 2 && dataRows.length >= 1) {
        // Find label column (first column, typically Year/Country/Category)
        let labelColumnIndex = 0;

        // Check if first column contains years/dates (time series indicator)
        const firstColumnValues = dataRows.map(row => row[0]);
        const firstColumnHeader = headers[0].toLowerCase();

        // Check header for time-related keywords
        const hasTimeHeader = firstColumnHeader.match(/year|date|time|month|quarter|period|day/i);

        // Check values for date/year patterns
        const hasTimeValues = firstColumnValues.every(val =>
            val.match(/^\d{4}$/) || // Year: 2020, 2021
            val.match(/^\d{4}-\d{2}/) || // Year-Month: 2020-01
            val.match(/^\d{4}\/\d{2}/) || // Year/Month: 2020/01
            val.match(/^(Q[1-4]|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i) // Quarter or Month
        );

        // Time series if header suggests time OR values look like dates
        const isTimeSeries = hasTimeHeader || hasTimeValues;

        // Analyze all numeric columns
        const numericColumns = [];
        for (let colIdx = 1; colIdx < headers.length; colIdx++) {
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

        // Extract labels (X-axis)
        const labels = dataRows.map(row => row[labelColumnIndex]);

        // Check for bubble chart (exactly 3 numeric columns, not time series)
        if (numericColumns.length === 3 && !isTimeSeries) {
            console.log('✅ Detected bubble chart data (3 numeric columns)');
            console.log('📊 Labels:', labels);
            console.log('📊 X-axis:', numericColumns[0].header);
            console.log('📊 Y-axis:', numericColumns[1].header);
            console.log('📊 Size:', numericColumns[2].header);

            // Create bubble chart data points
            const bubbleData = labels.map((label, idx) => ({
                x: numericColumns[0].values[idx],
                y: numericColumns[1].values[idx],
                r: Math.sqrt(numericColumns[2].values[idx]) / 2, // Scale radius
                label: label,
                size: numericColumns[2].values[idx]
            }));

            return {
                type: 'bubble',
                labels: labels,
                bubbleData: bubbleData,
                xAxisLabel: numericColumns[0].header,
                yAxisLabel: numericColumns[1].header,
                sizeLabel: numericColumns[2].header,
                title: `${numericColumns[1].header} vs ${numericColumns[0].header}`,
                multiSeries: false
            };
        }

        // Check for scatter plot (exactly 2 numeric columns, not time series)
        if (numericColumns.length === 2 && !isTimeSeries) {
            console.log('✅ Detected scatter plot data (2 numeric columns)');
            console.log('📊 Labels:', labels);
            console.log('📊 X-axis:', numericColumns[0].header);
            console.log('📊 Y-axis:', numericColumns[1].header);

            // Create scatter plot data points
            const scatterData = labels.map((label, idx) => ({
                x: numericColumns[0].values[idx],
                y: numericColumns[1].values[idx],
                label: label
            }));

            return {
                type: 'scatter',
                labels: labels,
                scatterData: scatterData,
                xAxisLabel: numericColumns[0].header,
                yAxisLabel: numericColumns[1].header,
                title: `${numericColumns[1].header} vs ${numericColumns[0].header}`,
                multiSeries: false
            };
        }

        // Check if this is multi-series data (time series with multiple columns)
        if (numericColumns.length > 1 && isTimeSeries) {
            console.log('✅ Detected multi-series time series data');
            console.log('📊 Labels (X-axis):', labels);
            console.log('📊 Series:', numericColumns.map(col => col.header));

            // Detect unit from first data cell
            let unit = '';
            const firstCell = dataRows[0][1] || '';
            if (firstCell.match(/billion/i)) unit = '(billions)';
            else if (firstCell.match(/million/i)) unit = '(millions)';
            else if (firstCell.match(/thousand/i)) unit = '(thousands)';
            else if (firstCell.match(/trillion/i)) unit = '(trillions)';
            else if (firstCell.match(/%/)) unit = '(%)';

            return {
                type: 'line',
                labels: labels,
                datasets: numericColumns.map(col => ({
                    label: col.header,
                    data: col.values
                })),
                title: `${headers.slice(1).join(', ')} over ${headers[0]}`,
                xAxisLabel: headers[0],
                yAxisLabel: unit,
                multiSeries: true
            };
        }

        // Check for stacked bar chart or heatmap (multiple numeric columns >= 3, not time series)
        if (numericColumns.length >= 3 && !isTimeSeries) {
            // Check if all columns have similar value ranges (suggesting a matrix/heatmap)
            const allValues = numericColumns.flatMap(col => col.values);
            const maxValue = Math.max(...allValues);
            const minValue = Math.min(...allValues);
            const range = maxValue - minValue;

            // Calculate variance in column totals to determine if stacked bar or heatmap
            const columnTotals = numericColumns.map(col => col.values.reduce((a, b) => a + b, 0));
            const avgTotal = columnTotals.reduce((a, b) => a + b, 0) / columnTotals.length;
            const variance = columnTotals.reduce((sum, total) => sum + Math.pow(total - avgTotal, 2), 0) / columnTotals.length;
            const coefficientOfVariation = Math.sqrt(variance) / avgTotal;

            // If low variance in column totals and similar ranges → stacked bar
            // If high variance or very different ranges → heatmap
            if (coefficientOfVariation < 0.3 && range > 0) {
                console.log('✅ Detected stacked bar chart data (composition across categories)');
                return {
                    type: 'stacked-bar',
                    labels: labels,
                    datasets: numericColumns.map(col => ({
                        label: col.header,
                        data: col.values
                    })),
                    title: `${headers.slice(1).join(' + ')} by ${headers[labelColumnIndex]}`,
                    categoryLabel: headers[labelColumnIndex],
                    multiSeries: true
                };
            } else if (range > 0 && numericColumns.every(col => {
                const colMax = Math.max(...col.values);
                const colMin = Math.min(...col.values);
                return (colMax - minValue) / range < 2 && (colMin - minValue) / range > -1;
            })) {
                console.log('✅ Detected heatmap data (matrix structure)');
                return {
                    type: 'heatmap',
                    labels: labels,
                    columns: numericColumns.map(col => col.header),
                    values: numericColumns.map(col => col.values),
                    title: `Heatmap: ${headers[labelColumnIndex]} vs ${headers.slice(1).join('/')}`,
                    rowLabel: headers[labelColumnIndex],
                    multiSeries: false
                };
            }
        }

        // Single series data
        // Prefer percentage columns for pie charts, otherwise use first valid column
        let selectedColumn = numericColumns.find(col => col.type === 'percentage') || numericColumns[0];

        // Check if labels look like ranges (histogram bins)
        const isHistogram = labels.every(label =>
            label.match(/^\d+[-–]\d+$/) || // "0-10", "10-20"
            label.match(/^\d+\s*-\s*\d+$/) || // "0 - 10"
            label.match(/^[\d.]+\s*-\s*[\d.]+$/) // "0.5 - 1.0"
        );

        if (isHistogram && numericColumns.length === 1) {
            console.log('✅ Detected histogram data (range bins)');
            return {
                type: 'histogram',
                labels: labels,
                values: selectedColumn.values,
                title: `Distribution: ${selectedColumn.header}`,
                valueLabel: selectedColumn.header,
                multiSeries: false
            };
        }

        // Check if labels are geographical (countries/states/regions)
        const isGeographical = detectGeographicalData(labels);

        if (isGeographical && numericColumns.length === 1) {
            console.log('✅ Detected geographical data - will render as map');
            return {
                type: 'map',
                labels: labels,
                values: selectedColumn.values,
                title: `${selectedColumn.header} by ${headers[labelColumnIndex]}`,
                valueLabel: selectedColumn.header,
                multiSeries: false
            };
        }

        // Determine chart type
        const isPercentage = selectedColumn.type === 'percentage';
        const maxValue = Math.max(...selectedColumn.values);
        let chartType = 'bar';

        if (isPercentage && selectedColumn.values.length <= 8) {
            chartType = 'pie';
        } else if (maxValue > 1000 || selectedColumn.type === 'large_number') {
            chartType = 'bar';
        } else if (isTimeSeries) {
            chartType = 'line';
        }

        console.log('✅ Parsed table - labels:', labels, 'values:', selectedColumn.values);
        console.log('📊 Using column:', selectedColumn.header, 'type:', chartType);

        // Create intelligent title
        const labelHeader = headers[labelColumnIndex];
        const valueHeader = selectedColumn.header;
        const title = isTimeSeries ? `${valueHeader} over ${labelHeader}` : `${valueHeader} by ${labelHeader}`;

        return {
            type: chartType,
            labels: labels,
            values: selectedColumn.values,
            title: title,
            multiSeries: false
        };
    }

    return null;
}

function getCountryCoordinates(countryName) {
    const coordinates = {
        'usa': [37.0902, -95.7129],
        'united states': [37.0902, -95.7129],
        'america': [37.0902, -95.7129],
        'china': [35.8617, 104.1954],
        'india': [20.5937, 78.9629],
        'brazil': [-14.2350, -51.9253],
        'russia': [61.5240, 105.3188],
        'japan': [36.2048, 138.2529],
        'germany': [51.1657, 10.4515],
        'uk': [55.3781, -3.4360],
        'united kingdom': [55.3781, -3.4360],
        'france': [46.2276, 2.2137],
        'italy': [41.8719, 12.5674],
        'canada': [56.1304, -106.3468],
        'australia': [-25.2744, 133.7751],
        'spain': [40.4637, -3.7492],
        'mexico': [23.6345, -102.5528],
        'indonesia': [-0.7893, 113.9213],
        'netherlands': [52.1326, 5.2913],
        'saudi arabia': [23.8859, 45.0792],
        'turkey': [38.9637, 35.2433],
        'switzerland': [46.8182, 8.2275],
        'poland': [51.9194, 19.1451],
        'belgium': [50.5039, 4.4699],
        'sweden': [60.1282, 18.6435],
        'argentina': [-38.4161, -63.6167],
        'norway': [60.4720, 8.4689],
        'austria': [47.5162, 14.5501],
        'uae': [23.4241, 53.8478],
        'israel': [31.0461, 34.8516],
        'ireland': [53.4129, -8.2439],
        'denmark': [56.2639, 9.5018],
        'singapore': [1.3521, 103.8198],
        'malaysia': [4.2105, 101.9758],
        'south africa': [-30.5595, 22.9375],
        'egypt': [26.8206, 30.8025],
        'pakistan': [30.3753, 69.3451],
        'vietnam': [14.0583, 108.2772],
        'philippines': [12.8797, 121.7740],
        'bangladesh': [23.6850, 90.3563],
        'nigeria': [9.0820, 8.6753],
        'thailand': [15.8700, 100.9925],
        'colombia': [4.5709, -74.2973],
        'chile': [-35.6751, -71.5430],
        'finland': [61.9241, 25.7482],
        'portugal': [39.3999, -8.2245],
        'czech republic': [49.8175, 15.4730],
        'romania': [45.9432, 24.9668],
        'new zealand': [-40.9006, 174.8860],
        'peru': [-9.1900, -75.0152],
        'greece': [39.0742, 21.8243],
        'iraq': [33.2232, 43.6793],
        'algeria': [28.0339, 1.6596],
        'qatar': [25.3548, 51.1839],
        'kazakhstan': [48.0196, 66.9237],
        'hungary': [47.1625, 19.5033],
        'kuwait': [29.3117, 47.4818],
        'morocco': [31.7917, -7.0926],
        'ethiopia': [9.1450, 40.4897],
        'south korea': [35.9078, 127.7669],
        'kenya': [-0.0236, 37.9062],
        'ukraine': [48.3794, 31.1656],
        'angola': [-11.2027, 17.8739],
        'ghana': [7.9465, -1.0232],
        'uzbekistan': [41.3775, 64.5853],
        'luxembourg': [49.8153, 6.1296]
    };

    const normalized = countryName.toLowerCase()
        .replace(/🇺🇸|🇨🇳|🇮🇳|🇧🇷|🇷🇺|🇯🇵|🇩🇪|🇬🇧|🇫🇷|🇮🇹|🇨🇦|🇦🇺|🇪🇸|🇲🇽|🇮🇩|🇳🇱|🇸🇦|🇹🇷|🇨🇭|🇵🇱/g, '')
        .trim();

    return coordinates[normalized] || null;
}

function detectGeographicalData(labels) {
    // List of common country names
    const countries = new Set([
        'usa', 'united states', 'america', 'china', 'india', 'brazil', 'russia', 'japan',
        'germany', 'uk', 'united kingdom', 'france', 'italy', 'canada', 'australia',
        'spain', 'mexico', 'indonesia', 'netherlands', 'saudi arabia', 'turkey', 'switzerland',
        'poland', 'belgium', 'sweden', 'argentina', 'norway', 'austria', 'uae', 'israel',
        'ireland', 'denmark', 'singapore', 'malaysia', 'south africa', 'egypt', 'pakistan',
        'vietnam', 'philippines', 'bangladesh', 'nigeria', 'thailand', 'colombia', 'chile',
        'finland', 'portugal', 'czech republic', 'romania', 'new zealand', 'peru', 'greece',
        'iraq', 'algeria', 'qatar', 'kazakhstan', 'hungary', 'kuwait', 'morocco', 'ethiopia',
        'south korea', 'kenya', 'ukraine', 'angola', 'ghana', 'uzbekistan', 'luxembourg'
    ]);

    // Check if at least 50% of labels are recognizable countries
    const matchCount = labels.filter(label => {
        const normalized = label.toLowerCase()
            .replace(/🇺🇸|🇨🇳|🇮🇳|🇧🇷|🇷🇺|🇯🇵|🇩🇪|🇬🇧|🇫🇷|🇮🇹|🇨🇦|🇦🇺|🇪🇸|🇲🇽|🇮🇩|🇳🇱|🇸🇦|🇹🇷|🇨🇭|🇵🇱/g, '')
            .trim();
        return countries.has(normalized);
    }).length;

    return matchCount >= Math.min(3, labels.length * 0.5);
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
    console.log('📊 Chart data:', chartData);

    try {
        // Clear container and add special class
        container.innerHTML = '';
        container.classList.add('has-chart');

        // Handle map visualization
        if (chartData.type === 'map') {
            renderMap(container, chartData, originalText);
            return;
        }

        // Handle heatmap visualization with ECharts
        if (chartData.type === 'heatmap') {
            renderHeatmapECharts(container, chartData, originalText);
            return;
        }

        // Create chart container
        const chartContainer = document.createElement('div');
        chartContainer.classList.add('chart-container');

        // Extract non-table text (remove the markdown table)
        const textWithoutTable = extractNonTableText(originalText);

        if (textWithoutTable.trim()) {
            const textDiv = document.createElement('div');
            textDiv.classList.add('chart-text');
            textDiv.innerHTML = formatText(textWithoutTable);
            chartContainer.appendChild(textDiv);
        }

        // Create chart div wrapper for proper sizing
        const chartWrapper = document.createElement('div');
        chartWrapper.classList.add('chart-canvas-wrapper');

        const chartDiv = document.createElement('div');
        chartDiv.id = 'chart-' + Date.now();
        chartDiv.style.width = '100%';
        chartDiv.style.height = '450px';
        chartWrapper.appendChild(chartDiv);
        chartContainer.appendChild(chartWrapper);

        container.appendChild(chartContainer);

        // Validate ECharts
        if (typeof echarts === 'undefined') {
            console.error('❌ ECharts not loaded!');
            return;
        }

        // Initialize chart after DOM is ready
        setTimeout(() => {
            try {
                const myChart = echarts.init(chartDiv);
                let option;

                // Generate colors
                const colors = getEChartsColors();

                // Build option based on chart type
                if (chartData.type === 'pie') {
                    option = buildPieChartOption(chartData, colors);
                } else if (chartData.type === 'bar' || chartData.type === 'histogram') {
                    option = buildBarChartOption(chartData, colors);
                } else if (chartData.type === 'line') {
                    option = buildLineChartOption(chartData, colors);
                } else if (chartData.type === 'scatter') {
                    option = buildScatterChartOption(chartData, colors);
                } else if (chartData.type === 'bubble') {
                    option = buildBubbleChartOption(chartData, colors);
                } else if (chartData.type === 'stacked-bar') {
                    option = buildStackedBarChartOption(chartData, colors);
                }

                if (option) {
                    myChart.setOption(option);
                    console.log('✅ ECharts chart created successfully!');

                    // Handle window resize
                    window.addEventListener('resize', () => {
                        myChart.resize();
                    });
                }
            } catch (chartError) {
                console.error('❌ Chart creation failed:', chartError);
            }
        }, 100);

    } catch (error) {
        console.error('❌ Render chart error:', error);
    }

    console.log('📊 === RENDER CHART END ===');
}

function getEChartsColors() {
    return [
        '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
        '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#4992ff'
    ];
}

function buildPieChartOption(chartData, colors) {
    return {
        title: {
            text: chartData.title,
            left: 'center',
            top: 10,
            textStyle: { fontSize: 16, fontWeight: 'bold' }
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
        },
        legend: {
            orient: 'horizontal',
            bottom: 10,
            left: 'center'
        },
        series: [{
            type: 'pie',
            radius: '65%',
            center: ['50%', '50%'],
            data: chartData.labels.map((label, idx) => ({
                name: label,
                value: chartData.values[idx]
            })),
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            },
            label: {
                formatter: '{b}: {d}%'
            }
        }],
        color: colors
    };
}

function buildBarChartOption(chartData, colors) {
    return {
        title: {
            text: chartData.title,
            left: 'center',
            top: 10,
            textStyle: { fontSize: 16, fontWeight: 'bold' }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: chartData.labels,
            axisLabel: { interval: 0, rotate: chartData.labels.length > 8 ? 45 : 0 }
        },
        yAxis: {
            type: 'value',
            name: chartData.valueLabel || '',
            nameLocation: 'middle',
            nameGap: 50
        },
        series: [{
            data: chartData.values,
            type: 'bar',
            itemStyle: { color: colors[0] },
            emphasis: { itemStyle: { color: colors[1] } }
        }]
    };
}

function buildLineChartOption(chartData, colors) {
    if (chartData.multiSeries && chartData.datasets) {
        // Multi-series line chart
        return {
            title: {
                text: chartData.title,
                left: 'center',
                top: 10,
                textStyle: { fontSize: 16, fontWeight: 'bold' }
            },
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                data: chartData.datasets.map(d => d.label),
                top: 40
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '20%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: chartData.labels,
                name: chartData.xAxisLabel || '',
                nameLocation: 'middle',
                nameGap: 30
            },
            yAxis: {
                type: 'value',
                name: chartData.yAxisLabel || '',
                nameLocation: 'middle',
                nameGap: 50
            },
            series: chartData.datasets.map((dataset, idx) => ({
                name: dataset.label,
                type: 'line',
                data: dataset.data,
                smooth: true,
                emphasis: { focus: 'series' },
                lineStyle: { width: 3 },
                itemStyle: { color: colors[idx % colors.length] }
            })),
            color: colors
        };
    } else {
        // Single series line chart
        return {
            title: {
                text: chartData.title,
                left: 'center',
                top: 10,
                textStyle: { fontSize: 16, fontWeight: 'bold' }
            },
            tooltip: {
                trigger: 'axis'
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: chartData.labels
            },
            yAxis: {
                type: 'value'
            },
            series: [{
                data: chartData.values,
                type: 'line',
                smooth: true,
                lineStyle: { width: 3 },
                itemStyle: { color: colors[0] }
            }]
        };
    }
}

function buildScatterChartOption(chartData, colors) {
    return {
        title: {
            text: chartData.title,
            left: 'center',
            top: 10,
            textStyle: { fontSize: 16, fontWeight: 'bold' }
        },
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                const point = chartData.scatterData[params.dataIndex];
                return `${point.label}<br/>${chartData.xAxisLabel}: ${point.x}<br/>${chartData.yAxisLabel}: ${point.y}`;
            }
        },
        grid: {
            left: '3%',
            right: '7%',
            bottom: '3%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: chartData.xAxisLabel || '',
            nameLocation: 'middle',
            nameGap: 30
        },
        yAxis: {
            type: 'value',
            name: chartData.yAxisLabel || '',
            nameLocation: 'middle',
            nameGap: 50
        },
        series: [{
            type: 'scatter',
            data: chartData.scatterData.map(point => [point.x, point.y]),
            symbolSize: 10,
            itemStyle: { color: colors[0] },
            emphasis: {
                itemStyle: {
                    color: colors[1],
                    borderColor: '#333',
                    borderWidth: 2
                }
            }
        }]
    };
}

function buildBubbleChartOption(chartData, colors) {
    return {
        title: {
            text: chartData.title,
            left: 'center',
            top: 10,
            textStyle: { fontSize: 16, fontWeight: 'bold' }
        },
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                const point = chartData.bubbleData[params.dataIndex];
                return `${point.label}<br/>${chartData.xAxisLabel}: ${point.x}<br/>${chartData.yAxisLabel}: ${point.y}<br/>${chartData.sizeLabel}: ${point.size}`;
            }
        },
        grid: {
            left: '3%',
            right: '7%',
            bottom: '3%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: chartData.xAxisLabel || '',
            nameLocation: 'middle',
            nameGap: 30
        },
        yAxis: {
            type: 'value',
            name: chartData.yAxisLabel || '',
            nameLocation: 'middle',
            nameGap: 50
        },
        series: [{
            type: 'scatter',
            data: chartData.bubbleData.map(point => [point.x, point.y, point.size]),
            symbolSize: function(data) {
                return Math.sqrt(data[2]) * 2;
            },
            itemStyle: {
                color: colors[0],
                opacity: 0.6
            },
            emphasis: {
                itemStyle: {
                    color: colors[1],
                    borderColor: '#333',
                    borderWidth: 2
                }
            }
        }]
    };
}

function buildStackedBarChartOption(chartData, colors) {
    return {
        title: {
            text: chartData.title,
            left: 'center',
            top: 10,
            textStyle: { fontSize: 16, fontWeight: 'bold' }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        legend: {
            data: chartData.datasets.map(d => d.label),
            top: 40
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: '20%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: chartData.labels,
            name: chartData.categoryLabel || '',
            axisLabel: { interval: 0, rotate: chartData.labels.length > 8 ? 45 : 0 }
        },
        yAxis: {
            type: 'value'
        },
        series: chartData.datasets.map((dataset, idx) => ({
            name: dataset.label,
            type: 'bar',
            stack: 'total',
            data: dataset.data,
            emphasis: { focus: 'series' },
            itemStyle: { color: colors[idx % colors.length] }
        })),
        color: colors
    };
}

function renderHeatmapECharts(container, chartData, originalText) {
    console.log('🔥 === RENDER ECHARTS HEATMAP START ===');

    try {
        container.innerHTML = '';
        container.classList.add('has-chart');

        const chartContainer = document.createElement('div');
        chartContainer.classList.add('chart-container');

        const textWithoutTable = extractNonTableText(originalText);
        if (textWithoutTable.trim()) {
            const textDiv = document.createElement('div');
            textDiv.classList.add('chart-text');
            textDiv.innerHTML = formatText(textWithoutTable);
            chartContainer.appendChild(textDiv);
        }

        const chartWrapper = document.createElement('div');
        chartWrapper.classList.add('chart-canvas-wrapper');

        const chartDiv = document.createElement('div');
        chartDiv.id = 'chart-' + Date.now();
        chartDiv.style.width = '100%';
        chartDiv.style.height = '450px';
        chartWrapper.appendChild(chartDiv);
        chartContainer.appendChild(chartWrapper);

        container.appendChild(chartContainer);

        setTimeout(() => {
            try {
                const myChart = echarts.init(chartDiv);

                // Prepare heatmap data
                const heatmapData = [];
                chartData.labels.forEach((label, rowIdx) => {
                    chartData.values.forEach((colValues, colIdx) => {
                        heatmapData.push([colIdx, rowIdx, colValues[rowIdx]]);
                    });
                });

                const allValues = chartData.values.flat();
                const maxValue = Math.max(...allValues);
                const minValue = Math.min(...allValues);

                const option = {
                    title: {
                        text: chartData.title,
                        left: 'center',
                        top: 10,
                        textStyle: { fontSize: 16, fontWeight: 'bold' }
                    },
                    tooltip: {
                        position: 'top',
                        formatter: function(params) {
                            return `${chartData.labels[params.data[1]]} - ${chartData.columns[params.data[0]]}: ${params.data[2]}`;
                        }
                    },
                    grid: {
                        left: '15%',
                        right: '4%',
                        bottom: '15%',
                        top: '15%',
                        containLabel: true
                    },
                    xAxis: {
                        type: 'category',
                        data: chartData.columns,
                        splitArea: { show: true },
                        axisLabel: { interval: 0, rotate: 45 }
                    },
                    yAxis: {
                        type: 'category',
                        data: chartData.labels,
                        splitArea: { show: true }
                    },
                    visualMap: {
                        min: minValue,
                        max: maxValue,
                        calculable: true,
                        orient: 'horizontal',
                        left: 'center',
                        bottom: '5%',
                        inRange: {
                            color: ['#e0f3ff', '#4a90e2', '#1e3a8a']
                        }
                    },
                    series: [{
                        type: 'heatmap',
                        data: heatmapData,
                        label: {
                            show: true
                        },
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }]
                };

                myChart.setOption(option);
                console.log('✅ ECharts heatmap created successfully!');

                window.addEventListener('resize', () => {
                    myChart.resize();
                });
            } catch (error) {
                console.error('❌ Heatmap creation failed:', error);
            }
        }, 100);

    } catch (error) {
        console.error('❌ Render heatmap error:', error);
    }
}

function extractNonTableText(text) {
    // Remove markdown table (lines with | and ---)
    const lines = text.split('\n');
    const filteredLines = lines.filter(line => {
        const trimmed = line.trim();
        return !trimmed.includes('|') && !trimmed.match(/^[-\s]+$/);
    });
    return filteredLines.join('\n').trim();
}


function renderMap(container, chartData, originalText) {
    console.log('🗺️ === RENDER MAP START ===');
    console.log('🗺️ Map data:', chartData);

    try {
        // Clear container
        container.innerHTML = '';
        container.classList.add('has-chart');

        // Create map container
        const mapContainer = document.createElement('div');
        mapContainer.classList.add('chart-container');

        // Extract non-table text
        const textWithoutTable = extractNonTableText(originalText);
        if (textWithoutTable.trim()) {
            const textDiv = document.createElement('div');
            textDiv.classList.add('chart-text');
            textDiv.innerHTML = formatText(textWithoutTable);
            mapContainer.appendChild(textDiv);
        }

        // Create map div
        const mapDiv = document.createElement('div');
        mapDiv.classList.add('map-canvas');
        mapDiv.id = 'map-' + Date.now();
        mapDiv.style.height = '500px';
        mapDiv.style.width = '100%';
        mapDiv.style.borderRadius = '8px';
        mapContainer.appendChild(mapDiv);

        container.appendChild(mapContainer);

        // Initialize map after DOM is ready
        setTimeout(() => {
            try {
                // Create Leaflet map
                const map = L.map(mapDiv.id).setView([20, 0], 2);

                // Add tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 18
                }).addTo(map);

                // Determine color scale
                const maxValue = Math.max(...chartData.values);
                const minValue = Math.min(...chartData.values);

                // Add markers for each country
                chartData.labels.forEach((label, idx) => {
                    const coords = getCountryCoordinates(label);
                    const value = chartData.values[idx];

                    if (coords) {
                        // Calculate color based on value (gradient from light to dark blue)
                        const normalized = (value - minValue) / (maxValue - minValue);
                        const hue = 200; // Blue
                        const lightness = 70 - (normalized * 40); // 70% to 30%
                        const color = `hsl(${hue}, 70%, ${lightness}%)`;

                        // Create circle marker
                        const radius = 8 + (normalized * 20); // Size 8-28 based on value

                        const marker = L.circleMarker(coords, {
                            radius: radius,
                            fillColor: color,
                            color: '#fff',
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 0.8
                        }).addTo(map);

                        // Add popup
                        marker.bindPopup(`<strong>${label}</strong><br>${chartData.valueLabel}: ${value}`);
                    } else {
                        console.warn(`⚠️ No coordinates found for: ${label}`);
                    }
                });

                // Add legend
                const legend = L.control({ position: 'bottomright' });
                legend.onAdd = function() {
                    const div = L.DomUtil.create('div', 'map-legend');
                    div.style.background = 'white';
                    div.style.padding = '10px';
                    div.style.borderRadius = '5px';
                    div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';

                    div.innerHTML = `
                        <strong>${chartData.valueLabel}</strong><br>
                        <div style="margin-top: 5px;">
                            <span style="color: hsl(200, 70%, 70%)">●</span> Low (${minValue.toFixed(1)})<br>
                            <span style="color: hsl(200, 70%, 50%)">●</span> Medium<br>
                            <span style="color: hsl(200, 70%, 30%)">●</span> High (${maxValue.toFixed(1)})
                        </div>
                    `;
                    return div;
                };
                legend.addTo(map);

                console.log('✅ Map created successfully!');
            } catch (mapError) {
                console.error('❌ Map creation failed:', mapError);
            }
        }, 100);

    } catch (error) {
        console.error('❌ Render map error:', error);
    }

    console.log('🗺️ === RENDER MAP END ===');
}

function formatText(text) {
    console.log('🖼️ formatText input:', text.substring(0, 500));

    // Convert markdown images to HTML (before other conversions to avoid conflicts)
    const imageMatches = text.match(/!\[([^\]]*)\]\(([^)]+)\)/g);
    console.log('🖼️ Found image patterns:', imageMatches);

    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(match, alt, url) {
        console.log('🖼️ Converting image:', { match, alt, url });
        
        // Clean and process URL
        let cleanUrl = processImageUrl(url.trim());
        
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('data:')) {
            console.warn('⚠️ Image URL does not start with http/https/data:', cleanUrl);
        }
        
        return `<img src="${cleanUrl}" alt="${alt || 'Image'}" class="content-image" 
                     onerror="handleImageError(this, '${cleanUrl}');" 
                     onload="handleImageLoad(this, '${cleanUrl}');" 
                     loading="lazy" 
                     style="opacity: 0.7;" />`;
    });

    console.log('🖼️ formatText output:', text.substring(0, 500));

    // Convert markdown headers to HTML
    text = text.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    text = text.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^# (.+)$/gm, '<h2>$1</h2>');

    // Convert bullet points
    text = text.replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Convert bold and italic
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Convert line breaks to <br> for remaining text
    text = text.replace(/\n\n/g, '<br><br>');

    return text;
}

// Image loading helper functions
function handleImageError(img, url) {
    console.error('❌ Failed to load image:', url);
    img.style.display = 'none';
    
    // Create a placeholder div with error message
    const placeholder = document.createElement('div');
    placeholder.className = 'image-error-placeholder';
    placeholder.innerHTML = `
        <div style="
            background: #f8f9fa; 
            border: 2px dashed #dee2e6; 
            border-radius: 8px; 
            padding: 1rem; 
            text-align: center; 
            color: #6c757d; 
            font-size: 0.9rem;
            margin: 1rem 0;
        ">
            <div>🖼️ Image could not be loaded</div>
            <div style="font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.7;">${url}</div>
        </div>
    `;
    
    img.parentNode.insertBefore(placeholder, img);
}

function handleImageLoad(img, url) {
    console.log('✅ Successfully loaded image:', url);
    img.style.opacity = '1';
}

// Preload images to check if they're accessible
function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject(new Error(`Failed to load: ${url}`));
        img.src = url;
    });
}

// Enhanced image processing for better compatibility
function processImageUrl(url) {
    // Handle common image hosting services
    if (url.includes('wikipedia.org')) {
        // Wikipedia images often need specific handling
        return url;
    }
    
    // Handle relative URLs
    if (url.startsWith('//')) {
        return 'https:' + url;
    }
    
    // Handle protocol-relative URLs
    if (url.startsWith('/')) {
        return window.location.origin + url;
    }
    
    return url;
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

function detectQueryIntent(message) {
    const lowerMsg = message.toLowerCase();

    // Report keywords
    const reportKeywords = ['report', 'analysis', 'detailed', 'comprehensive', 'breakdown', 'deep dive', 'analyze', 'examine'];
    const hasReportKeyword = reportKeywords.some(kw => lowerMsg.includes(kw));

    // Dashboard keywords
    const dashboardKeywords = ['dashboard', 'overview', 'summary', 'compare', ' vs ', 'comparison', 'multiple'];
    const hasDashboardKeyword = dashboardKeywords.some(kw => lowerMsg.includes(kw));

    // Complex query indicators
    const hasMultipleAspects = (lowerMsg.match(/\band\b/g) || []).length >= 2;
    const hasMultipleQuestions = (lowerMsg.match(/\?/g) || []).length >= 2;

    if (hasReportKeyword) {
        return { type: 'report', complexity: 'high' };
    } else if (hasDashboardKeyword || hasMultipleAspects || hasMultipleQuestions) {
        return { type: 'dashboard', complexity: 'medium' };
    } else {
        return { type: 'infographic', complexity: 'low' };
    }
}

async function breakDownQuery(message, intent) {
    // For simple infographics, return single section immediately
    if (intent.type === 'infographic') {
        return [{ title: null, query: message }];
    }

    try {
        console.log('🤖 Asking Claude to break down the query...');

        // Call Claude to intelligently break down the query
        const response = await fetch('/api/breakdown', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                apiKey: apiKey,
                intent: intent
            })
        });

        if (!response.ok) {
            console.error('❌ Breakdown API failed, using original query');
            return [{ title: null, query: message }];
        }

        const data = await response.json();
        const claudeResponse = data.content[0].text;
        console.log('📝 Claude breakdown response:', claudeResponse);

        // Parse JSON array from Claude's response
        // Handle cases where Claude might wrap it in markdown code blocks
        let cleanResponse = claudeResponse.trim();
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/```\n?/g, '');
        }

        const sections = JSON.parse(cleanResponse);

        if (Array.isArray(sections) && sections.length > 0) {
            console.log('✅ Successfully parsed sections:', sections);
            return sections;
        } else {
            console.error('❌ Invalid sections format, using original query');
            return [{ title: null, query: message }];
        }

    } catch (error) {
        console.error('❌ Error breaking down query:', error);
        // Fallback to original message if breakdown fails
        return [{ title: null, query: message }];
    }
}

async function sendToClaude(message) {
    try {
        // Detect intent
        const intent = detectQueryIntent(message);
        console.log('🎯 Query intent:', intent);

        // Break down query if needed (now async - Claude analyzes the query)
        const sections = await breakDownQuery(message, intent);
        console.log('📋 Sections:', sections);

        // Show intent to user with table of contents
        if (intent.type !== 'infographic' && sections.length > 1) {
            // Create report header with table of contents
            const messagesContainer = document.getElementById('messages');

            const reportHeaderDiv = document.createElement('div');
            reportHeaderDiv.classList.add('message', 'report-header');

            let reportTitle = intent.type === 'report' ? '📄 Report' : '📊 Dashboard';
            let tocHTML = `<div class="report-title">${reportTitle}</div>`;
            tocHTML += `<div class="toc-title">Table of Contents</div>`;
            tocHTML += `<ol class="toc-list">`;

            sections.forEach((section, idx) => {
                tocHTML += `<li><a href="#section-${idx}">${section.title}</a></li>`;
            });

            tocHTML += `</ol>`;

            reportHeaderDiv.innerHTML = tocHTML;
            messagesContainer.appendChild(reportHeaderDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // Process each section
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            console.log(`📊 Processing section ${i + 1}/${sections.length}: ${section.title || section.query}`);

            // Add section header separately for multi-query results
            if (sections.length > 1) {
                const messagesContainer = document.getElementById('messages');

                // Add section header with anchor
                const headerDiv = document.createElement('div');
                headerDiv.classList.add('message', 'section-header');
                headerDiv.id = `section-${i}`;
                headerDiv.innerHTML = `<strong>${section.title}</strong>`;
                messagesContainer.appendChild(headerDiv);

                // Add loading indicator
                const loadingDiv = document.createElement('div');
                loadingDiv.classList.add('message', 'loading-indicator');
                loadingDiv.id = `loading-${i}`;
                loadingDiv.innerHTML = `<div class="loading-spinner"></div><span>Loading section ${i + 1} of ${sections.length}...</span>`;
                messagesContainer.appendChild(loadingDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }

            // Force table format for multi-query requests
            let enhancedQuery = section.query;
            if (sections.length > 1) {
                enhancedQuery = `${section.query}\n\nIMPORTANT: You MUST provide your answer as a markdown table with actual data/numbers. Do not just explain - show the data in table format.`;
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: enhancedQuery,
                    apiKey: apiKey,
                    model: selectedModel
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                hideTypingIndicator();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const assistantMessage = data.content[0].text;

            // Remove loading indicator
            if (sections.length > 1) {
                const loadingDiv = document.getElementById(`loading-${i}`);
                if (loadingDiv) {
                    loadingDiv.remove();
                }
            }

            // Check if response has table data
            const hasTableData = assistantMessage.includes('|') && assistantMessage.includes('---');

            if (!hasTableData && sections.length > 1) {
                console.warn(`⚠️ Query ${i + 1} did not return table data. Response: ${assistantMessage.substring(0, 200)}`);
                // Add a note that this query didn't produce visualizable data
                const messagesContainer = document.getElementById('messages');
                const noteDiv = document.createElement('div');
                noteDiv.classList.add('message', 'assistant');
                noteDiv.textContent = `⚠️ Unable to visualize: ${assistantMessage.substring(0, 150)}...`;
                messagesContainer.appendChild(noteDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } else {
                // Add the actual response with chart
                addMessage(assistantMessage, 'assistant');
            }

            // Add small delay between queries to avoid rate limiting
            if (i < sections.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        hideTypingIndicator();

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