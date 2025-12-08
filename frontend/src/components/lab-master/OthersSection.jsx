import React from 'react';
import { labelStyle, inputStyle, selectStyle } from './styles';

const OthersSection = ({ data, onChange }) => {
    return (
        <div style={{
            padding: '1.25rem',
            backgroundColor: '#ECFDF5',
            borderRadius: '8px',
            border: '1px solid #A7F3D0',
            marginTop: '1.5rem'
        }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#047857', fontWeight: '600' }}>
                4. Others
            </h3>

            <div className="form-grid">
                <div>
                    <label style={labelStyle}>Regular / Critical</label>
                    <select
                        name="RegularCritical"
                        value={data.RegularCritical || ''}
                        onChange={onChange}
                        style={selectStyle}
                    >
                        <option value="">Select Type</option>
                        <option value="Regular">Regular</option>
                        <option value="Critical">Critical</option>
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Last Box Temp</label>
                    <input
                        type="text"
                        name="LastBoxTemp"
                        value={data.LastBoxTemp || ''}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Temperature"
                    />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Remarks</label>
                    <textarea
                        name="Remarks"
                        value={data.Remarks || ''}
                        onChange={onChange}
                        style={{
                            ...inputStyle,
                            minHeight: '80px',
                            resize: 'vertical',
                            fontFamily: 'inherit'
                        }}
                        placeholder="Any additional remarks..."
                    />
                </div>
            </div>
        </div>
    );
};

export default OthersSection;
