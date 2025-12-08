import React, { memo } from 'react';
import { labelStyle, inputStyle } from './styles';

const MouldingSection = ({ data, onChange }) => {
    return (
        <div className="section-container section-orange">
            <h3 className="section-title orange">
                🏭 Moulding
            </h3>
            <div className="form-grid">
                <div>
                    <label style={labelStyle}>Mould Vents Size</label>
                    <input
                        type="text"
                        name="Mould_Vents_Size"
                        value={data.Mould_Vents_Size}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter vent size"
                    />
                </div>

                <div>
                    <label style={labelStyle}>Mould Vents No</label>
                    <input
                        type="text"
                        name="Mould_Vents_No"
                        value={data.Mould_Vents_No}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter number"
                    />
                </div>

                <div>
                    <label style={labelStyle}>Breaker Core Size</label>
                    <input
                        type="text"
                        name="breaker_core_size"
                        value={data.breaker_core_size}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter breaker core size"
                    />
                </div>

                <div>
                    <label style={labelStyle}>Down Sprue Size</label>
                    <input
                        type="text"
                        name="down_sprue_size"
                        value={data.down_sprue_size}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter down sprue size"
                    />
                </div>

                <div>
                    <label style={labelStyle}>Foam Filter Size</label>
                    <input
                        type="text"
                        name="foam_filter_size"
                        value={data.foam_filter_size}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter foam filter size"
                    />
                </div>

                <div>
                    <label style={labelStyle}>Sand Riser Size</label>
                    <input
                        type="text"
                        name="sand_riser_size"
                        value={data.sand_riser_size}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter sand riser size"
                    />
                </div>

                <div>
                    <label style={labelStyle}>No of Sand Riser</label>
                    <input
                        type="text"
                        name="no_of_sand_riser"
                        value={data.no_of_sand_riser}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter number"
                    />
                </div>

                <div>
                    <label style={labelStyle}>Ingate Size</label>
                    <input
                        type="text"
                        name="ingate_size"
                        value={data.ingate_size}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter ingate size"
                    />
                </div>

                <div>
                    <label style={labelStyle}>No of Ingate</label>
                    <input
                        type="text"
                        name="no_of_ingate"
                        value={data.no_of_ingate}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter number"
                    />
                </div>

                <div>
                    <label style={labelStyle}>Runner Bar Size</label>
                    <input
                        type="text"
                        name="runner_bar_size"
                        value={data.runner_bar_size}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter runner bar size"
                    />
                </div>

                <div>
                    <label style={labelStyle}>Runner Bar No</label>
                    <input
                        type="text"
                        name="runner_bar_no"
                        value={data.runner_bar_no}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter runner bar number"
                    />
                </div>
            </div>
        </div>
    );
};

export default memo(MouldingSection);
