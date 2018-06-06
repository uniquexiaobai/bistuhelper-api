const express = require('express');
const bodyParser = require('body-parser');
const winston = require('winston');
const cors = require('cors');
const router = require('./router');
const app = express();

const {combine, timestamp, json} = winston.format;
const logger = winston.createLogger({
    format: combine(
        timestamp(),
        json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'info.log', level: 'info' })
    ]
});

app.use(bodyParser.urlencoded({extended: false}));
app.use(cors());

router(app);

app.use((req, res, next) => {
    const err = new Error('Not Found');

    err.status = 404;
    err.originalUrl = req.originalUrl;
	next(err);
});

app.use((err, req, res, next) => {
    logger.error(err);
    if (err.status) {
        res.status(err.status).json({code: 1, message: err.message});
    } else {
        res.json({code: 1, message: 'Internal Error'});
    }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
	console.log('server is running in ' + port);
});

process.on('unhandledRejection', (reason, p) => {
    logger.error(p);
});
