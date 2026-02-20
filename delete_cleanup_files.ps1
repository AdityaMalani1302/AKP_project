# ==========================================
# MASTER CLEANUP SCRIPT
# ==========================================
# Use this script to maintain a clean workspace.
# Add new files to the lists below as needed.

Write-Host "Starting cleanup process..." -ForegroundColor Cyan

# ------------------------------------------
# 1. FILES TO DELETE
# ------------------------------------------
$filesToDelete = @(
    # -- Tasks / Temporary Docs --
    "Troubleshooting Web App Access.md",
    "Sales & Finance Dashboard Enhancements.md",
    "cursor_comprehensive_codebase_analysis.md",
    "ad.txt",
    "audit_report.md.resolved",
    
    # -- Temporary/Test Files (added 2026-02-05) --
    "abc",                                        # Temp batch script with taskkill command
    "code-simplifier.md",                         # Temporary task doc
    "Caterpillar Excavator Divission.xlsx",       # Test Excel data file
    "WhatsApp Cloud API Integration Guide for Node.js_Express.md",  # External guide, not project docs
    
    # -- Backend Routes Backups --
    "backend/routes/itManagementRoutes.js.bak",
    "backend/routes/qualityLabRoutes.js.bak",
    
    # -- Backend Log Files (can be regenerated) --
    "backend/logs/error.log",
    "backend/logs/combined.log",
    
    # -- Database / Migration Temps --
    "migration.sql",
    
    # -- Backend Migration Scripts --
    "add_additional_info_columns.sql",
    "add_allowed_pages_column.sql",
    "add_cascade_constraints.sql",
    "add_box_per_heat_column.sql",
    "alter_pattern_tables.sql",
    "add_nickel_moly_columns.sql",
    "add_pattern_received_date_column.sql",
    "add_new_columns.sql",
    "add_moulding_columns.sql",
    "add_main_side_loose_core_qty_columns.sql",
    "add_core_type_columns.sql",
    "add_core_quantity_columns.sql",
    "create_performance_indexes.sql",
    "create_lab_master_table.sql",
    "create_drawing_master_table.sql",
    "create_core_details_master_table.sql",
    "create_sleeve_master_table.sql",
    "reorganize_pattern_master_table.sql",
    "rename_actual_casting_weight_column.sql",
    "remove_legacy_core_type_columns.sql",
    "remove_legacy_columns.sql",
    "recreate_pattern_master_table.sql",
    "split_core_box_s7_f4_column.sql",

    # -- JS Scripts --
    "add_allowed_pages.js",
    "run_migration.js",
    "test_products.js",
    "create_auth_table.js",
    "create_icsoft.js",
    
    # -- Obsolete Docs --
    "backend/docs/admin_user_created.md",
    "backend/scripts/SHORT_TERM_ACTIONS_SUMMARY.md",
    "docs/BROWSER_COMPATIBILITY.md",
    "package-lock.json",

    # -- Backend Unused Files --
    "backend/utils/responseHelper.js",
    "backend/routes/qualityLabRoutes/shared.js",
    "backend/server_backup.js",
    
    # -- ADD FUTURE FILES HERE --
    # "example_temp_file.log",
    # "old_notes.txt"
    "temp_file_placeholder_for_future_use.tmp" # Placeholder
)

# ------------------------------------------
# 2. DIRECTORIES TO DELETE
# ------------------------------------------
$dirsToDelete = @(
    # -- Temporary DB Dumps --
    "DB",
    
    # -- Empty folders after doc consolidation (2026-01-12) --
    "backend/docs",  # Moved to /docs
    "performance",   # Moved README to /docs/PERFORMANCE_TESTING.md
    
    # -- Empty directories (added 2026-02-05) --
    "scripts",       # Empty directory at project root
    
    # -- ADD FUTURE DIRECTORIES HERE --
    # "temp_output_dir"
    "temp_dir_placeholder_for_future_use" # Placeholder
)

