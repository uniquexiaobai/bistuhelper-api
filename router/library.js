const puppeteer = require('puppeteer');
const express = require('express');
const router = express.Router();

router.post('/borrow', (req, res, next) => {
    const {username, password} = req.body;
    const auth = {username, password};

    getBorrowInfo(auth).then((data) => {
        res.json(data);
    }).catch(err => {
        next(err);
    });
});

const getBorrowInfo = async (auth) => {
    let user, books;
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
        timeout: 0
    });
    const page = await browser.newPage();

    await page.goto('http://m.5read.com/163', {waitUntil: 'domcontentloaded'}); 

    await page.goto('http://mc.m.5read.com/user/login/showLogin.jspx?backurl=%2Fuser%2Fuc%2FshowOpacinfo.jspx', {waitUntil: 'domcontentloaded'});
    await page.type('#username', auth.username);
    await page.type('#password', auth.password);
    await page.click('input[type=submit]');
    await page.waitForSelector('.set > li > a');

    await page.click('.set > li > a');
    await page.waitForSelector('.boxBd');

    books = await page.evaluate(el => {
        const $$ = (el, $target) => ($target || document).querySelectorAll(el);
        const text = ($el) => $el.textContent.trim();

        const $list = [...$$(el)];
        return $list.map(($item) => {
            const name = $item.querySelector('.sheetHd').textContent.trim();
            const $infos = $$('.sheet > table:nth-child(2) tr > td', $item);
            const barCode = text($infos[0]);
            const fromDate = text($infos[1]);
            const toDate = text($infos[2]);
            const address = text($infos[3]);

            return {name, barCode, fromDate, toDate, address};
        });
    }, '.sheet');

    await page.goto('http://mc.m.5read.com/irdUser/edit/showEditUser.jspx', {waitUntil: 'domcontentloaded'});
    user = await page.evaluate(() => {
        const value = (el) => document.querySelector(el).value.trim();

        const name = value('#displayname');
        const department = value('#department');

        return {name, department};
    });

    await browser.close();
    return {user, books};
};

module.exports = router;
