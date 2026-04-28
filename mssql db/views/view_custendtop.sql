create view CustendTop as

(select top 10 InternalPartNo,SUM(DispWt)DespatchWeight,SUM(Rejwt)CustRejWt,round((SUM(Rejwt)/SUM(DispWt))*100,2)as RejPer  from

(select ir.RejDate dates,p.InternalPartNo InternalPartNo,Sum(RejQty*r.Weight) Rejwt,0 DispWt

from Invent_rejection Ir 

inner join Invent_GrnMaterialdetail igm  on igm.GRNID=ir.GrnId

inner join Invent_Grn ig  on ig.GrnNo=igm.Grnno

Inner Join Product p  On p.Rawmatid=igm.Rawmatid

inner join RawMaterial r on r.rawmatid=p.ProdId

left outer join PartyDetail si  on si.PartyID=ig.supid

where ir.RejDate >=   '2025-04-01'  and ig.AddnlParameter='Customer Return'

and p.ProdID like '%'

group by p.InternalPartNo,ir.RejDate

 

union all

select DespatchDATE dates,r.RawMatCode as InternalPartNo,0 Rejwt,Sum(DespatchQty*Weight) DispWt from Despatch d

inner join RawMaterial r on r.rawmatid=d.ProdId

where DespatchDATE  >=   '2025-04-01'  and r.RawMatID like '%'

group by r.RawMatCode,DespatchDATE

) CustEnd

group by InternalPartNo

order by CustRejWt desc

)

go