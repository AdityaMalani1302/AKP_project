import React from 'react';
import { labelStyle, inputStyle } from './styles';

const ChemistryMixSection = ({ data, onChange }) => {
    return (
        <>
            {/* Final Control Chemistry Section */}
            <div style={{
                padding: '1.25rem',
                backgroundColor: '#FFF7ED',
                borderRadius: '8px',
                border: '1px solid #FED7AA'
            }}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#C2410C', fontWeight: '600' }}>
                    2. Final Control Chemistry
                </h3>
                <div className="form-grid">
                    <div>
                        <label style={labelStyle}>C %</label>
                        <input
                            type="text"
                            name="C"
                            value={data.C || ''}
                            onChange={onChange}
                            style={inputStyle}
                            placeholder="C %"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Si %</label>
                        <input
                            type="text"
                            name="Si"
                            value={data.Si || ''}
                            onChange={onChange}
                            style={inputStyle}
                            placeholder="Si %"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Mn %</label>
                        <input
                            type="text"
                            name="Mn"
                            value={data.Mn || ''}
                            onChange={onChange}
                            style={inputStyle}
                            placeholder="Mn %"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>P %</label>
                        <input
                            type="text"
                            name="P"
                            value={data.P || ''}
                            onChange={onChange}
                            style={inputStyle}
                            placeholder="P %"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>S %</label>
                        <input
                            type="text"
                            name="S"
                            value={data.S || ''}
                            onChange={onChange}
                            style={inputStyle}
                            placeholder="S %"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Cr %</label>
                        <input
                            type="text"
                            name="Cr"
                            value={data.Cr || ''}
                            onChange={onChange}
                            style={inputStyle}
                            placeholder="Cr %"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Cu %</label>
                        <input
                            type="text"
                            name="Cu"
                            value={data.Cu || ''}
                            onChange={onChange}
                            style={inputStyle}
                            placeholder="Cu %"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>CE</label>
                        <input
                            type="text"
                            name="CE"
                            value={data.CE || ''}
                            onChange={onChange}
                            style={inputStyle}
                            placeholder="CE"
                        />
                    </div>
                </div>
            </div>

            {/* Charge Mix Section */}
            <div style={{
                padding: '1.25rem',
                backgroundColor: '#F0FDF4',
                borderRadius: '8px',
                border: '1px solid #BBF7D0'
            }}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#15803D', fontWeight: '600' }}>
                    3. Charge Mix
                </h3>
                <div className="form-grid">
                    <div>
                        <label style={labelStyle}>CRCA</label>
                        <input
                            type="text"
                            name="CRCA"
                            value={data.CRCA || ''}
                            onChange={onChange}
                            style={inputStyle}
                            placeholder="CRCA"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>RR</label>
                        <input
                            type="text"
                            name="RR"
                            value={data.RR || ''}
                            onChange={onChange}
                            style={inputStyle}
                            placeholder="RR"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>PIG</label>
                        <input
                            type="text"
                            name="PIG"
                            value={data.PIG || ''}
                            onChange={onChange}
                            style={inputStyle}
                            placeholder="PIG"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>MS</label>
                        <input
                            type="text"
                            name="MS"
                            value={data.MS || ''}
                            onChange={onChange}
                            style={inputStyle}
                            placeholder="MS"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Mg</label>
                        <input
                            type="text"
                            name="Mg"
                            value={data.Mg || ''}
                            onChange={onChange}
                            style={inputStyle}
                            placeholder="Mg"
                        />
                    </div>
                </div>
            </div>

            <style>{`
                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 1.5rem;
                }
            `}</style>
        </>
    );
};

export default ChemistryMixSection;
