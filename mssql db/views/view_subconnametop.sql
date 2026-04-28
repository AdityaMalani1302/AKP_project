create View [dbo].[SubconNameTop] as

(select rej.SubConName,isnull(sum(OutQty*RawCastingWeight),0)OutWt,sum((Rejqty*RawCastingWeight)) as RejWt,

case when isnull(sum(OutQty*RawCastingWeight),0)=0 then '100' else (sum((Rejqty*RawCastingWeight))*100)/isnull(sum(OutQty*RawCastingWeight),0) end  RejPer

from

(select s.SubConName,InternalPartNo,RawCastingWeight,RejType,sum(PSCD.Rejqty) RejQty,round(Sum(PSCD.Rejqty*RawCastingWeight ),2) RejWt

From ProdnSubContractorCause PSCD

Inner Join Rejection R On PSCD.Rejid=R.Rejid

inner Join ProdnSubContractorDetails  PSC On PSC.SubConDetID=PSCD.SubConDetID

inner join Product P on P.ProdID=PSC.ProdID

inner join Grade G on P.GID=G.GradeID

inner join SubContractor S on S.SubConId=PSC.SubConID

left outer join Invent_Rawmaterial ir on ir.Af_ID=p.RawMatID

where    PSC.InWardDate >= '2024-04-01' 

Group By InternalPartNo,RawCastingWeight,RejType,s.SubConName) Rej

Left Outer JOIN (select r.RawMatCode,Sum(igm.Gqty) OutQty

from invent_grn ig

inner join INVENT_GRNMATERIALDETAIL IGM on IGM.Grnno=ig.GrnNo

inner join Subcontractor S on S.SubconId=ig.SupId

inner join RawMaterial r on r.rawmatId=igm.rawmatId

where ig.GrnDate >= '2025-04-01'

and ig.AddnlParameter = 'Subcon Output Inward'

GROUP BY r.RawMatCode

) inward On Rej.InternalPartNO=inward.RawMatCode

group by rej.SubConName

having (case when isnull(sum(OutQty*RawCastingWeight),0)=0 then '100' else (sum((Rejqty*RawCastingWeight))*100)/isnull(sum(OutQty*RawCastingWeight),0) end)<>100

)

GO