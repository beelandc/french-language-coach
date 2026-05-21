# SPDD Analysis: PDF Export with jsPDF

**GitHub Issue**: #23
**Issue Title**: 1.5.9: Implement PDF export with jsPDF
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/23
**Artifact ID**: FLC-015-202605211800
**Created**: 2026-05-21 18:00
**Author**: Mistral Vibe

---

## Original Business Requirement

Implement client-side PDF generation of feedback report using jsPDF.

---

## Background

The French Language Coach application provides AI-generated feedback on user conversation sessions, including scores for grammar, vocabulary, fluency, and overall performance. Currently, users can view feedback on the FeedbackPage, but there is no way to export this feedback for offline review or record-keeping. 

PDF export functionality will allow users to:
- Download their feedback reports for offline study
- Share feedback with tutors or language partners
- Maintain a personal archive of their progress
- Print feedback for physical reference

This feature enhances the value of the feedback system by making it portable and persistent.

---

## Business Value

- **User Retention**: Users can track their progress over time by saving PDFs
- **Shareability**: Users can share feedback with tutors, teachers, or study partners
- **Offline Access**: Feedback can be reviewed without internet connection
- **Professional Use**: Useful for language learners who need to document their progress for academic or professional purposes
- **Enhanced Learning Experience**: Physical or digital copies support different learning styles

---

## Scope In

- [ ] Client-side PDF generation using jsPDF library
- [ ] PDF export button in FeedbackView component
- [ ] PDF includes all feedback data: scores, strengths, focus area, example corrections
- [ ] Automatic download functionality
- [ ] Cross-browser compatibility for modern browsers
- [ ] Proper TypeScript typing for the PDF export functionality
- [ ] Unit tests for PDF generation logic

## Scope Out

- [ ] Server-side PDF generation (will be client-side only)
- [ ] Custom PDF templates or themes
- [ ] Batch export of multiple sessions
- [ ] Email export functionality
- [ ] PDF password protection
- [ ] PDF watermarking or branding beyond basic styling
- [ ] PDF text customization by user

---

## Acceptance Criteria (ACs)

1. **AC1: PDF includes scores**
   **Given** A feedback report with scores
   **When** User clicks export PDF button
   **Then** PDF contains grammar_score, vocabulary_score, fluency_score, and overall_score

2. **AC2: PDF includes strengths list**
   **Given** A feedback report with strengths array
   **When** User clicks export PDF button
   **Then** PDF contains a list of all strengths

3. **AC3: PDF includes focus area**
   **Given** A feedback report with focus_area
   **When** User clicks export PDF button
   **Then** PDF contains the focus_area text

4. **AC4: PDF includes example corrections**
   **Given** A feedback report with example_corrections array
   **When** User clicks export PDF button
   **Then** PDF contains all example corrections with original, corrected, and explanation

5. **AC5: PDF downloads automatically**
   **Given** User clicks export PDF button
   **When** PDF generation completes
   **Then** PDF file downloads automatically without requiring additional user action

6. **AC6: Works in all modern browsers**
   **Given** User is using Chrome, Firefox, Safari, or Edge (latest 2 versions)
   **When** User clicks export PDF button
   **Then** PDF generates and downloads successfully

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Feedback Interface** (`frontend/src/types/index.ts:54-61`): TypeScript interface defining feedback structure with grammar_score, vocabulary_score, fluency_score, overall_score, strengths, focus_area, and example_corrections
- **FeedbackView Component** (`frontend/src/components/FeedbackView.tsx`): React component that displays feedback data to users
- **FeedbackPage** (`frontend/src/pages/FeedbackPage.tsx`): Page container for FeedbackView
- **useSessions Hook** (`frontend/src/hooks/useSessions.tsx`): Custom hook providing getFeedback function to retrieve feedback data
- **Feedback API Endpoint** (`routers/feedback.py`): Backend endpoint for generating feedback
- **FeedbackResponse Schema** (`schemas/session.py:70-77`): Pydantic model defining feedback response structure

### New Concepts Required

