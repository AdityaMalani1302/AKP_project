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
        const selectedOption = suppliers.find(s => s.value === selectedValue);
        onChange({
            target: {
                name: 'Pattern_Maker',
                value: selectedOption // Store full object
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
                        label={<>Supplier Pattern Maker <span style={{ color: 'red' }}>*</span></>}
                        value={data.Pattern_Maker ? data.Pattern_Maker.value : ''}
                        onChange={handleMakerChange}
                        options={suppliers}
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
                        <option value="2 Sets (Top-Bottom) = 4 No's">2 Sets (Top-Bottom) = 4 No's</option>
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
                        <option value="1 Set (Top-Bottom) = 2 No's">1 Set (Top-Bottom) = 2 No's</option>
                        <option value="2 Sets (Top-Bottom) = 4 No's">2 Sets (Top-Bottom) = 4 No's</option>
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
            </div>
        </div>
    );
};

export default memo(PatternSection);
