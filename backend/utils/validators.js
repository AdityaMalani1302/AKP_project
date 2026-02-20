const { z } = require('zod');

// ============ Auth Schemas ============
const loginSchema = z.object({
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username must be less than 50 characters')
        .trim(),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password must be less than 100 characters'),
});

const registerSchema = z.object({
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username must be less than 50 characters')
        .trim(),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password must be less than 100 characters'),
    fullName: z.string()
        .min(2, 'Full name must be at least 2 characters')
        .max(100, 'Full name must be less than 100 characters')
        .trim(),
    role: z.enum(['admin', 'employee', 'manager']),
    allowedPages: z.array(z.string()).optional(),
});

// ============ Pattern Schemas ============
const patternSchema = z.object({
    Customer: z.coerce.number().int().positive('Customer is required'),
    Pattern_Maker: z.preprocess(
        (val) => (val === null || val === '' || val === undefined || val === 0) ? undefined : val,
        z.coerce.number().int().positive().optional()
    ),
    PatternNo: z.string().max(255).optional().nullable(),
    Bunch_Wt: z.string().max(255).optional().nullable(),
    YieldPercent: z.string().max(255).optional().nullable(),
    Moulding_Box_Size: z.string().max(255).optional().nullable(),
    parts: z.array(z.object({
        partNo: z.coerce.number().int().optional().nullable(),
        qty: z.coerce.number().int().min(0).optional().nullable(),
        weight: z.coerce.number().min(0).optional().nullable(),
    }).passthrough()).optional(),
    sleeveRows: z.array(z.object({
        sleeve_name: z.string().max(255).optional().nullable(),
        sleeve_type_size: z.union([z.string(), z.number()]).optional().nullable().transform(val => val != null ? String(val) : null),
        quantity: z.coerce.number().int().min(0).optional().nullable(),
    }).passthrough()).optional(),
}).passthrough();

// ============ Drawing Master Schema ============
const drawingMasterSchema = z.object({
    Customer: z.string().min(1, 'Customer is required').max(255),
    DrawingNo: z.string().min(1, 'Drawing No is required').max(100),
    RevNo: z.string().max(50).optional().nullable(),
    Description: z.string().max(500).optional().nullable(),
    CustomerGrade: z.string().max(100).optional().nullable(),
    AKPGrade: z.string().max(100).optional().nullable(),
    Remarks: z.string().max(1000).optional().nullable(),
    Comments: z.string().max(2000).optional().nullable(),
}).passthrough();

// ============ Planning Master Schema ============
const planningMasterSchema = z.object({
    ItemCode: z.string().min(1, 'Item Code is required').max(50),
    CustomerName: z.string().min(1, 'Customer Name is required').max(50),
    ScheduleQty: z.coerce.number().int().positive('Schedule Qty must be a positive number'),
    PlanDate: z.string().min(1, 'Plan Date is required'),
}).passthrough();

// ============ Planning Entry Schema ============
const planningEntrySchema = z.object({
    entries: z.array(z.object({
        planDate: z.string().optional().nullable(),
        patternId: z.coerce.number().optional().nullable(),
        patternNo: z.string().max(255).optional().nullable(),
        customerName: z.string().max(255).optional().nullable(),
        partNo: z.string().max(255).optional().nullable(),
        partName: z.string().max(255).optional().nullable(),
        plateQty: z.coerce.number().int().min(0).optional().nullable(),
        shift: z.string().max(255).optional().nullable(),
        mouldBoxSize: z.string().max(255).optional().nullable(),
    }).passthrough()).min(1, 'At least one entry is required'),
}).passthrough();

// ============ IT Management Schemas ============
const itAssetSchema = z.object({
    AssetTagNumber: z.string().max(50).optional().nullable(),
    AssetName: z.string().max(255).optional().nullable(),
    AssetType: z.string().max(50).optional().nullable(),
    Category: z.string().max(50).optional().nullable(),
    SerialNumber: z.string().max(100).optional().nullable(),
    Hostname: z.string().max(100).optional().nullable(),
    Location: z.string().max(255).optional().nullable(),
    AssetStatus: z.string().max(50).optional().nullable(),
    PurchaseCost: z.coerce.number().min(0).optional().nullable(),
}).passthrough();

