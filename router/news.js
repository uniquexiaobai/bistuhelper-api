const path = require('path');
const url = require('url');
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const router = express.Router();

const baseUrl = 'http://news.bistu.edu.cn';

// ?type={}&page={}
router.get('/', (req, res, next) => {
	let {page = '1', type = 'zhxw'} = req.query;
	let listUrl = `${baseUrl}/${type}/`;

	if (page === '1') {
		listUrl += 'index.html';
	} else {
		listUrl += 'index_' + (~~page - 1) + '.html';
	}
	fetchNewsList(listUrl, type)
		.then((data) => {
			res.json({
                code: 0,
                data,
            });
		}).catch(err => {
			next(err);
		});
});

router.get('/hot', (req, res, next) => {
    const url = `${baseUrl}/zhxw/`;

    fetchHotNews(url)
		.then((data) => {
			res.json({
                code: 0,
                data,
            });
		}).catch((err) => {
			next(err);
		});
});

router.get('/slide', (req, res, next) => {
    fetchSlideNews(baseUrl)
		.then((data) => {
			res.json({
                code: 0,
                data,
            });
		}).catch((err) => {
			next(err);
		});
});

router.get('/:id', (req, res, next) => {
	const id = req.params.id.split('$').join('/');
	const detailUrl = `${baseUrl}/${id}.html`;

	fetchNewsDetail(detailUrl)
		.then((data) => {
			res.json({
                code: 0,
                data,
            });
		}).catch((err) => {
			next(err);
		});
});

const resolvedUrl = (baseUrl, path) => {
	return url.resolve(baseUrl, path);
};

const dirname = (url) => {
	return path.dirname(url);
};

const fetch = async (url) => {
    try {
        const {data} = await axios.get(url);
        return data;
    } catch (err) {
        return new Error(err);
    }
};

const fetchHotNews = async (url) => {
    try {
        const body = await fetch(url);
        const $ = cheerio.load(body);
        const list = [];

        const $list = $('a', '.table');
        for (let i = 0; i < $list.length; i ++) {
            const $item = $list.eq(i);
            const itemMeta = $item.attr('href').match(/\w+/g);

            itemMeta.pop();
            itemMeta.unshift('zhxw');
            list.push({
                id: itemMeta.join('$'),
                title: $item.text().trim(),
            });
        }
        return list;
    } catch (err) {
        throw err;
    }
};

const fetchSlideNews = async (url) => {
    try {
        const body = await fetch(url);
        const $ = cheerio.load(body);
        const slide = [];

        const $slide = $('#myCarousel > .carousel-inner').find('.item');
        for (let i = 0; i < $slide.length; i ++) {
            const $item = $slide.eq(i);
            const itemMeta = $item.find('a').attr('href').match(/\w+/g);

            itemMeta.pop();
            slide.push({
                id: itemMeta.join('$'),
                title: $item.find('.carousel-caption > p').text().trim(),
                image: resolvedUrl(baseUrl, $item.find('img').attr('src')),
            });
        }
       return slide;
    } catch (err) {
        throw err;
    }
};

const fetchNewsList = async (listUrl, type) => {
	try {
        const body = await fetch(listUrl);
		const $ = cheerio.load(body);
		const list$ = [];

		const $banner = $('#myCarousel > .carousel-inner');
        const bannerImgSrc = $banner.find('img').attr('src'); 
		if (bannerImgSrc) {
			const $bannerTitle = $banner.find('.carousel-caption h4');
			const $bannerDesc = $bannerTitle.next('p');
			const bannerMeta = $banner.find('a').attr('href').match(/\w+/g);
			bannerMeta.pop();
			bannerMeta.length === 2 ? bannerMeta.unshift(type) : '';
			const banner = {
				id: bannerMeta.join('$'),
				title: $bannerTitle.text().trim(),
				desc: $bannerDesc.text().trim(),
				banner: resolvedUrl(`${dirname(listUrl)}/`, bannerImgSrc)
			};
			list$.push(banner);
		} 

		const $list = $('.row-fluid');
		for (var i = 0; i < $list.length; i++) {
			const $newsInfo = $list.eq(i).find('.span10');
			const $newsTitle = $newsInfo.find('a');
			const $newsDesc = $newsInfo.children().last('p');
			const $cover = $list.eq(i).find('.span2 > div');
			const cover = $cover.attr('style').match(/url\((.*)\);/)[1];
			const newsMeta = $newsTitle.attr('href').match(/\w+/g);
			newsMeta.pop();
			newsMeta.length === 2 ? newsMeta.unshift(type) : '';
			const news = {
				id: newsMeta.join('$'),
				title: $newsTitle.text().trim(),
				desc: $newsDesc.text().trim(),
			};

			news.cover = cover ? resolvedUrl(`${baseUrl}/${type}/`, cover) : '';
			list$.push(news);
		}
		return list$;
	} catch (err) {
		throw err;
	}
};

const fetchNewsDetail = async (detailUrl) => {
	try {
		const body = await fetch(detailUrl);
		const $ = cheerio.load(body);
		const $title = $('.newstext h3');
		const $date = $title.next('p');
		const news$ = {};

		news$.title = $title.text().trim();
		news$.date = $date.text().trim();
		news$.content = [];
		$('.TRS_Editor > p').each(function() {
			if ($(this).find('img').length) {
				const $img = $(this).find('img').first();
				const imgUrl = resolvedUrl(`${dirname(detailUrl)}/`, $img.attr('src'));

				news$.content.push({img: imgUrl});
			}
			if ($(this).find('font').length) {
				$(this).find('font').each(function(index, font) {
					font = font.children[0];
					if (font.type === 'text' && font.data.trim().length) {
						news$.content.push({text: font.data.trim()});
					}
				});
			}
		});
		return news$;
	} catch (err) {
		throw err;
	}
};

module.exports = router;
