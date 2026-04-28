create view [dbo].[SalesDashboardFamily] as

(

SELECT     ir.Product_Range ProductType, ir.Segment_Type SegmentType,

    cast(datename(month, InvDate1)as varchar)+' - '+CAST(Year(InvDate1)as varchar)as Month,

    CASE WHEN ALTUOM='N' THEN sum(DespatchQty) ELSE sum(ALTUOMDespQty) END as Quantity,

    sum(DespatchQty*r.Weight) as Weight,

    sum(

        CASE

            WHEN ALTUOM ='N'and DespatchQty <> 0 THEN (DespatchQty * (Price - Disc + Pack) * InvoiceQuery.ExRate)

            when ALTUOM ='N'and DespatchQty = 0  THEN ((Price - Disc + Pack) * InvoiceQuery.ExRate)

            when ALTUOM <>'N'and ALTUOMDespQty <> 0 Then (ALTUOMDespQty * (ALTUOMPrice - Disc + Pack) * InvoiceQuery.ExRate)

            when ALTUOM <>'N'and ALTUOMDespQty = 0 Then ((ALTUOMPrice - Disc + Pack) * InvoiceQuery.ExRate)

        END

    ) as Value

FROM InvoiceQuery

LEFT JOIN RawMaterial r on r.RawMatID= InvoiceQuery.ProdId

INNER JOIN Customer c on c.CustId=InvoiceQuery.CustId

INNER JOIN Sales_CustType sc on sc.CTypeID=c.CTypeID

LEFT JOIN Sales_CustAddn sa on sa.Af_Id=c.CustId

inner join country co on co.CountryID=c.CountryId

left join Invent_Rawmaterial ir on ir.Af_ID=InvoiceQuery.ProdId

WHERE InvDate1 >= '2020-04-01'

    AND c.CTypeID like '%'  And InvDone = 'Y'

GROUP BY year(InvDate1), datename(month, InvDate1), ALTUOM,LEFT(CONVERT(varchar,InvDate1 ,112),6),ir.Segment_Type,ir.Product_Range

 

)

 

GO