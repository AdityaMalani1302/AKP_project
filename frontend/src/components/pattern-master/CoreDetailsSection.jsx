import React, { memo } from 'react';
import { labelStyle, inputStyle, smallNumberInputStyle } from './styles';

const CoreDetailsSection = ({
    data,
    onChange,
    errors = {}
}) => {
    return (
        <div className="section-container section-purple">
            <h3 className="section-title purple">
                🔩 Core Details
            </h3>

            <div className="form-grid">
                {/* Core Weight */}
                <div>
                    <label style={labelStyle}>Total Core Weight</label>
                    <input
                        type="text"
                        name="Core_Wt"
                        value={data.Core_Wt}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter total core weight"
                    />
                    {errors.Core_Wt && <span style={{ color: '#DC2626', fontSize: '0.75rem' }}>{errors.Core_Wt}</span>}
                </div>

                {/* Core Type with conditional number inputs */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ ...labelStyle, marginBottom: '0.75rem' }}>
                        Core Type
                    </label>
                    <div style={{
                        display: 'flex',
                        gap: '2rem',
                        flexWrap: 'wrap',
                        padding: '1rem',
                        backgroundColor: 'rgba(255,255,255,0.5)',
                        borderRadius: '6px',
                        border: '1px solid rgba(139, 92, 246, 0.2)'
                    }}>
                        {/* Shell */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}>
                            <input
                                type="checkbox"
                                id="Core_Type_shell"
                                name="Core_Type_shell"
                                checked={data.Core_Type?.shell || false}
                                onChange={onChange}
                                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                            />
                            <label htmlFor="Core_Type_shell" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Shell</label>
                            {data.Core_Type?.shell && (
                                <input
                                    type="number"
                                    name="shell_qty"
                                    value={data.shell_qty || ''}
                                    onChange={onChange}
                                    placeholder="Qty"
                                    style={smallNumberInputStyle}
                                />
                            )}
                        </div>

                        {/* Cold Box */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}>
                            <input
                                type="checkbox"
                                id="Core_Type_coldBox"
                                name="Core_Type_coldBox"
                                checked={data.Core_Type?.coldBox || false}
                                onChange={onChange}
                                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                            />
                            <label htmlFor="Core_Type_coldBox" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Cold Box</label>
                            {data.Core_Type?.coldBox && (
                                <input
                                    type="number"
                                    name="coldBox_qty"
                                    value={data.coldBox_qty || ''}
                                    onChange={onChange}
                                    placeholder="Qty"
                                    style={smallNumberInputStyle}
                                />
                            )}
                        </div>

                        {/* No-Bake */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}>
                            <input
                                type="checkbox"
                                id="Core_Type_noBake"
                                name="Core_Type_noBake"
                                checked={data.Core_Type?.noBake || false}
                                onChange={onChange}
                                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                            />
                            <label htmlFor="Core_Type_noBake" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>No-Bake</label>
                            {data.Core_Type?.noBake && (
                                <input
                                    type="number"
                                    name="noBake_qty"
                                    value={data.noBake_qty || ''}
                                    onChange={onChange}
                                    placeholder="Qty"
                                    style={smallNumberInputStyle}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Core Options with conditional number inputs */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ ...labelStyle, marginBottom: '0.75rem' }}>
                        Core Options
                    </label>
                    <div style={{
                        display: 'flex',
                        gap: '2rem',
                        flexWrap: 'wrap',
                        padding: '1rem',
                        backgroundColor: 'rgba(255,255,255,0.5)',
                        borderRadius: '6px',
                        border: '1px solid rgba(139, 92, 246, 0.2)'
                    }}>
                        {/* Main Core */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}>
                            <input
                                type="checkbox"
                                id="Main_Core"
                                name="Main_Core"
                                checked={data.Main_Core || false}
                                onChange={onChange}
                                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                            />
                            <label htmlFor="Main_Core" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Main Core</label>
                            {data.Main_Core && (
                                <input
                                    type="number"
                                    name="mainCore_qty"
                                    value={data.mainCore_qty || ''}
                                    onChange={onChange}
                                    placeholder="Qty"
                                    style={smallNumberInputStyle}
                                />
                            )}
                        </div>

                        {/* Side Core */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}>
                            <input
                                type="checkbox"
                                id="Side_Core"
                                name="Side_Core"
                                checked={data.Side_Core || false}
                                onChange={onChange}
                                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                            />
                            <label htmlFor="Side_Core" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Side Core</label>
                            {data.Side_Core && (
                                <input
                                    type="number"
                                    name="sideCore_qty"
                                    value={data.sideCore_qty || ''}
                                    onChange={onChange}
                                    placeholder="Qty"
                                    style={smallNumberInputStyle}
                                />
                            )}
                        </div>

                        {/* Loose Core */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}>
                            <input
                                type="checkbox"
                                id="Loose_Core"
                                name="Loose_Core"
                                checked={data.Loose_Core || false}
                                onChange={onChange}
                                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                            />
                            <label htmlFor="Loose_Core" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Loose Core</label>
                            {data.Loose_Core && (
                                <input
                                    type="number"
                                    name="looseCore_qty"
                                    value={data.looseCore_qty || ''}
                                    onChange={onChange}
                                    placeholder="Qty"
                                    style={smallNumberInputStyle}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(CoreDetailsSection);
