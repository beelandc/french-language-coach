/**
 * useContainerWidth: track an element's rendered width (Issue #237).
 *
 * The SVG charts draw at their real pixel width so axis text stays the same
 * size on phones and wide screens. Falls back to `fallback` where
 * ResizeObserver isn't available (e.g. jsdom).
 */

import { useEffect, useRef, useState } from 'react'

export function useContainerWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const measured = Math.round(entries[0]?.contentRect.width ?? 0)
      if (measured > 0) setWidth(measured)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}