const itComplaintSchema = z.object({
    EmployeeName: z.string().max(255).optional().nullable(),
    Department: z.string().max(100).optional().nullable(),
    ContactNumber: z.string().max(100).optional().nullable(),
    DeviceName: z.string().max(100).optional().nullable(),
    IssueType: z.string().max(50).optional().nullable(),
    ShortIssueTitle: z.string().max(255, 'Issue title must be less than 255 characters').optional(),
    ProblemDescription: z.string().max(2000).optional().nullable(),
}).passthrough();

const itSoftwareSchema = z.object({
    SoftwareName: z.string().max(255).optional().nullable(),
    VendorPublisher: z.string().max(255).optional().nullable(),
    Category: z.string().max(50).optional().nullable(),
    Version: z.string().max(50).optional().nullable(),
    LicenseType: z.string().max(50).optional().nullable(),
    LicenseCountPurchased: z.coerce.number().int().min(0).optional().nullable(),
    LicenseCountInUse: z.coerce.number().int().min(0).optional().nullable(),
}).passthrough();

// ============ Quality Lab Schemas ============
const physicalPropertiesSchema = z.object({
    Date: z.string().optional().nullable(),
    HeatNo: z.string().max(50).optional().nullable(),
    Grade: z.string().max(50).optional().nullable(),
    PartNo: z.string().max(50).optional().nullable(),
    UTS: z.string().max(50).optional().nullable(),
    YieldStress: z.string().max(50).optional().nullable(),
    Elongation: z.string().max(50).optional().nullable(),
    Impact: z.string().max(50).optional().nullable(),
}).passthrough();

const chemistrySchema = z.object({
    Date: z.string().optional().nullable(),
    HeatNo: z.string().max(50).optional().nullable(),
    Grade: z.string().max(50).optional().nullable(),
    PartNo: z.string().max(50).optional().nullable(),
    CE: z.string().max(50).optional().nullable(),
    C: z.string().max(50).optional().nullable(),
    Si: z.string().max(50).optional().nullable(),
    Mn: z.string().max(50).optional().nullable(),
    P: z.string().max(50).optional().nullable(),
    S: z.string().max(50).optional().nullable(),
}).passthrough();

const microstructureSchema = z.object({
    Date: z.string().optional().nullable(),
    HeatNo: z.string().max(50).optional().nullable(),
    Grade: z.string().max(50).optional().nullable(),
    PartNo: z.string().max(50).optional().nullable(),
    Nodularity: z.string().max(50).optional().nullable(),
    Graphitetype: z.string().max(50).optional().nullable(),
    NodularityCount: z.string().max(50).optional().nullable(),
    GraphiteSize: z.string().max(50).optional().nullable(),
    Pearlite: z.string().max(50).optional().nullable(),
    Ferrite: z.string().max(50).optional().nullable(),
    Carbide: z.string().max(50).optional().nullable(),
    CastingHardness: z.string().max(50).optional().nullable(),
}).passthrough();

