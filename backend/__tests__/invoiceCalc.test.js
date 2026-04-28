const { getInvoiceValueExpr } = require('../utils/invoiceCalc');

describe('invoiceCalc', () => {
  describe('getInvoiceValueExpr', () => {
    test('returns expression without table alias when no argument', () => {
      const expr = getInvoiceValueExpr();
      expect(expr).toContain('ALTUOM');
      expect(expr).toContain('DespatchQty');
      expect(expr).toContain('InvoiceQuery.ExRate');
      expect(expr).not.toContain('t1.');
    });

    test('returns expression with table alias prefix', () => {
      const expr = getInvoiceValueExpr('t1');
      expect(expr).toContain('t1.ALTUOM');
      expect(expr).toContain('t1.DespatchQty');
      expect(expr).toContain('t1.Price');
      expect(expr).toContain('t1.Disc');
      expect(expr).toContain('t1.Pack');
      expect(expr).toContain('t1.ExRate');
    });

    test('uses alias-free ExRate when alias is provided', () => {
      const expr = getInvoiceValueExpr('t1');
      expect(expr).toContain('ISNULL(t1.ExRate, 1)');
      const noAlias = getInvoiceValueExpr();
      expect(noAlias).toContain('ISNULL(InvoiceQuery.ExRate, 1)');
    });

    test('uses default ExRate reference when no alias', () => {
      const expr = getInvoiceValueExpr();
      expect(expr).toContain('ISNULL(InvoiceQuery.ExRate, 1)');
    });

    test('expression starts with CASE and ends with END', () => {
      const expr = getInvoiceValueExpr();
      expect(expr.trim().startsWith('CASE')).toBe(true);
      expect(expr.trim().endsWith('END')).toBe(true);
    });

    test('handles NULL values with ISNULL wrappers', () => {
      const expr = getInvoiceValueExpr();
      expect(expr).toMatch(/ISNULL\([^)]*DespatchQty[^)]*,\s*0\)/);
      expect(expr).toMatch(/ISNULL\([^)]*Price[^)]*,\s*0\)/);
      expect(expr).toMatch(/ISNULL\([^)]*Disc[^)]*,\s*0\)/);
      expect(expr).toMatch(/ISNULL\([^)]*Pack[^)]*,\s*0\)/);
    });

    test('contains 4 WHEN clauses', () => {
      const expr = getInvoiceValueExpr();
      const whenCount = (expr.match(/WHEN/g) || []).length;
      expect(whenCount).toBe(4);
    });

    test('has ELSE 0 as fallback', () => {
      const expr = getInvoiceValueExpr();
      expect(expr).toContain('ELSE 0');
    });
  });
});