const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

app.post('/api/breakdown', async (req, res) => {
    try {
        const { message, apiKey, intent } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const breakdownPrompt = `You are a query analysis expert. Analyze this user question and break it down into specific sections that would create a comprehensive ${intent.type}.

User Question: "${message}"

Guidelines:
- For INFOGRAPHIC (simple): Return only 1 section (the original or slightly refined)
- For DASHBOARD (comparison/overview): Return 2-4 related sections that compare different aspects
- For REPORT (comprehensive): Return 4-6 sections covering: rankings/leaders, distributions, trends over time, and geographic/categorical breakdowns

For each section, provide:
1. A declarative TITLE (not a question) - like "Market Leaders", "Growth Trends", "Geographic Distribution"
2. A data-focused QUERY that requests actual numbers/data in table format

CRITICAL: Each query MUST request DATA that can be shown in a table. Use phrases like:
- "What are the top 10..."
- "Show the breakdown of..."
- "Compare X vs Y with numbers for..."
- "What is the distribution of..."
- "How has X changed over time (show years and values)..."

Return ONLY a JSON array of objects with this structure:
[
  {"title": "Market Leaders", "query": "What are the top 10 countries by renewable energy capacity in 2024?"},
  {"title": "Energy Source Distribution", "query": "Show the breakdown of renewable energy sources (solar, wind, hydro) by percentage"},
  {"title": "Growth Over Time", "query": "How has global renewable energy capacity changed from 2015 to 2025?"}
]

Each section should be clear, specific, and designed to produce a data visualization.`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 1000,
                messages: [{
                    role: 'user',
                    content: breakdownPrompt
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: data.error?.message || `HTTP ${response.status}: ${response.statusText}`
            });
        }

        res.json(data);

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, apiKey, model } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model || 'claude-sonnet-4-5-20250929',
                max_tokens: 4000,
                system: `You are a helpful assistant in Vizini, an AI-powered data visualization chat by Kini. Your responses automatically render as interactive charts using Apache ECharts.

IMPORTANT: Always provide data in markdown tables when answering questions that involve numbers, comparisons, rankings, or statistics. The system intelligently detects whether the user wants a simple infographic, a dashboard with multiple visualizations, or a comprehensive report.

When providing data comparisons, rankings, statistics, or numerical information, format your response as a markdown table for automatic chart rendering:

**Choose the right format based on the question:**

**Pie Chart** - Use for percentage breakdowns (single numeric column with %):
| Category | % of Total |
|----------|------------|
| Type A | 45% |
| Type B | 30% |
| Type C | 25% |

**Bar Chart** - Use for rankings/comparisons (single numeric column):
| Country | Population |
|---------|------------|
| India | 1.44 billion |
| China | 1.42 billion |
| USA | 340 million |

**Line Chart** - Use for trends over time (years/dates in first column):
| Year | China | India | USA |
|------|-------|-------|-----|
| 1990 | 1.14 | 0.87 | 0.25 |
| 2000 | 1.26 | 1.06 | 0.28 |
| 2020 | 1.41 | 1.38 | 0.33 |

**Scatter Plot** - Use for correlations/relationships between TWO variables (2 numeric columns):
| Country | Population (millions) | GDP (trillions) |
|---------|-----------------------|-----------------|
| USA | 340 | 27.4 |
| China | 1425 | 17.9 |
| India | 1440 | 3.7 |
| Germany | 84 | 4.5 |

**Map/Choropleth** - Use for geographical data (countries/regions with values):
| Country | Value |
|---------|-------|
| USA | 340 |
| China | 1425 |
| India | 1440 |
| Brazil | 217 |
| Japan | 125 |

**Bubble Chart** - Use for relationships between THREE variables (3 numeric columns: X, Y, Size):
| Country | GDP (trillions) | Population (millions) | Area (km²) |
|---------|-----------------|----------------------|------------|
| USA | 27.4 | 340 | 9834 |
| China | 17.9 | 1425 | 9597 |
| India | 3.7 | 1440 | 3287 |

**Histogram** - Use for data distribution (bins/ranges with frequencies):
| Range | Frequency |
|-------|-----------|
| 0-10 | 5 |
| 10-20 | 12 |
| 20-30 | 8 |
| 30-40 | 3 |

**Heatmap** - Use for matrix data (showing intensity across two dimensions):
| | Monday | Tuesday | Wednesday | Thursday | Friday |
|---|--------|---------|-----------|----------|--------|
| 9am | 23 | 45 | 67 | 34 | 56 |
| 12pm | 89 | 78 | 90 | 85 | 92 |
| 3pm | 56 | 67 | 45 | 78 | 69 |
| 6pm | 34 | 23 | 34 | 45 | 38 |

**Stacked Bar Chart** - Use for composition across categories (multiple series stacked):
| Country | Desktop | Mobile | Tablet |
|---------|---------|--------|--------|
| USA | 45 | 35 | 20 |
| UK | 50 | 30 | 20 |
| Japan | 40 | 45 | 15 |
| Germany | 55 | 28 | 17 |

Guidelines:
- First column: Labels (names, categories, dates, or countries/regions)
- Use clear, descriptive headers
- Keep consistent units within columns
- 3-10 rows ideal for readability`,
                messages: [
                    {
                        role: 'user',
                        content: message
                    }
                ]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: data.error?.message || `HTTP ${response.status}: ${response.statusText}`
            });
        }

        res.json(data);

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🎨 Vizini - AI Data Visualization by Kini`);
    console.log(`📊 Server running at http://localhost:${PORT}`);
    console.log(`🚀 Open your browser and start visualizing data!`);
});