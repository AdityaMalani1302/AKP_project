import React, { memo } from 'react';
import { labelStyle, inputStyle, selectStyle } from './styles';

const SleevesSection = ({
    sleeveRows,
    onSleeveRowChange,
    onAddSleeveRow,
    onRemoveSleeveRow,
    sleeveOptions = [],
    errors = {}
}) => {
    return (
        <div className="section-container section-teal">
            <h3 className="section-title teal">
                🔧 Sleeves (Multiple Sleeves Supported)
            </h3>

            {/* Dynamic Sleeve Rows */}
            {sleeveRows.map((row, index) => (
                <div
                    key={index}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 120px 80px',
                        gap: '1rem',
                        alignItems: 'end',
                        marginBottom: '1rem',
                        padding: '1rem',
                        border: '1px solid #CCFBF1',
                        borderRadius: '8px',
                        backgroundColor: index % 2 === 0 ? '#FAFFFE' : '#FFFFFF'
                    }}
                >
                    {/* Sleeve Name */}
                    <div>
                        <label style={labelStyle}>
                            Sleeve Type {index === 0 && <span style={{ color: '#DC2626' }}>*</span>}
                        </label>
                        <input
                            type="text"
                            value={row.sleeve_name}
                            onChange={(e) => onSleeveRowChange(index, 'sleeve_name', e.target.value)}
                            placeholder="Enter sleeve type"
                            style={inputStyle}
                        />
                        {errors[`sleeve_${index}_name`] && <span style={{ color: '#DC2626', fontSize: '0.75rem' }}>{errors[`sleeve_${index}_name`]}</span>}
                    </div>

                    {/* Sleeve Type & Size - Dynamic from RawMaterial */}
                    <div>
                        <label style={labelStyle}>
                            Sleeve Name & Size {index === 0 && <span style={{ color: '#DC2626' }}>*</span>}
                        </label>
                        <select
                            value={row.sleeve_type_size}
                            onChange={(e) => onSleeveRowChange(index, 'sleeve_type_size', e.target.value)}
                            style={selectStyle}
                        >
                            <option value="">Select Name & Size</option>
                            {sleeveOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        {errors[`sleeve_${index}_size`] && <span style={{ color: '#DC2626', fontSize: '0.75rem' }}>{errors[`sleeve_${index}_size`]}</span>}
                    </div>

                    {/* Quantity */}
                    <div>
                        <label style={labelStyle}>Quantity</label>
                        <input
                            type="number"
                            value={row.quantity}
                            onChange={(e) => onSleeveRowChange(index, 'quantity', e.target.value)}
                            placeholder="Qty"
                            style={inputStyle}
                        />
                    </div>

                    {/* Remove button - only show for rows after the first */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                        {index > 0 ? (
                            <button
                                type="button"
                                onClick={() => onRemoveSleeveRow(index)}
                                style={{
                                    padding: '0.625rem 0.75rem',
                                    backgroundColor: '#FEE2E2',
                                    color: '#DC2626',
                                    border: '1px solid #FCA5A5',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    minHeight: '42px',
                                    width: '100%'
                                }}
                            >
                                Remove
                            </button>
                        ) : (
                            <div style={{ minHeight: '42px' }}></div>
                        )}
                    </div>
                </div>
            ))}

            {/* Add Another Sleeve Button */}
            <button
                type="button"
                onClick={onAddSleeveRow}
                style={{
                    padding: '0.625rem 1.25rem',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minHeight: '42px'
                }}
            >
                <span style={{ fontSize: '1.1rem' }}>+</span> Add Another Sleeve
            </button>
        </div>
    );
};

export default memo(SleevesSection);
