class ValidationError extends Error {
  constructor(
    message = 'A validation error has occurred. Please check the request and try again.'
  ) {
    super(message);
  }
}

module.exports = ValidationError;
