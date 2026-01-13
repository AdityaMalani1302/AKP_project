create view FinanceDashboard as

(

Select 'REVENUE' as MainGroup,'DIRECT REVENUE' as SubGroup,ah.AccountName,ac.Name,cast(datename(month,t.TransactionDate)as varchar)+' - '+CAST(Year(t.TransactionDate)as varchar)as Month,

sum(case when t.DrCr='Cr' then t.Amount else -(t.Amount) end) as Valuses

from [IcSoftLedgerVer3].dbo.transactions t

inner join [IcSoftLedgerVer3].dbo.accounts ac on ac.id = t.accountid

left join [IcSoftLedgerVer3].dbo.accountheads ah on ah.accountid = ac.accountid

where transactiondate between '2025-04-01' and getdate() and ac.AccountID in (87)  and approved = 'Y' and edited <> 'D' and trtypeno <> -1

group by ah.AccountName,ac.Name,cast(datename(month,t.TransactionDate)as varchar),CAST(Year(t.TransactionDate)as varchar)

union all

Select 'REVENUE' as MainGroup,'DIRECT REVENUE' as SubGroup,ah.AccountName,ac.Name,cast(datename(month,t.TransactionDate)as varchar)+' - '+CAST(Year(t.TransactionDate)as varchar)as Month,

sum(case when t.DrCr='Cr' then t.Amount else -(t.Amount) end) as Valuses

from [IcSoftLedgerVer3].dbo.transactions t

inner join [IcSoftLedgerVer3].dbo.accounts ac on ac.id = t.accountid

left join [IcSoftLedgerVer3].dbo.accountheads ah on ah.accountid = ac.accountid

where transactiondate between '2025-04-01' and getdate() and ac.AccountID in (89)  and approved = 'Y' and edited <> 'D' and trtypeno <> -1

group by ah.AccountName,ac.Name,cast(datename(month,t.TransactionDate)as varchar),CAST(Year(t.TransactionDate)as varchar)

union all

Select 'REVENUE' as MainGroup,'INDIRECT REVENUE' as SubGroup,'OTHER REVENUE'  AccountName,ac.Name,cast(datename(month,t.TransactionDate)as varchar)+' - '+CAST(Year(t.TransactionDate)as varchar)as Month,

sum(case when t.DrCr='Cr' then t.Amount else -(t.Amount) end) as Valuses

from [IcSoftLedgerVer3].dbo.transactions t

inner join [IcSoftLedgerVer3].dbo.accounts ac on ac.id = t.accountid

left join [IcSoftLedgerVer3].dbo.accountheads ah on ah.accountid = ac.accountid

where transactiondate between '2025-04-01' and getdate() and ac.ID in (5792,5793,5794,5796,5797,5798,6070,6097,6178,6503,6504,6511,6625,6767,6768,6773)

and approved = 'Y' and edited <> 'D' and trtypeno <> -1

group by ah.AccountName,ac.Name,cast(datename(month,t.TransactionDate)as varchar),CAST(Year(t.TransactionDate)as varchar)

union all

Select 'REVENUE' as MainGroup,'INDIRECT REVENUE' as SubGroup,'DUTY DRAWBACK INCENTIVE RECEIVED' AccountName,ac.Name,cast(datename(month,t.TransactionDate)as varchar)+' - '+CAST(Year(t.TransactionDate)as varchar)as Month,

sum(case when t.DrCr='Cr' then t.Amount else -(t.Amount) end) as Valuses

from [IcSoftLedgerVer3].dbo.transactions t

inner join [IcSoftLedgerVer3].dbo.accounts ac on ac.id = t.accountid

left join [IcSoftLedgerVer3].dbo.accountheads ah on ah.accountid = ac.accountid

where transactiondate between '2025-04-01' and getdate() and ac.id in (5795)  and approved = 'Y' and edited <> 'D' and trtypeno <> -1

group by ah.AccountName,ac.Name,cast(datename(month,t.TransactionDate)as varchar),CAST(Year(t.TransactionDate)as varchar)

Union All

Select 'PURCHASE' as MainGroup,'RAW MATERIAL PURCHASE' SubGroup,ah.AccountName,ac.name,cast(datename(month,t.TransactionDate)as varchar)+' - '+CAST(Year(t.TransactionDate)as varchar)as Month,

sum(case when t.DrCr='Dr' then t.Amount else -(t.Amount) end) as Valuess

from [IcSoftLedgerVer3].dbo.transactions t

inner join [IcSoftLedgerVer3].dbo.accounts ac on ac.id = t.accountid

inner join [IcSoftLedgerVer3].dbo.accountheads ah on ah.accountid = ac.accountid

where transactiondate between '2025-04-01' and getdate() and ah.AccountID in (524,525,526)

group by ah.AccountName,ac.Name,cast(datename(month,t.TransactionDate)as varchar),CAST(Year(t.TransactionDate)as varchar)

 

 

Union All

 

Select 'PURCHASE' as MainGroup,'INCREASE/DECREASE IN STOCK' SubGroup,  ah.AccountName,ac.name,cast(datename(month,t.TransactionDate)as varchar)+' - '+CAST(Year(t.TransactionDate)as varchar)as Month,

sum(case when t.DrCr='Dr' then t.Amount else -(t.Amount) end) as Valuess

from [IcSoftLedgerVer3].dbo.transactions t

inner join [IcSoftLedgerVer3].dbo.accounts ac on ac.id = t.accountid

inner join [IcSoftLedgerVer3].dbo.accountheads ah on ah.accountid = ac.accountid

where transactiondate between '2025-04-01' and getdate() and ah.AccountID in (548,549,550,551,552)

group by ah.AccountName,ac.Name,cast(datename(month,t.TransactionDate)as varchar),CAST(Year(t.TransactionDate)as varchar)

 

Union All

 

Select 'PURCHASE' as MainGroup,ah.AccountName SubGroup,ah.AccountName,ac.name,cast(datename(month,t.TransactionDate)as varchar)+' - '+CAST(Year(t.TransactionDate)as varchar)as Month,

sum(case when t.DrCr='Dr' then t.Amount else -(t.Amount) end) as Consumables

from [IcSoftLedgerVer3].dbo.transactions t

inner join [IcSoftLedgerVer3].dbo.accounts ac on ac.id = t.accountid

inner join [IcSoftLedgerVer3].dbo.accountheads ah on ah.accountid = ac.accountid

where transactiondate between '2025-04-01' and getdate() and ah.AccountID in (462,498,520,521,527,528,529,530,540)

group by ah.AccountName,ac.Name,cast(datename(month,t.TransactionDate)as varchar),CAST(Year(t.TransactionDate)as varchar)

 

Union All

 

 

Select 'OPERATING EXPENDITURE' as MainGroup,'INDIRECT EXPENSES' SubGroup,ah.AccountName,ac.name,cast(datename(month,t.TransactionDate)as varchar)+' - '+CAST(Year(t.TransactionDate)as varchar)as Month,

sum(case when t.DrCr='Dr' then t.Amount else -(t.Amount) end) as OperatingSal

from [IcSoftLedgerVer3].dbo.transactions t

inner join [IcSoftLedgerVer3].dbo.accounts ac on ac.id = t.accountid

inner join [IcSoftLedgerVer3].dbo.accountheads ah on ah.accountid = ac.accountid

where transactiondate between '2025-04-01' and getdate() and ah.AccountID in (16,502,503,504,505,506,507,508,535,536,537)

group by ah.AccountName,ac.Name,cast(datename(month,t.TransactionDate)as varchar),CAST(Year(t.TransactionDate)as varchar)

 

Union All

 

 

Select 'OPERATING EXPENDITURE' as MainGroup,'DIRECT EXPENSES' SubGroup,ah.AccountName,ac.name,cast(datename(month,t.TransactionDate)as varchar)+' - '+CAST(Year(t.TransactionDate)as varchar)as Month,

sum(case when t.DrCr='Dr' then t.Amount else -(t.Amount) end) as OperatingOther

from [IcSoftLedgerVer3].dbo.transactions t

inner join [IcSoftLedgerVer3].dbo.accounts ac on ac.id = t.accountid

inner join [IcSoftLedgerVer3].dbo.accountheads ah on ah.accountid = ac.accountid

where transactiondate between '2025-04-01' and getdate() and ah.AccountID in (15,464,499,500,501,522,531,532,533,534,545,555)

 

group by ah.AccountName,ac.Name,cast(datename(month,t.TransactionDate)as varchar),CAST(Year(t.TransactionDate)as varchar)
