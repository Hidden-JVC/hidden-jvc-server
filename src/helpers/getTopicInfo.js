const puppeteer = require('puppeteer');
const { parse } = require('date-fns');
const { fr } = require('date-fns/locale');

module.exports = async (forumId, viewId, topicId) => {
    const url = `https://www.jeuxvideo.com/forums/${viewId}-${forumId}-${topicId}-1-0-1-0-0.htm`;

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const pageUrl = await page.url();
    if (pageUrl === 'https://www.jeuxvideo.com/forums.htm') {
        return null;
    }

    const info = await page.evaluate(() => {
        /* eslint-disable-next-line */
        const firstPost = document.querySelectorAll('.bloc-message-forum ')[0];

        /* eslint-disable-next-line */
        const title = document.querySelector('#bloc-title-forum').textContent.trim();
        const content = firstPost.querySelector('.txt-msg.text-enrichi-forum').innerHTML.trim();
        const author = firstPost.querySelector('.bloc-pseudo-msg').textContent.trim();
        const dateStr = firstPost.querySelector('.bloc-date-msg').textContent.trim();

        return { title, author, dateStr, content };
    });

    await browser.close();

    info.date = parse(info.dateStr, 'dd MMMM yyyy à HH:mm:ss', new Date(), { locale: fr });
    delete info.dateStr;

    return info;
};
