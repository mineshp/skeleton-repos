const dotenv = require('dotenv');

console.log(process.env.DOTENV_FILENAME);

const path = process.env.DOTENV_FILENAME
  ? `./env/${process.env.DOTENV_FILENAME}`
  : '.env';

module.exports = async () => ({
  ...dotenv.config({ path }).parsed,
  ...process.env
});
