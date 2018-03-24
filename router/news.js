const path = require('path');
const url = require('url');
const axios = require('axios');
const request = require('request');
const cheerio = require('cheerio');
const express = require('express');
const router = express.Router();

const baseUrl = 'http://news.bistu.edu.cn';

router.get('/news/hot', (req, res, next) => {
  getHotNewsPromise(baseUrl)
		.then((hotNews) => {
			res.json(hotNews);
		}).catch((err) => {
			next(err);
		});
});

// ?type={}&page={}
router.get('/news', (req, res, next) => {
	let {page = '1', type = 'zhxw'} = req.query;
	let listUrl = `${baseUrl}/${type}/`;

	if (page === '1') {
		listUrl += 'index.html';
	} else {
		listUrl += 'index_' + (~~page - 1) + '.html';
	}
	fetchNewsList(listUrl, type)
		.then((newsList) => {
			res.json(newsList);
		}).catch(err => {
			next(err);
		});
});

router.get('/news/:id', (req, res, next) => {
	const id = req.params.id.split('$').join('/');
	const detailUrl = `${baseUrl}/${id}.html`;

	fetchNewsDetail(detailUrl)
		.then((newsDetail) => {
			res.send(newsDetail);
		}).catch((err) => {
			next(err);
		});
});

/*
function getHotNewsPromise(url) {
	return new Promise((resolve, reject) => {
		request(url, (err, response, body) => {
			if (err || response.statusCode !== 200) return reject(err);
			const data = {
				newsList: [],
				slideList: []
			};
			const $ = cheerio.load(body);
			const newsListNode = $('.span9 > .slide').find('.item li');
			const slideListNode = $('.span8 > .slide').find('.item');

			for (let i = 0; i < newsListNode.length; i ++) {
				const newsNode = newsListNode.eq(i);
				const linkNode = newsNode.find('a');

				data.newsList.push({ 
					title: linkNode.text(),
					src: resolvedUrl(baseUrl, linkNode.attr('href')), 
					date: newsNode.contents().first().text().trim() 
				});
			}

			for (let i = 0; i < slideListNode.length; i ++) {
				const slideNode = slideListNode.eq(i);

				data.slideList.push({
					url: resolvedUrl(baseUrl, slideNode.find('a').attr('href')),
					image: resolvedUrl(baseUrl, slideNode.find('img').attr('src')),
					desc: slideNode.find('.carousel-caption > p').text()
				});
			}
			resolve(data);
		});
	});
}
*/

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
}

module.exports = router;
