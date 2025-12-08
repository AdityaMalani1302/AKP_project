import React, { memo } from 'react';
import { labelStyle, inputStyle } from './styles';

const AdditionalInfo = ({ data, onChange }) => {
    return (
        <div className="section-container" style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}>
            <h3 className="section-title" style={{ color: '#374151' }}>
                📝 Additional Information
            </h3>
            <div className="form-grid">
                <div>
                    <label style={labelStyle}>Customer Tooling Inv No</label>
                    <input
                        type="text"
                        name="Customer_Tooling_Inv_No"
                        value={data.Customer_Tooling_Inv_No}
                        onChange={onChange}
                        style={inputStyle}
                    />
                </div>

                <div className="grid-full">
                    <label style={labelStyle}>Comment</label>
                    <textarea
                        name="Comment"
                        value={data.Comment}
                        onChange={onChange}
                        rows="3"
                        style={{ ...inputStyle, resize: 'vertical' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default memo(AdditionalInfo);
