import React from 'react';
import MainDetails from './MainDetails';
import PatternSection from './PatternSection';
import CoreBoxSection from './CoreBoxSection';
import CoreDetailsSection from './CoreDetailsSection';
import ChapletsChillsSection from './ChapletsChillsSection';
import MouldingSection from './MouldingSection';
import CastingSection from './CastingSection';
import SleevesSection from './SleevesSection';
import AdditionalSection from './AdditionalSection';


const PatternForm = ({
    // Data Props
    mainData,
    patternData,
    coreBoxData,
    coreDetailsData,
    castingData,
    mouldingData,
    chapletsChillsData,
    sleeveRows,
    additionalData,
    partRows,
    sleeveOptions,
    
    // Handlers
    onMainChange,
    onPatternChange,
    onCoreBoxChange,
    onCoreDetailsChange,
    onCastingChange,
    onMouldingChange,
    onChapletsChillsChange,
    onAdditionalChange,
    
    // Array Handlers
    onPartRowChange,
    onAddPartRow,
    onRemovePartRow,
    onSleeveRowChange,
    onAddSleeveRow,
    onRemoveSleeveRow,
    
    // Actions
    onSubmit,
    onClear,
    onDelete,
    
    // Search (kept in form actions row)
    searchTerm,
    onSearchChange,
    
    // State
    errors,
    loading,
    isEditing,
    selectedId,
    error
}) => {
    // Prevent Enter key from submitting the form - only allow button click
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    };

    return (
        <form onSubmit={onSubmit} onKeyDown={handleKeyDown} style={{ display: 'flex', flexDirection: 'column' }}>



            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <MainDetails
                    data={mainData}
                    onChange={onMainChange}
                    partRows={partRows}
                    onPartRowChange={onPartRowChange}
                    onAddPartRow={onAddPartRow}
                    onRemovePartRow={onRemovePartRow}
                    errors={errors}
                />

                <PatternSection
                    data={patternData}
                    onChange={onPatternChange}
                    errors={errors}
                />

                <CoreBoxSection
                    data={coreBoxData}
                    onChange={onCoreBoxChange}
                    errors={errors}
                />

                <CoreDetailsSection
                    data={coreDetailsData}
                    onChange={onCoreDetailsChange}
                    errors={errors}
                />

                <CastingSection
                    data={castingData}
                    onChange={onCastingChange}
                    errors={errors}
                />

                <MouldingSection
                    data={mouldingData}
                    onChange={onMouldingChange}
                />

                <ChapletsChillsSection
                    data={chapletsChillsData}
                    onChange={onChapletsChillsChange}
                />

                <SleevesSection
                    sleeveRows={sleeveRows}
                    onSleeveRowChange={onSleeveRowChange}
                    onAddSleeveRow={onAddSleeveRow}
                    onRemoveSleeveRow={onRemoveSleeveRow}
                    sleeveOptions={sleeveOptions}
                    errors={errors}
                />

                <AdditionalSection
                    data={additionalData}
                    onChange={onAdditionalChange}
                />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem' }}>
                <button type="submit" disabled={loading} className="btn btn-primary">
                    {loading ? 'Saving...' : (isEditing ? 'UPDATE' : 'ADD')}
                </button>
                {selectedId && (
                    <button type="button" onClick={onDelete} className="btn" style={{ backgroundColor: '#EF4444', color: 'white' }}>
                        DELETE
                    </button>
                )}
                <button type="button" onClick={onClear} className="btn btn-secondary">
                    CLEAR
                </button>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ fontWeight: '500', whiteSpace: 'nowrap', color: '#374151' }}>Search:</label>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={onSearchChange}
                        placeholder="Type to search..."
                        className="input-field"
                        style={{ minWidth: '200px' }}
                    />
                    {searchTerm && (
                        <button type="button" onClick={() => onSearchChange({ target: { value: '' } })} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>✕</button>
                    )}
                </div>
            </div>

            {/* Error Message Display */}
            {error && (
                <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#FEE2E2',
                    color: '#DC2626',
                    borderRadius: '6px',
                    border: '1px solid #FCA5A5'
                }}>
                    {error}
                </div>
            )}
        </form>
    );
};

export default PatternForm;
