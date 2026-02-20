-- =============================================
-- SalesDashboard View
-- Created for the Sales Dashboard feature
-- This view provides aggregated sales data by customer, segment, category, and month
-- NOTE: Update the date '01-Apr-2025' to the current FY start date when FY changes
-- =============================================

CREATE VIEW SalesDashboard AS
(
    SELECT 
        C.CustName,
        sc.CategoryName,
        ir.Segment_Type,
        sa.[CUSTOMER AREA GROUP],
        CAST(DATENAME(month, InvDate1) AS VARCHAR) + ' - ' + CAST(YEAR(InvDate1) AS VARCHAR) AS Month,
        CASE WHEN ALTUOM = 'N' THEN SUM(DespatchQty) ELSE SUM(ALTUOMDespQty) END AS Quantity,
        SUM(DespatchQty * r.Weight) AS Weight,
        SUM(
            CASE 
                WHEN ALTUOM = 'N' AND DespatchQty <> 0 THEN (DespatchQty * (Price - Disc + Pack) * InvoiceQuery.ExRate)
                WHEN ALTUOM = 'N' AND DespatchQty = 0 THEN ((Price - Disc + Pack) * InvoiceQuery.ExRate)
                WHEN ALTUOM <> 'N' AND ALTUOMDespQty <> 0 THEN (ALTUOMDespQty * (ALTUOMPrice - Disc + Pack) * InvoiceQuery.ExRate)
                WHEN ALTUOM <> 'N' AND ALTUOMDespQty = 0 THEN ((ALTUOMPrice - Disc + Pack) * InvoiceQuery.ExRate)
            END
        ) AS Value
    FROM InvoiceQuery 
    LEFT JOIN RawMaterial r ON r.RawMatID = InvoiceQuery.ProdId
    INNER JOIN Customer c ON c.CustId = InvoiceQuery.CustId
    INNER JOIN Sales_CustType sc ON sc.CTypeID = c.CTypeID
    LEFT JOIN Sales_CustAddn sa ON sa.Af_Id = c.CustId
    LEFT JOIN Invent_Rawmaterial ir ON ir.Af_ID = r.RawMatID
    WHERE InvDate1 BETWEEN '01-Apr-2025' AND DATEADD(ss, -1, DATEADD(mm, 12, '01-Apr-2025'))
        AND c.CTypeID LIKE '%' 
        AND InvDone = 'Y'
    GROUP BY 
        YEAR(InvDate1), 
        DATENAME(month, InvDate1), 
        ALTUOM,
        LEFT(CONVERT(VARCHAR, InvDate1, 112), 6),
        C.CustName,
        sc.CategoryName,
        ir.Segment_Type,
        sa.[CUSTOMER AREA GROUP]
)
