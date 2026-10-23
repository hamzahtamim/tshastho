import { generatePaymentNumber } from '../utils';

describe('Payment Utils', () => {
  it('should generate a valid payment number format', () => {
    const paymentNumber = generatePaymentNumber();
    expect(paymentNumber).toMatch(/^TSH-PAY-\d{8}-\d{6}$/);
  });
});
