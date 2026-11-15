/**
 * Tests for the comparison report PDF (Issue #238). jsPDF is mocked; the tests
 * check the content matches the on-screen report and stays Latin-1 safe.
 */

import { buildReportPdfContent, generateReportPDF, splitColumns } from './reportPdf'
import { NO_REPORT_DATA_MESSAGE } from './reportUtils'
import { emptyReport, noBaselineReport, reportRow, sampleReport, singleModelReport } from './fixtures'
import type { ModelReport } from '../../types/index'

const mockDoc = {
  internal: { pageSize: { getWidth: () => 297, getHeight: () => 210 } },
  setFont: jest.fn(),
  setFontSize: jest.fn(),
  setDrawColor: jest.fn(),
  text: jest.fn(),
  line: jest.fn(),
  addPage: jest.fn(),
  save: jest.fn(),
  splitTextToSize: jest.fn((text: string) => [text]),
}

jest.mock('jspdf', () => ({
  jsPDF: jest.fn(() => mockDoc),
}))

const printed = () => mockDoc.text.mock.calls.map((call) => String(call[0]))

describe('buildReportPdfContent', () => {
  it('carries metadata, caveats, summaries and the metric table', () => {
    const content = buildReportPdfContent(sampleReport, NO_REPORT_DATA_MESSAGE)

    expect(content.title).toBe('LLM model comparison report')
    expect(content.metaLines).toContain('Baseline: mistral:mistral-large-latest')
    expect(content.metaLines).toContain('Filters: none')
    expect(content.notes).toEqual(sampleReport.metadata.notes)
    expect(content.warnings).toEqual(sampleReport.metadata.warnings)
    expect(content.sampleLine).toContain('fewer than 20 calls are not ranked')
    expect(content.prices[0]).toBe(
      'anthropic:claude-haiku-5-5: checked 2026-11-13 (https://www.anthropic.com/pricing)'
    )
    expect(content.emptyMessage).toBeNull()

    const [chat, feedback] = content.features
    expect(chat.summary).toContain('Not enough data to name a winner')
    expect(chat.notice).toBeNull()
    expect(feedback.summary).toBe(sampleReport.features[1].summary!.text)
    expect(feedback.header).toEqual([
      'Metric',
      'mistral:mistral-large-latest (baseline)',
      'anthropic:claude-haiku-5-5',
      'anthropic:claude-sonnet-5-5',
    ])
    const costRow = feedback.rows.find((row) => row[0] === 'Cost per call')!
    expect(costRow).toEqual(['Cost per call', '$0.0029', '$0.0011 (-62.1%)', '$0.0041 (+41.4%)'])
    const errorRow = feedback.rows.find((row) => row[0] === 'Error rate')!
    expect(errorRow[1]).toBe('2.5%')
    expect(errorRow[2]).toBe('0.0% (-2.5 pp)')
    // Missing costs print as n/a, not the en dash used on screen
    const chatCost = chat.rows.find((row) => row[0] === 'Cost per call')!
    expect(chatCost[2]).toBe('n/a')
  })

  it('shows the single-model notice instead of a summary', () => {
    const [chat] = buildReportPdfContent(singleModelReport, NO_REPORT_DATA_MESSAGE).features
    expect(chat.summary).toBeNull()
    expect(chat.notice).toContain('CHAT_PROVIDER')
  })

  it('notes a missing baseline', () => {
    const [feedback] = buildReportPdfContent(noBaselineReport, NO_REPORT_DATA_MESSAGE).features
    expect(feedback.notice).toContain('has no calls for this feature')
  })

  it('handles an empty report and set filters', () => {
    const report: ModelReport = {
      ...emptyReport,
      metadata: { ...emptyReport.metadata, filters: { feature: 'chat', date_from: '2026-11-01', model: null } },
    }
    const content = buildReportPdfContent(report, NO_REPORT_DATA_MESSAGE)
    expect(content.emptyMessage).toContain('CHAT_PROVIDER')
    expect(content.warnings).toEqual(['No warnings.'])
    expect(content.prices).toEqual(['No price entries for these models.'])
    expect(content.metaLines).toContain('Filters: feature=chat, date_from=2026-11-01')
  })
})

describe('splitColumns', () => {
  it('keeps the metric column in every block', () => {
    const header = ['Metric', 'a', 'b', 'c']
    const rows = [['x', '1', '2', '3']]
    expect(splitColumns(header, rows, 2)).toEqual([
      { header: ['Metric', 'a', 'b'], rows: [['x', '1', '2']] },
      { header: ['Metric', 'c'], rows: [['x', '3']] },
    ])
    expect(splitColumns(header, rows)).toHaveLength(1)
  })
})

describe('generateReportPDF', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDoc.splitTextToSize.mockImplementation((text: string) => [text])
  })

  it('prints the caveats, summaries and table, then saves with the report filename', async () => {
    await generateReportPDF(sampleReport, NO_REPORT_DATA_MESSAGE)
    const text = printed()

    expect(text).toContain('LLM model comparison report')
    expect(text).toContain('Caveats')
    expect(text.some((t) => t.includes('eval harness (#231)'))).toBe(true)
    expect(text.some((t) => t.includes('checked 2026-11-13'))).toBe(true)
    expect(text.some((t) => t.startsWith('Summary: For feedback'))).toBe(true)
    expect(text).toContain('$0.0011 (-62.1%)')
    expect(mockDoc.save).toHaveBeenCalledWith('llm-model-report-20261114-1808.pdf')
  })

  it('only prints Latin-1 characters', async () => {
    await generateReportPDF(sampleReport, NO_REPORT_DATA_MESSAGE)
    for (const t of printed()) {
      expect([...t].every((char) => char.charCodeAt(0) <= 0xff)).toBe(true)
    }
  })

  it('adds pages for long content and wide tables', async () => {
    const rows = Array.from({ length: 8 }, (_, i) => reportRow({ model: `model-${i}`, is_baseline: i === 0 }))
    const wide: ModelReport = {
      ...sampleReport,
      features: Array.from({ length: 3 }, (_, i) => ({
        ...sampleReport.features[1],
        feature: `feature${i}`,
        rows,
      })),
    }
    await generateReportPDF(wide, NO_REPORT_DATA_MESSAGE)
    expect(mockDoc.addPage).toHaveBeenCalled()
    // 8 models -> two table blocks per feature, each with a Metric header
    expect(printed().filter((t) => t === 'Metric')).toHaveLength(6)
  })

  it('prints the empty-state message when there is no data', async () => {
    await generateReportPDF(emptyReport, NO_REPORT_DATA_MESSAGE)
    expect(printed()).toContain('No data')
    expect(printed().some((t) => t.includes('FEEDBACK_PROVIDER'))).toBe(true)
  })
})
