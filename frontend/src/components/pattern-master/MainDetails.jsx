import React, { memo, useState, useEffect } from 'react';
import Combobox from '../common/Combobox';
import { labelStyle, inputStyle } from './styles';
import api from '../../api';

// Helper to remove react-select styles dependency if no longer used
// import { customSelectStyles } from './styles'; // Removed

const MainDetails = ({
    data,
    onChange,
    partRows,
    onPartRowChange,
    onAddPartRow,
    onRemovePartRow,
    errors = {}
}) => {

    // State for all options
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);

    // Load all options on mount
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [customersRes, productsRes] = await Promise.all([
                    api.get('/customers?search='),
                    api.get('/products?search=')
                ]);
                setCustomers(customersRes.data.map(c => ({ value: c.CustId, label: c.CustName })));
                // Include GradeId and GradeName from products
                setProducts(productsRes.data.map(p => ({
                    value: p.ProdId,
                    label: p.InternalPartNo || `Product ${p.ProdId}`,
                    prodName: p.ProdName,
                    gradeId: p.GradeId,
                    gradeName: p.GradeName
                })));
            } catch (err) {
                console.error('Error loading options:', err);
            }
        };
        fetchOptions();
    }, []);

    const handleCustomerChange = (selectedValue) => {
        const selectedOption = customers.find(c => c.value === selectedValue);
        onChange({
            target: {
                name: 'Customer',
                value: selectedOption // Store { value: 1, label: 'Name' }
            }
        });
    };

    return (
        <div style={{
            padding: '1.25rem',
            backgroundColor: '#F0F9FF',
            borderRadius: '8px',
            border: '1px solid #BAE6FD'
        }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0369A1', fontWeight: '600' }}>
                📋 Main Details
            </h3>
            <div className="form-grid">
                <div>
                    <label style={labelStyle}>Pattern No <span style={{ color: 'red' }}>*</span></label>
                    <input
                        type="text"
                        name="PatternNo"
                        value={data.PatternNo}
                        onChange={onChange}
                        required
                        style={inputStyle}
                        placeholder="Enter pattern number"
                    />
                    {errors.PatternNo && <span style={{ color: '#DC2626', fontSize: '0.75rem' }}>{errors.PatternNo}</span>}
                </div>

                <div>
                    <Combobox
                        label={<>Customer Name <span style={{ color: 'red' }}>*</span></>}
                        value={data.Customer ? data.Customer.value : ''}
                        onChange={handleCustomerChange}
                        options={customers}
                        placeholder="Select Customer..."
                    />
                    {errors.Customer && <span style={{ color: '#DC2626', fontSize: '0.75rem' }}>{errors.Customer}</span>}
                </div>

                <div>
                    <label style={labelStyle}>Serial No</label>
                    <input
                        type="text"
                        name="Serial_No"
                        value={data.Serial_No}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter serial number"
                    />
                </div>

                <div>
                    <label style={labelStyle}>Asset No</label>
                    <input
                        type="text"
                        name="Asset_No"
                        value={data.Asset_No}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter asset number"
                    />
                </div>

                <div>
                    <label style={labelStyle}>Tooling Customer PO</label>
                    <input
                        type="text"
                        name="Customer_Po_No"
                        value={data.Customer_Po_No}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter PO number"
                    />
                </div>

                <div>
                    <label style={labelStyle}>Tooling PO Date</label>
                    <input
                        type="date"
                        name="Tooling_PO_Date"
                        value={data.Tooling_PO_Date}
                        onChange={onChange}
                        style={inputStyle}
                    />
                </div>

                <div>
                    <label style={labelStyle}>Purchase No</label>
                    <input
                        type="text"
                        name="Purchase_No"
                        value={data.Purchase_No}
                        onChange={onChange}
                        style={inputStyle}
                        placeholder="Enter purchase number"
                    />
                </div>

                <div>
                    <label style={labelStyle}>Purchase Date</label>
                    <input
                        type="date"
                        name="Purchase_Date"
                        value={data.Purchase_Date}
                        onChange={onChange}
                        style={inputStyle}
                    />
                </div>
            </div>

            {/* Dynamic Multi-Part Selection - Inline */}
            <div style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                backgroundColor: '#E0F2FE',
                borderRadius: '8px',
                border: '1px solid #BAE6FD'
            }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#0369A1', fontWeight: '600' }}>
                    Part Details (Multiple Parts Supported)
                </h4>

                {partRows.map((row, index) => (
                    <div
                        key={index}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1.5fr 1.5fr 1fr 0.8fr 0.8fr 50px',
                            gap: '0.75rem',
                            marginBottom: '1rem',
                            alignItems: 'end'
                        }}
                    >
                        <div>
                            <Combobox
                                label={index === 0 ? <>Part No <span style={{ color: 'red' }}>*</span></> : null}
                                value={row.partNoOption ? row.partNoOption.value : ''}
                                onChange={(val) => {
                                    const selected = products.find(p => p.value === val);
                                    onPartRowChange(index, 'partNo', selected);
                                }}
                                options={products}
                                placeholder="Select Part No..."
                                disabled={false}
                            />
                            {errors[`part_${index}_partNo`] && <span style={{ color: '#DC2626', fontSize: '0.75rem' }}>{errors[`part_${index}_partNo`]}</span>}
                        </div>

                        <div>
                            {index === 0 && (
                                <label style={labelStyle}>Product Name <span style={{ color: 'red' }}>*</span></label>
                            )}
                            <input
                                type="text"
                                value={row.productName}
                                disabled
                                style={{
                                    ...inputStyle,
                                    backgroundColor: '#F3F4F6',
                                    cursor: 'not-allowed',
                                    color: '#6B7280'
                                }}
                                placeholder="Auto-filled"
                            />
                        </div>

                        <div>
                            {index === 0 && (
                                <label style={labelStyle}>Material Grade</label>
                            )}
                            <input
                                type="text"
                                value={row.materialGradeName || ''}
                                disabled
                                style={{
                                    ...inputStyle,
                                    backgroundColor: '#F3F4F6',
                                    cursor: 'not-allowed',
                                    color: '#6B7280'
                                }}
                                placeholder="Auto-filled"
                            />
                        </div>

                        <div>
                            {index === 0 && (
                                <label style={labelStyle}>No of Cavities</label>
                            )}
                            <input
                                type="number"
                                placeholder="Qty"
                                value={row.qty}
                                onChange={(e) => onPartRowChange(index, 'qty', e.target.value)}
                                style={inputStyle}
                            />
                            {errors[`part_${index}_qty`] && <span style={{ color: '#DC2626', fontSize: '0.75rem', display: 'block' }}>{errors[`part_${index}_qty`]}</span>}
                        </div>

                        <div>
                            {index === 0 && (
                                <label style={labelStyle}>Weight (kg)</label>
                            )}
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Wt"
                                value={row.weight}
                                onChange={(e) => onPartRowChange(index, 'weight', e.target.value)}
                                style={inputStyle}
                            />
                            {errors[`part_${index}_weight`] && <span style={{ color: '#DC2626', fontSize: '0.75rem', display: 'block' }}>{errors[`part_${index}_weight`]}</span>}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                            {partRows.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => onRemovePartRow(index)}
                                    style={{
                                        padding: '0.625rem 0.75rem',
                                        backgroundColor: '#EF4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '1rem',
                                        fontWeight: 'bold',
                                        minHeight: '42px',
                                        width: '100%'
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={onAddPartRow}
                    style={{
                        marginTop: '0.5rem',
                        padding: '0.625rem 1.25rem',
                        backgroundColor: '#3B82F6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        minHeight: '42px'
                    }}
                >
                    + Add Another Part
                </button>

                {/* Total Weight Display */}
                <div style={{
                    marginTop: '1.25rem',
                    padding: '1rem',
                    backgroundColor: '#DBEAFE',
                    borderRadius: '6px',
                    border: '2px solid #3B82F6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <label style={{ ...labelStyle, margin: 0, fontWeight: '600', color: '#1E40AF' }}>Total Weight (kg)</label>
                    <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: '#1E40AF',
                        minWidth: '100px',
                        textAlign: 'right'
                    }}>
                        {partRows.reduce((sum, row) => sum + (parseFloat(row.weight) || 0), 0).toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(MainDetails);
