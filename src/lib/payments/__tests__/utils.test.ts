import { generatePaymentNumber, generateRefundNumber } from '../utils';

describe('Payment Utils', () => {
  it('should generate a valid payment number format', () => {
    const paymentNumber = generatePaymentNumber();
    // Payment format: TSH-PAY-YYYYMMDD-XXXXXX (8 digits date, 6 digits random)
    expect(paymentNumber).toMatch(/^TSH-PAY-\d{8}-\d{6}$/);
  });
});

describe('Refund Utils', () => {
  it('should generate a valid refund number format', () => {
    const refundNumber = generateRefundNumber();
    // Refund format: TSH-RF-YYYYMM-XXXXX (6 digits date, 5 digits random)
    expect(refundNumber).toMatch(/^TSH-RF-\d{6}-\d{5}$/);
  });
});
