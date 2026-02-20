USE [IcSoftVer3]

GO

 

/****** Object:  View [dbo].[AccountReceivables]    Script Date: 01/03/2026 14:43:59 ******/

SET ANSI_NULLS ON

GO

 

SET QUOTED_IDENTIFIER ON

GO

 

 

create view [dbo].[AccountReceivables] as

 

(Select  categ as Category,name,CreditPeriod,AgeSlab as Description, round(sum(amount),0) as [.] From (

 

select '0' as tempval,ah.accountname as categ,ac.name as name,case when

td.start is null then '0::Not Overdue' else convert(varchar,td.start) + ' - ' + (case when td.endto = 99999 then 'Above' else convert(varchar,td.endto) end) End as AgeSlab,

round(t.amount - isnull(D.AdAmount,0),0) as Amount,cr.CreditPeriod

from [IcSoftLedgerVer3].dbo.accounts ac  

inner join [IcSoftLedgerVer3].dbo.transactions t   on t.accountid=ac.id

inner join [IcSoftLedgerVer3].dbo.transactiontype tt   on tt.transtypeno = t.trtypeno

inner join Customer c   on c.AccID=t.AccountID

left join CustomerCrPeriod cr   on cr.CustomerId=c.CustId

left outer join  AgingTypeDetail TD   on isnull(datediff(d,t.agingdate,getdate()), 0) >= td.start and

isnull(datediff(d,t.agingdate,getdate()), 0) <= td.endto and  TD.type = '0-45-60-90-Above'

left outer join (

SELECT [IcSoftLedgerVer3].dbo.Transactions.Transactionid,isnull(SUM([IcSoftLedgerVer3].dbo.Adjustment.AdAmount),0) as AdAmount FROM [IcSoftLedgerVer3].dbo.Transactions INNER JOIN [IcSoftLedgerVer3].dbo.Adjustment ON

[IcSoftLedgerVer3].dbo.Transactions.TransactionID = [IcSoftLedgerVer3].dbo.Adjustment.AdTransactionID INNER JOIN [IcSoftLedgerVer3].dbo.Transactions Transactions_1 ON

[IcSoftLedgerVer3].dbo.Adjustment.TransactionID = Transactions_1.TransactionID

where [IcSoftLedgerVer3].dbo.Transactions.Approved='Y'  and transactions_1.approved='Y'

and Transactions_1.TransactionDate <= getdate()

group by [IcSoftLedgerVer3].dbo.Transactions.Transactionid

) D on d.transactionid = t.transactionid inner join [IcSoftLedgerVer3].dbo.accountheads ah on ah.accountid = ac.accountid

where t.drcr='Dr'  and ac.olevelid=2

and ac.accountid like '%'

 and ac.id like '%'

 and costcentreid like '%'

 and t.LocationID like '%'

and t.transactiondate <= getdate()

and td.start is not null

And round(t.amount - isnull(D.AdAmount,0),0)  >  0

 

union all

 

select Tempval,categ as Category,name,'Overdue Amount(Rs.)' as AgeSlab, round(sum(amount),0) as amount,CreditPeriod from (

select '0' as tempval,ah.accountname as categ,ac.name as name,case when

td.start is null then '0::Not Overdue' else '2' + convert(varchar,td.id) + '::' +  convert(varchar,td.start) + ' - ' + (case when td.endto = 99999 then 'Above' else convert(varchar,td.endto) end) End as AgeSlab,

round(t.amount - isnull(D.AdAmount,0),0) as Amount,cr.CreditPeriod,t.TransactionDate,isnull(datediff(d,t.TransactionDate,getdate()),0) as TDays

from [IcSoftLedgerVer3].dbo.accounts ac  

inner join [IcSoftLedgerVer3].dbo.transactions t   on t.accountid=ac.id

inner join [IcSoftLedgerVer3].dbo.transactiontype tt   on tt.transtypeno = t.trtypeno

inner join Customer c   on c.AccID=t.AccountID

left join CustomerCrPeriod cr   on cr.CustomerId=c.CustId

left outer join  AgingTypeDetail TD   on isnull(datediff(d,t.agingdate,getdate()), 0) >= td.start and

isnull(datediff(d,t.agingdate,getdate()), 0) <= td.endto and  TD.type = '0-45-60-90-Above'

left outer join (

SELECT [IcSoftLedgerVer3].dbo.Transactions.Transactionid,isnull(SUM([IcSoftLedgerVer3].dbo.Adjustment.AdAmount),0) as AdAmount FROM [IcSoftLedgerVer3].dbo.Transactions INNER JOIN [IcSoftLedgerVer3].dbo.Adjustment ON

[IcSoftLedgerVer3].dbo.Transactions.TransactionID = [IcSoftLedgerVer3].dbo.Adjustment.AdTransactionID INNER JOIN [IcSoftLedgerVer3].dbo.Transactions Transactions_1 ON

[IcSoftLedgerVer3].dbo.Adjustment.TransactionID = Transactions_1.TransactionID

where [IcSoftLedgerVer3].dbo.Transactions.Approved='Y'  and transactions_1.approved='Y'

and Transactions_1.TransactionDate <= getdate()

group by [IcSoftLedgerVer3].dbo.Transactions.Transactionid

) D on d.transactionid = t.transactionid inner join [IcSoftLedgerVer3].dbo.accountheads ah on ah.accountid = ac.accountid

where t.drcr='Dr'  and ac.olevelid=2

and ac.accountid like '%'

 and ac.id like '%'

 and costcentreid like '%'

 and t.LocationID like '%'

and t.transactiondate <= getdate()

and td.start is not null

And round(t.amount - isnull(D.AdAmount,0),0)  >  0 and cr.CreditPeriod < isnull(datediff(d,t.TransactionDate,getdate()),0)

)OD

group by Tempval,categ,name,CreditPeriod,AgeSlab

 

union all

 

select 'TempRow' as TempVal,'' as Category,'' as name,'2' + convert(varchar,id) + '::' + convert(varchar,start) + ' - ' + (case when endto = 99999 then 'Above' else convert(varchar,endto) end) AS AgeSlab,0 as Amount,0 CreditPeriod

from AgingTypeDetail   where type = '0-45-60-90-Above' and olevelid=2

 

union all

 

SELECT '0' as Tempval,ah.accountname as Category,ac.name,'On Account Amount(Rs.)' as AgeSlab ,round((t.CurrencyAmount)- isnull(SUM(aA.AdAmount),0),2) * t.exchangerate  AS Amount, isnull(cr.CreditPeriod,0) CreditPeriod  FROM [IcSoftLedgerVer3].dbo.Transactions t   

LEFT OUTER JOIN

(select  a.TransactionID , sum(A.CurrAdAmount) as AdAmount from [IcSoftLedgerVer3].dbo.Adjustment A  inner join [IcSoftLedgerVer3].dbo.Transactions T 

on T.TransactionID = A.AdTransactionID  

where t.transactiondate <= getdate() and T.approved = 'Y' --and a.TransactionID = 38892

 

group by a.Transactionid

)AA

   ON t.TransactionID = aA.TransactionID

inner join [IcSoftLedgerVer3].dbo.accounts ac   on ac.id=t.accountid

inner join Customer c on c.AccID=ac.ID

left outer join CustomerCrPeriod cr on cr.CustomerId=c.CustId

inner join [IcSoftLedgerVer3].dbo.transactiontype tt   on tt.transtypeno = t.trtypeno inner join [IcSoftLedgerVer3].dbo.accountheads ah   on ah.accountid = ac.accountid

where T.Approved = 'Y' And  T.TransactionDate < = getdate() And t.DrCr = 'Cr'  and ac.olevelid=2 and t.accountid like '%' and ac.accountid like '%'

and t.LocationID like '%'

GROUP BY t.AccountID, t.Amount, t.TransactionID,ac.name,tt.transdesc, t.transactionnumber,t.agingdate,ah.accountname ,t.CurrencyAmount,t.exchangerate,cr.CreditPeriod

 

having round((t.Amount)- isnull(SUM(aA.AdAmount),0),0) > 0

 

union all

 

---total

select '0' as tempval,ah.accountname as categ,ac.name as name,'Total Amount(Rs.)' AgeSlab,

t.amount - isnull(D.AdAmount,0) as Amount,cr.CreditPeriod

from [IcSoftLedgerVer3].dbo.accounts ac  

inner join [IcSoftLedgerVer3].dbo.transactions t   on t.accountid=ac.id

inner join [IcSoftLedgerVer3].dbo.transactiontype tt   on tt.transtypeno = t.trtypeno

inner join Customer c   on c.AccID=t.AccountID

left join CustomerCrPeriod cr   on cr.CustomerId=c.CustId

left outer join (

SELECT [IcSoftLedgerVer3].dbo.Transactions.Transactionid,isnull(SUM([IcSoftLedgerVer3].dbo.Adjustment.AdAmount),0) as AdAmount FROM [IcSoftLedgerVer3].dbo.Transactions INNER JOIN [IcSoftLedgerVer3].dbo.Adjustment   ON

[IcSoftLedgerVer3].dbo.Transactions.TransactionID = [IcSoftLedgerVer3].dbo.Adjustment.AdTransactionID INNER JOIN [IcSoftLedgerVer3].dbo.Transactions Transactions_1   ON

[IcSoftLedgerVer3].dbo.Adjustment.TransactionID = Transactions_1.TransactionID

where [IcSoftLedgerVer3].dbo.Transactions.Approved='Y'  and transactions_1.approved='Y'

and Transactions_1.TransactionDate <= getdate()

group by [IcSoftLedgerVer3].dbo.Transactions.Transactionid

) D on d.transactionid = t.transactionid inner join [IcSoftLedgerVer3].dbo.accountheads ah on ah.accountid = ac.accountid

where t.drcr='Dr'  and ac.olevelid=2

and ac.accountid like '%'

 and ac.id like '%'

 and costcentreid like '%'

 and t.LocationID like '%'

and t.transactiondate <= getdate()

And round(t.amount - isnull(D.AdAmount,0),0) > 0

 

union all

 

-- For Net Balance

select z.Tempval,z.Category,z.name,'Total Outstanding Amount(Rs.)' as AgeSlab,SUM(Amount) as Amount,CreditPeriod from

(SELECT '0' as Tempval,ah.accountname as Category,ac.name,-(t.CurrencyAmount - isnull(SUM(aa.AdAmount),0)) * t.exchangerate

  AS Amount,isnull(cr.CreditPeriod,0) CreditPeriod  FROM [IcSoftLedgerVer3].dbo.Transactions t   

LEFT OUTER JOIN

(select  a.TransactionID , sum(A.CurrAdAmount) as AdAmount from [IcSoftLedgerVer3].dbo.Adjustment A  inner join [IcSoftLedgerVer3].dbo.Transactions T 

on T.TransactionID = A.AdTransactionID  

where t.transactiondate <= getdate() and T.approved = 'Y' --and a.TransactionID = 38892

 

group by a.Transactionid

)AA

   ON t.TransactionID = aA.TransactionID

inner join [IcSoftLedgerVer3].dbo.accounts ac   on ac.id=t.accountid

inner join Customer c on c.AccID=ac.ID

left outer join CustomerCrPeriod cr on cr.CustomerId=c.CustId

inner join [IcSoftLedgerVer3].dbo.transactiontype tt   on tt.transtypeno = t.trtypeno inner join [IcSoftLedgerVer3].dbo.accountheads ah   on ah.accountid = ac.accountid

where T.Approved = 'Y' And  T.TransactionDate < = getdate() And t.DrCr = 'Cr'  and ac.olevelid=2 and t.accountid like '%' and ac.accountid like '%'

and t.LocationID like '%'

GROUP BY t.AccountID, t.Amount, t.TransactionID,ac.name,tt.transdesc, t.transactionnumber,t.agingdate,ah.accountname ,t.CurrencyAmount,t.exchangerate ,cr.CreditPeriod

 

having (t.CurrencyAmount)- isnull(SUM(aa.AdAmount),0)>0

 

union all

select '0' as tempval,ah.accountname as categ,ac.name as name,

round(t.amount - isnull(D.AdAmount,0),0) as Amount,cr.CreditPeriod

from [IcSoftLedgerVer3].dbo.accounts ac  

inner join [IcSoftLedgerVer3].dbo.transactions t   on t.accountid=ac.id

inner join [IcSoftLedgerVer3].dbo.transactiontype tt   on tt.transtypeno = t.trtypeno

inner join Customer c   on c.AccID=t.AccountID

left join CustomerCrPeriod cr   on cr.CustomerId=c.CustId

left outer join (

SELECT [IcSoftLedgerVer3].dbo.Transactions.Transactionid,isnull(SUM([IcSoftLedgerVer3].dbo.Adjustment.AdAmount),0) as AdAmount FROM [IcSoftLedgerVer3].dbo.Transactions

INNER JOIN [IcSoftLedgerVer3].dbo.Adjustment   ON [IcSoftLedgerVer3].dbo.Transactions.TransactionID = [IcSoftLedgerVer3].dbo.Adjustment.AdTransactionID

INNER JOIN [IcSoftLedgerVer3].dbo.Transactions Transactions_1   ON [IcSoftLedgerVer3].dbo.Adjustment.TransactionID = Transactions_1.TransactionID

where [IcSoftLedgerVer3].dbo.Transactions.Approved='Y'  and transactions_1.approved='Y' and [IcSoftLedgerVer3].dbo.Transactions.TrTypeNo<>50

and Transactions_1.TransactionDate <= getdate()

group by [IcSoftLedgerVer3].dbo.Transactions.Transactionid

) D on d.transactionid = t.transactionid inner join [IcSoftLedgerVer3].dbo.accountheads ah on ah.accountid = ac.accountid

where t.drcr='Dr'  and ac.olevelid=2

and ac.accountid like '%'

 and ac.id like '%'

 and costcentreid like '%'

 and t.LocationID like '%'

and t.transactiondate <= getdate()

And round(t.amount - isnull(D.AdAmount,0),0) <> 0   and t.TrTypeNo<>50

 

Union All

select '0' as tempval,ah.accountname as categ,ac.name as name,

round(t.amount - isnull(D.AdAmount,0),0) as Amount,cr.CreditPeriod

from [IcSoftLedgerVer3].dbo.accounts ac  

inner join [IcSoftLedgerVer3].dbo.transactions t   on t.accountid=ac.id

inner join [IcSoftLedgerVer3].dbo.transactiontype tt   on tt.transtypeno = t.trtypeno

inner join Customer c   on c.AccID=t.AccountID

left join CustomerCrPeriod cr   on cr.CustomerId=c.CustId

left outer join (

SELECT [IcSoftLedgerVer3].dbo.Transactions.Transactionid,isnull(SUM([IcSoftLedgerVer3].dbo.Adjustment.AdAmount),0) as AdAmount FROM [IcSoftLedgerVer3].dbo.Transactions

INNER JOIN [IcSoftLedgerVer3].dbo.Adjustment   ON [IcSoftLedgerVer3].dbo.Transactions.TransactionID = [IcSoftLedgerVer3].dbo.Adjustment.AdTransactionID

INNER JOIN [IcSoftLedgerVer3].dbo.Transactions Transactions_1   ON [IcSoftLedgerVer3].dbo.Adjustment.TransactionID = Transactions_1.TransactionID

where [IcSoftLedgerVer3].dbo.Transactions.Approved='Y'  and transactions_1.approved='Y'

and Transactions_1.TransactionDate <= getdate()

group by [IcSoftLedgerVer3].dbo.Transactions.Transactionid

) D on d.transactionid = t.transactionid inner join [IcSoftLedgerVer3].dbo.accountheads ah on ah.accountid = ac.accountid

where t.drcr='Dr'  and ac.olevelid=2

and ac.accountid like '%'

 and ac.id like '%'

 and costcentreid like '%'

 and t.LocationID like '%'

and t.transactiondate <= getdate()

And round(t.amount - isnull(D.AdAmount,0),0) > 0  and ac.accountid = 448

 

)z group by z.Tempval,z.Category,z.name,CreditPeriod

) Temp Group By  AgeSlab,categ,name,tempval ,CreditPeriod

having round(sum(amount),2)<>0

)

GO