import React, { memo } from 'react';
import { labelStyle, inputStyle, textareaStyle } from './styles';
import DatePicker from '../common/DatePicker';

const AdditionalSection = ({ data, onChange }) => {
    return (
        <div className="section-container section-gray">
            <h3 className="section-title gray">
                📋 Additional Information
            </h3>
            <div className="form-grid">
                <div>
                    <label style={labelStyle}>Rev No Status</label>
                    <input
                        type="text"
                        name="rev_no_status"
                        value={data.rev_no_status}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter revision number status"
                    />
                </div>

                <div>
                    <label style={labelStyle}>Date</label>
                    <DatePicker
                        name="date"
                        value={data.date ? data.date.split('T')[0] : ''}
                        onChange={onChange}
                        placeholder="Select date..."
                    />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Comment</label>
                    <textarea
                        name="comment"
                        value={data.comment}
                        onChange={onChange}
                        style={textareaStyle}
                        placeholder="Enter any additional comments"
                    />
                </div>
            </div>
        </div>
    );
};

export default memo(AdditionalSection);
