const newsRouter = require('./news');

module.exports = (app) => {
  app.use('/api', newsRouter);
};
