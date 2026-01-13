create view MeltingDashboard as (select 

cast(datename(month, StgDate)as varchar)+' - '+CAST(Year(StgDate)as varchar)as Month

,E.Grade Grade,count(A.GroupBatchNo) HeatNO,

sum(A.OkWt) Metal

from ProdnForgingStages A

inner join Machine F On A.MAchID=F.MachID

inner join

 ( select RawMatID,RawMatName Grade,RawMatCode

from RawMaterial where GrnTypeId in (176))  E On E.RawMAtID=A.ProdID

where   stgdate Between '2025-04-01' 

and  GETDATE() 

group by  cast(datename(month, StgDate)as varchar)+' - '+CAST(Year(StgDate)as varchar),E.Grade

)