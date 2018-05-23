const newsRouter = require('./news');
const libraryRouter = require('./library');
const educationRouter = require('./education');

module.exports = (app) => {
  app.use('/news', newsRouter);
  app.use('/library', libraryRouter);
  app.use('/education', educationRouter);
};
