
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const Systray = require('systray').default;
const { exec } = require('child_process'); 
const app = express();
const port = 3333;
const serverUrl = `http://localhost:${port}`;

let icon;
try {
    icon = fs.readFileSync(path.join(__dirname, 'icon.ico'), { encoding: 'base64' });
} catch (e) {
    console.error("icon.ico not found! Please add an icon file to the root directory.");
}


const systrayConfig = {
    menu: {
        icon: icon || "",
        title: "LlamaTamer 🦙 Server",
        tooltip: "LlamaTamer is not yet running",
        items: [{
            title: "Open LlamaTamer",
            tooltip: "Launches the chat interface in your browser",
            checked: false,
            enabled: true
        }, {
            title: "Exit",
            tooltip: "Stops the server and closes the application",
            checked: false,
            enabled: true
        }]
    },
    debug: false,
    copyDir: true,
};

// --- Express Server Setup ---

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/api/search', async (req, res) => {
    const { query, apiKey } = req.body;
    if (!query) {
        return res.status(400).json({ error: 'Query is required.' });
    }
    if (!apiKey) {
        return res.status(400).json({ error: 'Brave Search API key is required.' });
    }

    try {
        const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`;
        const braveResponse = await axios.get(searchUrl, {
            headers: { 'X-Subscription-Token': apiKey, 'Accept': 'application/json' }
        });
        const allResults = braveResponse.data.web.results || [];
        const scrapedResults = [];
        const remainingResults = [];

        for (let i = 0; i < allResults.length; i++) {
            const result = allResults[i];
            if (i < 3) {
                try {
                    const scrapeResponse = await axios.get(result.url, { timeout: 4000, headers: { 'User-Agent': 'Mozilla/5.0' } });
                    const html = scrapeResponse.data;
                    const $ = cheerio.load(html);
                    $('script, style, nav, footer, header').remove();
                    const mainContent = $('body').text();
                    const cleanedContent = mainContent.replace(/\s\s+/g, ' ').trim();
                    scrapedResults.push({ url: result.url, title: result.title, content: cleanedContent });
                } catch (scrapeError) {
                    console.error(`Failed to scrape ${result.url}:`, scrapeError.message);
                    scrapedResults.push({ url: result.url, title: result.title, content: 'Content scraping failed.' });
                }
            } else {
                remainingResults.push({ url: result.url, title: result.title, description: result.description });
            }
        }
        res.json({ scrapedResults, remainingResults });
    } catch (error) {
        console.error('Error during search and scraping:', error.message);
        if (error.response) {
            return res.status(error.response.status).json({ error: error.response.data.message || 'Failed to call Brave Search API.' });
        }
        res.status(500).json({ error: 'Failed to process request.' });
    }
});


app.listen(port, () => {
    console.log(`Server listening on ${serverUrl}`);
    console.log('System tray icon created. Right-click it for options.');
    console.log('Press Ctrl+C in this terminal to stop the server.');

    // --- System Tray Icon Logic ---
    const systray = new Systray(systrayConfig);

    systray.on('ready', () => {
        systray.sendAction({
            type: 'update-tooltip',
            tooltip: `LlamaTamer running on port ${port}`,
        });
    });

    systray.onClick(action => {
        if (action.item.title === 'Open LlamaTamer') {
            console.log(`Opening ${serverUrl} in browser...`);

            const command = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
            exec(`${command} ${serverUrl}`);
        } else if (action.item.title === 'Exit') {
            console.log('Exit clicked. Shutting down...');
            systray.kill();
        }
    });

    systray.on('exit', () => {
        console.log('Server and tray icon are shutting down.');
        process.exit(0);
    });
});
