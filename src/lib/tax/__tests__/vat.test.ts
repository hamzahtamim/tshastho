describe('VAT Calculation', () => {
  it('should calculate 15% VAT correctly', () => {
    const amount = 1000;
    const vatRate = 0.15;
    const vatAmount = amount * vatRate;
    const total = amount + vatAmount;
    expect(vatAmount).toBe(150);
    expect(total).toBe(1150);
  });
});
