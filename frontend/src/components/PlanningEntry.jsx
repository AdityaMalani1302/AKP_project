import Combobox from './common/Combobox';

import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import AlertDialog from './common/AlertDialog';
import DatePicker from './common/DatePicker';
import '../App.css';
import { formatDate } from '../styles/sharedStyles';

const PlanningEntry = () => {
    const queryClient = useQueryClient();

    // Form state
    const [planDate, setPlanDate] = useState('');
    const [selectedPattern, setSelectedPattern] = useState(null);
    const [patterns, setPatterns] = useState([]);

    // Parts state
    const [availableParts, setAvailableParts] = useState([]);
    const [selectedParts, setSelectedParts] = useState([]);
    const [loadingParts, setLoadingParts] = useState(false);

    // Sleeves selection state (per part)
    const [selectedSleeves, setSelectedSleeves] = useState({}); // { partRowId: sleeveRowId }

    // Pattern details state (for info table)
    const [patternDetails, setPatternDetails] = useState(null);

    // Configuration state
    const [plateQty, setPlateQty] = useState('');
    const [shift, setShift] = useState('');
    const [mouldBoxSize, setMouldBoxSize] = useState('');

    // Staged entries state (calculated table before submit)
    const [stagedEntries, setStagedEntries] = useState([]);
    const [selectedStagedIds, setSelectedStagedIds] = useState(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Existing records state (from database)
    const [existingRecords, setExistingRecords] = useState([]);
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [filterDate, setFilterDate] = useState('');
    const [filterShift, setFilterShift] = useState('');

    // Edit/Delete state
    const [editingRecord, setEditingRecord] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);

    // Print preview state
    const [printPlanDate, setPrintPlanDate] = useState('');
    const [printShift, setPrintShift] = useState('');
    const [printMouldBoxSize, setPrintMouldBoxSize] = useState('');
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [printData, setPrintData] = useState([]);
    const [isPrintLoading, setIsPrintLoading] = useState(false);
    const printRef = useRef(null);

    // Fetch patterns and existing records on mount
    useEffect(() => {
        fetchPatterns();
        fetchExistingRecords();
    }, []);

    const fetchPatterns = async () => {
        try {
            const response = await api.get('/pattern-master/numbers');
            setPatterns(response.data);
        } catch (err) {
            console.error('Error fetching patterns:', err);
            toast.error('Failed to load patterns');
        }
    };

    const fetchExistingRecords = async () => {
        setLoadingRecords(true);
        try {
            const response = await api.get('/planning-entry');
            setExistingRecords(response.data);
        } catch (err) {
            console.error('Error fetching existing records:', err);
        } finally {
            setLoadingRecords(false);
        }
    };

    // Fetch parts and pattern details when pattern is selected
    useEffect(() => {
        if (selectedPattern) {
            fetchPartsForPattern(selectedPattern.PatternId);
            fetchPatternDetails(selectedPattern.PatternId);
        } else {
            setAvailableParts([]);
            setSelectedParts([]);
            setPatternDetails(null);
        }
    }, [selectedPattern]);

    const fetchPartsForPattern = async (patternId) => {
        setLoadingParts(true);
        try {
            const response = await api.get(`/pattern-master/parts-by-pattern/${patternId}`);
            setAvailableParts(response.data);
            // Auto-select all parts so Selected Parts Information shows directly
            setSelectedParts(response.data);
        } catch (err) {
            console.error('Error fetching parts:', err);
            toast.error('Failed to load parts for this pattern');
        } finally {
            setLoadingParts(false);
        }
    };

    const fetchPatternDetails = async (patternId) => {
        try {
            const response = await api.get(`/pattern-master/${patternId}`);
            setPatternDetails(response.data);
        } catch (err) {
            console.error('Error fetching pattern details:', err);
        }
    };

    const handlePatternChange = (val) => {
        if (!val) {
            setSelectedPattern(null);
            setStagedEntries([]);
            setSelectedStagedIds(new Set());
            return;
        }

        const pattern = patterns.find(p => p.PatternNo === val);
        if (pattern) {
            setSelectedPattern(pattern);
            // Clear staged entries when pattern changes
            setStagedEntries([]);
            setSelectedStagedIds(new Set());
        }
    };

    const handlePartToggle = (part) => {
        setSelectedParts(prev => {
            const exists = prev.find(p => p.PartRowId === part.PartRowId);
            if (exists) {
                return prev.filter(p => p.PartRowId !== part.PartRowId);
            } else {
                return [...prev, part];
            }
        });
    };

    const handleSelectAllParts = () => {
        if (selectedParts.length === availableParts.length) {
            setSelectedParts([]);
        } else {
            setSelectedParts([...availableParts]);
        }
    };

    // Handle sleeve selection per part
    const handleSleeveChange = (partRowId, sleeveValue) => {
        setSelectedSleeves(prev => ({
            ...prev,
            [partRowId]: sleeveValue
        }));
    };

    const handleAddToCalculatedTable = () => {
        if (!planDate) {
            toast.error('Please select a Plan Date');
            return;
        }
        if (!selectedPattern) {
            toast.error('Please select a Pattern');
            return;
        }
        if (selectedParts.length === 0) {
            toast.error('Please select at least one part');
            return;
        }
        if (!plateQty || plateQty <= 0) {
            toast.error('Please enter a valid Plate Qty');
            return;
        }
        if (!shift) {
            toast.error('Please select a Shift');
            return;
        }


        const plateQtyNum = parseInt(plateQty); // User input is Plate Qty now
        const boxPerHeat = parseFloat(patternDetails?.Box_Per_Heat) || 0;

        // Calculate consolidated values for all parts
        // Total Cavity = sum of all parts' cavities
        const totalCavity = selectedParts.reduce((sum, part) => sum + (parseInt(part.Qty) || 1), 0);

        // Total Cast Weight = sum of all (cavity × weight per cavity) for each part
        const totalCastWeight = selectedParts.reduce((sum, part) => {
            const cavity = parseInt(part.Qty) || 1;
            const weightPerCavity = parseFloat(part.Weight) || 0;
            return sum + (cavity * weightPerCavity);
        }, 0);

        // Part numbers as comma-separated list
        const partNoList = selectedParts.map(part => part.InternalPartNo || part.PartNo).join(', ');

        // Part names as comma-separated list
        const partNameList = selectedParts.map(part => part.PartName || '-').join(', ');

        // Part row IDs as comma-separated list (for backend reference)
        const partRowIdList = selectedParts.map(part => part.PartRowId).join(',');

        // New calculations based on Plate Qty input:
        // Production Qty = Plate Qty * Total Cavity
        const productionQtyValues = plateQtyNum * totalCavity;

        // Total Weight = Plate Qty * Total Cast Weight
        // Note: totalCastWeight is weight of ONE MOULD (sum of all cavity weights)
        const totalWeight = plateQtyNum * totalCastWeight;

        // No of Heats = Plate Qty / Box Per Heat (rounded: 7.09→7, 7.5→8)
        const noOfHeats = boxPerHeat > 0 ? Math.round(plateQtyNum / boxPerHeat) : 0;

        // Common pattern-level data
        const coreType = (() => {
            const types = [];
            if (patternDetails?.shell_qty) types.push(`Shell=${patternDetails.shell_qty}`);
            if (patternDetails?.coldBox_qty) types.push(`ColdBox=${patternDetails.coldBox_qty}`);
            if (patternDetails?.noBake_qty) types.push(`NoBake=${patternDetails.noBake_qty}`);
            return types.length > 0 ? types.join(', ') : '-';
        })();

        const sleeve = (() => {
            const sleeves = patternDetails?.sleeveRows || [];
            if (sleeves.length === 0) return '-';
            return sleeves
                .filter(s => s.sleeve_type_size_name)
                .map(s => `${s.sleeve_type_size_name}=${s.quantity || 1}`)
                .join(', ') || '-';
        })();

        // Create ONE consolidated entry for the pattern with all parts
        const newEntry = {
            id: Date.now() + Math.random(),
            planDate,
            patternId: selectedPattern.PatternId,
            patternNo: selectedPattern.PatternNo,
            customerName: selectedPattern.CustomerName || '-',
            partRowIds: partRowIdList, // Comma-separated part row IDs
            partNo: partNoList, // Comma-separated part numbers
            partName: partNameList, // Comma-separated part names
            parts: selectedParts.map(p => ({
                partNo: p.InternalPartNo || p.PartNo,
                partName: p.PartName || '-',
                cavity: parseInt(p.Qty) || 1,
                weight: parseFloat(p.Weight) || 0
            })), // Array of parts for per-row display
            cavity: selectedParts.map(p => parseInt(p.Qty) || 1).join(', '), // Comma-separated cavities
            weight: selectedParts.map(p => parseFloat(p.Weight) || 0).map(w => w.toFixed(2)).join(', '), // Comma-separated weights
            coreType,
            sleeve,
            castWeight: totalCastWeight.toFixed(2), // Total cast weight (one mould)
            boxPerHeat: boxPerHeat || '-',
            productionQty: productionQtyValues, // Calculated: Plate Qty * Cavity
            plateQty: plateQtyNum, // User input
            totalWeight: totalWeight.toFixed(2), // Calculated: Plate Qty * Cast Weight
            noOfHeats, // Plate Qty / Box Per Heat
            shift: String(shift),
            mouldBoxSize: patternDetails?.Moulding_Box_Size || '-'
        };

        setStagedEntries(prev => [...prev, newEntry]);

        // Clear selection for next entry
        setSelectedParts([]);
        setPlateQty('');
        setShift('');

        toast.success(`Added 1 consolidated entry to calculated table`);
    };

    const handleSubmitAll = async () => {
        if (stagedEntries.length === 0) {
            toast.error('No entries to submit');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await api.post('/planning-entry', { entries: stagedEntries });
            toast.success(`Successfully submitted ${stagedEntries.length} entry(s)!`);

            // Clear all staged entries
            setStagedEntries([]);
            setSelectedStagedIds(new Set());

            // Refresh existing records
            fetchExistingRecords();
        } catch (err) {
            console.error('Error submitting entries:', err);
            toast.error(err.response?.data?.error || 'Failed to submit planning entries');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClearAll = () => {
        setStagedEntries([]);
        setSelectedStagedIds(new Set());
        setPlanDate('');
        setSelectedPattern(null);
        setAvailableParts([]);
        setSelectedParts([]);
        setPatternDetails(null);
        setPlateQty('');
        setShift('');
        setMouldBoxSize('');
    };

    // Handle print preview
    const handlePreviewAndPrint = async () => {
        if (!printPlanDate) {
            toast.error('Please select a Plan Date for printing');
            return;
        }
        if (!printShift) {
            toast.error('Please select a Shift for printing');
            return;
        }

        setIsPrintLoading(true);
        try {
            // Filter existing records for the selected date and shift
            const filtered = existingRecords.filter(record => {
                const recordDate = new Date(record.PlanDate).toISOString().split('T')[0];
                const dateMatch = recordDate === printPlanDate;
                const shiftMatch = record.Shift === parseInt(printShift);
                const mouldBoxMatch = !printMouldBoxSize || record.MouldBoxSize === printMouldBoxSize;

                return dateMatch && shiftMatch && mouldBoxMatch;
            });

            if (filtered.length === 0) {
                toast.warning('No records found for the selected date and shift');
                setIsPrintLoading(false);
                return;
            }

            setPrintData(filtered);
            setShowPrintPreview(true);
        } catch (err) {
            console.error('Error preparing print data:', err);
            toast.error('Failed to prepare print data');
        } finally {
            setIsPrintLoading(false);
        }
    };

    // Handle actual print
    const handlePrint = () => {
        window.print();
    };

    // Get unique mould box size for print header
    const getPrintMouldBoxSize = () => {
        if (printData.length === 0) return '-';
        const sizes = [...new Set(printData.map(r => r.MouldBoxSize).filter(Boolean))];
        return sizes.join(', ') || '-';
    };

    // Filter existing records
    const filteredRecords = existingRecords.filter(record => {
        let matchDate = true;
        let matchShift = true;

        if (filterDate) {
            const recordDate = new Date(record.PlanDate).toISOString().split('T')[0];
            matchDate = recordDate === filterDate;
        }
        if (filterShift) {
            matchShift = record.Shift === parseInt(filterShift);
        }
        return matchDate && matchShift;
    });

    // Handle delete record click - show dialog
    const handleDeleteClick = (record) => {
        setRecordToDelete(record);
        setShowDeleteDialog(true);
    };

    // Handle confirm delete
    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;
        setIsDeleting(true);
        try {
            await api.delete(`/planning-entry/${recordToDelete.EntryId}`);
            toast.success('Entry deleted successfully');
            fetchExistingRecords();
        } catch (err) {
            console.error('Error deleting entry:', err);
            toast.error('Failed to delete entry');
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(false);
            setRecordToDelete(null);
        }
    };

    // Handle edit record - open modal
    const handleEditRecord = (record) => {
        setEditingRecord({
            ...record,
            planDate: record.PlanDate ? new Date(record.PlanDate).toISOString().split('T')[0] : '',
            productionQty: record.ProductionQty || '',
            plateQty: record.PlateQty || '',
            totalWeight: record.TotalWeight || '',
            noOfHeats: record.NoOfHeats || '',
            shift: record.Shift || '',
            mouldBoxSize: record.MouldBoxSize || ''
        });
    };

    // Handle update record
    const handleUpdateRecord = async () => {
        if (!editingRecord) return;

        try {
            await api.put(`/planning-entry/${editingRecord.EntryId}`, editingRecord);
            toast.success('Entry updated successfully');
            setEditingRecord(null);
            fetchExistingRecords();
        } catch (err) {
            console.error('Error updating entry:', err);
            toast.error('Failed to update entry');
        }
    };

    const dropdownContainerStyle = {
        position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '300px',
        overflowY: 'auto', backgroundColor: 'white', border: '1px solid #3B82F6',
        borderRadius: '0.5rem', zIndex: 1000, marginTop: '4px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
    };

    const dropdownItemStyle = {
        padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #E5E7EB', fontSize: '0.875rem'
    };

    const dropdownHeaderStyle = {
        padding: '8px 14px', backgroundColor: '#F3F4F6', fontWeight: '600',
        fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase',
        borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0
    };

    const thStyle = {
        padding: '0.5rem 0.75rem', fontWeight: '600', borderBottom: '2px solid #374151', border: '1px solid #374151',
        textAlign: 'center', whiteSpace: 'nowrap', fontSize: '0.75rem', backgroundColor: '#FEF3C7'
    };

    const tdStyle = {
        padding: '0.5rem 0.75rem', border: '1px solid #374151',
        textAlign: 'center', whiteSpace: 'nowrap', fontSize: '0.8rem'
    };

    // Prepare options for Combobox
    const patternOptions = patterns.map(pattern => ({
        value: pattern.PatternNo,
        label: pattern.CustomerName ? `${pattern.PatternNo} - ${pattern.CustomerName}` : pattern.PatternNo
    }));

    return (
        <div>
            {/* Form Section */}
            <div className="section-container section-blue" style={{ marginBottom: '1.5rem' }}>
                <h3 className="section-title blue">Planning Entry Details</h3>

                <div className="form-grid">
                    {/* Plan Date */}
                    <div className="form-group">
                        <label htmlFor="planDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Plan Date <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <DatePicker
                            id="planDate"
                            value={planDate}
                            onChange={(e) => setPlanDate(e.target.value)}
                            placeholder="Select plan date..."
                        />
                    </div>

                    {/* Pattern No Dropdown */}
                    <div className="form-group">
                        <Combobox
                            label="Plan Pattern No"
                            options={patternOptions}
                            value={selectedPattern ? selectedPattern.PatternNo : ''}
                            onChange={handlePatternChange}
                            placeholder="Select or type Pattern No..."
                        />
                    </div>
                </div>
            </div>

            {/* Selected Parts Info Table - show when parts are selected */}
            {selectedParts.length > 0 && (
                <div className="section-container section-orange" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="section-title orange">Selected Parts Information</h3>
                    <div style={{ overflowX: 'auto', border: '1px solid #374151', borderRadius: '6px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead style={{ backgroundColor: '#FFF7ED' }}>
                                <tr>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', border: '1px solid #374151', textAlign: 'left', whiteSpace: 'nowrap' }}>Customer Name</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', border: '1px solid #374151', textAlign: 'left', whiteSpace: 'nowrap' }}>Pattern No</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', border: '1px solid #374151', textAlign: 'left', whiteSpace: 'nowrap' }}>Part No</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', border: '1px solid #374151', textAlign: 'left', whiteSpace: 'nowrap' }}>Part Name</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', border: '1px solid #374151', textAlign: 'center', whiteSpace: 'nowrap' }}>Cavity</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', border: '1px solid #374151', textAlign: 'center', whiteSpace: 'nowrap' }}>Weight (kg)</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', border: '1px solid #374151', textAlign: 'center', whiteSpace: 'nowrap' }}>Core</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', border: '1px solid #374151', textAlign: 'center', whiteSpace: 'nowrap' }}>Total Cast Weight (kg)</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', border: '1px solid #374151', textAlign: 'center', whiteSpace: 'nowrap' }}>Boxes Per Heat</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', border: '1px solid #374151', textAlign: 'center', whiteSpace: 'nowrap' }}>Mould Box Size</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', border: '1px solid #374151', textAlign: 'center', whiteSpace: 'nowrap' }}>Sleeves</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    // Calculate consolidated values
                                    const totalCavity = selectedParts.reduce((sum, part) => sum + (parseInt(part.Qty) || 1), 0);
                                    const totalCastWeight = selectedParts.reduce((sum, part) => {
                                        const cavity = parseInt(part.Qty) || 1;
                                        const weight = parseFloat(part.Weight) || 0;
                                        return sum + (cavity * weight);
                                    }, 0);

                                    const coreType = (() => {
                                        const types = [];
                                        if (patternDetails?.shell_qty) types.push(`Shell=${patternDetails.shell_qty}`);
                                        if (patternDetails?.coldBox_qty) types.push(`ColdBox=${patternDetails.coldBox_qty}`);
                                        if (patternDetails?.noBake_qty) types.push(`NoBake=${patternDetails.noBake_qty}`);
                                        return types.length > 0 ? types.join(', ') : '-';
                                    })();

                                    const sleeveInfo = (() => {
                                        const sleeves = patternDetails?.sleeveRows || [];
                                        if (sleeves.length === 0) return '-';
                                        return sleeves
                                            .filter(s => s.sleeve_type_size_name)
                                            .map(s => `${s.sleeve_type_size_name}=${s.quantity || 1}`)
                                            .join(', ') || '-';
                                    })();

                                    const rowCount = selectedParts.length;

                                    return selectedParts.map((part, index) => (
                                        <tr key={part.PartRowId || index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#FEF7ED' }}>
                                            {/* Customer Name - rowSpan on first row */}
                                            {index === 0 && (
                                                <td rowSpan={rowCount} style={{ padding: '0.75rem 1rem', border: '1px solid #374151', whiteSpace: 'nowrap', verticalAlign: 'middle', textAlign: 'center' }}>
                                                    {selectedPattern?.CustomerName || '-'}
                                                </td>
                                            )}
                                            {/* Pattern No - rowSpan on first row */}
                                            {index === 0 && (
                                                <td rowSpan={rowCount} style={{ padding: '0.75rem 1rem', border: '1px solid #374151', whiteSpace: 'nowrap', fontWeight: '600', color: '#059669', verticalAlign: 'middle', textAlign: 'center' }}>
                                                    {selectedPattern?.PatternNo || '-'}
                                                </td>
                                            )}
                                            {/* Part No - individual per row */}
                                            <td style={{ padding: '0.75rem 1rem', border: '1px solid #374151', fontWeight: '600', color: '#2563EB', whiteSpace: 'nowrap' }}>
                                                {part.InternalPartNo || part.PartNo || '-'}
                                            </td>
                                            {/* Part Name - individual per row */}
                                            <td style={{ padding: '0.75rem 1rem', border: '1px solid #374151', color: '#6B7280', maxWidth: '250px', wordWrap: 'break-word' }}>
                                                {part.PartName || '-'}
                                            </td>
                                            {/* Cavity - individual per row */}
                                            <td style={{ padding: '0.75rem 1rem', border: '1px solid #374151', textAlign: 'center', fontWeight: '600', color: '#7C3AED' }}>
                                                {parseInt(part.Qty) || 1}
                                            </td>
                                            {/* Weight (kg) - individual per row */}
                                            <td style={{ padding: '0.75rem 1rem', border: '1px solid #374151', textAlign: 'center', fontWeight: '600', color: '#059669' }}>
                                                {parseFloat(part.Weight) ? parseFloat(part.Weight).toFixed(2) : '-'}
                                            </td>
                                            {/* Core - rowSpan on first row */}
                                            {index === 0 && (
                                                <td rowSpan={rowCount} style={{ padding: '0.75rem 1rem', border: '1px solid #374151', textAlign: 'center', backgroundColor: '#FEF3C7', verticalAlign: 'middle' }}>
                                                    {coreType}
                                                </td>
                                            )}
                                            {/* Total Cast Weight - rowSpan on first row */}
                                            {index === 0 && (
                                                <td rowSpan={rowCount} style={{ padding: '0.75rem 1rem', border: '1px solid #374151', textAlign: 'center', fontWeight: '600', color: '#059669', verticalAlign: 'middle' }}>
                                                    {totalCastWeight.toFixed(2)}
                                                </td>
                                            )}
                                            {/* Boxes Per Heat - rowSpan on first row */}
                                            {index === 0 && (
                                                <td rowSpan={rowCount} style={{ padding: '0.75rem 1rem', border: '1px solid #374151', textAlign: 'center', backgroundColor: '#FEF3C7', verticalAlign: 'middle' }}>
                                                    {patternDetails?.Box_Per_Heat || '-'}
                                                </td>
                                            )}
                                            {/* Mould Box Size - rowSpan on first row */}
                                            {index === 0 && (
                                                <td rowSpan={rowCount} style={{ padding: '0.75rem 1rem', border: '1px solid #374151', textAlign: 'center', backgroundColor: '#FEF3C7', fontWeight: '600', color: '#7C3AED', verticalAlign: 'middle' }}>
                                                    {patternDetails?.Moulding_Box_Size || '-'}
                                                </td>
                                            )}
                                            {/* Sleeves - rowSpan on first row */}
                                            {index === 0 && (
                                                <td rowSpan={rowCount} style={{ padding: '0.75rem 1rem', border: '1px solid #374151', textAlign: 'center', backgroundColor: '#FEF3C7', verticalAlign: 'middle' }}>
                                                    {sleeveInfo}
                                                </td>
                                            )}
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Configuration Section - show when parts are selected */}
            {selectedParts.length > 0 && (
                <div className="section-container section-purple" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="section-title purple">Entry Configuration ({selectedParts.length} part(s) selected)</h3>

                    <div className="form-grid">
                        {/* Plate Qty */}
                        <div className="form-group">
                            <label htmlFor="plateQty" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                Plate Qty <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <input
                                type="number"
                                id="plateQty"
                                value={plateQty}
                                onChange={(e) => setPlateQty(e.target.value)}
                                className="input-field"
                                placeholder="Enter Plate Qty"
                                min="1"
                            />
                        </div>

                        {/* Shift Dropdown */}
                        <div className="form-group">
                            <label htmlFor="shift" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                Shift <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <select
                                id="shift"
                                value={shift}
                                onChange={(e) => setShift(e.target.value)}
                                className="input-field"
                                style={{ cursor: 'pointer' }}
                            >
                                <option value="">Select Shift</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                        <button onClick={handleAddToCalculatedTable} className="btn btn-primary">
                            OK - Calculate & Add
                        </button>
                    </div>
                </div>
            )}

            {/* Calculated Table Section (Staged Entries) */}
            {stagedEntries.length > 0 && (
                <div className="section-container" style={{ marginBottom: '1.5rem', backgroundColor: '#FFFBEB', border: '2px solid #F59E0B' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: '#B45309' }}>
                        Calculated Planning Entries ({stagedEntries.length} entries)
                    </h3>


                    <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Cust_Name</th>
                                    <th style={thStyle}>Pattern No</th>
                                    <th style={thStyle}>Part No</th>
                                    <th style={thStyle}>Part Name</th>
                                    <th style={thStyle}>Cavity</th>
                                    <th style={thStyle}>Weight (kg)</th>
                                    <th style={thStyle}>Core</th>
                                    <th style={{ ...thStyle, backgroundColor: '#FEF08A' }}>Plate Qty</th>
                                    <th style={{ ...thStyle, backgroundColor: '#FEF08A' }}>Production Qty</th>
                                    <th style={thStyle}>Cast Wt</th>
                                    <th style={thStyle}>Total Wt</th>
                                    <th style={thStyle}>Boxes/Heat</th>
                                    <th style={thStyle}>No of Heats</th>
                                    <th style={thStyle}>Sleeves</th>
                                    <th style={thStyle}>Shift</th>
                                    <th style={thStyle}>Mould Box Size</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stagedEntries.map((entry) => {
                                    const parts = entry.parts || [{ partNo: entry.partNo, partName: entry.partName, cavity: entry.cavity, weight: 0 }];
                                    const rowCount = parts.length;

                                    return parts.map((part, partIndex) => (
                                        <tr key={`${entry.id}-${partIndex}`} style={{ backgroundColor: partIndex % 2 === 0 ? 'white' : '#FEF7ED' }}>
                                            {/* Customer Name - rowSpan on first row */}
                                            {partIndex === 0 && (
                                                <td rowSpan={rowCount} style={{ ...tdStyle, verticalAlign: 'middle', textAlign: 'center' }}>{entry.customerName}</td>
                                            )}
                                            {/* Pattern No - rowSpan on first row */}
                                            {partIndex === 0 && (
                                                <td rowSpan={rowCount} style={{ ...tdStyle, fontWeight: '600', color: '#059669', verticalAlign: 'middle', textAlign: 'center' }}>{entry.patternNo}</td>
                                            )}
                                            {/* Part No - individual per row */}
                                            <td style={{ ...tdStyle, fontWeight: '600', color: '#2563EB', whiteSpace: 'nowrap' }}>{part.partNo}</td>
                                            {/* Part Name - individual per row */}
                                            <td style={{ ...tdStyle, color: '#6B7280', maxWidth: '200px', wordWrap: 'break-word', whiteSpace: 'normal' }}>{part.partName || '-'}</td>
                                            {/* Cavity - individual per row */}
                                            <td style={{ ...tdStyle, fontWeight: '600', color: '#7C3AED', textAlign: 'center' }}>{part.cavity}</td>
                                            {/* Weight (kg) - individual per row */}
                                            <td style={{ ...tdStyle, fontWeight: '600', color: '#059669', textAlign: 'center' }}>{part.weight ? part.weight.toFixed(2) : '-'}</td>
                                            {/* Core - rowSpan on first row */}
                                            {partIndex === 0 && (
                                                <td rowSpan={rowCount} style={{ ...tdStyle, backgroundColor: '#FEF3C7', verticalAlign: 'middle', textAlign: 'center' }}>{entry.coreType}</td>
                                            )}
                                            {/* Plate Qty - rowSpan on first row */}
                                            {partIndex === 0 && (
                                                <td rowSpan={rowCount} style={{ ...tdStyle, backgroundColor: '#FEF08A', fontWeight: '600', verticalAlign: 'middle', textAlign: 'center' }}>{entry.plateQty}</td>
                                            )}
                                            {/* Production Qty - individual per row (Plate Qty × Cavity) */}
                                            <td style={{ ...tdStyle, backgroundColor: '#FEF08A', fontWeight: '600', textAlign: 'center' }}>{entry.plateQty * part.cavity}</td>
                                            {/* Cast Wt - rowSpan on first row */}
                                            {partIndex === 0 && (
                                                <td rowSpan={rowCount} style={{ ...tdStyle, verticalAlign: 'middle', textAlign: 'center' }}>{entry.castWeight}</td>
                                            )}
                                            {/* Total Wt - rowSpan on first row */}
                                            {partIndex === 0 && (
                                                <td rowSpan={rowCount} style={{ ...tdStyle, fontWeight: '600', color: '#059669', verticalAlign: 'middle', textAlign: 'center' }}>{entry.totalWeight}</td>
                                            )}
                                            {/* Boxes/Heat - rowSpan on first row */}
                                            {partIndex === 0 && (
                                                <td rowSpan={rowCount} style={{ ...tdStyle, backgroundColor: '#FEF3C7', verticalAlign: 'middle', textAlign: 'center' }}>{entry.boxPerHeat}</td>
                                            )}
                                            {/* No of Heats - rowSpan on first row */}
                                            {partIndex === 0 && (
                                                <td rowSpan={rowCount} style={{ ...tdStyle, backgroundColor: '#FEF3C7', fontWeight: '600', color: '#059669', verticalAlign: 'middle', textAlign: 'center' }}>{entry.noOfHeats}</td>
                                            )}
                                            {/* Sleeves - rowSpan on first row */}
                                            {partIndex === 0 && (
                                                <td rowSpan={rowCount} style={{ ...tdStyle, backgroundColor: '#FEF3C7', verticalAlign: 'middle', textAlign: 'center' }}>{entry.sleeve}</td>
                                            )}
                                            {/* Shift - rowSpan on first row */}
                                            {partIndex === 0 && (
                                                <td rowSpan={rowCount} style={{ ...tdStyle, verticalAlign: 'middle', textAlign: 'center' }}>{entry.shift}</td>
                                            )}
                                            {/* Mould Box Size - rowSpan on first row */}
                                            {partIndex === 0 && (
                                                <td rowSpan={rowCount} style={{ ...tdStyle, fontWeight: '600', color: '#7C3AED', verticalAlign: 'middle', textAlign: 'center' }}>{entry.mouldBoxSize}</td>
                                            )}
                                        </tr>
                                    ));
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <button onClick={handleClearAll} className="btn btn-secondary">
                            Clear
                        </button>
                        <button
                            onClick={handleSubmitAll}
                            className="btn btn-primary"
                            disabled={isSubmitting || stagedEntries.length === 0}
                            style={{ backgroundColor: '#10B981' }}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </button>
                    </div>
                </div>
            )}

            {/* Existing Records Section with Filters */}
            <div className="section-container section-gray">
                <h3 className="section-title gray">Planning Entry Records</h3>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                            Filter by Date
                        </label>
                        <DatePicker
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            placeholder="Filter by date..."
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                            Filter by Shift
                        </label>
                        <select
                            value={filterShift}
                            onChange={(e) => setFilterShift(e.target.value)}
                            className="input-field"
                            style={{ width: '140px', cursor: 'pointer' }}
                        >
                            <option value="">All Shifts</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                        </select>
                    </div>
                    {(filterDate || filterShift) && (
                        <div style={{ alignSelf: 'flex-end' }}>
                            <button
                                onClick={() => { setFilterDate(''); setFilterShift(''); }}
                                className="btn btn-secondary"
                                style={{ padding: '0.5rem 1rem' }}
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>

                {loadingRecords ? (
                    <p style={{ color: '#6B7280' }}>Loading records...</p>
                ) : filteredRecords.length === 0 ? (
                    <p style={{ color: '#6B7280', fontStyle: 'italic' }}>No records found</p>
                ) : (
                    <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F9FAFB', zIndex: 1 }}>
                                <tr>
                                    <th style={thStyle}>Plan Date</th>
                                    <th style={thStyle}>Cust_Name</th>
                                    <th style={thStyle}>Part No</th>
                                    <th style={thStyle}>Part Name</th>
                                    <th style={thStyle}>Cavity</th>
                                    <th style={thStyle}>Weight (kg)</th>
                                    <th style={thStyle}>Core</th>
                                    <th style={{ ...thStyle, backgroundColor: '#FEF08A' }}>Plate Qty</th>
                                    <th style={{ ...thStyle, backgroundColor: '#FEF08A' }}>Production Qty</th>
                                    <th style={thStyle}>Cast. Wt</th>
                                    <th style={thStyle}>Total Wt.</th>
                                    <th style={thStyle}>Boxes/Heat</th>
                                    <th style={thStyle}>No of Heats</th>
                                    <th style={thStyle}>Sleeves</th>
                                    <th style={thStyle}>Shift</th>
                                    <th style={thStyle}>Mould Box</th>
                                    <th style={thStyle}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map((record, index) => {
                                    // Parse comma-separated strings into arrays
                                    const partNos = (record.PartNo || '').split(',').map(s => s.trim());
                                    const partNames = (record.PartName || '').split(',').map(s => s.trim());
                                    const cavities = (record.Cavity ? String(record.Cavity).split(',') : []).map(s => parseInt(s.trim()) || 0);
                                    // Handle legacy data where Weight might be missing or not a CSV string
                                    const weights = (record.Weight ? String(record.Weight).split(',') : []).map(s => parseFloat(s.trim()) || 0);

                                    // Determine the number of rows based on PartNo count (default to 1 if empty)
                                    const rowCount = Math.max(partNos.length, 1);

                                    // Generate rows for this record
                                    return Array.from({ length: rowCount }).map((_, partIndex) => {
                                        const isFirstRow = partIndex === 0;

                                        // Get individual part details (handle potential index out of bounds)
                                        const currentPartNo = partNos[partIndex] || '-';
                                        const currentPartName = partNames[partIndex] || '-';
                                        const currentCavity = cavities[partIndex] || (rowCount === 1 && record.Cavity ? parseInt(record.Cavity) : 1);
                                        const currentWeight = weights[partIndex] || 0;

                                        // Calculate per-part Production Qty: PlateQty * PartCavity
                                        const currentProductionQty = (parseInt(record.PlateQty) || 0) * currentCavity;

                                        return (
                                            <tr key={`${record.EntryId}-${partIndex}`} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#F9FAFB' }}>
                                                {/* Shared Columns (rowSpan) */}
                                                {isFirstRow && (
                                                    <>
                                                        <td rowSpan={rowCount} style={{ ...tdStyle, verticalAlign: 'middle' }}>{formatDate(record.PlanDate)}</td>
                                                        <td rowSpan={rowCount} style={{ ...tdStyle, verticalAlign: 'middle' }}>{record.CustomerName || '-'}</td>
                                                    </>
                                                )}

                                                {/* Individual Part Columns */}
                                                <td style={{ ...tdStyle, fontWeight: '600', color: '#2563EB' }}>{currentPartNo}</td>
                                                <td style={tdStyle}>{currentPartName}</td>
                                                <td style={{ ...tdStyle, fontWeight: '600', color: '#7C3AED' }}>{currentCavity}</td>
                                                <td style={{ ...tdStyle, fontWeight: '600', color: '#059669' }}>{currentWeight > 0 ? currentWeight.toFixed(2) : '-'}</td>

                                                {/* Shared Columns (rowSpan) */}
                                                {isFirstRow && (
                                                    <td rowSpan={rowCount} style={{ ...tdStyle, verticalAlign: 'middle' }}>{record.CoreType || '-'}</td>
                                                )}

                                                {/* Plate Qty (Shared) */}
                                                {isFirstRow && (
                                                    <td rowSpan={rowCount} style={{ ...tdStyle, backgroundColor: '#FEF08A', fontWeight: '600', verticalAlign: 'middle' }}>{record.PlateQty || '-'}</td>
                                                )}

                                                {/* Production Qty (Individual: PlateQty * PartCavity) */}
                                                <td style={{ ...tdStyle, backgroundColor: '#FEF08A', fontWeight: '600' }}>{currentProductionQty}</td>

                                                {/* Remaining Shared Columns (rowSpan) */}
                                                {isFirstRow && (
                                                    <>
                                                        <td rowSpan={rowCount} style={{ ...tdStyle, verticalAlign: 'middle' }}>{record.CastWeight || '-'}</td>
                                                        <td rowSpan={rowCount} style={{ ...tdStyle, fontWeight: '600', color: '#059669', verticalAlign: 'middle' }}>{record.TotalWeight || '-'}</td>
                                                        <td rowSpan={rowCount} style={{ ...tdStyle, verticalAlign: 'middle' }}>{record.BoxesPerHeat || '-'}</td>
                                                        <td rowSpan={rowCount} style={{ ...tdStyle, fontWeight: '600', color: '#059669', verticalAlign: 'middle' }}>{record.NoOfHeats || '-'}</td>
                                                        <td rowSpan={rowCount} style={{ ...tdStyle, verticalAlign: 'middle' }}>{record.Sleeves || '-'}</td>
                                                        <td rowSpan={rowCount} style={{ ...tdStyle, verticalAlign: 'middle' }}>{record.Shift}</td>
                                                        <td rowSpan={rowCount} style={{ ...tdStyle, fontWeight: '600', color: '#7C3AED', verticalAlign: 'middle' }}>{record.MouldBoxSize}</td>
                                                        <td rowSpan={rowCount} style={{ ...tdStyle, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                                            <button
                                                                onClick={() => handleEditRecord(record)}
                                                                style={{
                                                                    padding: '0.25rem 0.5rem',
                                                                    fontSize: '0.75rem',
                                                                    backgroundColor: '#3B82F6',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    cursor: 'pointer',
                                                                    marginRight: '0.25rem'
                                                                }}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteClick(record)}
                                                                disabled={isDeleting}
                                                                style={{
                                                                    padding: '0.25rem 0.5rem',
                                                                    fontSize: '0.75rem',
                                                                    backgroundColor: '#EF4444',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    cursor: isDeleting ? 'wait' : 'pointer',
                                                                    opacity: isDeleting ? 0.6 : 1
                                                                }}
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    });
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6B7280' }}>
                    Showing {filteredRecords.length} of {existingRecords.length} records
                </div>
            </div>

            {/* Print Controls Section */}
            <div className="section-container" style={{ marginBottom: '1.5rem', backgroundColor: '#F5F3FF', borderLeft: '4px solid #8B5CF6' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: '#7C3AED' }}>
                    Preview & Print Production Planning
                </h3>

                <div className="form-grid" style={{ maxWidth: '600px', marginBottom: '1rem' }}>
                    {/* Print Plan Date */}
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Plan Date <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <DatePicker
                            value={printPlanDate}
                            onChange={(e) => setPrintPlanDate(e.target.value)}
                            placeholder="Select print date..."
                        />
                    </div>

                    {/* Print Shift */}
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Shift <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <select
                            value={printShift}
                            onChange={(e) => setPrintShift(e.target.value)}
                            className="input-field"
                            style={{ cursor: 'pointer' }}
                        >
                            <option value="">Select Shift</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                        </select>
                    </div>

                    {/* Print Mould Box Size */}
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Mould Box Size
                        </label>
                        <select
                            value={printMouldBoxSize}
                            onChange={(e) => setPrintMouldBoxSize(e.target.value)}
                            className="input-field"
                            style={{ cursor: 'pointer' }}
                        >
                            <option value="">All Sizes</option>
                            {[...new Set(existingRecords.map(r => r.MouldBoxSize).filter(Boolean))].sort().map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    onClick={handlePreviewAndPrint}
                    disabled={isPrintLoading}
                    className="btn"
                    style={{
                        backgroundColor: '#8B5CF6',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        opacity: isPrintLoading ? 0.7 : 1
                    }}
                >
                    🖨️ {isPrintLoading ? 'Loading...' : 'Preview and Print'}
                </button>
            </div>

            {/* Print Preview Modal */}
            {showPrintPreview && (
                <div
                    className="print-modal-overlay"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: '1rem'
                    }}
                    onClick={(e) => e.target === e.currentTarget && setShowPrintPreview(false)}
                >
                    <div
                        className="print-modal-content"
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            width: '100%',
                            maxWidth: '1000px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            padding: '1.5rem'
                        }}
                    >
                        {/* Print Buttons */}
                        <div className="no-print" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handlePrint}
                                className="btn btn-primary"
                                style={{ padding: '0.5rem 1.5rem' }}
                            >
                                🖨️ Print
                            </button>
                            <button
                                onClick={() => setShowPrintPreview(false)}
                                className="btn btn-secondary"
                                style={{ padding: '0.5rem 1.5rem' }}
                            >
                                ✕ Close
                            </button>
                        </div>

                        {/* Print Content */}
                        <div ref={printRef} className="print-content" style={{
                            border: '2px solid #1e3a5f',
                            padding: '1.5rem',
                            fontFamily: "'Segoe UI', 'Roboto', 'Arial', sans-serif",
                            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)'
                        }}>
                            {/* Header with Process Card Note */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: '1rem',
                                paddingBottom: '0.75rem',
                                borderBottom: '3px solid #1e3a5f'
                            }}>
                                {/* Empty left spacer for balance */}
                                <div style={{ width: '180px' }}></div>

                                {/* Center: Title */}
                                <div style={{ textAlign: 'center', flex: 1 }}>
                                    <h1 style={{
                                        fontSize: '1.4rem',
                                        fontWeight: '700',
                                        color: '#1e3a5f',
                                        margin: '0 0 0.3rem 0',
                                        letterSpacing: '2px',
                                        textTransform: 'uppercase'
                                    }}>
                                        Production Planning
                                    </h1>
                                    <p style={{
                                        fontSize: '0.75rem',
                                        color: '#64748b',
                                        margin: 0,
                                        fontStyle: 'italic'
                                    }}>
                                        Production Planning Department
                                    </p>
                                </div>

                                {/* Right: Process Card Note */}
                                <div style={{
                                    backgroundColor: '#FFFF00',
                                    padding: '0.4rem 0.8rem',
                                    fontWeight: '700',
                                    fontSize: '0.7rem',
                                    color: '#000000',
                                    whiteSpace: 'nowrap',
                                    border: '1px solid #000'
                                }}>
                                    PLEASE FOLLOW PROCESS CARD
                                </div>
                            </div>

                            {/* Date, Shift, Mould Box Info */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '1.5rem',
                                marginBottom: '1rem',
                                padding: '0.5rem',
                                backgroundColor: '#e8f4fd',
                                borderRadius: '6px',
                                border: '1px solid #bfdbfe',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.75rem' }}>Date:</span>
                                    <span style={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #94a3b8',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '4px',
                                        fontWeight: '600',
                                        color: '#1e3a5f',
                                        fontSize: '0.75rem'
                                    }}>
                                        {formatDate(printPlanDate)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.75rem' }}>Shift:</span>
                                    <span style={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #94a3b8',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '4px',
                                        fontWeight: '600',
                                        color: '#1e3a5f',
                                        fontSize: '0.75rem',
                                        minWidth: '30px',
                                        textAlign: 'center'
                                    }}>
                                        {printShift}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.75rem' }}>Mould Box Size:</span>
                                    <span style={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #94a3b8',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '4px',
                                        fontWeight: '600',
                                        color: '#1e3a5f',
                                        fontSize: '0.75rem'
                                    }}>
                                        {getPrintMouldBoxSize()}
                                    </span>
                                </div>
                            </div>

                            {/* Planning Table */}
                            <div style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    fontSize: '0.7rem'
                                }}>
                                    <thead>
                                        <tr>
                                            <th style={{ backgroundColor: '#d4a574', color: '#1e3a5f', padding: '0.3rem 0.25rem', fontWeight: '600', border: '1px solid #1e3a5f', textAlign: 'left', fontSize: '0.65rem' }}>Cust_Name</th>
                                            <th style={{ backgroundColor: '#d4a574', color: '#1e3a5f', padding: '0.3rem 0.25rem', fontWeight: '600', border: '1px solid #1e3a5f', textAlign: 'left', fontSize: '0.65rem' }}>Part No</th>
                                            <th style={{ backgroundColor: '#d4a574', color: '#1e3a5f', padding: '0.3rem 0.25rem', fontWeight: '600', border: '1px solid #1e3a5f', textAlign: 'left', fontSize: '0.65rem' }}>Part Name</th>
                                            <th style={{ backgroundColor: '#d4a574', color: '#1e3a5f', padding: '0.3rem 0.25rem', fontWeight: '600', border: '1px solid #1e3a5f', textAlign: 'center', fontSize: '0.65rem' }}>Cavity</th>
                                            <th style={{ backgroundColor: '#d4a574', color: '#1e3a5f', padding: '0.3rem 0.25rem', fontWeight: '600', border: '1px solid #1e3a5f', textAlign: 'center', fontSize: '0.65rem' }}>Wt (kg)</th>
                                            <th style={{ backgroundColor: '#d4a574', color: '#1e3a5f', padding: '0.3rem 0.25rem', fontWeight: '600', border: '1px solid #1e3a5f', textAlign: 'center', fontSize: '0.65rem' }}>Core</th>
                                            <th style={{ backgroundColor: '#FEF08A', color: '#1e3a5f', padding: '0.3rem 0.25rem', fontWeight: '600', border: '1px solid #1e3a5f', textAlign: 'center', fontSize: '0.65rem' }}>Plate Qty</th>
                                            <th style={{ backgroundColor: '#FEF08A', color: '#1e3a5f', padding: '0.3rem 0.25rem', fontWeight: '600', border: '1px solid #1e3a5f', textAlign: 'center', fontSize: '0.65rem' }}>Prod Qty</th>
                                            <th style={{ backgroundColor: '#d4a574', color: '#1e3a5f', padding: '0.3rem 0.25rem', fontWeight: '600', border: '1px solid #1e3a5f', textAlign: 'center', fontSize: '0.65rem' }}>Cast. Wt</th>
                                            <th style={{ backgroundColor: '#d4a574', color: '#1e3a5f', padding: '0.3rem 0.25rem', fontWeight: '600', border: '1px solid #1e3a5f', textAlign: 'center', fontSize: '0.65rem' }}>Total Wt.</th>
                                            <th style={{ backgroundColor: '#d4a574', color: '#1e3a5f', padding: '0.3rem 0.25rem', fontWeight: '600', border: '1px solid #1e3a5f', textAlign: 'center', fontSize: '0.65rem' }}>Boxes/heat</th>
                                            <th style={{ backgroundColor: '#d4a574', color: '#1e3a5f', padding: '0.3rem 0.25rem', fontWeight: '600', border: '1px solid #1e3a5f', textAlign: 'center', fontSize: '0.65rem' }}>No of Heats</th>
                                            <th style={{ backgroundColor: '#d4a574', color: '#1e3a5f', padding: '0.3rem 0.25rem', fontWeight: '600', border: '1px solid #1e3a5f', textAlign: 'left', fontSize: '0.65rem' }}>Sleeve</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {printData.map((record, recordIndex) => {
                                            // Parse comma-separated strings into arrays
                                            const partNos = (record.PartNo || '').split(',').map(s => s.trim());
                                            const partNames = (record.PartName || '').split(',').map(s => s.trim());
                                            const cavities = (record.Cavity ? String(record.Cavity).split(',') : []).map(s => parseInt(s.trim()) || 0);
                                            const weights = (record.Weight ? String(record.Weight).split(',') : []).map(s => parseFloat(s.trim()) || 0);

                                            // Determine the number of rows based on PartNo count
                                            const rowCount = Math.max(partNos.length, 1);

                                            return Array.from({ length: rowCount }).map((_, partIndex) => {
                                                const isFirstRow = partIndex === 0;
                                                const currentPartNo = partNos[partIndex] || '-';
                                                const currentPartName = partNames[partIndex] || '-';
                                                const currentCavity = cavities[partIndex] || (rowCount === 1 && record.Cavity ? parseInt(record.Cavity) : 1);
                                                const currentWeight = weights[partIndex] || 0;
                                                const currentProductionQty = (parseInt(record.PlateQty) || 0) * currentCavity;

                                                return (
                                                    <tr key={`${record.EntryId}-${partIndex}`} style={{
                                                        backgroundColor: recordIndex % 2 === 0 ? '#ffffff' : '#f8fafc'
                                                    }}>
                                                        {/* Customer Name - rowSpan */}
                                                        {isFirstRow && (
                                                            <td rowSpan={rowCount} style={{ padding: '0.25rem', border: '1px solid #94a3b8', color: '#334155', fontSize: '0.65rem', verticalAlign: 'middle' }}>{record.CustomerName || '-'}</td>
                                                        )}

                                                        {/* Individual Part Columns */}
                                                        <td style={{ padding: '0.25rem', border: '1px solid #94a3b8', fontWeight: '500', color: '#1e3a5f', fontSize: '0.65rem' }}>{currentPartNo}</td>
                                                        <td style={{ padding: '0.25rem', border: '1px solid #94a3b8', color: '#334155', fontSize: '0.65rem' }}>{currentPartName}</td>
                                                        <td style={{ padding: '0.25rem', border: '1px solid #94a3b8', textAlign: 'center', fontWeight: '600', color: '#7C3AED', fontSize: '0.65rem' }}>{currentCavity}</td>
                                                        <td style={{ padding: '0.25rem', border: '1px solid #94a3b8', textAlign: 'center', fontWeight: '600', color: '#059669', fontSize: '0.65rem' }}>{currentWeight > 0 ? currentWeight.toFixed(2) : '-'}</td>

                                                        {/* Core - rowSpan */}
                                                        {isFirstRow && (
                                                            <td rowSpan={rowCount} style={{ padding: '0.25rem', border: '1px solid #94a3b8', textAlign: 'center', color: '#334155', fontSize: '0.65rem', verticalAlign: 'middle' }}>{record.CoreType || '-'}</td>
                                                        )}

                                                        {/* Plate Qty - rowSpan */}
                                                        {isFirstRow && (
                                                            <td rowSpan={rowCount} style={{ padding: '0.25rem', border: '1px solid #94a3b8', textAlign: 'center', fontWeight: '600', color: '#1e3a5f', fontSize: '0.65rem', backgroundColor: '#FEF9C3', verticalAlign: 'middle' }}>{record.PlateQty || '-'}</td>
                                                        )}

                                                        {/* Part Qty - Individual per part */}
                                                        <td style={{ padding: '0.25rem', border: '1px solid #94a3b8', textAlign: 'center', fontWeight: '600', color: '#1e3a5f', fontSize: '0.65rem', backgroundColor: '#FEF9C3' }}>{currentProductionQty}</td>

                                                        {/* Remaining columns - rowSpan */}
                                                        {isFirstRow && (
                                                            <>
                                                                <td rowSpan={rowCount} style={{ padding: '0.25rem', border: '1px solid #94a3b8', textAlign: 'center', color: '#334155', fontSize: '0.65rem', verticalAlign: 'middle' }}>{record.CastWeight || '-'}</td>
                                                                <td rowSpan={rowCount} style={{ padding: '0.25rem', border: '1px solid #94a3b8', textAlign: 'center', fontWeight: '600', color: '#047857', fontSize: '0.65rem', verticalAlign: 'middle' }}>{record.TotalWeight || '-'}</td>
                                                                <td rowSpan={rowCount} style={{ padding: '0.25rem', border: '1px solid #94a3b8', textAlign: 'center', color: '#334155', fontSize: '0.65rem', verticalAlign: 'middle' }}>{record.BoxesPerHeat || '-'}</td>
                                                                <td rowSpan={rowCount} style={{ padding: '0.25rem', border: '1px solid #94a3b8', textAlign: 'center', fontWeight: '600', color: '#1e3a5f', fontSize: '0.65rem', verticalAlign: 'middle' }}>{record.NoOfHeats || '-'}</td>
                                                                <td rowSpan={rowCount} style={{ padding: '0.25rem', border: '1px solid #94a3b8', color: '#334155', fontSize: '0.6rem', verticalAlign: 'middle' }}>{record.Sleeves || '-'}</td>
                                                            </>
                                                        )}
                                                    </tr>
                                                );
                                            });
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Signature Section */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginTop: '3rem',
                                paddingTop: '1.5rem',
                                borderTop: '2px solid #1e3a5f'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        borderTop: '1px solid #64748b',
                                        width: '150px',
                                        marginTop: '2.5rem',
                                        marginBottom: '0.5rem',
                                        paddingTop: '0.5rem'
                                    }}></div>
                                    <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Prepared By</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        borderTop: '1px solid #64748b',
                                        width: '150px',
                                        marginTop: '2.5rem',
                                        marginBottom: '0.5rem',
                                        paddingTop: '0.5rem'
                                    }}></div>
                                    <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>Approved By</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Styles */}
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 8mm;
                    }
                    
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    body * {
                        visibility: hidden;
                    }
                    
                    .print-content, .print-content * {
                        visibility: visible;
                    }
                    
                    .print-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 5mm !important;
                        box-sizing: border-box;
                    }
                    
                    .print-content table {
                        page-break-inside: avoid;
                        font-size: 7pt !important;
                    }
                    
                    .print-content table th,
                    .print-content table td {
                        padding: 2px 3px !important;
                    }
                    
                    .print-content tr {
                        page-break-inside: avoid;
                    }
                    
                    .print-content thead {
                        display: table-header-group;
                    }
                    
                    .print-content h1 {
                        font-size: 14pt !important;
                        margin-bottom: 2px !important;
                    }
                    
                    .print-content p {
                        font-size: 8pt !important;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                    
                    .print-modal-overlay {
                        position: static !important;
                        background: none !important;
                    }
                    
                    .print-modal-content {
                        box-shadow: none !important;
                        padding: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                    }
                }
            `}</style>

            {/* Edit Modal */}
            {editingRecord && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px',
                        width: '500px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto'
                    }}>
                        <h3 style={{ marginBottom: '1rem', color: '#1F2937' }}>Edit Planning Entry</h3>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Plan Date</label>
                                <DatePicker
                                    value={editingRecord.planDate}
                                    onChange={(e) => setEditingRecord({ ...editingRecord, planDate: e.target.value })}
                                    placeholder="Select date..."
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Production Qty</label>
                                    <input
                                        type="number"
                                        value={editingRecord.productionQty}
                                        onChange={(e) => setEditingRecord({ ...editingRecord, productionQty: e.target.value })}
                                        className="input-field"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Plate Qty</label>
                                    <input
                                        type="number"
                                        value={editingRecord.plateQty}
                                        onChange={(e) => setEditingRecord({ ...editingRecord, plateQty: e.target.value })}
                                        className="input-field"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Shift</label>
                                    <select
                                        value={editingRecord.shift}
                                        onChange={(e) => setEditingRecord({ ...editingRecord, shift: e.target.value })}
                                        className="input-field"
                                        style={{ width: '100%' }}
                                    >
                                        <option value="1">Shift 1</option>
                                        <option value="2">Shift 2</option>
                                        <option value="3">Shift 3</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Mould Box Size</label>
                                    <input
                                        type="text"
                                        value={editingRecord.mouldBoxSize}
                                        onChange={(e) => setEditingRecord({ ...editingRecord, mouldBoxSize: e.target.value })}
                                        className="input-field"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                            <button
                                onClick={() => setEditingRecord(null)}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateRecord}
                                className="btn btn-primary"
                            >
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                isOpen={showDeleteDialog}
                title="Delete Entry"
                message={`Are you sure you want to delete this planning entry? This action cannot be undone.`}
                onConfirm={handleConfirmDelete}
                onCancel={() => {
                    setShowDeleteDialog(false);
                    setRecordToDelete(null);
                }}
                confirmText="Delete"
                isDanger={true}
            />
        </div>
    );
};

export default PlanningEntry;
