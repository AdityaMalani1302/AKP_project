USE [IcSoftVer3]
GO

/****** Object:  Table [dbo].[Lab_Micro]    Script Date: 10-Dec-2025 2:45:17 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Lab_Micro](
	[ID] [numeric](18, 0) IDENTITY(1,1) NOT NULL,
	[Date] [datetime2](7) NULL,
	[HeatNo] [nvarchar](50) NULL,
	[Grade] [nvarchar](50) NULL,
	[PartNo] [nvarchar](50) NULL,
	[Nodularity] [nvarchar](50) NULL,
	[Graphitetype] [nvarchar](50) NULL,
	[NodularityCount] [nvarchar](50) NULL,
	[GraphiteSize] [nvarchar](50) NULL,
	[Pearlite] [nvarchar](50) NULL,
	[Ferrite] [nvarchar](50) NULL,
	[Carbide] [nvarchar](50) NULL,
	[CastingHardness] [nvarchar](50) NULL
) ON [PRIMARY]

GO

USE [IcSoftVer3]
GO

/****** Object:  Table [dbo].[Lab_PhysicalProperties]    Script Date: 10-Dec-2025 2:46:05 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Lab_PhysicalProperties](
	[Id] [numeric](18, 0) IDENTITY(1,1) NOT NULL,
	[Date] [datetime] NOT NULL,
	[HeatNo] [nvarchar](50) NOT NULL,
	[Grade] [nvarchar](50) NULL,
	[PartNo] [nvarchar](50) NULL,
	[UTS N/mm²] [nvarchar](50) NULL,
	[Yield Stress N/mm²] [nvarchar](50) NULL,
	[Elongation %] [nvarchar](50) NULL,
	[Impact In Joule(J)] [nvarchar](50) NULL
) ON [PRIMARY]

GO

USE [IcSoftVer3]
GO

/****** Object:  Table [dbo].[Lab_Sand]    Script Date: 10-Dec-2025 2:46:46 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Lab_Sand](
	[Id] [numeric](18, 0) IDENTITY(1,1) NOT NULL,
	[Date] [datetime] NOT NULL,
	[Shift] [nvarchar](50) NOT NULL,
	[InspectionTime] [nvarchar](50) NOT NULL,
	[HeatNo] [nvarchar](50) NULL,
	[PartNo] [nvarchar](50) NOT NULL,
	[PartName] [nvarchar](50) NOT NULL,
	[Moisture In %] [float] NOT NULL,
	[Compactability In %] [float] NOT NULL,
	[Permeability In No] [nvarchar](50) NOT NULL,
	[Green Compression Strength] [nvarchar](50) NOT NULL,
	[Return Sand Temp] [numeric](18, 0) NOT NULL,
	[TOTAL CLAY 11.0 - 14.50%] [float] NULL,
	[ACTIVE CLAY 7.0 - 9.0%] [float] NULL,
	[DEAD CLAY 3.0 - 4.50%] [float] NULL,
	[VOLATILE MATTER 2.30 - 3.50%] [float] NULL,
	[LOSS ON IGNITION 4.0 - 7.0%] [float] NULL,
	[AFS No  45 - 55] [float] NULL
) ON [PRIMARY]

GO

USE [IcSoftVer3]
GO

/****** Object:  Table [dbo].[Lab_Spectro]    Script Date: 10-Dec-2025 2:47:16 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Lab_Spectro](
	[Id] [numeric](18, 0) IDENTITY(1,1) NOT NULL,
	[Date] [datetime] NOT NULL,
	[HeatNo] [nvarchar](50) NOT NULL,
	[Grade] [nvarchar](50) NOT NULL,
	[PartNo] [nvarchar](50) NOT NULL,
	[CE] [nvarchar](50) NOT NULL,
	[C] [nvarchar](50) NOT NULL,
	[Si] [nvarchar](50) NOT NULL,
	[Mn] [nvarchar](50) NOT NULL,
	[P] [nvarchar](50) NOT NULL,
	[S] [nvarchar](50) NOT NULL,
	[Cu] [nvarchar](50) NOT NULL,
	[Cr] [nvarchar](50) NOT NULL,
	[Al] [nvarchar](50) NOT NULL,
	[Pb] [nvarchar](50) NOT NULL,
	[Sn] [nvarchar](50) NOT NULL,
	[Ti] [nvarchar](50) NOT NULL,
	[Mg] [nvarchar](50) NOT NULL,
	[Mo] [nvarchar](50) NULL,
	[MeltingSupervisor] [nvarchar](50) NULL,
	[LabSupervisor] [nvarchar](50) NULL
) ON [PRIMARY]

GO

USE [IcSoftVer3]
GO

/****** Object:  Table [dbo].[MouldHardness]    Script Date: 10-Dec-2025 2:48:02 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[MouldHardness](
	[Date] [datetime2](7) NULL,
	[HeatNo] [nvarchar](50) NULL,
	[PartNo] [nvarchar](50) NULL,
	[BoxNo1] [nvarchar](50) NULL,
	[BoxNo2] [nvarchar](50) NULL,
	[BoxNo3] [nvarchar](50) NULL,
	[BoxNo4] [nvarchar](50) NULL,
	[BoxNo5] [nvarchar](50) NULL,
	[BoxNo6] [nvarchar](50) NULL,
	[BoxNo7] [nvarchar](50) NULL,
	[BoxNo8] [nvarchar](50) NULL,
	[BoxNo9] [nvarchar](50) NULL,
	[BoxNo10] [nvarchar](50) NULL,
	[BoxNo11] [nvarchar](50) NULL,
	[BoxNo12] [nvarchar](50) NULL,
	[BoxNo13] [nvarchar](50) NULL,
	[BoxNo14] [nvarchar](50) NULL,
	[BoxNo15] [nvarchar](50) NULL,
	[BoxNo16] [nvarchar](50) NULL,
	[BoxNo17] [nvarchar](50) NULL,
	[BoxNo18] [nvarchar](50) NULL,
	[BoxNo19] [nvarchar](50) NULL,
	[BoxNo20] [nvarchar](50) NULL,
	[BoxNo21] [nvarchar](50) NULL,
	[BoxNo22] [nvarchar](50) NULL,
	[BoxNo23] [nvarchar](50) NULL,
	[BoxNo24] [nvarchar](50) NULL,
	[BoxNo25] [nvarchar](50) NULL,
	[Id] [numeric](18, 0) IDENTITY(1,1) NOT NULL
) ON [PRIMARY]

GO





