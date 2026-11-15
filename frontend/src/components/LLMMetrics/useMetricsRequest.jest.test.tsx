/**
 * Tests for useMetricsRequest (Issues #237, #238).
 */

import { act, renderHook, waitFor } from '@testing-library/react'
import { useMetricsRequest } from './useMetricsRequest'

describe('useMetricsRequest', () => {
  it('starts loading, then exposes the data', async () => {
    const load = jest.fn().mockResolvedValue('value')
    const { result } = renderHook(() => useMetricsRequest('key', load))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toBe('value'))
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('exposes errors and retries', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue('ok')
    const { result } = renderHook(() => useMetricsRequest('key', load))
    await waitFor(() => expect(result.current.error).toBe('boom'))
    expect(result.current.data).toBeNull()

    act(() => result.current.retry())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toBe('ok'))
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('drops responses for an outdated key', async () => {
    let resolveFirst: (value: string) => void = () => {}
    const loads: Record<string, () => Promise<string>> = {
      a: () => new Promise((resolve) => (resolveFirst = resolve)),
      b: () => Promise.resolve('second'),
    }
    const { result, rerender } = renderHook(({ k }) => useMetricsRequest(k, loads[k]), {
      initialProps: { k: 'a' },
    })
    rerender({ k: 'b' })
    await waitFor(() => expect(result.current.data).toBe('second'))
    await act(async () => resolveFirst('first'))
    expect(result.current.data).toBe('second')
  })
})
