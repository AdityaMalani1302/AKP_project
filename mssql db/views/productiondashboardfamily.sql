USE [IcSoftVer3]

GO

 

/****** Object:  View [dbo].[ProductionDashboard]    Script Date: 03/18/2026 12:22:46 ******/

SET ANSI_NULLS ON

GO

 

SET QUOTED_IDENTIFIER ON

GO

 

 

Create view [dbo].[ProductionDashboardFamily] as

(select ir.Product_Range ProductType, ir.Segment_Type SegmentType,

cast(datename(month, StgDate)as varchar)+' - '+CAST(Year(StgDate)as varchar)as Month,sum(OkWt) Pouredweight,Sum(OkWt)-Sum(CummRejWt) OkWeight,

Sum(CummRejWt) RejWeight

 

from View_productionSummary vp

inner join rawmaterial r on r.rawmatid=vp.prodid

left join invent_rawmaterial ir on ir.Af_ID=vp.ProdID

where  StgDate >=   '2020-04-01'   

AND  StgDate <=    GETDATE()  

Group by ir.Product_Range, ir.Segment_Type,year(StgDate),datename(month, StgDate)

)

 

 

 

GO