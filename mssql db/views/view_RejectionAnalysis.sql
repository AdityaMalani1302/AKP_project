USE [IcSoftVer3]
GO

SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE VIEW [dbo].[RejectionAnalysis] AS
(
    SELECT 
        CAST(DATENAME(month, Dates) AS varchar) AS Months,
        ISNULL(SUM(OkQTy),0) ProdQty,
        ISNULL(SUM(OkQty*productweight),0) AS weight,
        ISNULL(SUM(OutQty),0) OutQty,
        ISNULL(SUM(OutQty*ir.[Actual_AKP_Wt]),0) AS Outwt,
        ISNULL(SUM(DispQty),0) DespQty,
        ISNULL(SUM(DispQty*weight),0) DespWT,
        ISNULL(SUM(RejQty),0) RejQty,
        ISNULL(SUM(RejQty*productweight),0) RejWt,
        ISNULL(SUM(SubRejQty),0) SubRejQty,
        ISNULL(SUM(SubRejQty*productweight),0) SubRejWt,
        ISNULL(SUM(CustRejQty),0) CustRejQty,
        ISNULL(SUM(CustRejQty*productweight),0) CustRejWt,
        ISNULL(SUM(RejQty)+SUM(SubRejQty)+SUM(CustRejQty),0) TotalRej,
        ISNULL(
            (SUM(RejQty*productweight)+SUM(SubRejQty*productweight)+SUM(CustRejQty*productweight)),
            0
        ) TotalWt
    FROM Product A
    INNER JOIN RawMaterial B ON A.ProdID = B.RawMatID
    INNER JOIN invent_rawmaterial ir ON ir.af_id = a.prodid
    INNER JOIN
    (
        SELECT 
            stgdate dates, ProdID, SUM(OkQty) OkQty, 0 DespQty, SUM(CummRejQty) RejQty,
            0 SubRejQTy, 0 CustRejQty, 0 OutQty, '' Customer, 0 DispQty, 0 dispwt
        FROM view_ProductionSummary
        WHERE StgDATE >= '2025-04-01' AND ProcessID IN (19) AND ProdID LIKE '%'
        GROUP BY ProdID, stgdate

        UNION ALL

        SELECT dates, sub.ProdID, 0,0,0, SUM(SubRejQty),0,0,'',0 DispQty,0 dispwt
        FROM
        (
            SELECT 
                o.InspDate dates, B.ProdID, SUM(A.RejQty) SubRejQty
            FROM ProdnSubContractorCause A
            INNER JOIN ProdnSubContractorDetails B ON A.SubconDetID = B.SubconDetID
            INNER JOIN OtherInspection o ON o.OtherInspId = A.OtherInspId
            WHERE o.InspDate >= '2025-04-01' AND ProdID LIKE '%'
            GROUP BY ProdID, o.InspDate

            UNION ALL

            SELECT 
                ir.rejdate dates, p.ProdID, SUM(RejQty) SubRejQty
            FROM Invent_rejection Ir
            INNER JOIN Invent_GrnMaterialdetail igm ON igm.GRNID = ir.GrnId
            INNER JOIN invent_grn ig ON ig.grnno = igm.Grnno
            INNER JOIN Product p ON p.Rawmatid = igm.Rawmatid
            WHERE ir.RejDate >= '2025-04-01'
              AND ir.RejMode = 'Rejected'
              AND ig.AddnlParameter <> 'Customer Return'
              AND p.ProdID LIKE '%'
            GROUP BY p.ProdID, ir.rejdate
        ) sub
        GROUP BY ProdID, dates

        UNION ALL

        SELECT 
            im.mindate dates, R.RawMatID, 0,0,0,0,0, SUM(imm.Qty) OutwardQty,'',0 DispQty,0 dispwt
        FROM invent_min im
        INNER JOIN Invent_MinMaterial imm ON im.MinNo = imm.Minno
        INNER JOIN Subcontractor S ON S.SubconId = im.VendorID
        LEFT OUTER JOIN RawMaterial r ON r.rawmatId = imm.rawmatId
        INNER JOIN Invent_grnmaterialdetail IGM ON IGM.Grnid = imm.Grnid
        WHERE im.mindate >= '2025-04-01'
          AND im.VendorID LIKE '%'
          AND im.LocationId = 1
          AND r.RawMatID LIKE '%'
          AND im.AddnlParameter = 'Issue To Subcontractor'
        GROUP BY R.RawMatID, im.mindate

        UNION ALL

        SELECT 
            ir.RejDate dates, p.ProdID, 0,0,0,0, SUM(RejQty) RejQty,0, si.Name,0 DispQty,0 dispwt
        FROM Invent_rejection Ir
        INNER JOIN Invent_GrnMaterialdetail igm ON igm.GRNID = ir.GrnId
        INNER JOIN Invent_Grn ig ON ig.GrnNo = igm.Grnno
        INNER JOIN Product p ON p.Rawmatid = igm.Rawmatid
        LEFT OUTER JOIN PartyDetail si ON si.PartyID = ig.supid
        WHERE ir.RejDate >= '2025-04-01'
          AND ig.AddnlParameter = 'Customer Return'
          AND p.ProdID LIKE '%'
        GROUP BY p.ProdID, si.Name, ir.RejDate

        UNION ALL

        SELECT 
            DespatchDATE dates, d.ProdID, 0,0,0,0,0 RejQty,0,'',
            SUM(DespatchQty) DispQty,
            SUM(Despatchqty*weight) AS Dispwt
        FROM Despatch d
        INNER JOIN RawMaterial r ON r.rawmatid = d.ProdId
        WHERE DespatchDATE >= '2025-04-01'
          AND r.RawMatID LIKE '%'
        GROUP BY d.ProdID, DespatchDATE

    ) C ON A.ProdID = C.ProdID

    GROUP BY CAST(DATENAME(month, Dates) AS varchar)
)
GO