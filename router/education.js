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

router.post('/course', (req, res, next) => {
    const {username, password, year, term} = req.body;
    const auth = {username, password};
    const query = {year, term};

    getCourseInfo(auth, query)
        .then(courseInfo => {
            res.json(courseInfo);
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

const getCourseInfo = async (auth, query) => {
    const browser = await pageInit(auth);
    const pages = await browser.pages();
    const page = pages.pop();

    const url = await page.evaluate(el => {
        return document.querySelector(el).href;
    }, '.nav > li:nth-child(6) > .sub li:nth-child(3) > a')
    await page.goto(url, {waitUntil: 'domcontentloaded'});

    await page.evaluate((year, term) => {
        const $ = (el) => document.querySelector(el);

        $('#xnd').value = year;
        $('#xqd').value = term;
        __doPostBack('xnd', '');
        __doPostBack('xqd', '');
    }, query.year, query.term);
    await page.waitForNavigation({waitUntil: 'domcontentloaded'})

    const courseInfo = await page.evaluate(() => {
        const $ = el => document.querySelector(el);
        const $$ = el => document.querySelectorAll(el);

        function getCells() {
            var rows = [...$('#Table1').rows].slice(2);
            var list = [];
        
            var a = 0, b = 0;
            for (var i = 0; i < rows.length; i++) {
                var cells = rows[i].cells;
        
                if (i === 0 || i === 5 || i === 9) {
                    cells = [...cells].slice(2);
                } else {
                    cells = [...cells].slice(1);
                }
        
                var c = 0, d = 0;
                for (var j = 0; j < cells.length; j++) {
                    if (!/\n/.test(cells[j].innerText)) continue;
                    var rowspan = cells[j].getAttribute('rowspan');
                    var week = j + a + b;
                    var parts;
                    if (rowspan === '3') {
                        c ++;
                        d ++;
                        parts = [i, i + 2];
                    } else if (rowspan === '2') {
                        d ++;
                        parts = [i, i + 1];
                    } else {
                        parts = [i, i];
                    }
                    list.push({text: cells[j].innerText, pos: [week, parts]});
                }
                a = c;
                b = d;
            }
            return list;
        }
        const cells = getCells();
        const list = [...cells].reduce((arr, cell) => {
            const text = cell.text;
            const obj = {};

            if (/\n\n/.test(text)) {
                return arr.concat(text.split('\n\n').map(v => ({text: v, pos: cell.pos})));
            }
            return [...arr, cell];
        }, []);
        
        const getMeta = (text, pos) => {
            const matchs = text.match(/{第(\d+-\d+)周.*}/);
            
            return {
                week: pos[0],
                parts: pos[1],
                range: matchs[1].split('-'),
            };
        };
        const result = list.map(({text, pos}) => {
            const infos = text.split('\n');
            const name = infos[0];
            const type = infos[1];
            const meta = getMeta(infos[2], pos);
            const teacher = infos[3];
            const address = infos[4];

            return {name, type, meta, teacher, address};
        });

        return result;
    });

    return courseInfo;
}

module.exports = router;