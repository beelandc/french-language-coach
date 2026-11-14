/**
 * Tests for useContainerWidth (Issue #237).
 */

import { act, render, screen } from '@testing-library/react'
import { useContainerWidth } from './useContainerWidth'

function Probe() {
  const [ref, width] = useContainerWidth<HTMLDivElement>(640)
  return (
    <div ref={ref} data-testid="probe">
      {width}
    </div>
  )
}

describe('useContainerWidth', () => {
  const original = globalThis.ResizeObserver

  afterEach(() => {
    globalThis.ResizeObserver = original
  })

  it('falls back when ResizeObserver is unavailable', () => {
    // jsdom has no ResizeObserver
    // @ts-expect-error removing for the test
    delete globalThis.ResizeObserver
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('640')
  })

  it('tracks the observed width and disconnects on unmount', () => {
    let callback: ResizeObserverCallback = () => {}
    const disconnect = jest.fn()
    const observe = jest.fn()
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        callback = cb
      }
      observe = observe
      unobserve = jest.fn()
      disconnect = disconnect
    } as unknown as typeof ResizeObserver

    const { unmount } = render(<Probe />)
    expect(observe).toHaveBeenCalledWith(screen.getByTestId('probe'))

    const fire = (width: number) =>
      act(() => {
        callback([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver)
      })
    fire(343.6)
    expect(screen.getByTestId('probe')).toHaveTextContent('344')
    // A zero width (hidden element) keeps the last known width
    fire(0)
    expect(screen.getByTestId('probe')).toHaveTextContent('344')
    act(() => {
      callback([], {} as ResizeObserver)
    })
    expect(screen.getByTestId('probe')).toHaveTextContent('344')

    unmount()
    expect(disconnect).toHaveBeenCalled()
  })
})
