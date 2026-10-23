import { generatePaymentNumber, generateRefundNumber } from '../utils';

describe('Payment Utils', () => {
  it('should generate a valid payment number format', () => {
    const paymentNumber = generatePaymentNumber();
    expect(paymentNumber).toMatch(/^TSH-PAY-\d{8}-\d{6}$/);
  });
});

describe('Refund Utils', () => {
  it('should generate a valid refund number format', () => {
    const refundNumber = generateRefundNumber();
    expect(refundNumber).toMatch(/^TSH-RF-\d{6}-\d{5}$/);
  });
});
