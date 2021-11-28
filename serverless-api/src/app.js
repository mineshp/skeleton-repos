const Koa = require('koa');
const cors = require('@koa/cors');
const router = require('./router');
const errorHandler = require('./handlers/error');

const app = new Koa();

app.use(cors());
app.use(router.routes());

app.on('error', errorHandler);

module.exports = app;
