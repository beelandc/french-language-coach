/**
 * MetricsBreakdownTable: per feature/provider/model statistics with sortable
 * columns (Issue #237).
 */

import { useMemo, useState } from 'react'
import type { LLMMetricsGroup } from '../../types/index'
import { costPerCall, formatCost, formatLatency, formatNumber } from './metricsUtils'

/** Props for MetricsBreakdownTable. */
export interface MetricsBreakdownTableProps {
  /** Groups from GET /metrics/llm. */
  groups: LLMMetricsGroup[]
}

type SortDirection = 'asc' | 'desc'

interface Column {
  id: string
  label: string
  numeric: boolean
  value: (group: LLMMetricsGroup) => string | number | null
  render: (group: LLMMetricsGroup) => string
}

const COLUMNS: Column[] = [
  { id: 'feature', label: 'Feature', numeric: false, value: (g) => g.feature, render: (g) => g.feature },
  { id: 'provider', label: 'Provider', numeric: false, value: (g) => g.provider, render: (g) => g.provider },
  { id: 'model', label: 'Model', numeric: false, value: (g) => g.model, render: (g) => g.model },
  { id: 'calls', label: 'Calls', numeric: true, value: (g) => g.calls, render: (g) => formatNumber(g.calls) },
  { id: 'errors', label: 'Errors', numeric: true, value: (g) => g.errors, render: (g) => formatNumber(g.errors) },
  {
    id: 'input_tokens',
    label: 'Input tokens',
    numeric: true,
    value: (g) => g.input_tokens,
    render: (g) => formatNumber(g.input_tokens),
  },
  {
    id: 'output_tokens',
    label: 'Output tokens',
    numeric: true,
    value: (g) => g.output_tokens,
    render: (g) => formatNumber(g.output_tokens),
  },
  {
    id: 'cache_read_tokens',
    label: 'Cache-read tokens',
    numeric: true,
    value: (g) => g.cache_read_tokens,
    render: (g) => formatNumber(g.cache_read_tokens),
  },
  {
    id: 'cost',
    label: 'Cost',
    numeric: true,
    value: (g) => g.estimated_cost_usd,
    render: (g) => formatCost(g.estimated_cost_usd),
  },
  {
    id: 'cost_per_call',
    label: 'Cost/call',
    numeric: true,
    value: (g) => costPerCall(g),
    render: (g) => formatCost(costPerCall(g)),
  },
  {
    id: 'p50',
    label: 'p50',
    numeric: true,
    value: (g) => g.latency_p50_ms,
    render: (g) => formatLatency(g.latency_p50_ms),
  },
  {
    id: 'p95',
    label: 'p95',
    numeric: true,
    value: (g) => g.latency_p95_ms,
    render: (g) => formatLatency(g.latency_p95_ms),
  },
]

/** Compare two cell values; nulls always sort last. */
function compareValues(
  a: string | number | null,
  b: string | number | null,
  direction: SortDirection
): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))
  return direction === 'asc' ? result : -result
}

function MetricsBreakdownTable({ groups }: MetricsBreakdownTableProps) {
  const [sortId, setSortId] = useState('calls')
  const [direction, setDirection] = useState<SortDirection>('desc')

  const sorted = useMemo(() => {
    const column = COLUMNS.find((c) => c.id === sortId) ?? COLUMNS[3]
    return [...groups].sort((a, b) => compareValues(column.value(a), column.value(b), direction))
  }, [groups, sortId, direction])

  const handleSort = (column: Column) => {
    if (column.id === sortId) {
      setDirection(direction === 'asc' ? 'desc' : 'asc')
    } else {
      setSortId(column.id)
      // Numbers start largest-first, text A-Z
      setDirection(column.numeric ? 'desc' : 'asc')
    }
  }

  return (
    <div className="llm-metrics-table-wrapper" data-testid="llm-metrics-breakdown-table">
      <table className="llm-metrics-table">
        <thead>
          <tr>
            {COLUMNS.map((column) => {
              const active = column.id === sortId
              return (
                <th
                  key={column.id}
                  scope="col"
                  className={column.numeric ? 'llm-metrics-numeric' : undefined}
                  aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button
                    type="button"
                    className="llm-metrics-sort-button"
                    onClick={() => handleSort(column)}
                  >
                    {column.label}
                    <span aria-hidden="true" className="llm-metrics-sort-indicator">
                      {active ? (direction === 'asc' ? ' ▲' : ' ▼') : ''}
                    </span>
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((group) => (
            <tr key={`${group.feature}|${group.provider}|${group.model}`}>
              {COLUMNS.map((column) => (
                <td key={column.id} className={column.numeric ? 'llm-metrics-numeric' : undefined}>
                  {column.render(group)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default MetricsBreakdownTable
