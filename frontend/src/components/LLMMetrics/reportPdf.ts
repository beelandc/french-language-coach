/**
 * PDF export of the model comparison report (Issue #238).
 *
 * `buildReportPdfContent` turns the on-screen report JSON into plain strings
 * (same metrics, deltas, summary and caveats as the screen); `generateReportPDF`
 * lays them out with jsPDF (already a dependency, loaded on demand). All text
 * goes through `toPdfText` because jsPDF's built-in fonts are Latin-1 only.
 */

import type { ModelReport } from '../../types/index'
import { MISSING, formatDateTime } from './metricsUtils'
import {
  REPORT_METRICS,
  featureTitle,
  formatDelta,
  isComparable,
  metricDelta,
  missingBaselineMessage,
  modelKey,
  pdfFilename,
  singleModelMessage,
  toPdfText,
} from './reportUtils'

/** One feature section of the PDF. */
export interface ReportPdfFeature {
  heading: string
  summary: string | null
  notice: string | null
  header: string[]
  rows: string[][]
}

/** Everything the PDF prints, as Latin-1-safe strings. */
export interface ReportPdfContent {
  title: string
  metaLines: string[]
  notes: string[]
  warnings: string[]
  sampleLine: string
  prices: string[]
  emptyMessage: string | null
  features: ReportPdfFeature[]
}

/** Maximum model columns per table block before the table wraps. */
export const PDF_MAX_MODEL_COLUMNS = 6

function pdfValue(value: string): string {
  return value === MISSING ? 'n/a' : toPdfText(value)
}

/** Build the PDF's text content from the report shown on screen. */
export function buildReportPdfContent(report: ModelReport, emptyMessage: string): ReportPdfContent {
  const meta = report.metadata
  const setFilters = Object.entries(meta.filters)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${value}`)

  const features = report.features.map((feature) => {
    const comparable = isComparable(feature)
    let summary: string | null = null
    let notice: string | null = null
    if (!comparable) {
      notice = singleModelMessage(feature.feature, meta.min_sample_size)
    } else {
      summary = feature.summary?.text ?? null
      if (!feature.baseline_present) notice = missingBaselineMessage(meta.baseline)
    }
    return {
      heading: toPdfText(`${featureTitle(feature.feature)}: ${formatDateTime(feature.first_call_at)} to ${formatDateTime(feature.last_call_at)}`),
      summary: summary === null ? null : toPdfText(summary),
      notice: notice === null ? null : toPdfText(notice),
      header: [
        'Metric',
        ...feature.rows.map((row) => toPdfText(modelKey(row) + (row.is_baseline ? ' (baseline)' : ''))),
      ],
      rows: REPORT_METRICS.map((metric) => [
        toPdfText(metric.label),
        ...feature.rows.map((row) => {
          const value = pdfValue(metric.value(row))
          const delta = metric.unit ? formatDelta(metricDelta(metric, row), metric.unit, true) : null
          return delta ? `${value} (${delta})` : value
        }),
      ]),
    }
  })

  return {
    title: 'LLM model comparison report',
    metaLines: [
      `Generated: ${formatDateTime(meta.generated_at)}`,
      `Baseline: ${meta.baseline}`,
      `Filters: ${setFilters.join(', ') || 'none'}`,
      `Date range covered: ${formatDateTime(meta.covered_from)} to ${formatDateTime(meta.covered_to)}`,
    ].map(toPdfText),
    notes: meta.notes.map(toPdfText),
    warnings: meta.warnings.length ? meta.warnings.map(toPdfText) : ['No warnings.'],
    sampleLine: toPdfText(
      `Models with fewer than ${meta.min_sample_size} calls are not ranked. ` +
        `Latency and token averages use ${meta.latency_basis}.`
    ),
    prices: meta.prices.length
      ? meta.prices.map((p) => toPdfText(`${p.provider}:${p.model}: checked ${p.checked_on} (${p.source})`))
      : ['No price entries for these models.'],
    emptyMessage: report.features.length === 0 ? toPdfText(emptyMessage) : null,
    features,
  }
}

/** Split a table into blocks with the metric column plus at most `max` model columns. */
export function splitColumns(header: string[], rows: string[][], max = PDF_MAX_MODEL_COLUMNS) {
  const blocks: { header: string[]; rows: string[][] }[] = []
  const modelCount = header.length - 1
  for (let start = 1; start <= Math.max(modelCount, 1); start += max) {
    const end = start + max
    blocks.push({
      header: [header[0], ...header.slice(start, end)],
      rows: rows.map((row) => [row[0], ...row.slice(start, end)]),
    })
  }
  return blocks
}

/** Generate the report PDF (A4 landscape) and trigger the download. */
export async function generateReportPDF(report: ModelReport, emptyMessage: string): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const content = buildReportPdfContent(report, emptyMessage)

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  const usable = pageWidth - margin * 2
  let y = margin + 6

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage()
      y = margin + 6
    }
  }

  const heading = (text: string, size: number) => {
    ensureSpace(size * 0.6 + 4)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size)
    doc.text(text, margin, y)
    y += size * 0.45 + 2
  }

  const paragraph = (text: string, size = 9, indent = 0) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    const lines: string[] = doc.splitTextToSize(text, usable - indent)
    const lineHeight = size * 0.45
    for (const line of lines) {
      ensureSpace(lineHeight)
      doc.text(line, margin + indent, y)
      y += lineHeight
    }
    y += 1
  }

  const bullets = (items: string[]) => {
    for (const item of items) paragraph(`- ${item}`, 9, 2)
  }

  const table = (header: string[], rows: string[][]) => {
    const metricWidth = 50
    const colWidth = (usable - metricWidth) / Math.max(header.length - 1, 1)
    const widths = header.map((_, index) => (index === 0 ? metricWidth : colWidth))
    const lineHeight = 3.4

    const drawRow = (cells: string[], bold: boolean) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.setFontSize(8)
      const wrapped = cells.map((cell, index) => doc.splitTextToSize(cell, widths[index] - 2) as string[])
      const height = Math.max(...wrapped.map((lines) => lines.length)) * lineHeight + 1.5
      ensureSpace(height)
      let x = margin
      wrapped.forEach((lines, index) => {
        lines.forEach((line, lineIndex) => doc.text(line, x + 1, y + lineHeight * (lineIndex + 1) - 0.8))
        x += widths[index]
      })
      y += height
      doc.setDrawColor(210, 210, 210)
      doc.line(margin, y, margin + usable, y)
    }

    drawRow(header, true)
    for (const row of rows) drawRow(row, false)
    y += 4
  }

  // Title and metadata
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(content.title, margin, y)
  y += 8
  for (const line of content.metaLines) paragraph(line, 9)
  y += 2

  // Caveats come before the numbers so they are never separated from them
  heading('Caveats', 12)
  bullets(content.notes)
  paragraph(content.sampleLine)
  heading('Warnings', 10)
  bullets(content.warnings)
  heading('Prices used', 10)
  bullets(content.prices)
  y += 2

  if (content.emptyMessage) {
    heading('No data', 12)
    paragraph(content.emptyMessage)
  }

  for (const feature of content.features) {
    heading(feature.heading, 12)
    if (feature.summary) paragraph(`Summary: ${feature.summary}`, 9)
    if (feature.notice) paragraph(feature.notice, 9)
    for (const block of splitColumns(feature.header, feature.rows)) table(block.header, block.rows)
  }

  doc.save(pdfFilename(report))
}
