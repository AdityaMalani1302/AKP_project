import React, { memo } from 'react';
import { FileText } from 'lucide-react';
import { labelStyle, inputStyle } from './styles';
import CharacterCounter from '../common/CharacterCounter';

const AdditionalInfo = ({ data, onChange }) => {
    return (
        <div className="section-container" style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}>
            <h3 className="section-title" style={{ color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} /> Additional Information
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
                        maxLength={500}
                        style={{ ...inputStyle, resize: 'vertical' }}
                    />
                    <CharacterCounter value={data.Comment} maxLength={500} showAt={400} />
                </div>
            </div>
        </div>
    );
};

export default memo(AdditionalInfo);
