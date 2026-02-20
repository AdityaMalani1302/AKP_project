create view CustomerRecovery as

(

SELECT  '' as [Sl no],LEFT(convert(varchar,TransactionDate,112),6)MM,cast(datename(month,TransactionDate)as varchar)+'-'+convert(varchar,year(TransactionDate)) as TransactionDate

 

,sum(t.DomAmount)as DomesticAmount,sum(ExpAmount) as ExportAmount

,sum(t.DomAmount)+sum(ExpAmount) as TotalAmount

From (

 

SELECT

 

(

select ah.accountname

 

from [IcSoftLedgerVer3].dbo.accountheads ah

inner join [IcSoftLedgerVer3].dbo.accounts ac on ac.accountid=ah.accountid

where ac.id=tq1.AccountID) as categ,

tq.TransactionDate as TransactionDate

,sum(case when a.AdAmount>0 then AdAmount else tq1.Amount end )as DomAmount,

0 ExpAmount

 

FROM [IcSoftLedgerVer3].dbo.TransactionsQuery tq INNER JOIN [IcSoftLedgerVer3].dbo.TransactionsQuery Tq1

ON tq.TransactionType = tq1.TransactionType

AND tq.TransactionNumber = tq1.TransactionNumber

AND tq1.TransactionID <> tq.TransactionID

left join IcSoftLedgerVer3..Adjustment a on TrNo=tq1.TransactionNumber

WHERE (tq.Approved='Y') And (tq.OLevelID = 10 or tq.OLevelID = 23 OR tq.OLevelID = 1)

AND tq.DrCr = 'Dr'

And tq1.OlevelID = 2 

 AND tq.TransactionDate <= GETDATE()

 AND tq.TransactionDate >= '2025-04-01'

 

AND tq1.account_id=350 

 

 

group by tq.TransactionDate,tq1.Amount,tq1.AccountID

 

union all

 

SELECT

 

(

select ah.accountname

 

from [IcSoftLedgerVer3].dbo.accountheads ah

inner join [IcSoftLedgerVer3].dbo.accounts ac on ac.accountid=ah.accountid

where ac.id=tq1.AccountID) as categ,

tq.TransactionDate as TransactionDate

,0 as DomAmount

,sum(case when a.AdAmount>0 then AdAmount else tq1.Amount end ) ExpAmount

 

FROM [IcSoftLedgerVer3].dbo.TransactionsQuery tq INNER JOIN [IcSoftLedgerVer3].dbo.TransactionsQuery Tq1

ON tq.TransactionType = tq1.TransactionType

AND tq.TransactionNumber = tq1.TransactionNumber

AND tq1.TransactionID <> tq.TransactionID

left join IcSoftLedgerVer3..Adjustment a on TrNo=tq1.TransactionNumber

WHERE (tq.Approved='Y') And (tq.OLevelID = 10 or tq.OLevelID = 23 OR tq.OLevelID = 1)

AND tq.DrCr = 'Dr'

And tq1.OlevelID = 2 

AND tq.TransactionDate <= GETDATE() 

AND tq.TransactionDate >= '2025-04-01' 

AND tq1.account_id=351 

 

 

group by tq.TransactionDate,tq1.Amount,tq1.AccountID

 

) t group by LEFT(convert(varchar,TransactionDate,112),6),cast(datename(month,TransactionDate)as varchar)+'-'+convert(varchar,year(TransactionDate))

 

)