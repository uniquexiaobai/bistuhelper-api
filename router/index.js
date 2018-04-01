const newsRouter = require('./news');
const libraryRouter = require('./library');

module.exports = (app) => {
  app.use('/api/news', newsRouter);
  app.use('/api/library', libraryRouter);
};
