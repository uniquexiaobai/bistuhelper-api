const puppeteer = require('puppeteer');
const express = require('express');
const router = express.Router();

router.post('/base', (req, res, next) => {
    const {username, password} = req.body;
    const auth = {
        username,
        password,
    };

    getBaseInfo(auth)
        .then(baseInfo => {
            res.json(baseInfo);
        })
        .catch(err => {
            next(err);
        });
});

router.post('/score', (req, res, next) => {
    const {username, password, year, term} = req.body;
    const auth = {username, password};
    const query = {year, term};

    getScoreInfo(auth, query)
        .then(scoreInfo => {
            res.json(scoreInfo);
        })
        .catch(err => {
            next(err);
        });
});

const pageInit = async (auth) => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
        ignoreHTTPSErrors: true,
        timeout: 0
    });
    const page = await browser.newPage();

    // clear dialog
    page.on('dialog', async (dialog) => {
        await dialog.dismiss();
    });

    await page.goto('http://jxgl.bistu.edu.cn/index.html', {waitUntil: 'domcontentloaded'});
    await page.type('#username', auth.username);
    await page.type('#password', auth.password);
    await page.click('button[type=submit]');
    await page.waitForSelector('a[djsl="233645"]');

    const href = await page.evaluate(el => {
        return document.querySelector(el).href;
    }, 'a[djsl="233645"]');
    await page.goto(href, {waitUntil: 'domcontentloaded'});

    return browser;
};

const getBaseInfo = async (auth) => {
    const browser = await pageInit(auth);
    const pages = await browser.pages();
    const page = pages.pop();

    const url = await page.evaluate(el => {
        return document.querySelector(el).href;
    }, '.nav > li:nth-child(5) > .sub li:nth-child(1) > a')
    await page.goto(url, {waitUntil: 'domcontentloaded'});

    const baseInfo = await page.evaluate(() => {
        const text = (el) => {
            return document.querySelector(el).textContent.trim();
        };

        return {
            studentID: text('#xh'),       // 学号
            name: text('#xm'),            // 姓名
            college: text('#lbl_xy'),     // 学院
            major: text('#lbl_zymc'),     // 专业
            class: text('#lbl_dqszj')     // 年级
        };
    });

    await browser.close();
    return baseInfo;
};

const getScoreInfo = async (auth, query) => {
    const browser = await pageInit(auth);
    const pages = await browser.pages();
    const page = pages.pop();

    const url = await page.evaluate(el => {
        return document.querySelector(el).href;
    }, '.nav > li:nth-child(6) > .sub li:nth-child(10) > a')
    await page.goto(url, {waitUntil: 'domcontentloaded'});

    await page.evaluate((year, team) => {
        const $ = (el) => document.querySelector(el);
        
        $('#ddlXN').value = year;
        $('#ddlXQ').value = team;
    }, query.year, query.term);
    await page.click('input[id=Button1]');
    await page.waitForSelector('form');

    const scoreInfo = await page.evaluate(() => {
        const $ = (el) => document.querySelector(el);
        const $$ = (el) => document.querySelectorAll(el);
        const text = ($el) => $el.textContent.trim();

        const studentID = text($('#Label3')).split('：')[1];
        const name = text($('#Label5')).split('：')[1];
        const courses = [...$$('#Datagrid1 tr:not(:first-child)')].map(($item, index) => {
            const children = $item.children;

            return {
                courseID: text(children[2]),
                name: text(children[3]),
                type: text(children[4]),
                credit: text(children[6]),
                point: text(children[7]),
                score: text(children[12]),
            };
        });

        return {studentID, name, courses};
    });

    await browser.close();
    return scoreInfo;
}

module.exports = router;
