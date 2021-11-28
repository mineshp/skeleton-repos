const { createTestApi, users } = require('../utils/createTestApi');

const api = createTestApi();

afterAll(() => api.stop());

test('GET /permissions returns authorization error when auth token invalid', async () => {
  api.setUser(users.INVALID_CLIENT_ID);

  await expect(api.getPermissions()).rejects.toEqual({
    message: 'No client ID provided',
    status: 401
  });
});

test('GET /permissions returns permissions for approver', async () => {
  api.setUser(users.MARKETPLACE_MANAGER_APPROVER);

  const getResponse = await api.getPermissions();

  expect(getResponse.status).toEqual(200);
  expect(getResponse.body).toEqual({ listingApproval: true });
});

test('GET /permissions returns permissions for non-approver', async () => {
  api.setUser(users.MARKETPLACE_MANAGER);

  const getResponse = await api.getPermissions();

  expect(getResponse.status).toEqual(200);
  expect(getResponse.body).toEqual({ listingApproval: false });
});
