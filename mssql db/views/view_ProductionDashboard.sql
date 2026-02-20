create view ProductionDashboard as (select LEFT(GRADEName,2)MainGrade,GRADEName as Grade,internalpartno as PartNo,machname as BoxSize,

cast(datename(month, StgDate)as varchar)+' - '+CAST(Year(StgDate)as varchar)as Month,sum(OkWt) Pouredweight,Sum(OkWt)-Sum(CummRejWt) OkWeight,

Sum(CummRejWt) RejWeight

 

from View_productionSummary

where  StgDate >=   '2025-04-01'   

AND  StgDate <=    GETDATE()  

Group by internalpartno,GRADEName,year(StgDate),datename(month, StgDate),machname

)