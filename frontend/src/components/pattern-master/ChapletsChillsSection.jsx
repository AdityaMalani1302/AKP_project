import React, { memo } from 'react';
import { labelStyle, inputStyle, inlineLabelStyle } from './styles';

const ChapletsChillsSection = ({ data, onChange }) => {
    return (
        <div className="section-container section-indigo">
            <h3 className="section-title indigo">
                ⚙️ Chaplets / Chills
            </h3>
            <div className="form-grid">
                {/* Composite Input for Chaplets COPE */}
                <div>
                    <label style={labelStyle}>No of Chaplets size (COPE – TOP)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <span style={inlineLabelStyle}>REG</span>
                            <input
                                type="text"
                                placeholder="10 mm Ø"
                                value={data.Chaplets_COPE?.split('|')[0]?.replace('REG:', '')?.trim() || ''}
                                onChange={(e) => {
                                    const reg = e.target.value;
                                    const hDuty = data.Chaplets_COPE?.split('|')[1]?.replace('H Duty:', '')?.trim() || '';
                                    onChange({ target: { name: 'Chaplets_COPE', value: `REG: ${reg} | H Duty: ${hDuty}` } });
                                }}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <span style={inlineLabelStyle}>H Duty</span>
                            <input
                                type="text"
                                placeholder="12 mm Ø"
                                value={data.Chaplets_COPE?.split('|')[1]?.replace('H Duty:', '')?.trim() || ''}
                                onChange={(e) => {
                                    const hDuty = e.target.value;
                                    const reg = data.Chaplets_COPE?.split('|')[0]?.replace('REG:', '')?.trim() || '';
                                    onChange({ target: { name: 'Chaplets_COPE', value: `REG: ${reg} | H Duty: ${hDuty}` } });
                                }}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                </div>

                {/* Composite Input for Chaplets DRAG */}
                <div>
                    <label style={labelStyle}>No of Chaplets size (DRAG – Bottom)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <span style={inlineLabelStyle}>REG</span>
                            <input
                                type="text"
                                placeholder="mm Ø"
                                value={data.Chaplets_DRAG?.split('|')[0]?.replace('REG:', '')?.trim() || ''}
                                onChange={(e) => {
                                    const reg = e.target.value;
                                    const hDuty = data.Chaplets_DRAG?.split('|')[1]?.replace('H Duty:', '')?.trim() || '';
                                    onChange({ target: { name: 'Chaplets_DRAG', value: `REG: ${reg} | H Duty: ${hDuty}` } });
                                }}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <span style={inlineLabelStyle}>H Duty</span>
                            <input
                                type="text"
                                placeholder="mm Ø"
                                value={data.Chaplets_DRAG?.split('|')[1]?.replace('H Duty:', '')?.trim() || ''}
                                onChange={(e) => {
                                    const hDuty = e.target.value;
                                    const reg = data.Chaplets_DRAG?.split('|')[0]?.replace('REG:', '')?.trim() || '';
                                    onChange({ target: { name: 'Chaplets_DRAG', value: `REG: ${reg} | H Duty: ${hDuty}` } });
                                }}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label style={labelStyle}>No of Chills (COPE – TOP)</label>
                    <div style={{ paddingTop: '1.25rem' }}>
                        <input
                            type="text"
                            name="Chills_COPE"
                            value={data.Chills_COPE}
                            onChange={onChange}
                            style={inputStyle}
                            placeholder="Enter number"
                        />
                    </div>
                </div>

                <div>
                    <label style={labelStyle}>No of Chills (DRAG – Bottom)</label>
                    <div style={{ paddingTop: '1.25rem' }}>
                        <input
                            type="text"
                            name="Chills_DRAG"
                            value={data.Chills_DRAG}
                            onChange={onChange}
                            style={inputStyle}
                            placeholder="Enter number"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(ChapletsChillsSection);
