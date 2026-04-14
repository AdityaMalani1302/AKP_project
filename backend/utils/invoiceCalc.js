const getInvoiceValueExpr = (alias = '') => {
    const p = alias ? `${alias}.` : '';
    const exRateAlias = alias || 'InvoiceQuery';

    return `CASE 
    WHEN ${p}ALTUOM = 'N' AND ISNULL(${p}DespatchQty, 0) <> 0 THEN (ISNULL(${p}DespatchQty, 0) * (ISNULL(${p}Price, 0) - ISNULL(${p}Disc, 0) + ISNULL(${p}Pack, 0)) * ISNULL(${exRateAlias}.ExRate, 1))
    WHEN ${p}ALTUOM = 'N' AND ISNULL(${p}DespatchQty, 0) = 0 THEN ((ISNULL(${p}Price, 0) - ISNULL(${p}Disc, 0) + ISNULL(${p}Pack, 0)) * ISNULL(${exRateAlias}.ExRate, 1))
    WHEN ${p}ALTUOM <> 'N' AND ISNULL(${p}ALTUOMDespQty, 0) <> 0 THEN (ISNULL(${p}ALTUOMDespQty, 0) * (ISNULL(${p}ALTUOMPrice, 0) - ISNULL(${p}Disc, 0) + ISNULL(${p}Pack, 0)) * ISNULL(${exRateAlias}.ExRate, 1))
    WHEN ${p}ALTUOM <> 'N' AND ISNULL(${p}ALTUOMDespQty, 0) = 0 THEN ((ISNULL(${p}ALTUOMPrice, 0) - ISNULL(${p}Disc, 0) + ISNULL(${p}Pack, 0)) * ISNULL(${exRateAlias}.ExRate, 1))
    ELSE 0 END`;
};

module.exports = { getInvoiceValueExpr };