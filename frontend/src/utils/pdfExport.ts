import type { Feedback } from '../types';

/**
 * Generates a PDF document from feedback data and triggers download
 * 
 * @param feedback - The feedback data to include in the PDF
 * @param sessionId - The session ID for filename generation
 * @throws Error if PDF generation fails
 */
export async function generateFeedbackPDF(
  feedback: Feedback,
  sessionId: string
): Promise<void> {
  // Use dynamic import to load jsPDF only when needed (reduces initial bundle size)
  const { jsPDF } = await import('jspdf');
  
  // Create new PDF document with A4 page size, portrait orientation
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Get current date for filename and header
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-');
  
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/:/g, '-');

  // Generate filename
  const filename = `french-coach-feedback-${sessionId}-${dateStr}-${timeStr}.pdf`;

  // Title and header styling
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const startY = 20;
  let currentY = startY;

  // Set font for title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  
  // Title - centered
  const title = 'French Language Coach - Session Feedback';
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (pageWidth - titleWidth) / 2, currentY);
  currentY += 10;

  // Subtitle with session ID and date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const subtitle = `Session ID: ${sessionId} | Generated: ${now.toLocaleString()}`;
  const subtitleWidth = doc.getTextWidth(subtitle);
  doc.text(subtitle, (pageWidth - subtitleWidth) / 2, currentY);
  currentY += 15;

  // Add horizontal line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // ============================================
  // SCORES SECTION
  // ============================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Scores', margin, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);

  // Create a grid for scores (2 columns)
  const scoreItems = [
    { label: 'Grammar', value: feedback.grammar_score },
    { label: 'Vocabulary', value: feedback.vocabulary_score },
    { label: 'Fluency', value: feedback.fluency_score },
    { label: 'Overall', value: feedback.overall_score }
  ];

  const colWidth = (pageWidth - margin * 2) / 2;
  const col1X = margin;
  const col2X = margin + colWidth;

  scoreItems.forEach((item, index) => {
    const colIndex = index % 2;
    const x = colIndex === 0 ? col1X : col2X;
    const y = currentY + Math.floor(index / 2) * 12;
    
    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(item.label, x, y);
    
    // Value - bold and larger
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    const valueText = String(item.value);
    const valueWidth = doc.getTextWidth(valueText);
    doc.text(valueText, x + colWidth - valueWidth - 2, y);
    
    // Reset font for next iteration
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
  });

  currentY += 30; // Move past scores section

  // ============================================
  // STRENGTHS SECTION
  // ============================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Strengths', margin, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);

  if (feedback.strengths && feedback.strengths.length > 0) {
    feedback.strengths.forEach((strength, index) => {
      // Bullet point
      const bulletX = margin + 2;
      const textX = margin + 5;
      
      // Check if we need a new page
      const lineHeight = 7;
      const textLines = doc.splitTextToSize(strength, pageWidth - margin * 2 - 5);
      const linesToAdd = textLines.length;
      
      if (currentY + (linesToAdd * lineHeight) > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        currentY = startY;
      }
      
      // Draw bullet
      doc.circle(bulletX, currentY - 2, 1, 'F');
      
      // Draw text
      doc.text(textLines, textX, currentY);
      currentY += linesToAdd * lineHeight;
    });
  } else {
    doc.text('No specific strengths identified.', margin, currentY);
    currentY += 7;
  }

  currentY += 5;

  // ============================================
  // FOCUS AREA SECTION
  // ============================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Focus Area', margin, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  
  const focusAreaText = `Priority: Improve your ${feedback.focus_area}`;
  const focusLines = doc.splitTextToSize(focusAreaText, pageWidth - margin * 2);
  doc.text(focusLines, margin, currentY);
  currentY += focusLines.length * 7 + 5;

  // ============================================
  // EXAMPLE CORRECTIONS SECTION
  // ============================================
  if (feedback.example_corrections && feedback.example_corrections.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Example Corrections', margin, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    feedback.example_corrections.forEach((correction, correctionIndex) => {
      // Check if we need a new page
      const lineHeight = 6;
      
      if (currentY + 30 > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        currentY = startY;
      }

      // Correction number
      doc.setFont('helvetica', 'bold');
      doc.text(`${correctionIndex + 1}.`, margin, currentY);
      currentY += lineHeight;

      // Original text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const originalLines = doc.splitTextToSize(
        `Original: ${correction.original}`,
        pageWidth - margin * 2
      );
      doc.text(originalLines, margin + 5, currentY);
      currentY += originalLines.length * lineHeight;

      // Corrected text
      doc.setFont('helvetica', 'bold');
      const correctedLines = doc.splitTextToSize(
        `Corrected: ${correction.corrected}`,
        pageWidth - margin * 2
      );
      doc.text(correctedLines, margin + 5, currentY);
      currentY += correctedLines.length * lineHeight;

      // Explanation text
      doc.setFont('helvetica', 'normal');
      const explanationLines = doc.splitTextToSize(
        `Explanation: ${correction.explanation}`,
        pageWidth - margin * 2
      );
      doc.text(explanationLines, margin + 5, currentY);
      currentY += explanationLines.length * lineHeight + 5;

      // Reset font
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
    });
  }

  // Footer with page number
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const pageText = `Page ${i} of ${pageCount}`;
    const pageTextWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - pageTextWidth - margin, doc.internal.pageSize.getHeight() - 10);
    doc.setTextColor(0, 0, 0);
  }

  // Save and trigger download
  doc.save(filename);
}

/**
 * Checks if PDF export is available in the current environment
 * 
 * @returns true if jsPDF is available, false otherwise
 */
export function isPDFExportAvailable(): boolean {
  // In a browser environment, jsPDF should always be available after import
  // This function is useful for feature detection or progressive enhancement
  try {
    // Check if we're in a browser environment
    return typeof window !== 'undefined';
  } catch {
    return false;
  }
}