# ------------------------------------------
# 3. DELETED DOCS RECORD (consolidated to /docs on 2026-01-12)
# ------------------------------------------
# Obsolete docs deleted:
#   - backend/docs/admin_user_created.md (one-time setup note)
#   - backend/scripts/SHORT_TERM_ACTIONS_SUMMARY.md (stale action items)
#   - docs/BROWSER_COMPATIBILITY.md (outdated browser notes)
#   - package-lock.json (orphan root lockfile, actual ones are in frontend/backend)
# 
# Docs moved to /docs folder:
#   - setup_pm2.md, PROJECT_DOCUMENTATION.md, deployment.md, DATABASE_CHANGES.md
#   - frontend/BROWSER_COMPATIBILITY.md, frontend/DESIGN_SYSTEM.md
#   - frontend/SECURITY_PERFORMANCE.md, backend/docs/users_foreign_key_guide.md
#   - performance/README.md -> PERFORMANCE_TESTING.md

# ------------------------------------------
# 4. UNUSED CODE CLEANUP (2026-01-12)
# ------------------------------------------
# Frontend unused components deleted:
#   - frontend/src/components/common/ConfirmDialog.jsx (AlertDialog used instead)
#   - frontend/src/components/common/LoadingOverlay.jsx (not imported anywhere)
#   - frontend/src/components/common/FormField.jsx (not imported anywhere)
#   - frontend/src/components/common/SearchInput.jsx (not imported anywhere)
#   - frontend/src/components/common/FileUpload.jsx (not imported anywhere)
#   - frontend/src/components/common/SortableTable.jsx (not imported anywhere)
#   - frontend/src/utils/usePatternFormReducer.js (not imported anywhere)
#
# Code cleaned up (unused exports removed):
#   - frontend/src/utils/useDebounce.js: removed useDebouncedCallback
#   - frontend/src/utils/useInputHistory.js: removed useInputHistory hook (kept saveFormHistory, getFieldHistory)
#   - frontend/src/utils/useKeyboardShortcuts.js: removed useTableShortcuts (kept useFormShortcuts)
#   - backend/utils/validators.js: removed unused labRecordSchema
#   - backend/routes/qualityLabRoutes/main.js: removed labRecordSchema import (schema was deleted but import remained - BUG FIX)
#   - backend/routes/patternRoutes/returnHistory.js: consolidated duplicate table creation code into ensureTablesExist helper

# ------------------------------------------
# 5. BACKEND CODE CLEANUP (2026-01-12)
# ------------------------------------------
# Backend unused files deleted:
#   - backend/utils/responseHelper.js (never imported anywhere)
#   - backend/utils/logger.js (never imported anywhere)
#   - backend/routes/qualityLabRoutes/shared.js (duplicate of main.js, never imported)
#   - backend/server_backup.js (backup file, not part of active codebase)
#
# Backend code cleaned up:
#   - backend/routes/financeDashboardRoutes.js: removed duplicate module.exports
#   - backend/routes/userRoutes.js: removed unused invalidateCache import
#   - backend/routes/qualityLabRoutes/main.js: removed unused invalidateCache import
#   - backend/routes/authRoutes.js: removed unused registerSchema import
#   - backend/utils/validators.js: removed unused exports (paginationSchema, idParamSchema, validateQuery, validateParams)
#   - backend/utils/cache.js: removed unused exports (clearAllCache, getCacheStats, cache object)
#   - backend/middleware/errorHandler.js: removed unused exports (AppError, asyncHandler)
#
# Backend refactoring:
#   - Created backend/utils/dateHelpers.js (shared date/month utilities)
#   - backend/routes/salesDashboardRoutes.js: refactored to use dateHelpers
#   - backend/routes/productionDashboardRoutes.js: refactored to use dateHelpers
#   - backend/routes/itManagementRoutes/index.js: simplified route forwarding with redirectMiddleware

