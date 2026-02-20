create view InhouseTop as

(

select Top 10 InternalPartNo,Sum(OkQty*ir.RawCastingWeight) inhouseokWt,sum(CummRejQty*ir.RawCastingWeight) inhouseRejWt

from  view_ProductionSummary vp

left outer join Invent_Rawmaterial ir on ir.Af_ID=vp.ProdID

where   StgDATE >=  '2025-04-01' and ProcessID in (19)

group by InternalPartNo

order by inhouseRejWt desc

)

GO