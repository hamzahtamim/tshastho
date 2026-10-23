describe('Double-Entry Ledger Logic', () => {
  it('should balance debit and credit amounts correctly', () => {
    const entries = [
      { account: 'CUSTOMER', type: 'DEBIT', amount: 1500 },
      { account: 'PLATFORM', type: 'CREDIT', amount: 1500 }
    ];

    const totalDebit = entries.filter(e => e.type === 'DEBIT').reduce((sum, e) => sum + e.amount, 0);
    const totalCredit = entries.filter(e => e.type === 'CREDIT').reduce((sum, e) => sum + e.amount, 0);

    expect(totalDebit).toBe(totalCredit); // Accounting equation must balance
  });
});
