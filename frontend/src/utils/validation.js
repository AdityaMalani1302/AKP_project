/**
 * Validation Utilities
 * 
 * Strategy:
 * 1. Required Fields: Must be present.
 * 2. Optional Fields: Can be empty, but if present, must match format (e.g. number).
 * 3. Conditional Logic: Some validations depend on other field values.
 */

export const validatePatternMaster = (formData) => {
    const errors = {};

    // --- 1. Main Details (Critical) ---

    // Pattern No (Required)
    if (!formData.PatternNo || !formData.PatternNo.trim()) {
        errors.PatternNo = 'Pattern Number is required';
    }

    // Customer (Required)
    if (!formData.Customer) {
        errors.Customer = 'Customer selection is required';
    }

    // Part Rows (At least one part required)
    if (!formData.parts || formData.parts.length === 0) {
        errors.parts = 'At least one part is required';
    } else {
        // Validate each part row
        formData.parts.forEach((part, index) => {
            if (!part.partNoOption) {
                errors[`part_${index}_partNo`] = 'Part Number is required';
            }
            // Qty (Optional but if exists must be number)
            if (part.qty && isNaN(part.qty)) {
                errors[`part_${index}_qty`] = 'Quantity must be a number';
            }
            // Weight (Optional but if exists must be number)
            if (part.weight && isNaN(part.weight)) {
                errors[`part_${index}_weight`] = 'Weight must be a number';
            }
        });
    }

    // --- 2. Pattern Section ---

    // Pattern Maker (Optional)

    // Numeric checks for optional fields
    if (formData.Quoted_Estimated_Weight && isNaN(formData.Quoted_Estimated_Weight)) {
        errors.Quoted_Estimated_Weight = 'Must be a valid number';
    }

    // --- 3. Casting Section ---
    if (formData.YieldPercent) {
        if (isNaN(formData.YieldPercent)) {
            errors.YieldPercent = 'Must be a number';
        } else if (parseFloat(formData.YieldPercent) > 100 || parseFloat(formData.YieldPercent) < 0) {
            errors.YieldPercent = 'Yield % must be between 0 and 100';
        }
    }

    if (formData.Bunch_Wt && isNaN(formData.Bunch_Wt)) {
        errors.Bunch_Wt = 'Must be a number';
    }

    // --- 4. Core Details (Conditional Logic) ---

    // Core Weight - Optional, numeric
    if (formData.Core_Wt && isNaN(formData.Core_Wt)) {
        errors.Core_Wt = 'Must be a number';
    }

    // Logic: If Checkbox checked, Qty SHOULD be entered (Optional strictness)
    // We will make this "Strict Conditional" - if you say yes, give me a number.
    if (formData.Core_Type?.shell) {
        if (!formData.shell_qty) errors.shell_qty = 'Qty required';
        else if (isNaN(formData.shell_qty)) errors.shell_qty = 'Must be number';
    }
    if (formData.Core_Type?.coldBox) {
        if (!formData.coldBox_qty) errors.coldBox_qty = 'Qty required';
        else if (isNaN(formData.coldBox_qty)) errors.coldBox_qty = 'Must be number';
    }
    if (formData.Core_Type?.noBake) {
        if (!formData.noBake_qty) errors.noBake_qty = 'Qty required';
        else if (isNaN(formData.noBake_qty)) errors.noBake_qty = 'Must be number';
    }

    // --- 5. Sleeves ---
    if (formData.sleeveRows && formData.sleeveRows.length > 0) {
        formData.sleeveRows.forEach((row, index) => {
            // Only validate if row is partially filled
            if (row.sleeve_name || row.sleeve_type_size || row.quantity) {
                if (!row.sleeve_name) errors[`sleeve_${index}_name`] = 'Sleeve Type Required';
                if (!row.sleeve_type_size) errors[`sleeve_${index}_size`] = 'Sleeve Size Required';
            }
        });
    }

    return errors;
};

/**
 * Validation for Planning Master
 */
export const validatePlanningMaster = (formData) => {
    const errors = {};

    // Item Code (Required)
    if (!formData.ItemCode || !formData.ItemCode.trim()) {
        errors.ItemCode = 'Item Code is required';
    }

    // Customer Name (Required)
    if (!formData.CustomerName || !formData.CustomerName.trim()) {
        errors.CustomerName = 'Customer Name is required';
    }

    // Schedule Qty (Required, must be positive number)
    if (!formData.ScheduleQty) {
        errors.ScheduleQty = 'Schedule Quantity is required';
    } else if (isNaN(formData.ScheduleQty)) {
        errors.ScheduleQty = 'Must be a valid number';
    } else if (parseFloat(formData.ScheduleQty) <= 0) {
        errors.ScheduleQty = 'Quantity must be greater than 0';
    }

    // Plan Date (Required)
    if (!formData.PlanDate) {
        errors.PlanDate = 'Date is required';
    }

    return errors;
};

/**
 * Validation for Admin Dashboard (User Registration)
 */
export const validateUserRegistration = (formData) => {
    const errors = {};

    // Username (Required, alphanumeric, min length)
    if (!formData.username || !formData.username.trim()) {
        errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
        errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Full Name (Required)
    if (!formData.fullName || !formData.fullName.trim()) {
        errors.fullName = 'Full Name is required';
    }

    // Password (Required, min length)
    if (!formData.password) {
        errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
    }

    // Role (Required)
    if (!formData.role) {
        errors.role = 'Role selection is required';
    }

    return errors;
};
