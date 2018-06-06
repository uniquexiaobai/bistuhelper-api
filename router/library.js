const puppeteer = require('puppeteer');
const AipOcrClient = require("baidu-aip-sdk").ocr;
const express = require('express');
const router = express.Router();

const baiduOcr = require('../conf.json').baiduOcr;

const ocrClient = new AipOcrClient(baiduOcr.APP_ID, baiduOcr.API_KEY, baiduOcr.SECRET_KEY);

// 验证码识别
const imageToText = async (base64) => {
    try {
        const result = await ocrClient.generalBasic(base64);

        if (result.words_result && result.words_result[0] && result.words_result[0].words) {
            return result.words_result[0].words;
        }
    } catch (err) {
        throw err;
    }
};

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
    
        await page.goto('http://opac-lib.bistu.edu.cn:8080/reader/login.php', {waitUntil: 'domcontentloaded'});
        
        // 验证码
        const base64 = await page.evaluate(() => {
            const img = document.querySelector('img');
            const convas = document.createElement('canvas');

            convas.width = 60;
            convas.height = 36;
            convas.getContext('2d').drawImage(img, 0, 0, 60, 36);

            const base64 = convas.toDataURL().slice(22);
            return base64;
        });
        const text = await imageToText(base64);

        await page.type('#number', auth.username);
        await page.type('input[name=passwd]', auth.password);
        await page.type('#captcha', text);
        await Promise.all([
            page.click('input[type=submit]'),
            page.waitForNavigation({waitUntil: 'domcontentloaded'}),
        ]);

        const url = await page.url();
		if (!url.includes('redr_info')) {
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

        const user = await page.evaluate(() => {
            const $name = document.querySelector('.profile-name');
            const name = $name.textContent.trim();

            return {name};
        });

        browser.close();
        return user;
    } catch (err) {
        browser && browser.close && browser.close();
        throw err;
    }
};

const getBorrowInfo = async (auth) => {
    let browser;

    try {
        browser = await pageInit(auth);
        const pages = await browser.pages();
        const page = pages.pop();

        await page.goto('http://opac-lib.bistu.edu.cn:8080/reader/book_lst.php', {waitUntil: 'domcontentloaded'});

        const books = await page.evaluate(() => {
            const text = $el => ($el.textContent || '').trim();
            const $trs = [].slice.call(document.querySelectorAll('.table_line tr'), 1);

            const list = $trs.map($tr => {
                const $tds = $tr.children;
                return {
                    'barCode': text($tds[0]),
                    'name': text($tds[1]),
                    'fromDate': text($tds[2]),
                    'toDate': text($tds[3]),
                    'address': text($tds[5]),
                };
            });
            return list;
        });

        browser.close();
        return books;
    } catch (err) {
        browser && browser.close && browser.close();
        throw err;
    }
};

module.exports = router;
