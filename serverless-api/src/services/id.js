const { customAlphabet } = require('nanoid');

const nanoid = customAlphabet('0123456789', 10);

function generate() {
  return nanoid();
}

module.exports = { generate };
