const puppeteer = require('puppeteer');
const express = require('express');
const router = express.Router();

router.post('/base', (req, res, next) => {
    const {username, password} = req.body;
    const auth = {username, password};

    getBaseInfo(auth).then((data) => {
        res.json({
            code: 0,
            data,
        });
    }).catch(err => {
        if (err.message === 'loginError') {
            res.json({
                code: 1,
                message: '用户名或密码不正确',
            });
        } else {
            next(err);
        }
    });
});

router.post('/borrow', (req, res, next) => {
    const {username, password} = req.body;
    const auth = {username, password};

    getBorrowInfo(auth).then((data) => {
        res.json({
            code: 0,
            data,
        });
    }).catch(err => {
        if (err.message === 'loginError') {
            res.json({
                code: 1,
                message: '用户名或密码不正确',
            });
        } else {
            next(err);
        }
    });
});

const pageInit = async (auth) => {
    let browser;

    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
        });
        const page = await browser.newPage();
    
        await page.goto('http://m.5read.com/163', {waitUntil: 'domcontentloaded'}); 
    
        await page.goto('http://mc.m.5read.com/user/login/showLogin.jspx?backurl=%2Fuser%2Fuc%2FshowOpacinfo.jspx', {waitUntil: 'domcontentloaded'});
        await page.type('#username', auth.username);
        await page.type('#password', auth.password);

        await Promise.all([
            page.click('input[type=submit]'),
            page.waitForNavigation({waitUntil: 'domcontentloaded'}),
        ]);

        const url = await page.url();
		if (url.includes('irdUser')) {
            throw new Error('loginError');
        }
    
        return browser;
    } catch (err) {
        browser.close();
        throw err;
    }
};

const getBaseInfo = async (auth) => {
    let browser;

    try {
        browser = await pageInit(auth);
        const pages = await browser.pages();
        const page = pages.pop();

        await page.goto('http://mc.m.5read.com/irdUser/edit/showEditUser.jspx', {waitUntil: 'domcontentloaded'});
        const user = await page.evaluate(() => {
            const trim = (str = '') => str.trim();
            const value = (el) => trim((document.querySelector(el) || {}).value);
            const name = value('#displayname');
            const department = value('#department');

            return {name, department};
        });

        browser.close();
        return user;
    } catch (err) {
        browser && bworser.close && browser.close();
        throw err;
    }
};

const getBorrowInfo = async (auth) => {
    let browser;

    try {
        browser = await pageInit(auth);
        const pages = await browser.pages();
        const page = pages.pop();

        await Promise.all([
            page.click('.set > li > a'),
            page.waitForNavigation({waitUntil: 'domcontentloaded'}),
        ]);

        const books = await page.evaluate(el => {
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

        browser.close();
        return books;
    } catch (err) {
        browser && bworser.close && browser.close();
        throw err;
    }
};

module.exports = router;
