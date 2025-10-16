const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

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
                system: `You are a helpful assistant in a chat interface with automatic chart visualization.

When providing data comparisons, rankings, statistics, or numerical information, format your response as a markdown table for automatic chart rendering:

**Table Format Guidelines:**
- First column: Labels (names, categories, dates)
- Include a numeric column with clear headers (e.g., "Population", "Revenue", "% of Total")
- Use consistent units in each column
- Keep it simple: 2-4 columns work best
- Include percentages when showing distributions
- Row count: 3-10 rows ideal for visualization

**Example:**
| Country | Population | % of World |
|---------|------------|------------|
| India | 1.44 billion | 17.8% |
| China | 1.42 billion | 17.5% |
| USA | 340 million | 4.2% |

The system will automatically detect tables and render them as charts (pie charts for percentages, bar charts for comparisons, line charts for time series).`,
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
    console.log(`Claude Chat App running at http://localhost:${PORT}`);
    console.log(`Open your browser and go to http://localhost:${PORT}`);
});