import React, { useState } from 'react';
import { FiDownload, FiLoader } from 'react-icons/fi';

// jsPDF, ExcelJS, and html2canvas are loaded dynamically to reduce initial bundle size
// This significantly improves first load time as these are heavy libraries

/**
 * ExportButtons - Reusable component for exporting data/charts to PDF and Excel
 * 
 * Props:
 * - data: Array of objects to export (for table export mode)
 * - columns: Array of { key, header, width? } for column definitions
 * - fileName: Base file name (without extension)
 * - title: Title for the PDF document
 * - orientation: 'portrait' or 'landscape' for PDF
 * - chartRefs: Array of { ref, title } for chart export mode (captures charts as images)
 */
const ExportButtons = ({ 
    data = [], 
    columns = [], 
    fileName = 'export',
    title = 'Data Export',
    orientation = 'landscape',
    size = 'small', // 'small', 'medium'
    chartRefs = [] // New prop for chart export mode
}) => {
    const [exporting, setExporting] = useState(null); // 'pdf' | 'excel' | null

    const buttonStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: size === 'small' ? '0.5rem 0.75rem' : '0.625rem 1rem',
        fontSize: size === 'small' ? '0.8rem' : '0.875rem',
        fontWeight: '500',
        borderRadius: '0.375rem',
        border: '1px solid #E5E7EB',
        backgroundColor: '#FFFFFF',
        color: '#374151',
        cursor: 'pointer',
        transition: 'all 0.2s'
    };

    // Check if we should export charts (images) or data (tables)
    const isChartExportMode = chartRefs && chartRefs.length > 0;

    // Export charts as images to PDF
    const exportChartsToPDF = async () => {
        setExporting('pdf');
        
        try {
            const [{ jsPDF }, html2canvasModule] = await Promise.all([
                import('jspdf'),
                import('html2canvas')
            ]);
            const html2canvas = html2canvasModule.default;
            
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 10;
            const titleHeight = 20;

            // Add title
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(title, pageWidth / 2, 15, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: 'center' });

            let currentY = titleHeight + 15;
            let chartsOnPage = 0;
            const maxChartHeight = (pageHeight - titleHeight - margin * 3) / 2; // 2 charts per page
            const maxChartWidth = Math.min(pageWidth - margin * 2, 180); // Limit width to prevent stretching

            for (let i = 0; i < chartRefs.length; i++) {
                const chartItem = chartRefs[i];
                if (!chartItem.ref?.current) continue;

                // Capture chart as canvas
                const canvas = await html2canvas(chartItem.ref.current, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    logging: false,
                    useCORS: true
                });

                const imgData = canvas.toDataURL('image/png');
                
                // Calculate dimensions preserving aspect ratio
                const aspectRatio = canvas.height / canvas.width;
                let imgWidth = maxChartWidth;
                let imgHeight = imgWidth * aspectRatio;
                
                // If too tall, scale down by height instead
                if (imgHeight > maxChartHeight) {
                    imgHeight = maxChartHeight;
                    imgWidth = imgHeight / aspectRatio;
                }

                // Check if we need a new page
                if (chartsOnPage >= 2 || currentY + imgHeight + 10 > pageHeight - margin) {
                    doc.addPage();
                    currentY = margin;
                    chartsOnPage = 0;
                }

                // Add chart title
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(chartItem.title || `Chart ${i + 1}`, margin, currentY);
                currentY += 5;

                // Center the image horizontally
                const imageX = (pageWidth - imgWidth) / 2;

                // Add chart image
                doc.addImage(imgData, 'PNG', imageX, currentY, imgWidth, imgHeight);
                currentY += imgHeight + 10;
                chartsOnPage++;
            }

            doc.save(`${fileName}.pdf`);
        } catch (error) {
            console.error('PDF chart export error:', error);
            alert('Failed to export charts to PDF');
        } finally {
            setExporting(null);
        }
    };

    // Export charts as images to Excel
    const exportChartsToExcel = async () => {
        setExporting('excel');

        try {
            const [ExcelJSModule, fileSaverModule, html2canvasModule] = await Promise.all([
                import('exceljs'),
                import('file-saver'),
                import('html2canvas')
            ]);
            const ExcelJS = ExcelJSModule.default;
            const { saveAs } = fileSaverModule;
            const html2canvas = html2canvasModule.default;

            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Smart ERP';
            workbook.created = new Date();

            const worksheet = workbook.addWorksheet('Dashboard Charts');

            // Add title
            worksheet.mergeCells('A1:L1');
            worksheet.getCell('A1').value = title;
            worksheet.getCell('A1').font = { bold: true, size: 18 };
            worksheet.getCell('A1').alignment = { horizontal: 'center' };

            worksheet.mergeCells('A2:L2');
            worksheet.getCell('A2').value = `Generated: ${new Date().toLocaleString()}`;
            worksheet.getCell('A2').font = { size: 10, color: { argb: '666666' } };
            worksheet.getCell('A2').alignment = { horizontal: 'center' };

            let currentRow = 4;

            for (let i = 0; i < chartRefs.length; i++) {
                const chartItem = chartRefs[i];
                if (!chartItem.ref?.current) continue;

                // Add chart title
                worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
                worksheet.getCell(`A${currentRow}`).value = chartItem.title || `Chart ${i + 1}`;
                worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
                currentRow++;

                // Capture chart as canvas
                const canvas = await html2canvas(chartItem.ref.current, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    logging: false,
                    useCORS: true
                });

                // Convert canvas to base64 (remove data:image/png;base64, prefix)
                const base64 = canvas.toDataURL('image/png').split(',')[1];

                // Add image to workbook
                const imageId = workbook.addImage({
                    base64: base64,
                    extension: 'png'
                });

                // Calculate image dimensions (fit to cell width of ~700px)
                const aspectRatio = canvas.height / canvas.width;
                const imgWidth = 700;
                const imgHeight = imgWidth * aspectRatio;

                worksheet.addImage(imageId, {
                    tl: { col: 0, row: currentRow - 1 },
                    ext: { width: imgWidth, height: imgHeight }
                });

                // Move down by approximate number of rows for this image
                const rowsForImage = Math.ceil(imgHeight / 20) + 2;
                currentRow += rowsForImage;
            }

            // Set column widths
            worksheet.columns = Array(12).fill({ width: 10 });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            saveAs(blob, `${fileName}.xlsx`);
        } catch (error) {
            console.error('Excel chart export error:', error);
            alert('Failed to export charts to Excel');
        } finally {
            setExporting(null);
        }
    };

    // Original table data export to PDF
    const exportDataToPDF = async () => {
        if (data.length === 0) {
            alert('No data to export');
            return;
        }

        setExporting('pdf');
        
        try {
            const [{ jsPDF }, { default: autoTable }] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable')
            ]);
            
            const doc = new jsPDF({
                orientation: orientation,
                unit: 'mm',
                format: 'a4'
            });

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 14, 20);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

            const headers = columns.map(col => col.header);
            const rows = data.map(item => 
                columns.map(col => {
                    const value = item[col.key];
                    if (typeof value === 'number') {
                        return value.toLocaleString('en-IN');
                    }
                    return value ?? '';
                })
            );

            autoTable(doc, {
                head: [headers],
                body: rows,
                startY: 35,
                styles: {
                    fontSize: 8,
                    cellPadding: 2
                },
                headStyles: {
                    fillColor: [37, 99, 235],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [249, 250, 251]
                },
                margin: { top: 35, left: 10, right: 10 }
            });

            doc.save(`${fileName}.pdf`);
        } catch (error) {
            console.error('PDF export error:', error);
            alert('Failed to export PDF');
        } finally {
            setExporting(null);
        }
    };

    // Original table data export to Excel
    const exportDataToExcel = async () => {
        if (data.length === 0) {
            alert('No data to export');
            return;
        }

        setExporting('excel');

        try {
            const [ExcelJSModule, fileSaverModule] = await Promise.all([
                import('exceljs'),
                import('file-saver')
            ]);
            const ExcelJS = ExcelJSModule.default;
            const { saveAs } = fileSaverModule;
            
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Smart ERP';
            workbook.created = new Date();
            
            const worksheet = workbook.addWorksheet('Data');

            worksheet.columns = columns.map(col => ({
                header: col.header,
                key: col.key,
                width: col.width || 15
            }));

            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '2563EB' }
            };
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };

            data.forEach(item => {
                const row = {};
                columns.forEach(col => {
                    row[col.key] = item[col.key] ?? '';
                });
                worksheet.addRow(row);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            saveAs(blob, `${fileName}.xlsx`);
        } catch (error) {
            console.error('Excel export error:', error);
            alert('Failed to export Excel');
        } finally {
            setExporting(null);
        }
    };

    // Decide which export functions to use
    const exportToPDF = isChartExportMode ? exportChartsToPDF : exportDataToPDF;
    const exportToExcel = isChartExportMode ? exportChartsToExcel : exportDataToExcel;

    return (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
                onClick={exportToPDF}
                disabled={exporting !== null}
                style={{
                    ...buttonStyle,
                    opacity: exporting ? 0.7 : 1,
                    cursor: exporting ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                    if (!exporting) e.target.style.backgroundColor = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#FFFFFF';
                }}
                title={isChartExportMode ? "Export charts to PDF" : "Export to PDF"}
            >
                {exporting === 'pdf' ? (
                    <FiLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                    <FiDownload size={16} />
                )}
                PDF
            </button>

            <button
                onClick={exportToExcel}
                disabled={exporting !== null}
                style={{
                    ...buttonStyle,
                    opacity: exporting ? 0.7 : 1,
                    cursor: exporting ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                    if (!exporting) e.target.style.backgroundColor = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#FFFFFF';
                }}
                title={isChartExportMode ? "Export charts to Excel" : "Export to Excel"}
            >
                {exporting === 'excel' ? (
                    <FiLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                    <FiDownload size={16} />
                )}
                Excel
            </button>
        </div>
    );
};

export default ExportButtons;
