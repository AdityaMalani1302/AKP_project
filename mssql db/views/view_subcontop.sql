create view SubconTop as

(

select Top 10 InternalPartNo,SUM(OutwardWt)OutwardWt,SUM(SubRejweight)SubRejweight,round((SUM(SubRejweight)/SUM(OutwardWt))*100,2)as RejPer from

(

select  dates dates,sub.InternalPartNo InternalPartNo,0 Outwardwt,Sum(SubRejwt) SubRejweight from

(

select o.InspDate dates,p.InternalPartNo InternalPartNo,Sum(A.RejQty*RawCastingWeight) SubRejwt

from ProdnSubContractorCause A

INNER JOIN ProdnSubContractorDetails B On A.SubconDetID=B.SubconDetID

inner join OtherInspection o on o.OtherInspId=A.OtherInspId

Inner Join Product p  On p.Rawmatid=b.ProdId

left outer join Invent_Rawmaterial ir on ir.Af_ID=p.RawMatID

WHere o.InspDate >=   '2025-04-01' 

Group by p.InternalPartNo,o.inspdate

union all

select ir.rejdate dates,p.InternalPartNo InternalPartNo,Sum(RejQty*RawCastingWeight) SubRejwt

from Invent_rejection Ir 

inner join Invent_GrnMaterialdetail igm  on igm.GRNID=ir.GrnId

inner join invent_grn ig on ig.grnno=igm.Grnno

Inner Join Product p  On p.Rawmatid=igm.Rawmatid

left outer join Invent_Rawmaterial irm on irm.Af_ID=p.RawMatID

where ir.RejDate >=   '2025-04-01'  and ir.RejMode='Rejected' and ig.AddnlParameter<>'Customer Return'

group by p.InternalPartNo,ir.rejdate

)sub

group by sub.InternalPartNo,dates

 

UNION ALL

select im.mindate dates,R.RawMatCode InternalPartNo,sum(imm.Qty*RawCastingWeight) OutwardWt,0 SubRejwt

from invent_min im

inner join Invent_MinMaterial imm on im.MinNo=imm.Minno

inner join Subcontractor S on S.SubconId=im.VendorID

left outer join RawMaterial r on r.rawmatId=imm.rawmatId

left outer join Invent_Rawmaterial ir on ir.Af_ID=r.RawMatID

inner join Invent_grnmaterialdetail IGM   on IGM.Grnid=imm.Grnid

where im.mindate >=   '2025-04-01'

and im.AddnlParameter = 'Issue To Subcontractor'

group by  R.RawMatCode,im.mindate

)Subcon

group by InternalPartNo

order by SubRejweight desc

)

GO