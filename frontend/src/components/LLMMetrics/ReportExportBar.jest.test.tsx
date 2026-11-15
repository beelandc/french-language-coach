/**
 * Tests for ReportExportBar (Issue #238).
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ReportExportBar from './ReportExportBar'

describe('ReportExportBar', () => {
  it('offers Markdown, CSV and PDF and runs the chosen export', async () => {
    const onExport = jest.fn().mockResolvedValue(undefined)
    render(<ReportExportBar onExport={onExport} />)

    for (const format of ['markdown', 'csv', 'pdf'] as const) {
      fireEvent.click(screen.getByTestId(`report-export-${format}`))
      await waitFor(() => expect(onExport).toHaveBeenLastCalledWith(format))
      await waitFor(() => expect(screen.getByTestId(`report-export-${format}`)).toBeEnabled())
    }
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('disables every button while an export runs', async () => {
    let finish: () => void = () => {}
    const onExport = jest.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    render(<ReportExportBar onExport={onExport} />)

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }))

    expect(screen.getByTestId('report-export-pdf')).toHaveTextContent('Exporting…')
    expect(screen.getByRole('button', { name: 'CSV' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Markdown' })).toBeDisabled()

    await act(async () => finish())
    expect(screen.getByRole('button', { name: 'PDF' })).toBeEnabled()
  })

  it('shows an error and clears it on the next success', async () => {
    const onExport = jest.fn().mockRejectedValueOnce(new Error('HTTP error! status: 500')).mockResolvedValue(undefined)
    render(<ReportExportBar onExport={onExport} />)

    fireEvent.click(screen.getByRole('button', { name: 'CSV' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Export failed: HTTP error! status: 500')
    expect(screen.getByRole('button', { name: 'CSV' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'CSV' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('falls back to a generic message for non-Error failures', async () => {
    render(<ReportExportBar onExport={jest.fn().mockRejectedValue('nope')} />)
    fireEvent.click(screen.getByRole('button', { name: 'Markdown' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
  })

  it('can be disabled', () => {
    render(<ReportExportBar onExport={jest.fn()} disabled />)
    for (const name of ['Markdown', 'CSV', 'PDF']) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }
  })
})
