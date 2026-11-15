/**
 * Tests for ModelComparisonReport (Issue #238): loading the report for the
 * date range/feature filters and baseline, empty and error states, and exports
 * that reuse the on-screen request's parameters.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ModelComparisonReport from './ModelComparisonReport'
import * as apiModule from '../../utils/api'
import * as pdfModule from './reportPdf'
import * as utilsModule from './reportUtils'
import { emptyReport, sampleReport, singleModelReport } from './fixtures'
import type { LLMMetricsFilters } from '../../types/index'

jest.mock('../../utils/api', () => ({
  metricsApi: {
    getReport: jest.fn(),
    downloadReport: jest.fn(),
  },
}))
jest.mock('./reportPdf', () => ({ generateReportPDF: jest.fn() }))
jest.mock('./reportUtils', () => ({
  ...jest.requireActual('./reportUtils'),
  saveBlob: jest.fn(),
}))

const { metricsApi } = apiModule as unknown as {
  metricsApi: { getReport: jest.Mock; downloadReport: jest.Mock }
}
const generateReportPDF = pdfModule.generateReportPDF as jest.Mock
const saveBlob = utilsModule.saveBlob as jest.Mock

const BASELINE = 'mistral:mistral-large-latest'

function renderReport(filters: LLMMetricsFilters = { range: 'all' }, baseline = BASELINE) {
  const onBaselineChange = jest.fn()
  const utils = render(
    <ModelComparisonReport filters={filters} baseline={baseline} onBaselineChange={onBaselineChange} />
  )
  return { ...utils, onBaselineChange }
}

describe('ModelComparisonReport', () => {
  beforeEach(() => {
    metricsApi.getReport.mockResolvedValue(sampleReport)
  })

  it('loads the report and shows caveats and every feature (AC1, AC4)', async () => {
    renderReport()
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    expect(screen.getByRole('button', { name: 'CSV' })).toBeDisabled()

    expect(await screen.findByTestId('report-feature-chat')).toBeInTheDocument()
    expect(screen.getByTestId('report-feature-feedback')).toBeInTheDocument()
    expect(screen.getByTestId('report-caveats')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CSV' })).toBeEnabled()
    expect(metricsApi.getReport).toHaveBeenCalledWith({}, BASELINE)
    expect(screen.queryByTestId('report-ignored-filters')).not.toBeInTheDocument()
  })

  it('sends only date range and feature filters, and notes the ignored ones', async () => {
    renderReport({ range: 'custom', dateFrom: '2026-11-01', dateTo: '2026-11-14', feature: 'chat', provider: 'anthropic', status: 'error' })
    await screen.findByTestId('report-feature-chat')
    expect(metricsApi.getReport).toHaveBeenCalledWith(
      { date_from: '2026-11-01', date_to: '2026-11-14', feature: 'chat' },
      BASELINE
    )
    expect(screen.getByTestId('report-ignored-filters')).toHaveTextContent('date range and feature filters only')
  })

  it('offers every model as a baseline and reports a change (AC2)', async () => {
    const { onBaselineChange } = renderReport()
    await screen.findByTestId('report-feature-chat')
    const select = screen.getByLabelText('Baseline model') as HTMLSelectElement
    expect([...select.options].map((o) => o.value)).toEqual([
      'anthropic:claude-haiku-5-5',
      'anthropic:claude-sonnet-5-5',
      'mistral:mistral-large-latest',
    ])
    fireEvent.change(select, { target: { value: 'anthropic:claude-haiku-5-5' } })
    expect(onBaselineChange).toHaveBeenCalledWith('anthropic:claude-haiku-5-5')
  })

  it('refetches when the baseline changes', async () => {
    const { rerender } = renderReport()
    await screen.findByTestId('report-feature-chat')
    rerender(
      <ModelComparisonReport filters={{ range: 'all' }} baseline="anthropic:claude-haiku-5-5" onBaselineChange={jest.fn()} />
    )
    await waitFor(() => expect(metricsApi.getReport).toHaveBeenLastCalledWith({}, 'anthropic:claude-haiku-5-5'))
  })

  it('downloads Markdown and CSV with the on-screen parameters (AC5)', async () => {
    const blob = new Blob(['x'])
    metricsApi.downloadReport.mockResolvedValue({ blob, filename: 'llm-model-report-20261114-1808.csv' })
    renderReport({ range: '7d', feature: 'feedback' })
    await screen.findByTestId('report-feature-chat')
    const [screenParams] = metricsApi.getReport.mock.calls[0]
    expect(screenParams.date_from).toMatch(/Z$/)

    fireEvent.click(screen.getByRole('button', { name: 'CSV' }))
    await waitFor(() => expect(saveBlob).toHaveBeenCalledWith(blob, 'llm-model-report-20261114-1808.csv'))
    // Identical params object (same resolved date_from), and the report's baseline
    expect(metricsApi.downloadReport).toHaveBeenCalledWith(screenParams, BASELINE, 'csv')

    fireEvent.click(screen.getByRole('button', { name: 'Markdown' }))
    await waitFor(() => expect(metricsApi.downloadReport).toHaveBeenLastCalledWith(screenParams, BASELINE, 'markdown'))
  })

  it('builds the PDF from the on-screen report (AC5)', async () => {
    generateReportPDF.mockResolvedValue(undefined)
    renderReport()
    await screen.findByTestId('report-feature-chat')
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }))
    await waitFor(() => expect(generateReportPDF).toHaveBeenCalledWith(sampleReport, utilsModule.NO_REPORT_DATA_MESSAGE))
    expect(metricsApi.downloadReport).not.toHaveBeenCalled()
  })

  it('shows export failures', async () => {
    metricsApi.downloadReport.mockRejectedValue(new Error('HTTP error! status: 500'))
    renderReport()
    await screen.findByTestId('report-feature-chat')
    fireEvent.click(screen.getByRole('button', { name: 'CSV' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP error! status: 500')
  })

  it('shows the per-feature empty state with a single model (AC6)', async () => {
    metricsApi.getReport.mockResolvedValue(singleModelReport)
    renderReport()
    expect(await screen.findByTestId('report-feature-empty-chat')).toHaveTextContent('CHAT_PROVIDER')
  })

  it('shows the report-wide empty state with the caveats still visible (AC4, AC6)', async () => {
    metricsApi.getReport.mockResolvedValue(emptyReport)
    renderReport()
    const empty = await screen.findByTestId('report-empty')
    expect(empty).toHaveTextContent('CHAT_PROVIDER / CHAT_MODEL')
    expect(empty).toHaveTextContent('FEEDBACK_PROVIDER / FEEDBACK_MODEL')
    expect(screen.getByTestId('report-caveats')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CSV' })).toBeEnabled()
  })

  it('shows the API error and retries', async () => {
    metricsApi.getReport.mockRejectedValueOnce(new Error("baseline must be 'provider:model'"))
    renderReport(undefined, 'broken')
    expect(await screen.findByRole('alert')).toHaveTextContent("baseline must be 'provider:model'")
    // The bad baseline stays selectable so the user can switch away from it
    expect((screen.getByLabelText('Baseline model') as HTMLSelectElement).value).toBe('broken')

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByTestId('report-feature-chat')).toBeInTheDocument()
  })
})
