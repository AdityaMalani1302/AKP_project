import React, { memo } from 'react';
import { labelStyle, inputStyle } from './styles';

const CastingSection = ({ data, onChange, errors = {} }) => {
    return (
        <div className="section-container section-red">
            <h3 className="section-title red">
                ⚙️ Casting
            </h3>
            <div className="form-grid">
                <div>
                    <label style={labelStyle}>Moulding Box Size</label>
                    <input
                        type="text"
                        name="Moulding_Box_Size"
                        value={data.Moulding_Box_Size}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter box size"
                    />
                </div>

                <div>
                    <label style={labelStyle}>Bunch Wt</label>
                    <input
                        type="text"
                        name="Bunch_Wt"
                        value={data.Bunch_Wt}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter bunch weight"
                    />
                    {errors.Bunch_Wt && <span style={{ color: '#DC2626', fontSize: '0.75rem' }}>{errors.Bunch_Wt}</span>}
                </div>

                <div>
                    <label style={labelStyle}>Yield %</label>
                    <input
                        type="text"
                        name="YieldPercent"
                        value={data.YieldPercent}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter yield percentage"
                    />
                    {errors.YieldPercent && <span style={{ color: '#DC2626', fontSize: '0.75rem' }}>{errors.YieldPercent}</span>}
                </div>
            </div>
        </div>
    );
};

export default memo(CastingSection);
