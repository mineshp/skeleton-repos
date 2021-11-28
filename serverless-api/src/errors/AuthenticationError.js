class AuthenticationError extends Error {
  constructor(message = 'User could not be authenticated') {
    super(message);
  }
}

module.exports = AuthenticationError;
