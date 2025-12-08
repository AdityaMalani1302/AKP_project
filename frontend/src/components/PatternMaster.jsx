import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { validatePatternMaster } from '../utils/validation';
import MainDetails from './pattern-master/MainDetails';
import PatternSection from './pattern-master/PatternSection';
import CoreBoxSection from './pattern-master/CoreBoxSection';
import CoreDetailsSection from './pattern-master/CoreDetailsSection';
import ChapletsChillsSection from './pattern-master/ChapletsChillsSection';
import MouldingSection from './pattern-master/MouldingSection';
import CastingSection from './pattern-master/CastingSection';
import SleevesSection from './pattern-master/SleevesSection';
import AdditionalSection from './pattern-master/AdditionalSection';
// import * as Tabs from '@radix-ui/react-tabs'; // Removed
// import './PatternMasterTabs.css'; // Removed
import AlertDialog from './common/AlertDialog';
import { createColumnHelper } from '@tanstack/react-table';
import DataTable from './common/DataTable';
import TableSkeleton from './common/TableSkeleton'; // Added
import TextTooltip from './common/TextTooltip'; // Added

const PatternMaster = () => {
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
        Purchase_Date: ''
    });

    const [patternData, setPatternData] = useState({
        Quoted_Estimated_Weight: '',
        Pattern_Maker: null, // Now stores { value, label }
        Pattern_Material_Details: '',
        No_Of_Patterns_Set: '',
        Pattern_Pieces: '',
        Rack_Location: ''
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
    const [searchQuery, setSearchQuery] = useState(''); // The active query for the API

    // Dynamic parts rows state
    const [partRows, setPartRows] = useState([
        { partNoOption: null, productName: '', materialGradeId: null, materialGradeName: '', qty: '', weight: '' }
    ]);

    // Sleeve options state
    const [sleeveOptions, setSleeveOptions] = useState([]);

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
        queryKey: ['patterns', searchQuery],
        queryFn: () => fetchPatternsFromApi(searchQuery),
        placeholderData: keepPreviousData,
        staleTime: 5000,
    });

    // Mutations
    const addMutation = useMutation({
        mutationFn: (newPattern) => api.post('/pattern-master', newPattern),
        onSuccess: (data) => {
            toast.success(`Pattern added successfully! Pattern ID: ${data.data.patternId}`);
            queryClient.invalidateQueries(['patterns']);
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
            setSelectedId(null);
            setIsEditing(false);
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

    // Search handlers
    const handleSearch = () => setSearchQuery(searchTerm);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (value === '') setSearchQuery('');
    };

    const handleSearchKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    // Row click handler for editing
    const handleRowClick = async (pattern) => {
        setSelectedId(pattern.PatternId);
        setIsEditing(true);
        // Load full pattern details when row is clicked
        try {
            const response = await api.get(`/pattern-master/${pattern.PatternId}`);
            const data = response.data;

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
                Purchase_Date: data.Purchase_Date || ''
            });

            // Populate Pattern Details
            setPatternData({
                Quoted_Estimated_Weight: data.Quoted_Estimated_Weight || '',
                Pattern_Maker: data.Pattern_Maker ? { value: data.Pattern_Maker, label: data.Pattern_Maker_Name || data.Pattern_Maker } : null,
                Pattern_Material_Details: data.Pattern_Material_Details || '',
                No_Of_Patterns_Set: data.No_Of_Patterns_Set || '',
                Pattern_Pieces: data.Pattern_Pieces || '',
                Rack_Location: data.Rack_Location || ''
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
                        label: part.partNo,
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

            // Populate Sleeve Rows
            if (data.sleeves && data.sleeves.length > 0) {
                const formattedSleeves = data.sleeves.map(sleeve => ({
                    sleeve_name: sleeve.sleeve_name || '',
                    sleeve_type_size: sleeve.sleeve_type_size || '',
                    quantity: sleeve.quantity || ''
                }));
                setSleeveRows(formattedSleeves);
            } else {
                setSleeveRows([{ sleeve_name: '', sleeve_type_size: '', quantity: '' }]);
            }

        } catch (err) {
            console.error('Error loading pattern details:', err);
            toast.error('Failed to load pattern details for editing');
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
            Asset_No: '', Customer_Po_No: '', Tooling_PO_Date: '', Purchase_No: '', Purchase_Date: ''
        });
        setPatternData({
            Quoted_Estimated_Weight: '', Pattern_Maker: null, Pattern_Material_Details: '',
            No_Of_Patterns_Set: '', Pattern_Pieces: '', Rack_Location: ''
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
        setSleeveRows([{ sleeve_name: '', sleeve_type_size: '', quantity: '' }]);
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
            toast.error("Please fix the errors highlighted in red.");
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

            // Calculate Total Weight from all parts
            const totalWeight = partRows.reduce((sum, row) => sum + (parseFloat(row.weight) || 0), 0).toFixed(2);

            // Extract IDs from state objects for submission
            const submissionData = {
                ...mainData,
                Customer: mainData.Customer ? mainData.Customer.value : '',

                ...patternData,
                Pattern_Maker: patternData.Pattern_Maker ? patternData.Pattern_Maker.value : '',

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
                    productName: row.partNoOption ? row.partNoOption.prodName : '', // Fixed: use prodName from option
                    materialGradeId: row.materialGradeId || null,
                    materialGradeName: row.materialGradeName || '',
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

    // Define columns for DataTable
    const columnHelper = createColumnHelper();

    const columns = [
        columnHelper.accessor('PatternId', { header: 'ID', size: 60 }),
        columnHelper.accessor('PatternNo', { header: 'Pattern No', size: 120 }),
        columnHelper.accessor('CustomerName', {
            header: 'Customer',
            size: 150,
            cell: info => <TextTooltip text={info.getValue()} maxLength={20} />
        }),
        columnHelper.accessor('Serial_No', { header: 'Serial No', size: 100 }),
        columnHelper.accessor('Part_No', { header: 'Part No', size: 100 }),
        columnHelper.accessor('Product_Name', {
            header: 'Product Name',
            size: 150,
            cell: info => <TextTooltip text={info.getValue()} maxLength={20} />
        }),
        columnHelper.accessor('Pattern_Maker_Name', {
            header: 'Pattern Maker',
            size: 150,
            cell: info => <TextTooltip text={info.getValue()} maxLength={20} />
        }),
        columnHelper.accessor('Pattern_Material_Details', { header: 'Material', size: 100 }),
        columnHelper.accessor('No_Of_Patterns_Set', { header: 'No of Set', size: 120 }),
    ];

    return (
        <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>Pattern Master</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <MainDetails
                        data={mainData}
                        onChange={handleMainChange}
                        partRows={partRows}
                        onPartRowChange={handlePartRowChange}
                        onAddPartRow={addPartRow}
                        onRemovePartRow={removePartRow}
                        errors={errors}
                    />

                    <PatternSection
                        data={patternData}
                        onChange={handlePatternChange}
                        errors={errors}
                    />

                    <CoreBoxSection
                        data={coreBoxData}
                        onChange={handleCoreBoxChange}
                        errors={errors}
                    />

                    <CoreDetailsSection
                        data={coreDetailsData}
                        onChange={handleCoreDetailsChange}
                        errors={errors}
                    />

                    <CastingSection
                        data={castingData}
                        onChange={handleCastingChange}
                        errors={errors}
                    />

                    <MouldingSection
                        data={mouldingData}
                        onChange={handleMouldingChange}
                    />

                    <ChapletsChillsSection
                        data={chapletsChillsData}
                        onChange={handleChapletsChillsChange}
                    />

                    <SleevesSection
                        sleeveRows={sleeveRows}
                        onSleeveRowChange={handleSleeveRowChange}
                        onAddSleeveRow={addSleeveRow}
                        onRemoveSleeveRow={removeSleeveRow}
                        sleeveOptions={sleeveOptions}
                        errors={errors}
                    />

                    <AdditionalSection
                        data={additionalData}
                        onChange={handleAdditionalChange}
                    />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem' }}>
                    <button type="submit" disabled={loading} className="btn btn-primary">
                        {loading ? 'Saving...' : (isEditing ? 'UPDATE' : 'ADD')}
                    </button>
                    {selectedId && (
                        <button type="button" onClick={handleDeleteClick} className="btn" style={{ backgroundColor: '#EF4444', color: 'white' }}>
                            DELETE
                        </button>
                    )}
                    <button type="button" onClick={handleClear} className="btn btn-secondary">
                        CLEAR
                    </button>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <label style={{ fontWeight: '500', whiteSpace: 'nowrap', color: '#374151' }}>Search:</label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onKeyPress={handleSearchKeyPress}
                            placeholder="Pattern No, Customer..."
                            className="input-field"
                            style={{ minWidth: '200px' }}
                        />
                        <button type="button" onClick={handleSearch} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>🔍</button>
                    </div>
                </div>

                {/* Error Message Display */}
                {error && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem',
                        backgroundColor: '#FEE2E2',
                        color: '#DC2626',
                        borderRadius: '6px',
                        border: '1px solid #FCA5A5'
                    }}>
                        {error}
                    </div>
                )}
            </form>

            {/* Table Section */}
            <div className="section-container section-gray">
                <h3 className="section-title gray">Pattern Records ({patterns.length} patterns)</h3>

                {isQueryLoading ? (
                    <TableSkeleton rows={10} columns={12} />
                ) : (
                    <DataTable
                        data={patterns}
                        columns={columns}
                        onRowClick={handleRowClick}
                        selectedId={selectedId}
                    />
                )}

                {selectedId && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: '#DBEAFE', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#1E40AF' }}>
                        <strong>Selected Pattern ID: {selectedId}</strong> - Click DELETE to remove or CLEAR to deselect.
                    </div>
                )}
            </div>

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
