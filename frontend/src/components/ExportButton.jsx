import React, { useState } from 'react';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const ExportButton = ({ chartRef, title = 'chart', filename = 'dashboard-chart' }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (e) => {
    e.stopPropagation(); // prevent clicking from triggering the expanded chart view
    
    if (!chartRef || !chartRef.current) return;
    
    try {
      setIsExporting(true);
      const element = chartRef.current;
      
      // Temporarily style for export if needed, html2canvas handles most things well
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
          // Fix: Override opacity/animation styles that cause dimmed charts in PDF
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach(el => {
            el.style.opacity = '1';
            el.style.animation = 'none';
            el.style.transition = 'none';
            el.style.filter = 'none';
          });
        }
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      // Calculate PDF dimensions (landscape A4 is 297x210 mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate image dimensions to fit within PDF while maintaining aspect ratio
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;
      
      let finalWidth = pdfWidth - 20; // 10mm padding on sides
      let finalHeight = finalWidth / ratio;
      
      // If height is too large for the page, scale by height instead
      if (finalHeight > pdfHeight - 30) { // 15mm padding top/bottom
        finalHeight = pdfHeight - 30;
        finalWidth = finalHeight * ratio;
      }
      
      // Center on page
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;
      
      // Add title
      pdf.setFontSize(16);
      pdf.text(title, pdfWidth / 2, 15, { align: 'center' });
      
      // Add image
      pdf.addImage(imgData, 'JPEG', x, Math.max(20, y), finalWidth, finalHeight);
      
      // Save
      pdf.save(`${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
      
    } catch (error) {
      console.error('Error exporting chart to PDF:', error);
      alert('Failed to export chart. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      title="Export to PDF"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px',
        background: 'transparent',
        border: 'none',
        borderRadius: '6px',
        cursor: isExporting ? 'wait' : 'pointer',
        color: '#4B5563',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        if (!isExporting) {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
            e.currentTarget.style.color = '#1F2937';
        }
      }}
      onMouseLeave={(e) => {
        if (!isExporting) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#4B5563';
        }
      }}
    >
      <Download size={18} opacity={isExporting ? 0.5 : 1} />
    </button>
  );
};

export default ExportButton;
