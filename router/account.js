const AV = require('leancloud-storage');
const express = require('express');
const axios = require('axios');
const router = express.Router();

const conf = require('../conf.json');

AV.init({
    appId: conf.leancloud.APP_ID,
    appKey: conf.leancloud.APP_KEY
});

router.post('/login', (req, res, next) => {
    const {loginType, openid, access_token, oauth_consumer_key, expires_in} = req.body;
    const auth = {
        openid, 
        access_token, 
        oauth_consumer_key, 
        expires_in,
    };

    login(loginType, auth)
        .then(user => {
            res.json({
                code: 0,
                data: user,
            });
        })
        .catch(err => {
            console.log(err);
            next(err);
        });
});

const getQQInfo = async ({openid, access_token, oauth_consumer_key}) => {
    const url = `https://graph.qq.com/user/get_user_info?access_token=${access_token}&oauth_consumer_key=${oauth_consumer_key}&openid=${openid}`;
    
    try {
        const {data = {}} = await axios.get(url) || {};

        if (data.ret) {
            throw data.msg;
        }
        const {nickname, gender, figureurl_qq_2} = data; 
        return {nickname, gender, figureurl: figureurl_qq_2};
    } catch (err) {
        throw err;
    }
};

const login = async (loginType, {openid, access_token, oauth_consumer_key}) => {
    try {
        const {nickname, gender, figureurl} = await getQQInfo({openid, access_token, oauth_consumer_key});
        const loggedInUser = await AV.User.loginWithAuthData({
            openid,
            access_token,
        }, loginType);

        loggedInUser.set('nickname', nickname);
        loggedInUser.set('gender', gender);
        loggedInUser.set('figureurl', figureurl);
        const user = await loggedInUser.save();

        return user;
    } catch (err) {
        throw err;
    }
};

module.exports = router;
