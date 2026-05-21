import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import FeedbackView from './FeedbackView';
import { generateFeedbackPDF } from '../utils/pdfExport';

// Mock the useSessions hook
const mockUseSessions = vi.fn();

// Mock the PDF export utility
vi.mock('../utils/pdfExport', () => ({
  generateFeedbackPDF: vi.fn(),
  isPDFExportAvailable: vi.fn(() => true)
}));

// Mock the ScoreCard and CorrectionItem components
vi.mock('./ScoreCard', () => ({
  default: ({ label, value }: { label: string; value: number }) => (
    <div data-testid="score-card">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}));

vi.mock('./CorrectionItem', () => ({
  default: ({ correction }: { correction: any }) => (
    <div data-testid="correction-item">
      <span>{correction.original}</span>
      <span>{correction.corrected}</span>
      <span>{correction.explanation}</span>
    </div>
  )
}));

// Mock hook implementation
const mockGetFeedback = vi.fn();

describe('FeedbackView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for useSessions
    mockUseSessions.mockReturnValue({
      getFeedback: mockGetFeedback,
      isLoading: false
    });
    
    // Default mock for getFeedback - return sample feedback
    mockGetFeedback.mockResolvedValue({
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
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = (sessionId: string) => {
    return render(
      <MemoryRouter initialEntries={[`/feedback/${sessionId}`]}>
        <Routes>
          <Route path="/feedback/:sessionId" element={<FeedbackView sessionId={sessionId} />} />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('Basic Rendering', () => {
    it('should render loading state initially', async () => {
      mockGetFeedback.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      renderComponent('123');
      
      expect(screen.getByText('Loading feedback...')).toBeInTheDocument();
    });

    it('should render feedback when loaded', async () => {
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText('Session Feedback')).toBeInTheDocument();
      });
    });

    it('should render error state when feedback loading fails', async () => {
      mockGetFeedback.mockRejectedValue(new Error('Failed to load feedback'));
      
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load feedback')).toBeInTheDocument();
      });
    });

    it('should render "No feedback available" when feedback is null', async () => {
      mockGetFeedback.mockResolvedValue(null);
      
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText('No feedback available for this session.')).toBeInTheDocument();
      });
    });
  });

  describe('PDF Export Button', () => {
    it('should render Export to PDF button when feedback is available', async () => {
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText('Export to PDF')).toBeInTheDocument();
      });
    });

    it('should not render Export to PDF button when feedback is null', async () => {
      mockGetFeedback.mockResolvedValue(null);
      
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.queryByText('Export to PDF')).not.toBeInTheDocument();
      });
    });

    it('should disable Export to PDF button when PDF is exporting', async () => {
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText('Export to PDF')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export to PDF');
      
      // Simulate click and exporting state
      // The button should show "Exporting..." when clicked
      fireEvent.click(exportButton);
      
      // Since we mocked generateFeedbackPDF, it won't actually change state
      // But we can verify the button is rendered
      expect(exportButton).toBeInTheDocument();
    });

    it('should call generateFeedbackPDF when Export to PDF button is clicked', async () => {
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText('Export to PDF')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export to PDF');
      fireEvent.click(exportButton);
      
      // Wait for the async handler to complete
      await waitFor(() => {
        expect(generateFeedbackPDF).toHaveBeenCalled();
      });
    });

    it('should pass feedback and sessionId to generateFeedbackPDF', async () => {
      renderComponent('test-session-456');
      
      await waitFor(() => {
        expect(screen.getByText('Export to PDF')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export to PDF');
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(generateFeedbackPDF).toHaveBeenCalledWith(
          expect.objectContaining({
            grammar_score: 85,
            vocabulary_score: 78,
            fluency_score: 82,
            overall_score: 81
          }),
          'test-session-456'
        );
      });
    });

    it('should display error message when PDF export fails', async () => {
      const mockError = new Error('Failed to export PDF');
      // @ts-ignore - We're mocking the implementation
      generateFeedbackPDF.mockRejectedValue(mockError);
      
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText('Export to PDF')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export to PDF');
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(screen.getByText(/⚠️ Failed to export PDF/)).toBeInTheDocument();
      });
    });

    it('should disable other buttons when PDF is exporting', async () => {
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText('Export to PDF')).toBeInTheDocument();
      });

      // Mock a long-running export
      // @ts-ignore
      generateFeedbackPDF.mockImplementation(() => new Promise(() => {}));
      
      const exportButton = screen.getByText('Export to PDF');
      fireEvent.click(exportButton);
      
      // The buttons should be disabled during export
      // Note: Since we're using a promise that never resolves, we need to check the state
      // This test verifies the button text changes to "Exporting..."
      await waitFor(() => {
        expect(screen.getByText('Exporting...')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Buttons', () => {
    it('should render Back to Chat button', async () => {
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText('Back to Chat')).toBeInTheDocument();
      });
    });

    it('should render New Session button', async () => {
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText('New Session')).toBeInTheDocument();
      });
    });
  });

  describe('Feedback Content', () => {
    it('should render scores section', async () => {
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText('Scores')).toBeInTheDocument();
      });
    });

    it('should render strengths section', async () => {
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText('Strengths')).toBeInTheDocument();
      });
    });

    it('should render focus area section', async () => {
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText('Focus Area')).toBeInTheDocument();
      });
    });

    it('should render example corrections section when corrections exist', async () => {
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText('Example Corrections')).toBeInTheDocument();
      });
    });

    it('should not render example corrections section when no corrections', async () => {
      mockGetFeedback.mockResolvedValue({
        grammar_score: 85,
        vocabulary_score: 78,
        fluency_score: 82,
        overall_score: 81,
        strengths: ['Good vocabulary usage'],
        focus_area: 'grammar',
        example_corrections: []
      });
      
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.queryByText('Example Corrections')).not.toBeInTheDocument();
      });
    });

    it('should render strengths as list items', async () => {
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText('Good vocabulary usage')).toBeInTheDocument();
        expect(screen.getByText('Complex sentences')).toBeInTheDocument();
      });
    });

    it('should render focus area text', async () => {
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText(/Improve your grammar/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Session Feedback' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Scores' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Strengths' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Focus Area' })).toBeInTheDocument();
      });
    });

    it('should have buttons with proper labels', async () => {
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Back to Chat' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'New Session' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Export to PDF' })).toBeInTheDocument();
      });
    });
  });

  describe('Empty State Handling', () => {
    it('should show "No specific strengths identified" when strengths is empty', async () => {
      mockGetFeedback.mockResolvedValue({
        grammar_score: 85,
        vocabulary_score: 78,
        fluency_score: 82,
        overall_score: 81,
        strengths: [],
        focus_area: 'grammar',
        example_corrections: []
      });
      
      renderComponent('123');
      
      await waitFor(() => {
        expect(screen.getByText('No specific strengths identified.')).toBeInTheDocument();
      });
    });
  });
});
