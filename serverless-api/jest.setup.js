require('dotenv').config({ path: './env/test.env' });

jest.mock('./src/services/log');
