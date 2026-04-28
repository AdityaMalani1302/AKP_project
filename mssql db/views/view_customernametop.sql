create view CustomerNameTop as

(Select  si.Name,sum(TotalRej) Rej,sum(TotalDespatch) Despatch,

case when sum(TotalDespatch)>0 then (sum(TotalRej)/sum(TotalDespatch)) * 100 ELSE case when sum(TotalDespatch) =0 then 0 Else

100 END END [Rej%]

from

(select datename(month,DespatchDate)Months,0 TotalRej,sum(DespatchQty*Weight) TotalDespatch,pt.PartyID,Pro.RawMatID

from Despatch A

inner join purchaseproduct PP On PP.PoProductID=A.PoProductID

inner join Purchase P On P.PoID=PP.PoID

inner join PartyDetail pt on pt.PartyID=p.custid

inner join RawMaterial pro on pro.RawMatID=a.ProdId

where  DespatchDate >= '2025-04-01'

group by datename(month,DespatchDate),pt.PartyID,Pro.RawMatID

union all

select datename(month,ir.RejDate)Months,Sum(RejQty*p.Weight) As TotalRej,0 TotalDespatch,pt.PartyID,p.RawMatID

from Invent_rejection Ir 

inner join Invent_GrnMaterialdetail igm  on igm.GRNID=ir.GrnId

inner join Invent_Grn ig  on ig.GrnNo=igm.Grnno

Inner Join RawMaterial p  On p.Rawmatid=igm.Rawmatid

inner join PartyDetail pt on pt.PartyID=ig.SupId

where ir.RejDate >=  '2025-04-01'   and ig.AddnlParameter='Customer Return'

group by datename(month,ir.RejDate),p.RawMatID ,pt.PartyID

) A

inner  join PartyDetail si  on si.PartyID=a.PartyID

inner Join Product P On A.RawMatID=P.ProdID

group by si.Name

)

go