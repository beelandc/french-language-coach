/**
 * Tests for LLMMetricsDashboard (Issue #237): data loading per panel, shared
 * URL filters, pagination, and loading/empty/error states.
 */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import LLMMetricsDashboard from './LLMMetricsDashboard'
import * as apiModule from '../../utils/api'
import {
  emptyCallLog,
  emptySummary,
  sampleCallLog,
  samplePricing,
  sampleSummary,
  sampleTimeseries,
} from './fixtures'

jest.mock('../../utils/api', () => ({
  metricsApi: {
    getSummary: jest.fn(),
    listCalls: jest.fn(),
    getTimeseries: jest.fn(),
    getPricing: jest.fn(),
  },
}))

const { metricsApi } = apiModule as unknown as {
  metricsApi: {
    getSummary: jest.Mock
    listCalls: jest.Mock
    getTimeseries: jest.Mock
    getPricing: jest.Mock
  }
}

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.search}</div>
}

function renderAt(url = '/admin/metrics') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/admin/metrics"
          element={
            <>
              <LLMMetricsDashboard />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

const currentSearch = () => screen.getByTestId('location').textContent ?? ''

function mockAllSuccess() {
  metricsApi.getSummary.mockResolvedValue(sampleSummary)
  metricsApi.listCalls.mockResolvedValue(sampleCallLog)
  metricsApi.getTimeseries.mockResolvedValue(sampleTimeseries)
  metricsApi.getPricing.mockResolvedValue(samplePricing)
}

async function waitForPanels() {
  await screen.findByTestId('llm-metrics-summary-cards')
  await screen.findByTestId('llm-metrics-call-log')
  await screen.findByTestId('llm-metrics-pricing')
  await screen.findByTestId('llm-metrics-chart-calls')
}

describe('LLMMetricsDashboard', () => {
  beforeEach(() => {
    mockAllSuccess()
  })

  it('loads every panel from the metrics API (AC1)', async () => {
    renderAt()
    // Loading indicators first
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(5)
    await waitForPanels()

    expect(screen.getByTestId('llm-metrics-breakdown-table')).toBeInTheDocument()
    expect(screen.getByTestId('llm-metrics-chart-cost')).toBeInTheDocument()
    expect(screen.getByTestId('llm-metrics-chart-latency')).toBeInTheDocument()
    expect(screen.getByTestId('llm-metrics-cost-latency-chart')).toBeInTheDocument()
    expect(screen.queryAllByRole('status')).toHaveLength(0)

    // Unfiltered options call + filtered summary call (no params for "all time")
    expect(metricsApi.getSummary).toHaveBeenCalledWith({})
    expect(metricsApi.getTimeseries).toHaveBeenCalledWith({}, 'day')
    expect(metricsApi.listCalls).toHaveBeenCalledWith({}, 1, 20)
    expect(metricsApi.getPricing).toHaveBeenCalledTimes(1)
  })

  it('fills the filter dropdowns from the unfiltered summary', async () => {
    renderAt()
    await waitForPanels()
    const provider = screen.getByLabelText('Provider') as HTMLSelectElement
    await waitFor(() =>
      expect([...provider.options].map((o) => o.value)).toEqual(['', 'anthropic', 'mistral'])
    )
  })

  it('applies a filter to every panel and the URL (AC2)', async () => {
    renderAt()
    await waitForPanels()
    const pricingCalls = metricsApi.getPricing.mock.calls.length

    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'anthropic' } })

    await waitFor(() => expect(currentSearch()).toBe('?provider=anthropic'))
    await waitFor(() =>
      expect(metricsApi.listCalls).toHaveBeenLastCalledWith({ provider: 'anthropic' }, 1, 20)
    )
    expect(metricsApi.getTimeseries).toHaveBeenLastCalledWith({ provider: 'anthropic' }, 'day')
    expect(metricsApi.getSummary).toHaveBeenLastCalledWith({ provider: 'anthropic' })
    // Pricing has no filters and isn't refetched
    expect(metricsApi.getPricing).toHaveBeenCalledTimes(pricingCalls)
    await waitForPanels()
  })

  it('restores filters from the URL and resolves presets to dates', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] })
    jest.setSystemTime(new Date('2026-11-14T08:00:00Z'))
    try {
      renderAt('/admin/metrics?range=24h&status=error&feature=chat')
      await act(async () => {})
      expect(metricsApi.getTimeseries).toHaveBeenCalledWith(
        { date_from: '2026-11-13T08:00:00.000Z', feature: 'chat', status: 'error' },
        'hour'
      )
      expect(screen.getByLabelText('Date range')).toHaveValue('24h')
      expect(screen.getByLabelText('Status')).toHaveValue('error')
    } finally {
      jest.useRealTimers()
    }
  })

  it('passes custom ranges through', async () => {
    renderAt('/admin/metrics?range=custom&date_from=2026-11-01&date_to=2026-11-07')
    await waitForPanels()
    expect(metricsApi.listCalls).toHaveBeenCalledWith({ date_from: '2026-11-01', date_to: '2026-11-07' }, 1, 20)
  })

  it('paginates the call log via the URL and resets the page on filter change (AC3)', async () => {
    renderAt()
    await waitForPanels()

    metricsApi.listCalls.mockResolvedValue({
      ...sampleCallLog,
      pagination: { ...sampleCallLog.pagination, page: 2 },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(currentSearch()).toBe('?page=2'))
    await waitFor(() => expect(metricsApi.listCalls).toHaveBeenLastCalledWith({}, 2, 20))
    await screen.findByText(/Page 2 of 3/)

    metricsApi.listCalls.mockResolvedValue(sampleCallLog)
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    await waitFor(() => expect(currentSearch()).toBe(''))
    await screen.findByText(/Page 1 of 3/)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(currentSearch()).toBe('?page=2'))
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'error' } })
    await waitFor(() => expect(currentSearch()).toBe('?status=error'))
    await waitFor(() => expect(metricsApi.listCalls).toHaveBeenLastCalledWith({ status: 'error' }, 1, 20))
  })

  it('links calls to their session (AC3)', async () => {
    renderAt()
    await waitForPanels()
    expect(screen.getByRole('link', { name: '#12' })).toHaveAttribute('href', '/sessions/12')
  })

  it('says no calls have been recorded on a fresh install (AC4)', async () => {
    metricsApi.getSummary.mockResolvedValue(emptySummary)
    metricsApi.listCalls.mockResolvedValue(emptyCallLog)
    metricsApi.getTimeseries.mockResolvedValue({ bucket: 'day', points: [] })
    renderAt()
    await waitFor(() => expect(screen.getAllByText('No LLM calls recorded yet')).toHaveLength(5))
    // Pricing still renders
    expect(await screen.findByTestId('llm-metrics-pricing')).toBeInTheDocument()
  })

  it('distinguishes "no match" from "no calls ever" (AC4)', async () => {
    metricsApi.getSummary.mockImplementation(async (params: object) =>
      Object.keys(params).length === 0 ? sampleSummary : emptySummary
    )
    metricsApi.listCalls.mockResolvedValue(emptyCallLog)
    metricsApi.getTimeseries.mockResolvedValue({ bucket: 'day', points: [] })
    renderAt('/admin/metrics?model=nothing')
    await waitFor(() => expect(screen.getAllByText('No calls match these filters')).toHaveLength(5))
  })

  it('isolates a failing panel and retries it (AC4)', async () => {
    metricsApi.listCalls.mockRejectedValueOnce(new Error('HTTP error! status: 500'))
    renderAt()
    const callLogPanel = await screen.findByTestId('llm-metrics-call-log-panel')
    await within(callLogPanel).findByRole('alert')
    expect(within(callLogPanel).getByRole('alert')).toHaveTextContent('HTTP error! status: 500')
    // Other panels still render
    await screen.findByTestId('llm-metrics-summary-cards')
    await screen.findByTestId('llm-metrics-pricing')

    fireEvent.click(within(callLogPanel).getByRole('button', { name: 'Retry' }))
    await within(callLogPanel).findByTestId('llm-metrics-call-log')
    expect(metricsApi.listCalls).toHaveBeenCalledTimes(2)
  })

  it('shows API errors for the summary, trends and pricing panels', async () => {
    metricsApi.getSummary.mockRejectedValue(new Error('date_from must be less than or equal to date_to'))
    metricsApi.getTimeseries.mockRejectedValue(new Error('Timeseries failed'))
    metricsApi.getPricing.mockRejectedValue('boom')
    renderAt()
    await waitFor(() =>
      expect(screen.getAllByText('date_from must be less than or equal to date_to')).toHaveLength(3)
    )
    expect(await screen.findByText('Timeseries failed')).toBeInTheDocument()
    expect(await screen.findByText(/Something went wrong/)).toBeInTheDocument()
    // Options failed too, so the dropdowns are just "All"
    const provider = screen.getByLabelText('Provider') as HTMLSelectElement
    expect([...provider.options].map((o) => o.value)).toEqual([''])
  })

  it('ignores responses for outdated filters', async () => {
    let resolveFirst: (value: unknown) => void = () => {}
    metricsApi.listCalls.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveFirst = resolve
      })
    )
    renderAt()
    await screen.findByTestId('llm-metrics-summary-cards')
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'error' } })
    await screen.findByTestId('llm-metrics-call-log')
    expect(screen.getByTestId('llm-metrics-page-info')).toHaveTextContent('45 calls')

    // The first (unfiltered) request finishes late; its data must not replace the current page
    await act(async () => {
      resolveFirst({ ...sampleCallLog, pagination: { total: 999, page: 1, per_page: 20, total_pages: 50 } })
    })
    expect(screen.getByTestId('llm-metrics-page-info')).toHaveTextContent('45 calls')
  })
})
