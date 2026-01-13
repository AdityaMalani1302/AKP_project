import React, { memo } from 'react';
import { labelStyle, inputStyle, selectStyle, inlineLabelStyle } from './styles';
import DatePicker from '../common/DatePicker';

const CoreBoxSection = ({ data, onChange, errors = {} }) => {
    return (
        <div className="section-container section-yellow">
            <h3 className="section-title yellow">
                📦 Core Box
            </h3>
            <div className="form-grid">
                <div>
                    <label style={labelStyle}>Core Box Material Details (AL–CI–SG)</label>
                    <select
                        name="Core_Box_Material_Details"
                        value={data.Core_Box_Material_Details}
                        onChange={onChange}
                        style={selectStyle}
                    >
                        <option value="">Select Material</option>
                        <option value="AL">AL</option>
                        <option value="CI">CI</option>
                        <option value="SG">SG</option>
                        <option value="AL-SG">AL-SG</option>
                    </select>
                </div>

                <div>
                    <label style={labelStyle}>Core Box Location</label>
                    <select
                        name="Core_Box_Location"
                        value={data.Core_Box_Location}
                        onChange={onChange}
                        style={selectStyle}
                    >
                        <option value="">Select Location</option>
                        <option value="AKP FOUNDRIES Unit II">AKP FOUNDRIES Unit II</option>
                        <option value="Shiva Enterprise">Shiva Enterprise</option>
                    </select>
                </div>

                <div>
                    <label style={labelStyle}>No. of Core Box Set / Nos</label>
                    <select
                        name="No_Of_Core_Box_Set"
                        value={data.No_Of_Core_Box_Set}
                        onChange={onChange}
                        style={selectStyle}
                    >
                        <option value="">Select Core Box Set</option>
                        <option value="1 Set (Top-Bottom) = 2 No's">1 Set (Top-Bottom) = 2 No's</option>
                        <option value="2 Sets (Top-Bottom) = 4 No's">2 Sets (Top-Bottom) = 4 No's</option>
                        <option value="3 Set (Top-Bottom) = 6 No's">3 Set (Top-Bottom) = 6 No's</option>
                        <option value="4 Set (Top-Bottom) = 8 No's">4 Set (Top-Bottom) = 8 No's</option>
                        <option value="5 Set (Top-Bottom) = 10 No's">5 Set (Top-Bottom) = 10 No's</option>
                    </select>
                </div>

                <div>
                    <label style={labelStyle}>Core Box Pieces Pc / Nos</label>
                    <select
                        name="Core_Box_Pieces"
                        value={data.Core_Box_Pieces}
                        onChange={onChange}
                        style={selectStyle}
                    >
                        <option value="">Select Core Box Pieces</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                    </select>
                </div>

                {/* Core Box S7 F4 - No Field */}
                <div>
                    <label style={labelStyle}>Core Box S7 F4 No</label>
                    <input
                        type="text"
                        name="Core_Box_S7_F4_No"
                        placeholder="Enter S7 F4 No"
                        value={data.Core_Box_S7_F4_No || ''}
                        onChange={onChange}
                        style={inputStyle}
                    />
                </div>

                <div>
                    <label style={labelStyle}>Core Box S7 F4 Date</label>
                    <DatePicker
                        name="Core_Box_S7_F4_Date"
                        value={data.Core_Box_S7_F4_Date ? data.Core_Box_S7_F4_Date.split('T')[0] : ''}
                        onChange={onChange}
                        placeholder="Select date..."
                    />
                </div>
            </div>
        </div>
    );
};

export default memo(CoreBoxSection);