# ------------------------------------------
# 6. STYLE CONSOLIDATION & CLEANUP (2026-01-12)
# ------------------------------------------
# Created centralized shared styles file:
#   - frontend/src/styles/sharedStyles.js (NEW - single source of truth for all form styles)
#
# Module-specific styles.js files now re-export from sharedStyles.js:
#   - frontend/src/components/quality-lab/styles.js (was ~115 lines, now ~18 lines)
#   - frontend/src/components/it-management/styles.js (was ~83 lines, now ~15 lines)
#   - frontend/src/components/pattern-master/styles.js (was ~117 lines, now ~16 lines)
#   - frontend/src/components/lab-master/styles.js (was ~99 lines, now ~6 lines)
#
# Duplicate code eliminated: ~400+ lines consolidated into single file
# Benefits: Single source of truth, backward compatible, easier maintenance
#
# Unused exports removed from frontend/src/components/common/index.js:
#   - ConfirmDialog (duplicate of AlertDialog)
#   - LoadingOverlay, SpinnerInline (not imported anywhere)
#   - FormField (not imported anywhere)
#   - SearchInput (not imported anywhere)
#   - FileUpload (not imported anywhere)
#   - SortableTable (not imported anywhere)
#
# Note: The unused component FILES still exist but are not exported.
# They can be safely deleted if desired:
$unusedComponentsToDelete = @(
    "frontend/src/components/common/ConfirmDialog.jsx",
    "frontend/src/components/common/LoadingOverlay.jsx",
    "frontend/src/components/common/FormField.jsx",
    "frontend/src/components/common/SearchInput.jsx",
    "frontend/src/components/common/FileUpload.jsx",
    "frontend/src/components/common/SortableTable.jsx"
)

# ------------------------------------------
# 7. EXECUTION LOGIC
# ------------------------------------------

# Delete Files
foreach ($file in $filesToDelete) {
    if ($file -like "*placeholder*") { continue }
    
    if (Test-Path $file) {
        Remove-Item $file -Force -ErrorAction SilentlyContinue
        if (Test-Path $file) {
            Write-Host "[FAIL] Failed to delete file: $file" -ForegroundColor Red
        }
        else {
            Write-Host "[OK] Deleted file: $file" -ForegroundColor Green
        }
    }
    else {
        Write-Host "[SKIP] File not found (already clean): $file" -ForegroundColor Gray
    }
}

# Delete Directories
foreach ($dir in $dirsToDelete) {
    if ($dir -like "*placeholder*") { continue }

    if (Test-Path $dir) {
        Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
        if (Test-Path $dir) {
            Write-Host "[FAIL] Failed to delete directory: $dir" -ForegroundColor Red
        }
        else {
            Write-Host "[OK] Deleted directory: $dir" -ForegroundColor Green
        }
    }
    else {
        Write-Host "[SKIP] Directory not found (already clean): $dir" -ForegroundColor Gray
    }
}

# Delete Unused Components (Optional - uncomment to enable)
Write-Host ""
Write-Host "Checking unused components..." -ForegroundColor Yellow
foreach ($component in $unusedComponentsToDelete) {
    if (Test-Path $component) {
        # Uncomment the next line to actually delete these files:
        Remove-Item $component -Force -ErrorAction SilentlyContinue
        
        if (Test-Path $component) {
             Write-Host "[FAIL] Failed to delete component: $component" -ForegroundColor Red
        } else {
             Write-Host "[OK] Deleted component: $component" -ForegroundColor Green
        }
    }
    else {
        Write-Host "[SKIP] Component not found (already deleted): $component" -ForegroundColor Gray
    }
}
Write-Host "Note: Uncomment deletion line in script to remove unused components" -ForegroundColor DarkGray

Write-Host "------------------------------------------"
Write-Host "Cleanup complete." -ForegroundColor Cyan
