const { createTestApi, users } = require('../utils/createTestApi');
const { CheckoutAPI } = require('@adyen/api-library');

const api = createTestApi();

const { ADYEN_MERCHANT_ACCOUNT } = process.env;

afterAll(() => api.stop());

test('GET /payment/methods returns authorization error when no client ID provided', async () => {
  api.setUser(users.INVALID_CLIENT_ID);

  await expect(api.getPaymentMethods({ client: 'web' })).rejects.toEqual({
    message: 'No client ID provided',
    status: 401
  });
});

test('GET /payment/methods returns payment methods from adyen for web', async () => {
  api.setUser(users.MEMBER_A);

  const paymentMethods = ['web-payment-methods'];

  CheckoutAPI().paymentMethods.mockResolvedValueOnce(paymentMethods);

  const getResponse = await api.getPaymentMethods({ client: 'web' });

  expect(getResponse.status).toEqual(200);
  expect(getResponse.body).toEqual(paymentMethods);

  expect(CheckoutAPI().paymentMethods).toHaveBeenCalledWith({
    channel: 'Web',
    merchantAccount: ADYEN_MERCHANT_ACCOUNT
  });
});

test('GET /payment/methods returns payment methods from adyen for ios', async () => {
  api.setUser(users.MEMBER_A);

  const paymentMethods = ['ios-payment-methods'];

  CheckoutAPI().paymentMethods.mockResolvedValueOnce(paymentMethods);

  const getResponse = await api.getPaymentMethods({ client: 'ios' });

  expect(getResponse.status).toEqual(200);
  expect(getResponse.body).toEqual(paymentMethods);

  expect(CheckoutAPI().paymentMethods).toHaveBeenCalledWith({
    channel: 'iOS',
    merchantAccount: ADYEN_MERCHANT_ACCOUNT
  });
});