// ============ Validation Middleware Factory ============
/**
 * Creates a validation middleware for request body
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.body);
            if (!result.success) {
                // Add safety check for result.error and result.error.errors
                const errors = result.error?.errors?.map(err => ({
                    field: err.path?.join('.') || 'unknown',
                    message: err.message || 'Validation error'
                })) || [{ field: 'unknown', message: 'Validation failed' }];
                return res.status(400).json({ 
                    error: 'Validation failed', 
                    details: errors 
                });
            }
            req.body = result.data; // Use parsed/transformed data
            next();
        } catch (err) {
            console.error('Validation error:', err);
            res.status(500).json({ error: 'Validation error' });
        }
    };
};


// ============ Lab Master Schema ============
const labMasterSchema = z.object({
    DrgNo: z.string().max(100).optional().nullable(),
    Customer: z.string().max(255).optional().nullable(),
    Description: z.string().max(500).optional().nullable(),
    Grade: z.string().max(50).optional().nullable(),
    PartWeight: z.string().max(50).optional().nullable(),
    MinMaxThickness: z.string().max(50).optional().nullable(),
    ThicknessGroup: z.string().max(50).optional().nullable(),
    BaseChe_C: z.string().max(50).optional().nullable(),
    BaseChe_Si: z.string().max(50).optional().nullable(),
    C: z.string().max(50).optional().nullable(),
    Si: z.string().max(50).optional().nullable(),
    Mn: z.string().max(50).optional().nullable(),
    P: z.string().max(50).optional().nullable(),
    S: z.string().max(50).optional().nullable(),
    Cr: z.string().max(50).optional().nullable(),
    Cu: z.string().max(50).optional().nullable(),
    Mg_Chem: z.string().max(50).optional().nullable(),
    CE: z.string().max(50).optional().nullable(),
    Nickel: z.string().max(50).optional().nullable(),
    Moly: z.string().max(50).optional().nullable(),
    CRCA: z.string().max(100).optional().nullable(),
    RR: z.string().max(100).optional().nullable(),
    PIG: z.string().max(100).optional().nullable(),
    MS: z.string().max(100).optional().nullable(),
    Mg_Mix: z.string().max(100).optional().nullable(),
    RegularCritical: z.string().max(50).optional().nullable(),
    LastBoxTemp: z.string().max(100).optional().nullable(),
    Remarks: z.string().max(2000).optional().nullable(),
}).passthrough();

// ============ Schedule Schema ============
const scheduleSchema = z.object({
    ReportId: z.coerce.number().int().positive('Report ID is required'),
    ScheduleName: z.string().max(255).optional().nullable(),
    Frequency: z.enum(['daily', 'weekly', 'monthly'], { errorMap: () => ({ message: 'Frequency must be daily, weekly, or monthly' }) }),
    DayOfWeek: z.coerce.number().int().min(0).max(6).optional().nullable(),
    DayOfMonth: z.coerce.number().int().min(1).max(31).optional().nullable(),
    TimeOfDay: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'TimeOfDay must be in HH:MM format'),
}).passthrough();

// ============ Report Template Schema ============
const reportSchema = z.object({
    ReportName: z.string().min(1, 'Report Name is required').max(255),
    Description: z.string().max(1000).optional().nullable(),
    SqlQuery: z.string().min(10, 'SQL Query is required and must be at least 10 characters'),
    DatabaseName: z.string().max(100).optional().nullable(),
}).passthrough();

// ============ User Update Schema ============
const userUpdateSchema = z.object({
    username: z.string().min(3).max(50).trim().optional(),
    fullName: z.string().min(2).max(100).trim().optional(),
    password: z.string().min(8).max(100).optional(),
    allowedPages: z.union([
        z.array(z.string()),
        z.string().optional()
    ]).optional(),
}).passthrough();

// ============ Marketing Schemas ============
const marketingRFQSchema = z.object({
    RFQNo: z.string().min(1, 'RFQ No is required').max(50),
    PartNo: z.string().max(100).optional().nullable(),
    MachiningDrawingNo: z.string().max(100).optional().nullable(),
    PartName: z.string().max(255).optional().nullable(),
    DrawingMatGrade: z.string().max(100).optional().nullable(),
    BOMQty: z.coerce.number().min(0).optional().nullable(),
    FY2026: z.string().max(100).optional().nullable(),
    DrgWt: z.coerce.number().min(0).optional().nullable(),
    CastingPartWt: z.coerce.number().min(0).optional().nullable(),
}).passthrough();

const marketingLaboratorySchema = z.object({
    RFQId: z.coerce.number().int().positive('RFQ ID is required'),
    FGSG: z.string().max(100).optional().nullable(),
    AlloyAddition: z.string().max(255).optional().nullable(),
    RT: z.string().max(100).optional().nullable(),
    UT: z.string().max(100).optional().nullable(),
    MPI: z.string().max(100).optional().nullable(),
    HT: z.string().max(100).optional().nullable(),
    DPTest: z.string().max(100).optional().nullable(),
    NABL: z.string().max(100).optional().nullable(),
    ImpactTest: z.string().max(100).optional().nullable(),
    Millipore: z.string().max(100).optional().nullable(),
    CutSection: z.string().max(100).optional().nullable(),
    InducingHardening: z.string().max(100).optional().nullable(),
    LaboratoryRequirements: z.string().optional().nullable(),
}).passthrough();

const marketingPatternshopSchema = z.object({
    RFQId: z.coerce.number().int().positive('RFQ ID is required'),
    LineBox: z.string().max(100).optional().nullable(),
    Cavity: z.string().max(100).optional().nullable(),
    CoreWt: z.string().max(100).optional().nullable(),
    MatchPlateSpecial: z.string().max(255).optional().nullable(),
    MatchPlateRegular: z.string().max(255).optional().nullable(),
    ShellCoreWt: z.string().max(100).optional().nullable(),
    ColdBoxWt: z.string().max(100).optional().nullable(),
    CustomerRequirement: z.string().max(255).optional().nullable(),
    OurFeasibilityCastingTolerance: z.string().max(255).optional().nullable(),
    NPDFoundryRequirements: z.string().optional().nullable(),
}).passthrough();

const marketingRFQMasterSchema = z.object({
    AKPRFQNo: z.string().min(1, 'AKP RFQ No is required').max(50),
    SrNo: z.string().max(50).optional().nullable(),
    RFQId: z.coerce.number().int().optional().nullable(),
    Status: z.string().max(50).optional().nullable(),
    CustomerName: z.string().max(255).optional().nullable(),
    RFQDate: z.string().optional().nullable(),
    ProjectReference: z.string().max(255).optional().nullable(),
    RFQParts: z.string().max(500).optional().nullable(),
    AnnualVolume: z.coerce.number().min(0).optional().nullable(),
    Weight: z.coerce.number().min(0).optional().nullable(),
    MonthlyTonnage: z.coerce.number().min(0).optional().nullable(),
    Remarks: z.string().optional().nullable(),
}).passthrough();

// ============ IT Issued Material Schema ============
const itIssuedMaterialSchema = z.object({
    MaterialName: z.string().min(1, 'Material Name is required').max(255),
    IssuedTo: z.string().min(1, 'Issued To is required').max(255),
    MaterialType: z.string().max(100).optional().nullable(),
    Quantity: z.coerce.number().int().min(0).optional().nullable(),
    Unit: z.string().max(50).optional().nullable(),
    IssuedBy: z.string().max(255).optional().nullable(),
    IssueDate: z.string().optional().nullable(),
    Department: z.string().max(100).optional().nullable(),
    Purpose: z.string().max(500).optional().nullable(),
    ReturnDate: z.string().optional().nullable(),
    Status: z.string().max(50).optional().nullable(),
    Remarks: z.string().max(500).optional().nullable(),
}).passthrough();

// ============ Pattern Return History Schema ============
const patternReturnHistorySchema = z.object({
    PatternId: z.coerce.number().int().positive('Pattern ID is required'),
    PatternNo: z.string().min(1, 'Pattern No is required').max(255),
    Customer: z.coerce.number().int().positive('Customer is required'),
    ReturnChallanNo: z.string().min(1, 'Return Challan No is required').max(255),
    ReturnDate: z.string().min(1, 'Return Date is required'),
    PatternName: z.string().max(255).optional().nullable(),
    Description: z.string().max(1000).optional().nullable(),
    SelectedParts: z.array(z.object({
        PartRowId: z.coerce.number().int().optional().nullable(),
        PartNo: z.coerce.number().int().optional().nullable(),
        ProductName: z.string().max(255).optional().nullable(),
    }).passthrough()).min(1, 'At least one part must be selected'),
}).passthrough();

// ============ Sand Properties Schema ============
const sandPropertiesSchema = z.object({
    Date: z.string().optional().nullable(),
    Shift: z.string().max(50).optional().nullable(),
    InspectionTime: z.string().max(50).optional().nullable(),
    HeatNo: z.string().max(50).optional().nullable(),
    PartNo: z.string().max(50).optional().nullable(),
    PartName: z.string().max(50).optional().nullable(),
    Moisture: z.coerce.number().min(0).optional().nullable(),
    Compactability: z.coerce.number().min(0).optional().nullable(),
    Permeability: z.string().max(50).optional().nullable(),
    GreenCompressionStrength: z.string().max(50).optional().nullable(),
    ReturnSandTemp: z.coerce.number().int().min(0).optional().nullable(),
    TotalClay: z.coerce.number().min(0).optional().nullable(),
    ActiveClay: z.coerce.number().min(0).optional().nullable(),
    DeadClay: z.coerce.number().min(0).optional().nullable(),
    VolatileMatter: z.coerce.number().min(0).optional().nullable(),
    LossOnIgnition: z.coerce.number().min(0).optional().nullable(),
    AFSNo: z.coerce.number().min(0).optional().nullable(),
}).passthrough();

// ============ Mould Hardness Schema ============
const mouldHardnessSchema = z.object({
    Date: z.string().optional().nullable(),
    HeatNo: z.string().max(50).optional().nullable(),
    PartNo: z.string().max(50).optional().nullable(),
}).passthrough(); // Allow BoxNo1-BoxNo25 dynamically

// ============ Sleeve Requirement Schema ============
const sleeveRequirementSchema = z.object({
    planDate: z.string().min(1, 'Plan Date is required'),
    shift: z.coerce.number().int().min(1, 'Shift is required'),
    entries: z.array(z.object({
        PatternNo: z.string().optional().nullable(),
        PlateQty: z.coerce.number().int().optional().nullable(),
        SleeveType: z.string().optional().nullable(),
        SleeveQty: z.coerce.number().int().optional().nullable(),
        TotalSleeves: z.coerce.number().int().optional().nullable(),
    }).passthrough()).min(1, 'Entries are required'),
}).passthrough();

// ============ IT System Users Schema ============
const itSystemUserSchema = z.object({
    AssetId: z.coerce.number().int().positive('Asset ID is required'),
    AssignedUser: z.string().max(255).optional().nullable(),
    SystemName: z.string().max(100).optional().nullable(),
    IPAddress: z.string().max(50).optional().nullable(),
    AssetOwner: z.string().max(255).optional().nullable(),
    Descriptions: z.string().max(500).optional().nullable(),
    IssueDate: z.string().optional().nullable(),
}).passthrough();

// ============ IT Device Repair Schema ============
const itDeviceRepairSchema = z.object({
    AssetId: z.coerce.number().int().positive('Asset ID is required'),
    RepairDate: z.string().optional().nullable(),
    IssueDescription: z.string().max(1000).optional().nullable(),
    ActionTaken: z.string().max(1000).optional().nullable(),
    RepairedBy: z.string().max(255).optional().nullable(),
    RepairCost: z.coerce.number().min(0).optional().nullable(),
    VendorName: z.string().max(255).optional().nullable(),
    Status: z.string().max(50).optional().nullable(),
    Notes: z.string().max(500).optional().nullable(),
}).passthrough();

// ============ IT Software History Schema ============
const itSoftwareHistorySchema = z.object({
    AssetId: z.coerce.number().int().positive('Asset ID is required'),
    IssuedUserName: z.string().max(255).optional().nullable(),
    IssuedDepartment: z.string().max(100).optional().nullable(),
    IssuedBy: z.string().max(255).optional().nullable(),
    Date: z.string().optional().nullable(),
    IssueVendorName: z.string().max(255).optional().nullable(),
    DescriptionOfIssue: z.string().max(1000).optional().nullable(),
    Remark: z.string().max(500).optional().nullable(),
}).passthrough();

// ============ IT Complaint Resolution Schema ============
const itResolutionSchema = z.object({
    TicketId: z.coerce.number().int().optional().nullable(),
    Date: z.string().optional().nullable(),
    ShortIssueTitle: z.string().max(255).optional().nullable(),
    Description: z.string().max(2000).optional().nullable(),
}).passthrough();

module.exports = {
    // Schemas
    loginSchema,
    registerSchema,
    patternSchema,
    // Pattern & Drawing Schemas
    drawingMasterSchema,
    planningMasterSchema,
    planningEntrySchema,
    // IT Management Schemas
    itAssetSchema,
    itComplaintSchema,
    itSoftwareSchema,
    itIssuedMaterialSchema,
    itSystemUserSchema,
    itDeviceRepairSchema,
    itSoftwareHistorySchema,
    itResolutionSchema,
    // Quality Lab Schemas
    physicalPropertiesSchema,
    chemistrySchema,
    microstructureSchema,
    sandPropertiesSchema,
    mouldHardnessSchema,
    // Marketing Schemas
    marketingRFQSchema,
    marketingLaboratorySchema,
    marketingPatternshopSchema,
    marketingRFQMasterSchema,
    // Planning Schemas
    sleeveRequirementSchema,
    // Pattern Return Schema
    patternReturnHistorySchema,
    // Additional Schemas
    labMasterSchema,
    scheduleSchema,
    reportSchema,
    userUpdateSchema,
    // Middleware factories
    validateBody,
};

