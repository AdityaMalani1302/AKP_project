USE [IcSoftVer3]
GO

/****** Object:  Table [dbo].[PPC]    Script Date: 01/12/2026 11:25:08 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

SET ANSI_PADDING ON
GO

CREATE TABLE [dbo].[PPC](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[ItemCode] [varchar](50) NOT NULL,
	[CustName] [varchar](50) NOT NULL,
	[SQty] [numeric](18, 0) NULL,
	[PlanDate] [datetime] NULL
) ON [PRIMARY]

GO

SET ANSI_PADDING OFF
GO


