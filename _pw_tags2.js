// Баг: при добавлении нового тега старые пропадали при сохранении
const { chromium } = require('playwright');
const DEMO_NOTES = [
    { id: 'n1', title: 'Приложения Такси', body: 'MAXIM', category: 'transport', subcategory: 'taxi', tags: ['жильё', 'симка'], city: 'hanoi', cityName: 'Ханой', updatedAt: 1756500000000 }
];
(async () => {
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROME });
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    await page.route('https://bestvi.bestvietnam-sync-morning.workers.dev/**', route => {
        const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
        if (route.request().url().includes('/auth/me')) return json({ user: { userId: 1, login: 'demo' } });
        if (route.request().url().includes('/data/notes')) return json({ value: DEMO_NOTES });
        if (route.request().url().includes('/data/notesCategories')) return json({ value: { categories: [] } });
        if (route.request().url().includes('/data/settings')) return json({ value: { budgetRub: 600000 } });
        return json({ value: null });
    });
    await page.goto('http://localhost:8000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => localStorage.setItem('bestvn_token', 'demo-token'));
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3500);
    await page.click('.nav-item[data-tab="notes"]');
    await page.waitForTimeout(400);
    await page.evaluate(() => renderNoteEditor('n1'));
    await page.waitForTimeout(300);

    // 1) старые чипсы имеют data-tag
    const initial = await page.evaluate(() =>
        [...document.querySelectorAll('#note-tags-list .note-tag-chip')].map(el => el.dataset.tag)
    );

    // 2) добавляем новый тег — старые не теряются
    await page.click('#note-tag-input');
    await page.type('#note-tag-input', 'еда');
    await page.keyboard.press('Enter');
    const afterAdd = await page.evaluate(() => {
        const tags = Array.from(document.querySelectorAll('#note-tags-list .note-tag-chip')).map(el => el.dataset.tag);
        return { tags, draft: getDraftNote().tags };
    });

    // 3) удаление старого тега крестиком
    await page.evaluate(() => removeNoteTag('жильё'));
    const afterRemove = await page.evaluate(() =>
        [...document.querySelectorAll('#note-tags-list .note-tag-chip')].map(el => el.dataset.tag)
    );
    console.log(JSON.stringify({ initial, afterAdd, afterRemove }));
    console.log('DONE');
    await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });