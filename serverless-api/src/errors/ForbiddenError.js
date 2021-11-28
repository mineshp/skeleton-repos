class ForbiddenError extends Error {
  constructor(message = 'User not allowed to perform action.') {
    super(message);
  }
}

module.exports = ForbiddenError;
