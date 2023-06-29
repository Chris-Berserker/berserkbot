const puppeteer = require('puppeteer');

async function run() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.goto('http://127.0.0.1:5500/index.html');
    
    // Replace '#playerType' with the actual selector for your dropdown menu
    // and 'Agent' with the actual value for selecting an agent player
    await page.select('#player1input', 'AI Agent');

    // Replace '#playButton' with the actual selector for your play button
    await page.click('#playButton');

    // ... insert code here to play the game ...

    await browser.close();
}

run();
