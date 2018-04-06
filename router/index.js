const newsRouter = require('./news');
const libraryRouter = require('./library');
const educationRouter = require('./education');

module.exports = (app) => {
  app.use('/api/news', newsRouter);
  app.use('/api/library', libraryRouter);
  app.use('/api/education', educationRouter);
};
