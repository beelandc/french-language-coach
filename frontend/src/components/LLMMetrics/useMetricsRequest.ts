/**
 * useMetricsRequest: load data for one admin metrics panel (Issues #237, #238).
 *
 * Moved out of LLMMetricsDashboard so the comparison report can reuse it.
 */

import { useEffect, useState } from 'react'
import { errorMessage } from './metricsUtils'

/** State of one panel's request. */
export interface RequestState<T> {
  data: T | null
  loading: boolean
  error: string | null
  retry: () => void
}

/**
 * Run `load` whenever `requestKey` changes (or on retry) and track its state.
 *
 * `requestKey` must capture everything `load` depends on. State is only set
 * from promise callbacks; `loading` is derived by comparing the key of the last
 * completed request with the current one, so stale responses never show.
 */
export function useMetricsRequest<T>(requestKey: string, load: () => Promise<T>): RequestState<T> {
  const [attempt, setAttempt] = useState(0)
  const token = `${requestKey}#${attempt}`
  const [result, setResult] = useState<{ token: string; data: T | null; error: string | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    load().then(
      (data) => {
        if (!cancelled) setResult({ token, data, error: null })
      },
      (error: unknown) => {
        if (!cancelled) setResult({ token, data: null, error: errorMessage(error) })
      }
    )
    return () => {
      cancelled = true
    }
    // `load` is a new closure every render; `token` captures everything it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const current = result !== null && result.token === token ? result : null
  return {
    data: current ? current.data : null,
    error: current ? current.error : null,
    loading: current === null,
    retry: () => setAttempt((value) => value + 1),
  }
}
