const logLevel = {
  error: 0,
  info: 2,
  warn: 1
}[process.env.LOG_LEVEL || 'error'];

module.exports = {
  error: console.error,
  info: (msg) => logLevel > 1 && console.log(msg),
  warn: (msg) => logLevel > 0 && console.log(msg)
};