- **PDF Export Service/Utility**: Client-side utility for generating PDFs from feedback data using jsPDF
- **Export Button Component**: UI button component to trigger PDF export
- **PDF Styling**: CSS/styling rules for consistent PDF appearance

### Key Business Rules

- **Rule 1**: PDF generation must be client-side only (no server involvement)
- **Rule 2**: PDF must contain all feedback data from the Feedback interface
- **Rule 3**: PDF filename should be descriptive (e.g., `french-coach-feedback-{sessionId}-{date}.pdf`)
- **Rule 4**: PDF must be generated asynchronously to avoid blocking the UI
- **Rule 5**: Error handling must be gracefully displayed to users if PDF generation fails

---

## Strategic Approach

### Solution Direction

1. **Add jsPDF dependency**: Install `jspdf` and potentially `jspdf-autotable` for better table formatting
2. **Create PDF export utility**: New utility function in `frontend/src/utils/pdfExport.ts` that takes Feedback object and returns a jsPDF document
3. **Add export button**: Add "Export to PDF" button to FeedbackView component
4. **Implement download logic**: Use jsPDF's save() method for automatic download
5. **Add error handling**: Display user-friendly errors if PDF generation fails
6. **Create tests**: Unit tests for PDF generation utility

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **Client-side vs Server-side PDF generation** | Client-side: No server load, works offline, faster response. Server-side: More consistent rendering, supports older browsers. | **Client-side with jsPDF** - Better user experience, no server dependency |
| **PDF library choice** | jsPDF: Lightweight, popular, good browser support. PDFKit: More features but server-side only. react-pdf: Better React integration but larger bundle. | **jsPDF** - Client-side, lightweight, well-documented |
| **PDF styling approach** | Inline styling in code vs CSS-based styling vs template-based | **Inline styling in code** - Most reliable for jsPDF, consistent across browsers |
| **Button placement** | In FeedbackView header vs FeedbackView footer vs separate ExportPage | **In FeedbackView header** - Most discoverable, logical placement |

### Alternatives Considered

- **Alternative 1**: Use html2canvas + jsPDF for HTML-to-PDF conversion - Rejected because: Adds complexity, may have rendering inconsistencies, larger bundle size
- **Alternative 2**: Use @react-pdf/renderer - Rejected because: Primarily server-side, React-specific, heavier dependency
- **Alternative 3**: Use browser print functionality - Rejected because: Less control over output, user experience varies, requires user interaction
- **Alternative 4**: Use a PDF generation API service - Rejected because: Requires server-side integration, privacy concerns, external dependency

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| **PDF design/layout** | No specific design requirements provided | Use clean, readable layout similar to FeedbackView component with scores in grid, sections for each feedback category |
| **Filename format** | No specific filename pattern provided | Use `french-coach-feedback-{sessionId}-{timestamp}.pdf` format |
| **PDF page size/orientation** | Not specified | Use A4 portrait as default, auto-adjust for content |
| **Multi-language support** | Feedback could contain French text | jsPDF supports UTF-8, should handle French characters properly |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| **Empty strengths array** | User has no identified strengths | Display "No specific strengths identified" or similar message |
| **Empty example corrections array** | User has no example corrections | Omit corrections section or display "No corrections available" |
| **Long feedback text** | Focus area or strengths might be long | Implement text wrapping and multi-line support in PDF |
| **Invalid session ID** | User tries to export non-existent feedback | Display error message, button disabled if no feedback available |
| **Mobile browser** | Different browser capabilities on mobile | Test on mobile browsers, ensure touch-friendly |
| **Special characters in feedback** | French text with accents, special symbols | jsPDF should handle UTF-8 encoding properly |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| **jsPDF bundle size** | Could increase frontend bundle size significantly | Use dynamic import for jsPDF to load only when needed |
| **Browser compatibility** | Some browsers might not support jsPDF features | Test on latest Chrome, Firefox, Safari, Edge; use polyfills if needed |
| **Memory usage** | Large feedback with many corrections could use excessive memory | Implement chunking or streaming for large PDFs |
| **CORS issues** | Loading jsPDF from CDN might have CORS problems | Install via npm and bundle with Vite |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | PDF includes scores | Yes | Need to ensure all 4 score types are included |
| AC2 | PDF includes strengths list | Yes | Need to handle empty arrays gracefully |
| AC3 | PDF includes focus area | Yes | Simple text inclusion |
| AC4 | PDF includes example corrections | Yes | Need to format correction objects properly |
| AC5 | PDF downloads automatically | Yes | jsPDF.save() handles this |
| AC6 | Works in all modern browsers | Yes | jsPDF supports all modern browsers |

