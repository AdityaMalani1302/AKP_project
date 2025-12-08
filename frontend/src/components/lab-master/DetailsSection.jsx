import React from 'react';
import { labelStyle, inputStyle } from './styles';

const DetailsSection = ({ data, onChange }) => {
    return (
        <div style={{
            padding: '1.25rem',
            backgroundColor: '#F0F9FF',
            borderRadius: '8px',
            border: '1px solid #BAE6FD'
        }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0369A1', fontWeight: '600' }}>
                1. Details
            </h3>
            <div className="form-grid">
                <div>
                    <label style={labelStyle}>CUSTOMER</label>
                    <input
                        type="text"
                        name="Customer"
                        value={data.Customer || ''}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter Customer"
                    />
                </div>
                <div>
                    <label style={labelStyle}>Drg. No.</label>
                    <input
                        type="text"
                        name="DrgNo"
                        value={data.DrgNo || ''}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Drawing Number"
                    />
                </div>
                <div>
                    <label style={labelStyle}>Description</label>
                    <input
                        type="text"
                        name="Description"
                        value={data.Description || ''}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Description"
                    />
                </div>
                <div>
                    <label style={labelStyle}>Grade</label>
                    <input
                        type="text"
                        name="Grade"
                        value={data.Grade || ''}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Material Grade"
                    />
                </div>
                <div>
                    <label style={labelStyle}>Part Weight</label>
                    <input
                        type="text"
                        name="PartWeight"
                        value={data.PartWeight || ''}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Weight (kg)"
                    />
                </div>
                <div>
                    <label style={labelStyle}>Min-Max Thickness</label>
                    <input
                        type="text"
                        name="MinMaxThickness"
                        value={data.MinMaxThickness || ''}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="e.g. 10-20mm"
                    />
                </div>
                <div>
                    <label style={labelStyle}>Thickness Group</label>
                    <input
                        type="text"
                        name="ThicknessGroup"
                        value={data.ThicknessGroup || ''}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Group"
                    />
                </div>
                <div>
                    <label style={labelStyle}>BASE CHE C %</label>
                    <input
                        type="text"
                        name="BaseChe_C"
                        value={data.BaseChe_C || ''}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="C %"
                    />
                </div>
                <div>
                    <label style={labelStyle}>BASE CHE Si %</label>
                    <input
                        type="text"
                        name="BaseChe_Si"
                        value={data.BaseChe_Si || ''}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Si %"
                    />
                </div>
            </div>

            <style>{`
                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 1.5rem;
                }
            `}</style>
        </div>
    );
};

export default DetailsSection;
