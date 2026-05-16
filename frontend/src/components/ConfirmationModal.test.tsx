import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmationModal from './ConfirmationModal'

// Mock props
const mockOnCancel = vi.fn()
const mockOnConfirm = vi.fn()

const defaultProps = {
  isOpen: true,
  onCancel: mockOnCancel,
  onConfirm: mockOnConfirm,
  title: 'Delete Session',
  message: 'Are you sure you want to delete this session?',
  confirmText: 'Delete',
  cancelText: 'Cancel',
  isLoading: false,
}

describe('ConfirmationModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnCancel.mockClear()
    mockOnConfirm.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      expect(screen.getByTestId('modal')).toBeInTheDocument()
      expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument()
    })

    it('does not render when isOpen is false', () => {
      render(<ConfirmationModal {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    })

    it('renders the title correctly', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      expect(screen.getByText('Delete Session')).toBeInTheDocument()
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Delete Session')
    })

    it('renders the message correctly', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      expect(screen.getByText('Are you sure you want to delete this session?')).toBeInTheDocument()
    })

    it('renders custom confirm text', () => {
      render(<ConfirmationModal {...defaultProps} confirmText="Remove" />)
      
      expect(screen.getByText('Remove')).toBeInTheDocument()
    })

    it('renders custom cancel text', () => {
      render(<ConfirmationModal {...defaultProps} cancelText="Go Back" />)
      
      expect(screen.getByText('Go Back')).toBeInTheDocument()
    })

    it('renders Cancel button with btn-secondary class', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      const cancelButton = screen.getByTestId('modal-cancel')
      expect(cancelButton).toBeInTheDocument()
      expect(cancelButton).toHaveClass('btn-secondary')
    })

    it('renders Confirm/Delete button with btn-danger class', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      const confirmButton = screen.getByTestId('modal-confirm')
      expect(confirmButton).toBeInTheDocument()
      expect(confirmButton).toHaveClass('btn-danger')
    })
  })

  describe('Interactions', () => {
    it('calls onCancel when Cancel button is clicked', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      const cancelButton = screen.getByTestId('modal-cancel')
      fireEvent.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('calls onConfirm when Delete/Confirm button is clicked', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      const confirmButton = screen.getByTestId('modal-confirm')
      fireEvent.click(confirmButton)
      
      expect(mockOnConfirm).toHaveBeenCalledTimes(1)
      expect(mockOnCancel).not.toHaveBeenCalled()
    })

    it('calls onCancel when backdrop is clicked', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      const backdrop = screen.getByTestId('modal-backdrop')
      fireEvent.click(backdrop)
      
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it('does not call onCancel when modal content is clicked', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      const modal = screen.getByTestId('modal')
      fireEvent.click(modal)
      
      expect(mockOnCancel).not.toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('disables Cancel button when isLoading is true', () => {
      render(<ConfirmationModal {...defaultProps} isLoading={true} />)
      
      const cancelButton = screen.getByTestId('modal-cancel')
      expect(cancelButton).toBeDisabled()
    })

    it('disables Confirm button when isLoading is true', () => {
      render(<ConfirmationModal {...defaultProps} isLoading={true} />)
      
      const confirmButton = screen.getByTestId('modal-confirm')
      expect(confirmButton).toBeDisabled()
    })

    it('shows loading text on Confirm button when isLoading is true', () => {
      render(<ConfirmationModal {...defaultProps} isLoading={true} />)
      
      const confirmButton = screen.getByTestId('modal-confirm')
      expect(confirmButton).toHaveTextContent('Deleting...')
    })

    it('does not disable buttons when isLoading is false', () => {
      render(<ConfirmationModal {...defaultProps} isLoading={false} />)
      
      const cancelButton = screen.getByTestId('modal-cancel')
      const confirmButton = screen.getByTestId('modal-confirm')
      
      expect(cancelButton).not.toBeDisabled()
      expect(confirmButton).not.toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      const modal = screen.getByTestId('modal')
      expect(modal).toHaveAttribute('role', 'dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title')
      expect(modal).toHaveAttribute('aria-describedby', 'modal-message')
    })

    it('has proper tabIndex for keyboard navigation', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      const modal = screen.getByTestId('modal')
      expect(modal).toHaveAttribute('tabindex', '-1')
    })
  })

  describe('Keyboard Navigation', () => {
    it('calls onCancel when Escape key is pressed', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it('calls onConfirm when Enter key is pressed', () => {
      render(<ConfirmationModal {...defaultProps} />)
      
      fireEvent.keyDown(document, { key: 'Enter' })
      
      expect(mockOnConfirm).toHaveBeenCalledTimes(1)
    })

    it('does not call onConfirm when Enter is pressed and isLoading is true', () => {
      render(<ConfirmationModal {...defaultProps} isLoading={true} />)
      
      fireEvent.keyDown(document, { key: 'Enter' })
      
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('does not trigger keyboard events when modal is closed', () => {
      render(<ConfirmationModal {...defaultProps} isOpen={false} />)
      
      fireEvent.keyDown(document, { key: 'Escape' })
      fireEvent.keyDown(document, { key: 'Enter' })
      
      expect(mockOnCancel).not.toHaveBeenCalled()
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })
  })

  describe('Default Props', () => {
    it('uses default confirmText when not provided', () => {
      const props = { ...defaultProps, confirmText: undefined }
      render(<ConfirmationModal {...props} />)
      
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('uses default cancelText when not provided', () => {
      const props = { ...defaultProps, cancelText: undefined }
      render(<ConfirmationModal {...props} />)
      
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('uses default isLoading as false when not provided', () => {
      const props = { ...defaultProps, isLoading: undefined }
      render(<ConfirmationModal {...props} />)
      
      const confirmButton = screen.getByTestId('modal-confirm')
      expect(confirmButton).not.toBeDisabled()
    })
  })
})
