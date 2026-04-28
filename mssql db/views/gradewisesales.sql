create view GradeWiseSales as

(SELECT LEFT(CONVERT(varchar,InvDate1 ,112),6)AS YYYYMM

,cast(datename(month, InvDate1)as varchar)+' - '+CAST(Year(InvDate1)as varchar)as Month

,isnull(gt.Gradetype,'None') as MainType   

,isnull(Grade.Gradename,'') as Type

,sum(dbo.Despatch.Despatchqty) [Qty]

,sum(Despatch.Despatchqty*Weight) [Wt]

,sum(Round(case When dbo.Despatch.Despatchqty =0 then (dbo.Despatch.price-(dbo.Despatch.disc+dbo.Despatch.pack)) else Round(Despatchqty *(dbo.Despatch.Price-(dbo.Despatch.Disc+dbo.Despatch.Pack))*dbo.Invoice.ExRate,2) end, 2))  AS Value

FROM dbo.CurrencyMaster

INNER JOIN dbo.Invoice ON dbo.CurrencyMaster.CurrID = dbo.Invoice.CurrID

INNER JOIN  dbo.Despatch ON dbo.Invoice.InvoiceNo = dbo.Despatch.InvoiceNo

INNER JOIN dbo.Product ON dbo.Despatch.ProdId = dbo.Product.ProdID 

inner join RawMaterial R On R.RawMatID =  dbo.Product .ProdID

inner join dbo.Grade on dbo.Product.GID=dbo.grade.GradeID

left join dbo.GradeType gt on gt.GradeTypeID=dbo.grade.GradeTypeID

Where Invoice.InvDate1 >= '2025-04-01'  

group by gt.GradeType,Grade.Gradename,LEFT(CONVERT(varchar,InvDate1 ,112),6),year(InvDate1),datename(month, InvDate1))

go