**AC Coverage Summary**: 6 of 6 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- PDF should have a header/title
- PDF should be properly formatted and readable
- PDF should include session information (date, session ID)
- PDF generation should not block the UI
- Error handling should be user-friendly

---

## REASONS Canvas

### Requirements
From GitHub issue #23:
- PDF includes scores (grammar, vocabulary, fluency, overall)
- PDF includes strengths list
- PDF includes focus area
- PDF includes example corrections
- PDF downloads automatically
- Works in all modern browsers

### Examples
1. User completes a session, receives feedback with scores: grammar=85, vocabulary=78, fluency=82, overall=81, strengths=["Good vocabulary usage", "Complex sentences"], focus_area="grammar", example_corrections=[{original: "je vais au magasin", corrected: "je vais au magasin", explanation: "Correct!"}]
2. Expected: PDF file named something like `french-coach-feedback-123-20260521.pdf` downloads automatically containing all the feedback data in a well-formatted document

### Architecture
**Frontend Structure:**
- React components in `frontend/src/components/`
- TypeScript types in `frontend/src/types/index.ts`
- Hooks in `frontend/src/hooks/`
- Utilities in `frontend/src/utils/`
- Styles in `frontend/src/styles/`
- Vite as build tool, ESM modules

**Current Feedback Flow:**
1. User completes session → ChatInterface calls getFeedback()
2. getFeedback() calls API endpoint `/sessions/{sessionId}/feedback/`
3. Backend generates feedback using Mistral API
4. Feedback stored in session.feedback_dict
5. Feedback displayed in FeedbackView component

**New PDF Flow:**
1. User views feedback in FeedbackView
2. User clicks "Export to PDF" button
3. PDF export utility creates jsPDF document from feedback data
4. jsPDF.save() triggers automatic download

### Standards
- **Coding**: TypeScript, React, follow existing patterns in codebase
- **Testing**: vitest for frontend tests, 80% coverage minimum
- **Code Style**: Consistent with existing frontend code (2-space indent, semicolons, etc.)
- **Documentation**: JSDoc comments for utility functions, update README.md
- **Dependencies**: Use npm packages, install via package.json

### Omissions
Explicitly out of scope:
- Server-side PDF generation
- Custom PDF templates or themes
- Batch export functionality
- Email export
- PDF password protection
- User customization of PDF content

### Notes
Implementation hints:
- See `frontend/src/components/FeedbackView.tsx` for feedback data structure and display patterns
- See `frontend/src/types/index.ts` for Feedback interface definition
- jsPDF documentation: https://parall.ax/products/jspdf
- Consider using dynamic import for jsPDF to reduce bundle size: `import('jspdf').then(({ jsPDF }) => {...})`
- Use session ID and timestamp in filename for uniqueness
- Add loading state during PDF generation
- Handle errors gracefully with user feedback

### Solutions
Reference implementations to mimic:
- **API utility pattern**: See `frontend/src/utils/api.ts` for API call patterns
- **Component pattern**: See `frontend/src/components/FeedbackView.tsx` for component structure
- **Hook usage**: See `frontend/src/hooks/useSessions.tsx` for data fetching patterns
- **Type definitions**: See `frontend/src/types/index.ts` for TypeScript patterns

Similar code in codebase:
- `frontend/src/components/ScoreCard.tsx` - Displays individual scores, can reference for score display in PDF
- `frontend/src/components/CorrectionItem.tsx` - Displays corrections, can reference for correction formatting in PDF
