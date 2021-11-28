const { createTestApi } = require('../utils/createTestApi');
const { sizes } = require('../domain/sizes');

const api = createTestApi();

afterAll(() => api.stop());

test('GET /sizes returns sizes successfully', async () => {
  const getResponse = await api.getAllSizes();

  expect(getResponse.status).toEqual(200);
  expect(getResponse.body).toEqual(sizes);
});
