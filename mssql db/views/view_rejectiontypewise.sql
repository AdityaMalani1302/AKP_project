create view RejectionTypeWise as (

select  r.description,

--LEFT(CONVERT(varchar,Dates ,112),6)+' - '+cast(datename(month, Dates)as varchar) as Months,

sum(InhRejWt) InhRejtypeWt,

SUM(SubRejWt) SubRejtypeWt,

SUM(CustRejWt) CustRejtypeWt

 

from Rejection  R

left outer Join (

select e.RejId,isnull(F.InspDate,A.stgdate)  as Dates,p.ProdID,sum(E.RejQty*ir.RawCastingWeight) as InhRejWt,0 as SubRejWt,0 as CustRejWt

from ProdnForgingStagesCause E

left outer join OtherInspection F On E.OtherInspId=F.OtherInspID and F.InspectionID=E.ProdnForgingStagesID

left outer join ProdnForgingStages A On E.ProdnForgingStagesID=A.ProdnForgingStagesID

left outer join product p on p.ProdId=A.ProdId

left join Invent_Rawmaterial ir on ir.Af_ID=a.ProdID

where A.stgdate between '2025-04-01' and GETDATE() OR F.Inspdate between '2025-04-01' and GETDATE()

group by p.ProdID,e.RejId,F.InspDate,A.stgdate

 

union all

 

----------------------------New Code 20.02.2025----------

select sub.RejId,sub.dates as Dates,sub.prodid,0 as InhRejWt,round(Sum(sub.SubRejQty*ir.RawCastingWeight),2) SubRejWt,0 as CustRejWt

from(

select a.rejid rejid,B.inwarddate dates,p.prodid prodid,p.productweight ProductWeight,A.rejqty SubRejQty from ProdnSubContractorCause A

INNER JOIN ProdnSubContractorDetails B On A.SubconDetID=B.SubconDetID

inner join product p on p.ProdId=B.ProdId

WHere InwardDate Between  '2025-04-01' and GETDATE()

union all

select ir.rejid rejid,ir.RejDate dates,p.ProdID ProdID,p.productweight ProductWeight,(RejQty) SubRejQty

from Invent_rejection Ir 

inner join Invent_GrnMaterialdetail igm  on igm.GRNID=ir.GrnId

inner join invent_grn ig on ig.grnno=igm.Grnno

Inner Join Product p  On p.Rawmatid=igm.Rawmatid

where ir.RejDate between '2025-04-01' and GETDATE() and ir.RejMode='Rejected' and ig.AddnlParameter<>'Customer Return'

 

)sub

left join Invent_Rawmaterial ir on ir.Af_ID=sub.prodid

group by sub.RejId,sub.dates ,sub.prodid

---------------------------------New code end-----------------

 

union all

 

select ir.RejId,ir.RejDate as Dates,p.ProdId as prodid,0,0,Sum(RejQty*r.RawCastingWeight) CustRejWt

from Invent_rejection Ir 

inner join Invent_GrnMaterialdetail igm  on igm.GRNID=ir.GrnId

inner join Invent_Grn ig  on ig.GrnNo=igm.Grnno

Inner Join Product p  On p.Rawmatid=igm.Rawmatid

left join Invent_Rawmaterial r on r.Af_ID=igm.Rawmatid

where ir.RejDate between '2025-04-01' and GETDATE() and ig.AddnlParameter='Customer Return'

group by p.ProdID,ir.RejDate,ir.RejId

 

) C On r.RejID=c.RejId

inner join Product p on p.ProdId=c.ProdID

where  P.ProdID like '%'  and  p.CategoryID not in (138) and

  Dates between '2025-04-01' and GETDATE()

group by r.description

 

)