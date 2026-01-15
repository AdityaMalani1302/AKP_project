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
    Pattern_Maker: z.coerce.number().int().positive('Pattern Maker is required'),
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
        sleeve_type_size: z.string().max(255).optional().nullable(),
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
    // Quality Lab Schemas
    physicalPropertiesSchema,
    chemistrySchema,
    microstructureSchema,
    // Additional Schemas
    labMasterSchema,
    scheduleSchema,
    reportSchema,
    userUpdateSchema,
    // Middleware factories
    validateBody,
};

