const log = require('../services/log');
const ValidationError = require('../errors/ValidationError');
const AuthenticationError = require('../errors/AuthenticationError');
const ForbiddenError = require('../errors/ForbiddenError');
const NotFoundError = require('../errors/NotFoundError');

function getErrorReport(error, ctx) {
  ctx.headers = { authorization: null };

  return { body: ctx?.req?.body?.toString(), ctx, error };
}

function handleValidationError(error, errorReport) {
  log.warn('Validation Error:', errorReport);

  error.expose = true;
  error.status = 400;
}

function handleAuthenticationError(error, errorReport) {
  log.warn('Authentication Error:', errorReport);

  error.expose = true;
  error.status = 401;
}

function handleForbiddenError(error, errorReport) {
  log.warn('Forbidden Error:', errorReport);

  error.expose = true;
  error.status = 403;
}

function handleNotFoundError(error, errorReport) {
  log.info('Not Found Error:', errorReport);

  error.expose = true;
  error.status = 404;
}

function handleServerError(error, errorReport) {
  log.error('Server Error:', errorReport);

  error.expose = false;
  error.status = 500;
}

function errorHandler(error, ctx) {
  const errorReport = getErrorReport(error, ctx);

  if (error instanceof ValidationError)
    return handleValidationError(error, errorReport);

  if (error instanceof AuthenticationError)
    return handleAuthenticationError(error, errorReport);

  if (error instanceof ForbiddenError)
    return handleForbiddenError(error, errorReport);

  if (error instanceof NotFoundError)
    return handleNotFoundError(error, errorReport);

  return handleServerError(error, errorReport);
}

module.exports = errorHandler;
