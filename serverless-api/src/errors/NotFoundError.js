class NotFoundError extends Error {
  constructor(message = 'The requested item could not be found.') {
    super(message);
  }
}

module.exports = NotFoundError;
