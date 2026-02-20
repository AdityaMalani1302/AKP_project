import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useDebounce } from '../utils/useDebounce';
import { useFormShortcuts } from '../utils/useKeyboardShortcuts';
import { validatePatternMaster } from '../utils/validation';

import PatternForm from './pattern-master/PatternForm'; // New Import
import UnifiedRecordsTable from './pattern-master/UnifiedRecordsTable';
import PatternReturnSection from './pattern-master/PatternReturnSection';
import PatternHistoryTab from './pattern-master/PatternHistoryTab';

import AlertDialog from './common/AlertDialog';
import TableSkeleton from './common/TableSkeleton';
import TextTooltip from './common/TextTooltip';
import Combobox from './common/Combobox';
import AnimatedTabs from './common/AnimatedTabs';

const PatternMaster = ({ user }) => {
    // Tab state with URL persistence
    const [searchParams, setSearchParams] = useSearchParams();

    // Define tabs with their permission IDs
    const allTabs = [
        { id: 'master', label: 'Pattern Master', pageId: 'pattern-master' },
        { id: 'history', label: 'Pattern-Process Card', pageId: 'pattern-process-card' },
        { id: 'return', label: 'Pattern Return History', pageId: 'pattern-return-history' }
    ];

    // Filter tabs based on permissions
    const getVisibleTabs = () => {
        if (!user) return allTabs;

        // Admins see all tabs
        if (user.role === 'admin') return allTabs;

        const allowedPages = user.allowedPages || [];

        // If user has 'all' access, show all tabs
        if (allowedPages.includes('all')) return allTabs;

        // Check if user has ANY sub-tab permissions explicitly assigned
        const hasSpecificSubTabs = allTabs.some(tab =>
            tab.pageId !== 'pattern-master' && allowedPages.includes(tab.pageId)
        );

        if (!hasSpecificSubTabs) {
            // If no specific sub-tabs are assigned, only show the main Pattern Master tab
            return allTabs.filter(tab => tab.pageId === 'pattern-master');
        }

        // Return only allowed tabs
        return allTabs.filter(tab => allowedPages.includes(tab.pageId));
    };

    const tabs = getVisibleTabs();

    // Read tab from URL, default to first visible tab
    const urlTab = searchParams.get('tab');
    const activeTab = (urlTab && tabs.some(t => t.id === urlTab)) ? urlTab : (tabs[0]?.id || 'master');

    // Handler to change tab and update URL
    const setActiveTab = useCallback((tab) => {
        setSearchParams(prev => {
            prev.set('tab', tab);
            return prev;
        }, { replace: true });
    }, [setSearchParams]);

    // Fetch pattern stats for header card
    const { data: patternStats, isLoading: statsLoading } = useQuery({
        queryKey: ['pattern-master', 'stats'],
        queryFn: async () => {
            const res = await api.get('/pattern-master/stats');
            return res.data;
        },
        staleTime: 60000, // 1 minute
        refetchInterval: 60000 // Auto-refresh every 1 minute
    });

    // Split State for Performance
    const [mainData, setMainData] = useState({
        PatternNo: '',
        Customer: null, // Now stores {value, label }
        Serial_No: '', // New field for Serial No
        Part_No: '', // Legacy field, will be derived from partRows[0] on submit
        Product_Name: '',
        Asset_No: '',
        Customer_Po_No: '',
        Tooling_PO_Date: '',
        Purchase_No: '',
        Purchase_Date: '',
        Pattern_Received_Date: ''
    });

    const [patternData, setPatternData] = useState({
        Quoted_Estimated_Weight: '',
        Pattern_Maker: null, // Now stores { value, label }
        Pattern_Material_Details: '',
        No_Of_Patterns_Set: '',
        Pattern_Pieces: '',
        Rack_Location: '',
        Box_Per_Heat: ''
    });

    const [coreBoxData, setCoreBoxData] = useState({
        Core_Box_Material_Details: '',
        Core_Box_Location: '',
        Core_Box_S7_F4_No: '',
        Core_Box_S7_F4_Date: '',
        No_Of_Core_Box_Set: '',
        Core_Box_Pieces: ''
    });

    const [castingData, setCastingData] = useState({
        Casting_Material_Grade: '',
        Moulding_Box_Size: '',
        Total_Weight: '',
        No_Of_Cavities: '',
        Bunch_Wt: '',
        YieldPercent: ''
    });

    // Core Details - single entry with conditional quantities
    const [coreDetailsData, setCoreDetailsData] = useState({
        Core_Wt: '',
        Core_Type: {
            shell: false,
            coldBox: false,
            noBake: false
        },
        shell_qty: '',
        coldBox_qty: '',
        noBake_qty: '',
        Main_Core: false,
        Side_Core: false,
        Loose_Core: false,
        mainCore_qty: '',
        sideCore_qty: '',
        looseCore_qty: ''
    });

    // Chaplets/Chills data
    const [chapletsChillsData, setChapletsChillsData] = useState({
        Chaplets_COPE: '',
        Chaplets_DRAG: '',
        Chills_COPE: '',
        Chills_DRAG: ''
    });

    const [mouldingData, setMouldingData] = useState({
        Mould_Vents_Size: '',
        Mould_Vents_No: '',
        breaker_core_size: '',
        down_sprue_size: '',
        foam_filter_size: '',
        sand_riser_size: '',
        no_of_sand_riser: '',
        ingate_size: '',
        no_of_ingate: '',
        runner_bar_size: '',
        runner_bar_no: ''
    });

    const [sleeveRows, setSleeveRows] = useState([
        {
            sleeve_name: '',
            sleeve_type_size: '',
            sleeve_type_size_name: '',
            quantity: ''
        }
    ]);

    const [additionalData, setAdditionalData] = useState({
        rev_no_status: '',
        date: '',
        comment: ''
    });

    const [errors, setErrors] = useState({});
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Records table state
    // patterns state is managed by React Query now
    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    // Debounced search - auto-search 300ms after typing stops
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger for sub-tables refresh

    // Dynamic parts rows state
    const [partRows, setPartRows] = useState([
        { partNoOption: null, productName: '', materialGradeId: null, materialGradeName: '', qty: '', weight: '' }
    ]);

    // Sleeve options state
    const [sleeveOptions, setSleeveOptions] = useState([]);

    // Pattern numbers for Edit dropdown
    const [patternNumbers, setPatternNumbers] = useState([]);



    // Keyboard shortcuts for power users
    useFormShortcuts({
        onSave: () => {
            // Trigger form submit programmatically
            const form = document.querySelector('form');
            if (form) form.requestSubmit();
        },
        onCancel: () => handleClear(),
        onNew: () => handleClear(),
        enabled: true
    });

    // Fetch sleeves on mount
    useEffect(() => {
        const fetchSleeves = async () => {
            try {
                const response = await api.get('/sleeves');
                const formatted = response.data.map(sleeve => ({
                    value: sleeve.RawMatID,
                    label: sleeve.RawMatName
                }));
                setSleeveOptions(formatted);
            } catch (error) {
                console.error('Error fetching sleeves:', error);
                toast.error('Failed to load sleeve options');
            }
        };
        fetchSleeves();
    }, []);

    // Fetch pattern numbers for Edit dropdown
    useEffect(() => {
        const fetchPatternNumbers = async () => {
            try {
                const response = await api.get('/pattern-master/numbers');
                const formatted = response.data.map(p => ({
                    value: p.PatternId,
                    label: p.PatternNo || `Pattern ${p.PatternId}`
                }));
                setPatternNumbers(formatted);
            } catch (error) {
                console.error('Error fetching pattern numbers:', error);
            }
        };
        fetchPatternNumbers();
    }, [refreshTrigger]);

    // React Query for fetching patterns
    const fetchPatternsFromApi = async (query) => {
        const url = query
            ? `/pattern-master?search=${encodeURIComponent(query)}`
            : '/pattern-master';
        const response = await api.get(url);
        return response.data;
    };

    const queryClient = useQueryClient();

    const { data: patterns = [], isError: isQueryError, isLoading: isQueryLoading } = useQuery({
        queryKey: ['patterns', debouncedSearchTerm],
        queryFn: () => fetchPatternsFromApi(debouncedSearchTerm),
        placeholderData: keepPreviousData,
    });

    // Mutations
    const addMutation = useMutation({
        mutationFn: (newPattern) => api.post('/pattern-master', newPattern),
        onSuccess: (data) => {
            toast.success(`Pattern added successfully! Pattern ID: ${data.data.patternId}`);
            queryClient.invalidateQueries(['patterns']);
            queryClient.invalidateQueries(['pattern-master', 'stats']); // Refresh pattern count
            queryClient.invalidateQueries(['unified-patterns']); // Refresh Unified Records Table
            setRefreshTrigger(prev => prev + 1);
            handleClear();
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.error || 'Failed to add pattern';
            toast.error(errorMsg);
            setError(errorMsg);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/pattern-master/${id}`, data),
        onSuccess: (data, variables) => {
            toast.success(`Pattern updated successfully! Pattern ID: ${variables.id}`);
            queryClient.invalidateQueries(['patterns']);
            queryClient.invalidateQueries(['pattern-master', 'stats']); // Refresh pattern count
            queryClient.invalidateQueries(['unified-patterns']); // Refresh Unified Records Table
            setRefreshTrigger(prev => prev + 1);
            handleClear();
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.error || 'Failed to update pattern';
            toast.error(errorMsg);
            setError(errorMsg);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/pattern-master/${id}`),
        onSuccess: () => {
            toast.success('Pattern deleted successfully!');
            queryClient.invalidateQueries(['patterns']);
            queryClient.invalidateQueries(['pattern-master', 'stats']); // Refresh pattern count
            queryClient.invalidateQueries(['unified-patterns']); // Refresh Unified Records Table
            setRefreshTrigger(prev => prev + 1);
            handleClear(); // Reset all form fields after deletion
            setShowDeleteDialog(false);
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.error || 'Failed to delete pattern';
            toast.error(errorMsg);
            setShowDeleteDialog(false);
        }
    });

    useEffect(() => {
        if (isQueryError) {
            toast.error('Failed to load patterns');
        }
    }, [isQueryError]);

    // Search is now auto-triggered by debounce
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Row click handler for editing - always fetches full pattern details from API
    const handleRowClick = async (patternOrData) => {
        const patternId = patternOrData.PatternId;
        setSelectedId(patternId);
        setIsEditing(true);

        // Always fetch full pattern details from API to ensure proper data structure
        // The unified-data endpoint has a different format that doesn't work for form editing
        let data;
        try {
            const response = await api.get(`/pattern-master/${patternId}`);
            data = response.data;
        } catch (err) {
            console.error('Error loading pattern details:', err);
            toast.error('Failed to load pattern details for editing');
            return;
        }

        // Populate Main Details
        setMainData({
            PatternNo: data.PatternNo || '',
            Customer: data.Customer ? { value: data.Customer, label: data.CustomerName || data.Customer } : null,
            Serial_No: data.Serial_No || '',
            Part_No: data.Part_No || '',
            Product_Name: data.Product_Name || '',
            Asset_No: data.Asset_No || '',
            Customer_Po_No: data.Customer_Po_No || '',
            Tooling_PO_Date: data.Tooling_PO_Date || '',
            Purchase_No: data.Purchase_No || '',
            Purchase_Date: data.Purchase_Date || '',
            Pattern_Received_Date: data.Pattern_Received_Date || ''
        });

        // Populate Pattern Details
        setPatternData({
            Quoted_Estimated_Weight: data.Quoted_Estimated_Weight || '',
            Pattern_Maker: data.Pattern_Maker ? { value: data.Pattern_Maker, label: data.Pattern_Maker_Name || data.Pattern_Maker } : null,
            Pattern_Material_Details: data.Pattern_Material_Details || '',
            No_Of_Patterns_Set: data.No_Of_Patterns_Set || '',
            Pattern_Pieces: data.Pattern_Pieces || '',
            Rack_Location: data.Rack_Location || '',
            Box_Per_Heat: data.Box_Per_Heat || ''
        });

        // Populate Core Box Details
        setCoreBoxData({
            Core_Box_Material_Details: data.Core_Box_Material_Details || '',
            Core_Box_Location: data.Core_Box_Location || '',
            Core_Box_S7_F4_No: data.Core_Box_S7_F4_No || '',
            Core_Box_S7_F4_Date: data.Core_Box_S7_F4_Date || '',
            No_Of_Core_Box_Set: data.No_Of_Core_Box_Set || '',
            Core_Box_Pieces: data.Core_Box_Pieces || ''
        });

        // Populate Casting Details
        setCastingData({
            Casting_Material_Grade: data.Casting_Material_Grade || '',
            Moulding_Box_Size: data.Moulding_Box_Size || '',
            Total_Weight: data.Total_Weight || '',
            No_Of_Cavities: data.No_Of_Cavities || '',
            Bunch_Wt: data.Bunch_Wt || '',
            YieldPercent: data.YieldPercent || ''
        });

        // Populate Core Details - parse Core_Type string back to checkboxes
        const coreTypeObj = {
            shell: data.Core_Type?.includes('Shell') || false,
            coldBox: data.Core_Type?.includes('Cold Box') || false,
            noBake: data.Core_Type?.includes('No-Bake') || false
        };

        setCoreDetailsData({
            Core_Wt: data.Core_Wt || '',
            Core_Type: coreTypeObj,
            shell_qty: data.shell_qty || '',
            coldBox_qty: data.coldBox_qty || '',
            noBake_qty: data.noBake_qty || '',
            Main_Core: data.Main_Core === 'Yes' || data.Main_Core === true,
            Side_Core: data.Side_Core === 'Yes' || data.Side_Core === true,
            Loose_Core: data.Loose_Core === 'Yes' || data.Loose_Core === true,
            mainCore_qty: data.mainCore_qty || '',
            sideCore_qty: data.sideCore_qty || '',
            looseCore_qty: data.looseCore_qty || ''
        });

        // Populate Chaplets & Chills
        setChapletsChillsData({
            Chaplets_COPE: data.Chaplets_COPE || '',
            Chaplets_DRAG: data.Chaplets_DRAG || '',
            Chills_COPE: data.Chills_COPE || '',
            Chills_DRAG: data.Chills_DRAG || ''
        });

        // Populate Moulding Details
        setMouldingData({
            Mould_Vents_Size: data.Mould_Vents_Size || '',
            Mould_Vents_No: data.Mould_Vents_No || '',
            breaker_core_size: data.breaker_core_size || '',
            down_sprue_size: data.down_sprue_size || '',
            foam_filter_size: data.foam_filter_size || '',
            sand_riser_size: data.sand_riser_size || '',
            no_of_sand_riser: data.no_of_sand_riser || '',
            ingate_size: data.ingate_size || '',
            no_of_ingate: data.no_of_ingate || '',
            runner_bar_size: data.runner_bar_size || '',
            runner_bar_no: data.runner_bar_no || ''
        });

        // Populate Additional Info
        setAdditionalData({
            rev_no_status: data.rev_no_status || '',
            date: data.date || '',
            comment: data.comment || ''
        });

        // Populate Part Rows
        if (data.parts && data.parts.length > 0) {
            const formattedParts = data.parts.map(part => ({
                partNoOption: part.partNo ? {
                    value: part.partNo,
                    label: part.internalPartNo || String(part.partNo),
                    prodName: part.productName || '',
                    gradeId: part.materialGradeId,
                    gradeName: part.materialGradeName || ''
                } : null,
                productName: part.productName || '',
                materialGradeId: part.materialGradeId || null,
                materialGradeName: part.materialGradeName || '',
                qty: part.qty || '',
                weight: part.weight || ''
            }));
            setPartRows(formattedParts);
        } else {
            setPartRows([{ partNoOption: null, productName: '', materialGradeId: null, materialGradeName: '', qty: '', weight: '' }]);
        }

        // Populate Sleeve Rows (backend returns sleeveRows)
        const sleeves = data.sleeveRows || data.sleeves;
        if (sleeves && sleeves.length > 0) {
            const formattedSleeves = sleeves.map(sleeve => ({
                sleeve_name: sleeve.sleeve_name || '',
                // Convert sleeve_type_size to number for proper matching with sleeveOptions
                sleeve_type_size: sleeve.sleeve_type_size ? parseInt(sleeve.sleeve_type_size) || sleeve.sleeve_type_size : '',
                // Keep the display name for the SearchableSelect to show
                sleeve_type_size_name: sleeve.sleeve_type_size_name || '',
                quantity: sleeve.quantity || ''
            }));
            setSleeveRows(formattedSleeves);
        } else {
            setSleeveRows([{ sleeve_name: '', sleeve_type_size: '', sleeve_type_size_name: '', quantity: '' }]);
        }
    };

    // Delete handler
    const handleDeleteClick = () => {
        if (!selectedId) {
            toast.error('Please select a pattern to delete');
            return;
        }
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = () => {
        if (selectedId) {
            deleteMutation.mutate(selectedId);
        }
    };

    // Clear form handler
    const handleClear = () => {
        setMainData({
            PatternNo: '', Customer: null, Serial_No: '', Part_No: '', Product_Name: '',
            Asset_No: '', Customer_Po_No: '', Tooling_PO_Date: '', Purchase_No: '', Purchase_Date: '', Pattern_Received_Date: ''
        });
        setPatternData({
            Quoted_Estimated_Weight: '', Pattern_Maker: null, Pattern_Material_Details: '',
            No_Of_Patterns_Set: '', Pattern_Pieces: '', Rack_Location: '', Box_Per_Heat: ''
        });
        setCoreBoxData({
            Core_Box_Material_Details: '', Core_Box_Location: '',
            Core_Box_S7_F4_No: '', Core_Box_S7_F4_Date: '',
            No_Of_Core_Box_Set: '', Core_Box_Pieces: ''
        });
        setCastingData({
            Casting_Material_Grade: '', Moulding_Box_Size: '', Total_Weight: '',
            No_Of_Cavities: '', Bunch_Wt: '', YieldPercent: ''
        });
        setCoreDetailsData({
            Core_Wt: '',
            Core_Type: { shell: false, coldBox: false, noBake: false },
            shell_qty: '', coldBox_qty: '', noBake_qty: '',
            Main_Core: false, Side_Core: false, Loose_Core: false,
            mainCore_qty: '', sideCore_qty: '', looseCore_qty: ''
        });
        setChapletsChillsData({ Chaplets_COPE: '', Chaplets_DRAG: '', Chills_COPE: '', Chills_DRAG: '' });
        setMouldingData({
            Mould_Vents_Size: '', Mould_Vents_No: '', breaker_core_size: '', down_sprue_size: '',
            foam_filter_size: '', sand_riser_size: '', no_of_sand_riser: '',
            ingate_size: '', no_of_ingate: '', runner_bar_size: '', runner_bar_no: ''
        });
        setSleeveRows([{ sleeve_name: '', sleeve_type_size: '', sleeve_type_size_name: '', quantity: '' }]);
        setAdditionalData({ rev_no_status: '', date: '', comment: '' });
        setPartRows([{ partNoOption: null, productName: '', materialGradeId: null, materialGradeName: '', qty: '', weight: '' }]);
        setErrors({});
        setSelectedId(null);
        setIsEditing(false);
    };

    // Handlers wrapped in useCallback to prevent re-creation on every render
    const handleMainChange = useCallback((e) => {
        const { name, value } = e.target;
        setMainData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handlePatternChange = useCallback((e) => {
        const { name, value } = e.target;
        setPatternData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleCoreBoxChange = useCallback((e) => {
        const { name, value } = e.target;
        setCoreBoxData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleCastingChange = useCallback((e) => {
        const { name, value } = e.target;
        setCastingData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Core Details handler - single entry with conditional quantities
    const handleCoreDetailsChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            // Handle Core_Type checkboxes
            if (name.startsWith('Core_Type_')) {
                const coreTypeKey = name.replace('Core_Type_', '');
                setCoreDetailsData(prev => ({
                    ...prev,
                    Core_Type: {
                        ...prev.Core_Type,
                        [coreTypeKey]: checked
                    },
                    // Clear quantity when unchecked
                    [`${coreTypeKey}_qty`]: checked ? prev[`${coreTypeKey}_qty`] : ''
                }));
            } else {
                // Handle Main_Core, Side_Core, Loose_Core checkboxes
                const qtyField = name === 'Main_Core' ? 'mainCore_qty' :
                    name === 'Side_Core' ? 'sideCore_qty' :
                        name === 'Loose_Core' ? 'looseCore_qty' : null;
                setCoreDetailsData(prev => ({
                    ...prev,
                    [name]: checked,
                    [qtyField]: checked ? prev[qtyField] : ''
                }));
            }
        } else {
            // Handle text/number inputs
            setCoreDetailsData(prev => ({ ...prev, [name]: value }));
        }
    }, []);

    // Chaplets/Chills handler
    const handleChapletsChillsChange = useCallback((e) => {
        const { name, value } = e.target;
        setChapletsChillsData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleMouldingChange = useCallback((e) => {
        const { name, value } = e.target;
        setMouldingData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Sleeve rows handlers
    const handleSleeveRowChange = useCallback((index, field, value) => {
        setSleeveRows(prev => {
            const newRows = [...prev];
            newRows[index] = { ...newRows[index], [field]: value };
            return newRows;
        });
    }, []);

    const addSleeveRow = useCallback(() => {
        setSleeveRows(prev => [...prev, {
            sleeve_name: '',
            sleeve_type_size: '',
            sleeve_type_size_name: '',
            quantity: ''
        }]);
    }, []);

    const removeSleeveRow = useCallback((index) => {
        setSleeveRows(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleAdditionalChange = useCallback((e) => {
        const { name, value } = e.target;
        setAdditionalData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Dynamic parts rows handlers
    const handlePartRowChange = useCallback((index, field, value) => {
        setPartRows(prev => {
            const newRows = [...prev];
            if (field === 'partNo') {
                const selectedOption = value; // { value, label, prodName, gradeId, gradeName }
                newRows[index] = {
                    ...newRows[index],
                    partNoOption: selectedOption,
                    productName: selectedOption ? selectedOption.prodName : '',
                    // Auto-fill material grade from the selected product
                    materialGradeId: selectedOption ? selectedOption.gradeId : null,
                    materialGradeName: selectedOption ? (selectedOption.gradeName || '') : ''
                };
            } else {
                newRows[index] = { ...newRows[index], [field]: value };
            }
            return newRows;
        });
    }, []);

    const addPartRow = useCallback(() => {
        setPartRows(prev => [...prev, { partNoOption: null, productName: '', materialGradeId: null, materialGradeName: '', qty: '', weight: '' }]);
    }, []);

    const removePartRow = useCallback((index) => {
        setPartRows(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setErrors({});

        // 1. Prepare Data for Validation (Merging split states into one object for validation function)
        const validationPayload = {
            ...mainData,
            parts: partRows,
            ...patternData,
            ...coreBoxData,
            ...castingData,
            Core_Wt: coreDetailsData.Core_Wt,
            Core_Type: coreDetailsData.Core_Type,
            shell_qty: coreDetailsData.shell_qty,
            coldBox_qty: coreDetailsData.coldBox_qty,
            noBake_qty: coreDetailsData.noBake_qty,
            sleeveRows: sleeveRows
        };

        // 2. Validate
        const validationErrors = validatePatternMaster(validationPayload);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setLoading(false);
            // Scroll to top or show alert
            toast.error("Please complete all required fields before submitting.");
            return;
        }

        try {
            // Generate legacy Core_Type string from coreDetailsData for backward compatibility
            const coreTypeStringParts = [];
            const hasAnyShell = coreDetailsData.Core_Type?.shell || false;
            const hasAnyColdBox = coreDetailsData.Core_Type?.coldBox || false;
            const hasAnyNoBake = coreDetailsData.Core_Type?.noBake || false;

            if (hasAnyShell) coreTypeStringParts.push('Shell=2');
            if (hasAnyColdBox) coreTypeStringParts.push('Cold Box=1');
            if (hasAnyNoBake) coreTypeStringParts.push('No-Bake');

            // Calculate Total Weight from all parts: (Qty × Weight) for each part
            const totalWeight = partRows.reduce((sum, row) => {
                const qty = parseFloat(row.qty) || 0;
                const weight = parseFloat(row.weight) || 0;
                return sum + (qty * weight);
            }, 0).toFixed(2);

            // Extract IDs from state objects for submission
            const submissionData = {
                ...mainData,
                Customer: mainData.Customer ? mainData.Customer.value : '',

                ...patternData,
                Pattern_Maker: patternData.Pattern_Maker ? patternData.Pattern_Maker.value : null,

                ...coreBoxData,

                // Add casting data - CRITICAL: includes No_Of_Cavities, Bunch_Wt, YieldPercent, etc.
                ...castingData,
                Total_Weight: totalWeight, // Override with calculated value

                // Core Details - single entry with conditional quantities
                Core_Wt: coreDetailsData.Core_Wt,
                shell_qty: coreDetailsData.Core_Type?.shell ? parseInt(coreDetailsData.shell_qty) || null : null,
                coldBox_qty: coreDetailsData.Core_Type?.coldBox ? parseInt(coreDetailsData.coldBox_qty) || null : null,
                noBake_qty: coreDetailsData.Core_Type?.noBake ? parseInt(coreDetailsData.noBake_qty) || null : null,
                mainCore_qty: coreDetailsData.Main_Core ? (coreDetailsData.mainCore_qty || null) : null,
                sideCore_qty: coreDetailsData.Side_Core ? (coreDetailsData.sideCore_qty || null) : null,
                looseCore_qty: coreDetailsData.Loose_Core ? (coreDetailsData.looseCore_qty || null) : null,

                // Legacy Core_Type and Main/Side/Loose Core for backward compatibility
                Core_Type: coreDetailsData.Core_Type?.shell || coreDetailsData.Core_Type?.coldBox || coreDetailsData.Core_Type?.noBake
                    ? [(coreDetailsData.Core_Type?.shell ? 'Shell' : ''), (coreDetailsData.Core_Type?.coldBox ? 'Cold Box' : ''), (coreDetailsData.Core_Type?.noBake ? 'No-Bake' : '')].filter(Boolean).join(', ')
                    : '',
                Main_Core: coreDetailsData.Main_Core ? 'Yes' : 'No',
                Side_Core: coreDetailsData.Side_Core ? 'Yes' : 'No',
                Loose_Core: coreDetailsData.Loose_Core ? 'Yes' : 'No',

                // Chaplets and Chills
                ...chapletsChillsData,

                // Add moulding data - now all fields will be saved
                ...mouldingData,

                // Add additional info data - now these fields will be saved
                ...additionalData,

                // Process parts rows to extract IDs
                parts: partRows.map(row => ({
                    partNo: row.partNoOption ? row.partNoOption.value : '',
                    productName: row.partNoOption ? row.partNoOption.prodName : '',
                    materialGradeId: row.materialGradeId || null,
                    qty: row.qty,
                    weight: row.weight
                })),

                // Process sleeve rows for SleeveMaster table
                sleeveRows: sleeveRows.map(row => ({
                    sleeve_name: row.sleeve_name || null,
                    sleeve_type_size: row.sleeve_type_size || null,
                    quantity: row.quantity ? parseInt(row.quantity) || null : null
                }))
            };

            // Legacy support: Fill top-level Part_No and Product_Name from first row
            if (submissionData.parts.length > 0) {
                submissionData.Part_No = submissionData.parts[0].partNo;
                submissionData.Product_Name = submissionData.parts[0].partNo;
            }

            // Determine whether to POST (add) or PUT (update)
            if (isEditing && selectedId) {
                updateMutation.mutate({ id: selectedId, data: submissionData });
            } else {
                addMutation.mutate(submissionData);
            }

        } catch (err) {
            console.error('Error preparing submission:', err);
            const errorMsg = 'An unexpected error occurred';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="card">
            {/* Header with Stats and Edit Dropdown */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0 }}>Pattern Master</h2>
                    {/* Patterns Count Card */}
                    <div style={{
                        background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
                        borderLeft: '4px solid #8B5CF6',
                        borderRadius: '12px',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>📋</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#6D28D9' }}>
                                {statsLoading ? '...' : patternStats?.TotalPatterns || 0}
                            </h3>
                            <p style={{ margin: 0, color: '#6B7280', fontSize: '0.75rem' }}>Patterns</p>
                        </div>
                    </div>
                </div>
                {activeTab === 'master' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '280px' }}>
                        <label style={{ fontWeight: '500', color: '#374151', whiteSpace: 'nowrap' }}>Edit Pattern:</label>
                        <div style={{ flex: 1 }}>
                            <Combobox
                                value={selectedId || ''}
                                onChange={async (patternId) => {
                                    if (patternId) {
                                        const pattern = patternNumbers.find(p => p.value === patternId);
                                        if (pattern) {
                                            // Load pattern details
                                            try {
                                                const response = await api.get(`/pattern-master/${patternId}`);
                                                handleRowClick(response.data);
                                            } catch (err) {
                                                console.error('Error loading pattern:', err);
                                                toast.error('Failed to load pattern for editing');
                                            }
                                        }
                                    }
                                }}
                                options={patternNumbers}
                                placeholder="Select pattern to edit..."
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Tab Navigation */}
            <AnimatedTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Tab Content */}
            {activeTab === 'master' ? (
                <>
                    <PatternForm
                        // Data
                        mainData={mainData}
                        patternData={patternData}
                        coreBoxData={coreBoxData}
                        coreDetailsData={coreDetailsData}
                        castingData={castingData}
                        mouldingData={mouldingData}
                        chapletsChillsData={chapletsChillsData}
                        sleeveRows={sleeveRows}
                        additionalData={additionalData}
                        partRows={partRows}
                        sleeveOptions={sleeveOptions}

                        // Handlers
                        onMainChange={handleMainChange}
                        onPatternChange={handlePatternChange}
                        onCoreBoxChange={handleCoreBoxChange}
                        onCoreDetailsChange={handleCoreDetailsChange}
                        onCastingChange={handleCastingChange}
                        onMouldingChange={handleMouldingChange}
                        onChapletsChillsChange={handleChapletsChillsChange}
                        onAdditionalChange={handleAdditionalChange}

                        // Array Handlers
                        onPartRowChange={handlePartRowChange}
                        onAddPartRow={addPartRow}
                        onRemovePartRow={removePartRow}
                        onSleeveRowChange={handleSleeveRowChange}
                        onAddSleeveRow={addSleeveRow}
                        onRemoveSleeveRow={removeSleeveRow}

                        // Actions
                        onSubmit={handleSubmit}
                        onClear={handleClear}
                        onDelete={handleDeleteClick}

                        // Search
                        searchTerm={searchTerm}
                        onSearchChange={handleSearchChange}

                        // State
                        errors={errors}
                        loading={loading}
                        isEditing={isEditing}
                        selectedId={selectedId}
                        error={error}
                    />

                    {/* Unified Records Table - Shows patterns with expandable parts/sleeves */}
                    <UnifiedRecordsTable
                        searchQuery={debouncedSearchTerm}
                        refreshTrigger={refreshTrigger}
                        onRowClick={handleRowClick}
                        selectedId={selectedId}
                    />
                </>
            ) : activeTab === 'history' ? (
                <PatternHistoryTab />
            ) : (
                <PatternReturnSection />
            )}

            <AlertDialog
                isOpen={showDeleteDialog}
                title="Delete Pattern"
                message="Are you sure you want to delete this pattern? This will also delete all related parts and sleeves. This action cannot be undone."
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteDialog(false)}
                confirmText="Delete"
                isDanger={true}
            />
        </div>
    );
};

export default PatternMaster;
