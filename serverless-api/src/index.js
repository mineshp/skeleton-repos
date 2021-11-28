let app = require('./app');
let serverless = require('serverless-http');

module.exports.api = serverless(app);
