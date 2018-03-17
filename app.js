var express = require('express');
var cors = require('cors');
var router = require('./router');
var app = express();

app.use(cors());
router(app);

app.use((req, res, next) => {
	const err = new Error('Not Found');

	err.status = 400;
	next(err);
});

app.use((err, req, res, next) => {
	res.send(err);
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
	console.log('server is running in ' + port);
});
