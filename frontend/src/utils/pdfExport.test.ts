import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateFeedbackPDF, isPDFExportAvailable } from './pdfExport';
import type { Feedback } from '../types';

// Mock jsPDF
const mockJsPDF = vi.fn().mockImplementation(() => ({
  internal: {
    pageSize: {
      getWidth: () => 210, // A4 width in mm
      getHeight: () => 297 // A4 height in mm
    },
    getNumberOfPages: () => 1
  },
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setDrawColor: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  getTextWidth: vi.fn((text: string) => text.length * 0.5), // Approximate width
  splitTextToSize: vi.fn((text: string, maxWidth: number) => [text]),
  line: vi.fn(),
  circle: vi.fn(),
  addPage: vi.fn(),
  save: vi.fn(),
  setPage: vi.fn()
}));

// Mock the dynamic import of jsPDF
vi.mock('jspdf', () => ({
  default: mockJsPDF
}));

// Helper to get the mock instance
const getMockDoc = () => mockJsPDF.mock.results[0].value;

describe('pdfExport utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateFeedbackPDF', () => {
    const mockFeedback: Feedback = {
      grammar_score: 85,
      vocabulary_score: 78,
      fluency_score: 82,
      overall_score: 81,
      strengths: ['Good vocabulary usage', 'Complex sentences'],
      focus_area: 'grammar',
      example_corrections: [
        {
          original: 'je vais au magasin',
          corrected: 'je vais au magasin',
          explanation: 'Correct!'
        }
      ]
    };

    it('should create a PDF document with all required sections', async () => {
      await generateFeedbackPDF(mockFeedback, '123');

      const mockDoc = getMockDoc();

      // Verify title was added
      expect(mockDoc.text).toHaveBeenCalledWith(
        'French Language Coach - Session Feedback',
        expect.any(Number),
        expect.any(Number)
      );

      // Verify session ID and date in subtitle
      expect(mockDoc.text).toHaveBeenCalledWith(
        expect.stringContaining('Session ID: 123'),
        expect.any(Number),
        expect.any(Number)
      );

      // Verify scores section
      expect(mockDoc.text).toHaveBeenCalledWith('Scores', expect.any(Number), expect.any(Number));
      expect(mockDoc.text).toHaveBeenCalledWith('Grammar', expect.any(Number), expect.any(Number));
      expect(mockDoc.text).toHaveBeenCalledWith('Vocabulary', expect.any(Number), expect.any(Number));
      expect(mockDoc.text).toHaveBeenCalledWith('Fluency', expect.any(Number), expect.any(Number));
      expect(mockDoc.text).toHaveBeenCalledWith('Overall', expect.any(Number), expect.any(Number));

      // Verify strengths section
      expect(mockDoc.text).toHaveBeenCalledWith('Strengths', expect.any(Number), expect.any(Number));

      // Verify focus area section
      expect(mockDoc.text).toHaveBeenCalledWith('Focus Area', expect.any(Number), expect.any(Number));

      // Verify corrections section
      expect(mockDoc.text).toHaveBeenCalledWith('Example Corrections', expect.any(Number), expect.any(Number));
    });

    it('should include all score values in the PDF', async () => {
      await generateFeedbackPDF(mockFeedback, '123');

      const mockDoc = getMockDoc();

      // Check that all score values are included
      expect(mockDoc.text).toHaveBeenCalledWith('85', expect.any(Number), expect.any(Number));
      expect(mockDoc.text).toHaveBeenCalledWith('78', expect.any(Number), expect.any(Number));
      expect(mockDoc.text).toHaveBeenCalledWith('82', expect.any(Number), expect.any(Number));
      expect(mockDoc.text).toHaveBeenCalledWith('81', expect.any(Number), expect.any(Number));
    });

    it('should handle empty strengths array', async () => {
      const feedbackWithEmptyStrengths: Feedback = {
        ...mockFeedback,
        strengths: []
      };

      await generateFeedbackPDF(feedbackWithEmptyStrengths, '124');

      const mockDoc = getMockDoc();

      // Should still have strengths section but with no specific message
      expect(mockDoc.text).toHaveBeenCalledWith('No specific strengths identified.', expect.any(Number), expect.any(Number));
    });

    it('should handle empty example corrections array', async () => {
      const feedbackWithEmptyCorrections: Feedback = {
        ...mockFeedback,
        example_corrections: []
      };

      await generateFeedbackPDF(feedbackWithEmptyCorrections, '125');

      const mockDoc = getMockDoc();

      // Should still create PDF without corrections section
      expect(mockDoc.text).not.toHaveBeenCalledWith('Example Corrections', expect.any(Number), expect.any(Number));
    });

    it('should handle French characters in feedback text', async () => {
      const feedbackWithFrench: Feedback = {
        grammar_score: 90,
        vocabulary_score: 85,
        fluency_score: 88,
        overall_score: 87,
        strengths: ['Bonne utilisation des accents é, è, ê, à, ç'],
        focus_area: 'grammaire et vocabulaire',
        example_corrections: [
          {
            original: 'j’ai un problème',
            corrected: 'j’ai un problème',
            explanation: 'Correct usage of apostrophe'
          }
        ]
      };

      await generateFeedbackPDF(feedbackWithFrench, '126');

      const mockDoc = getMockDoc();

      // Should be able to handle French characters
      expect(mockDoc.text).toHaveBeenCalledWith(
        expect.stringContaining('é, è, ê, à, ç'),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockDoc.text).toHaveBeenCalledWith(
        expect.stringContaining('grammaire et vocabulaire'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should call save with correct filename', async () => {
      const now = new Date('2024-01-15T14:30:45');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      await generateFeedbackPDF(mockFeedback, 'test-session-123');

      const mockDoc = getMockDoc();

      // Verify save was called with filename containing session ID
      expect(mockDoc.save).toHaveBeenCalledWith(
        expect.stringContaining('french-coach-feedback-test-session-123')
      );

      vi.useRealTimers();
    });

    it('should add page numbers to multi-page PDFs', async () => {
      // Mock a scenario where multiple pages are added
      const mockMultiPageDoc = {
        ...getMockDoc(),
        internal: {
          ...getMockDoc().internal,
          getNumberOfPages: () => 2
        },
        setPage: vi.fn()
      };

      mockJsPDF.mockImplementationOnce(() => mockMultiPageDoc);

      // Create feedback with lots of content to trigger multiple pages
      const feedbackWithMuchContent: Feedback = {
        grammar_score: 85,
        vocabulary_score: 78,
        fluency_score: 82,
        overall_score: 81,
        strengths: Array(50).fill('A very long strength that would cause text wrapping and potentially multiple pages'),
        focus_area: 'grammar',
        example_corrections: Array(20).fill({
          original: 'Very long original text that would wrap to multiple lines',
          corrected: 'Very long corrected text that would wrap to multiple lines',
          explanation: 'Very long explanation text that would wrap to multiple lines'
        })
      };

      await generateFeedbackPDF(feedbackWithMuchContent, '127');

      // Verify page numbers were added
      expect(mockMultiPageDoc.setPage).toHaveBeenCalled();
    });

    it('should include correction details (original, corrected, explanation)', async () => {
      await generateFeedbackPDF(mockFeedback, '128');

      const mockDoc = getMockDoc();

      // Verify correction details are included
      expect(mockDoc.text).toHaveBeenCalledWith(
        expect.stringContaining('Original:'),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockDoc.text).toHaveBeenCalledWith(
        expect.stringContaining('Corrected:'),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockDoc.text).toHaveBeenCalledWith(
        expect.stringContaining('Explanation:'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should use A4 portrait format', async () => {
      await generateFeedbackPDF(mockFeedback, '129');

      expect(mockJsPDF).toHaveBeenCalledWith({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
    });

    it('should handle very high scores', async () => {
      const feedbackWithHighScores: Feedback = {
        grammar_score: 150,
        vocabulary_score: 200,
        fluency_score: 175,
        overall_score: 180,
        strengths: ['Perfect scores'],
        focus_area: 'maintenance',
        example_corrections: []
      };

      await generateFeedbackPDF(feedbackWithHighScores, '130');

      const mockDoc = getMockDoc();

      // Should handle high scores as strings
      expect(mockDoc.text).toHaveBeenCalledWith('150', expect.any(Number), expect.any(Number));
      expect(mockDoc.text).toHaveBeenCalledWith('200', expect.any(Number), expect.any(Number));
    });
  });

  describe('isPDFExportAvailable', () => {
    it('should return true in browser environment', () => {
      // Simulate browser environment
      global.window = {} as any;
      
      expect(isPDFExportAvailable()).toBe(true);
      
      delete global.window;
    });

    it('should return false in non-browser environment', () => {
      // Ensure window is not defined
      const originalWindow = global.window;
      delete global.window;
      
      expect(isPDFExportAvailable()).toBe(false);
      
      global.window = originalWindow;
    });
  });
});
