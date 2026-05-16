import { useEffect, useCallback, useRef } from 'react'
import type { ConfirmationModalProps } from '../types'

/**
 * ConfirmationModal component displays a confirmation dialog for destructive actions.
 * It includes a message, Cancel button, and Confirm (Delete) button.
 * Supports keyboard navigation (Escape to cancel, Enter to confirm).
 */
export default function ConfirmationModal({
  isOpen,
  onCancel,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isLoading = false,
}: ConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return

      switch (event.key) {
        case 'Escape':
          onCancel()
          break
        case 'Enter':
          if (!isLoading) {
            onConfirm()
          }
          break
        default:
          break
      }
    },
    [isOpen, isLoading, onCancel, onConfirm]
  )

  // Handle clicks outside the modal
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onCancel()
      }
    },
    [onCancel]
  )

  // Add/remove event listener for keyboard
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleKeyDown])

  // Focus the modal when it opens for accessibility
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      data-testid="modal-backdrop"
    >
      <div
        className="modal"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-message"
        data-testid="modal"
      >
        <div className="modal-header">
          <h3 id="modal-title" className="modal-title">
            {title}
          </h3>
        </div>

        <div id="modal-message" className="modal-message">
          {message}
        </div>

        <div className="modal-actions">
          <button
            className="btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="modal-cancel"
          >
            {cancelText}
          </button>
          <button
            className="btn-danger"
            onClick={onConfirm}
            disabled={isLoading}
            data-testid="modal-confirm"
          >
            {isLoading ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
