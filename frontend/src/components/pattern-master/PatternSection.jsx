import React, { memo, useState, useEffect } from 'react';
import Combobox from '../common/Combobox';
import { labelStyle, inputStyle, selectStyle } from './styles';
import api from '../../api';

// import { customSelectStyles } from './styles'; // Removed

const PatternSection = ({ data, onChange, errors = {} }) => {

    // State for all suppliers
    const [suppliers, setSuppliers] = useState([]);

    // Load all suppliers on mount
    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const res = await api.get('/suppliers?search=');
                setSuppliers(res.data.map(s => ({ value: s.SupId, label: s.SupName })));
            } catch (err) {
                console.error('Error loading suppliers:', err);
            }
        };
        fetchSuppliers();
    }, []);

    const handleMakerChange = (selectedValue) => {
        // If selectedValue is empty/null/undefined, set Pattern_Maker to null (clearing)
        if (!selectedValue || selectedValue === '') {
            onChange({
                target: {
                    name: 'Pattern_Maker',
                    value: null
                }
            });
            return;
        }

        const selectedOption = suppliers.find(s => s.value === selectedValue);
        onChange({
            target: {
                name: 'Pattern_Maker',
                value: selectedOption || null // Store full object, or null if not found
            }
        });
    };

    return (
        <div className="section-container section-green">
            <h3 className="section-title green">
                🔨 Pattern
            </h3>
            <div className="form-grid">
                <div>
                    <label style={labelStyle}>Quoted Estimated Weight</label>
                    <input
                        type="text"
                        name="Quoted_Estimated_Weight"
                        value={data.Quoted_Estimated_Weight}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter weight"
                    />
                    {errors.Quoted_Estimated_Weight && <span style={{ color: '#DC2626', fontSize: '0.75rem' }}>{errors.Quoted_Estimated_Weight}</span>}
                </div>

                <div>
                    <Combobox
                        label={<>Supplier Pattern Maker</>}
                        value={data.Pattern_Maker ? data.Pattern_Maker.value : ''}
                        onChange={handleMakerChange}
                        options={
                            // Ensure the currently selected option is in the list even if suppliers haven't loaded yet
                            data.Pattern_Maker && data.Pattern_Maker.value && !suppliers.find(s => s.value === data.Pattern_Maker.value)
                                ? [{ value: data.Pattern_Maker.value, label: data.Pattern_Maker.label }, ...suppliers]
                                : suppliers
                        }
                        placeholder="Select Pattern Maker..."
                    />
                    {errors.Pattern_Maker && <span style={{ color: '#DC2626', fontSize: '0.75rem' }}>{errors.Pattern_Maker}</span>}
                </div>

                <div>
                    <label style={labelStyle}>Pattern Material Details (AL–CI–SG)</label>
                    <select
                        name="Pattern_Material_Details"
                        value={data.Pattern_Material_Details}
                        onChange={onChange}
                        style={selectStyle}
                    >
                        <option value="">Select Material</option>
                        <option value="AL">AL</option>
                        <option value="CI">CI</option>
                        <option value="SG">SG</option>
                    </select>
                </div>

                <div>
                    <label style={labelStyle}>No. of Patterns Set / Nos</label>
                    <select
                        name="No_Of_Patterns_Set"
                        value={data.No_Of_Patterns_Set}
                        onChange={onChange}
                        style={selectStyle}
                    >
                        <option value="">Select Pattern Set</option>
                        <option value="1 Set (Top-Bottom) = 2 No's">1 Set (Top-Bottom) = 2 No's</option>
                        <option value="2 Sets (Top-Bottom) = 4 No's">2 Set (Top-Bottom) = 4 No's</option>
                        <option value="3 Set (Top-Bottom) = 6 No's">3 Set (Top-Bottom) = 6 No's</option>
                        <option value="4 Set (Top-Bottom) = 8 No's">4 Set (Top-Bottom) = 8 No's</option>
                        <option value="5 Set (Top-Bottom) = 10 No's">5 Set (Top-Bottom) = 10 No's</option>
                        <option value="6 Set (Top-Bottom) = 12 No's">6 Set (Top-Bottom) = 12 No's</option>
                        <option value="7 Set (Top-Bottom) = 14 No's">7 Set (Top-Bottom) = 14 No's</option>
                        <option value="8 Set (Top-Bottom) = 16 No's">8 Set (Top-Bottom) = 16 No's</option>
                        <option value="9 Set (Top-Bottom) = 18 No's">9 Set (Top-Bottom) = 18 No's</option>
                        <option value="10 Set (Top-Bottom) = 20 No's">10 Set (Top-Bottom) = 20 No's</option>
                    </select>
                </div>

                <div>
                    <label style={labelStyle}>Pattern Pieces Pc / Nos</label>
                    <select
                        name="Pattern_Pieces"
                        value={data.Pattern_Pieces}
                        onChange={onChange}
                        style={selectStyle}
                    >
                        <option value="">Select Pattern Pieces</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                        <option value="9">9</option>
                        <option value="10">10</option>
                    </select>
                </div>

                <div>
                    <label style={labelStyle}>Pattern Rack Location</label>
                    <input
                        type="text"
                        name="Rack_Location"
                        value={data.Rack_Location}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter rack location"
                    />
                </div>

                <div>
                    <label style={labelStyle}>Box Per Heat <span style={{ color: 'red' }}>*</span></label>
                    <input
                        type="text"
                        name="Box_Per_Heat"
                        value={data.Box_Per_Heat}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter box per heat"
                    />
                </div>
            </div>
        </div>
    );
};

export default memo(PatternSection);
