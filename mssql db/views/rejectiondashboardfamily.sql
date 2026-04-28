USE [IcSoftVer3]

GO

 

/****** Object:  View [dbo].[RejectionAnalysis]    Script Date: 03/23/2026 10:09:29 ******/

SET ANSI_NULLS ON

GO

 

SET QUOTED_IDENTIFIER ON

GO

 

 

 

 

Create view [dbo].[RejectionAnalysisFamily] as (

select cast(datename(month, Dates)as varchar)+'-' +cast(datename(year,dates)as varchar) as Months

,ir.Product_Range ProductType,ir.Segment_Type SegmentType

,isnull(Sum(OkQTy),0) ProductionQty,isnull(Sum(OkQty*ir.RawCastingWeight),0) as ProductionWeight

,isnull(sum(OutQty),0) SubconOutQty,round(isnull(sum(OutQty*ir.RawCastingWeight),0),2) as SubconOutweight

,isnull(SUM(DispQty),0) DespatchQty

,isnull(SUM(DispQty*weight),0) DespatchWeight,

isnull(sum(RejQty),0) ProductionRejQty,isnull(sum(RejQty*ir.RawCastingWeight),0) InhouseRejWt,

isnull(sum(SubRejQty),0) SubConRejQty,isnull(sum(SubRejQty*ir.RawCastingWeight),0) SubconRejWt,

isnull(sum(CustRejQty),0) CustEndRejQty,isnull(sum(CustRejQty*ir.RawCastingWeight),0) CustEndRejWt,

isnull(sum(RejQty)+sum(SubRejQty)+sum(CustRejQty),0) TotalRejQty,isnull((sum(RejQty*ir.RawCastingWeight)+sum(SubRejQty*ir.RawCastingWeight)+

sum(CustRejQty*ir.RawCastingWeight)),0) TotalWeight

from Product A

Inner Join RawMaterial B On A.ProdID=B.RawMatID

left join invent_rawmaterial ir on ir.af_id=a.prodid

inner Join (

select stgdate dates,ProdID,Sum(OkQty) OkQty,0 DespQty,sum(CummRejQty) RejQty,0 SubRejQTy,0 CustRejQty,0 OutQty,'' Customer,0 DispQty,0 dispwt from  view_ProductionSummary

where   StgDATE >=   '2020-04-01'   and ProcessID in (19)  and   ProdID like '%'

group by ProdID,stgdate

 

union all

select  dates,sub.ProdID,0,0,0,Sum(SubRejQty) SubRejQty,0,0,'',0 DispQty,0 dispwt from (

select o.InspDate dates,B.ProdID ProdID,Sum(A.RejQty) SubRejQty from ProdnSubContractorCause A

INNER JOIN ProdnSubContractorDetails B On A.SubconDetID=B.SubconDetID

inner join OtherInspection o on o.OtherInspId=A.OtherInspId

WHere o.InspDate >=   '2020-04-01'  and ProdID like '%'

Group by ProdID,o.inspdate

union all

select ir.rejdate dates,p.ProdID ProdID,Sum(RejQty) SubRejQty

from Invent_rejection Ir 

inner join Invent_GrnMaterialdetail igm  on igm.GRNID=ir.GrnId

inner join invent_grn ig on ig.grnno=igm.Grnno

Inner Join Product p  On p.Rawmatid=igm.Rawmatid

where ir.RejDate >=   '2020-04-01'  and ir.RejMode='Rejected' and ig.AddnlParameter<>'Customer Return'

and p.ProdID  like '%'

group by p.ProdID,ir.rejdate

)sub

group by ProdID,dates

 

UNION ALL

select im.mindate dates,R.RawMatID,0,0,0,0,0,sum(imm.Qty)OutwardQty,'',0 DispQty,0 dispwt

from invent_min im

inner join Invent_MinMaterial imm on im.MinNo=imm.Minno

inner join Subcontractor S on S.SubconId=im.VendorID

left outer join RawMaterial r on r.rawmatId=imm.rawmatId

inner join Invent_grnmaterialdetail IGM   on IGM.Grnid=imm.Grnid

where im.mindate >=   '2020-04-01'

and  im.VendorID like '%'  and im.LocationId =  1  and r.RawMatID like '%'

and im.AddnlParameter = 'Issue To Subcontractor'

group by   R.RawMatID,im.mindate

 

union all

select ir.RejDate dates,p.ProdID,0,0,0,0,Sum(RejQty) RejQty,0 ,si.Name,0 DispQty,0 dispwt

from Invent_rejection Ir 

inner join Invent_GrnMaterialdetail igm  on igm.GRNID=ir.GrnId

inner join Invent_Grn ig  on ig.GrnNo=igm.Grnno

Inner Join Product p  On p.Rawmatid=igm.Rawmatid

left outer join PartyDetail si  on si.PartyID=ig.supid

where ir.RejDate >=   '2020-04-01'  and ig.AddnlParameter='Customer Return'

and p.ProdID like '%'

group by p.ProdID,si.Name,ir.RejDate

 

union all

select DespatchDATE dates,d.ProdID,0,0,0,0,0 RejQty,0 ,'',Sum(DespatchQty) DispQty,SUM(Despatchqty*weight) as Dispwt from Despatch d

inner join RawMaterial r on r.rawmatid=d.ProdId

where DespatchDATE  >=   '2020-04-01'  and r.RawMatID like '%'

group by d.ProdID,DespatchDATE

 

) C On A.ProdID=C.ProdID --and c.PDID=b.Pdid

 

--where a.CategoryID in (120,118,119,126,121,125,127)

group by cast(datename(month, Dates)as varchar),cast(datename(year,dates)as varchar),ir.Product_Range,ir.Segment_Type

)

 

 

 

 

GO