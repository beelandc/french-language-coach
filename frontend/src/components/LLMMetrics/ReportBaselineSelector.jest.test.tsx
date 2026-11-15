/**
 * Tests for ReportBaselineSelector (Issue #238).
 */

import { fireEvent, render, screen } from '@testing-library/react'
import ReportBaselineSelector from './ReportBaselineSelector'

const options = ['anthropic:claude-haiku-5-5', 'mistral:mistral-large-latest']

describe('ReportBaselineSelector', () => {
  it('lists the options and shows the current baseline', () => {
    render(<ReportBaselineSelector value="mistral:mistral-large-latest" options={options} onChange={jest.fn()} />)
    const select = screen.getByLabelText('Baseline model') as HTMLSelectElement
    expect(select.value).toBe('mistral:mistral-large-latest')
    expect([...select.options].map((o) => o.value)).toEqual(options)
    expect(select).toBeEnabled()
  })

  it('reports a new baseline', () => {
    const onChange = jest.fn()
    render(<ReportBaselineSelector value="mistral:mistral-large-latest" options={options} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Baseline model'), { target: { value: 'anthropic:claude-haiku-5-5' } })
    expect(onChange).toHaveBeenCalledWith('anthropic:claude-haiku-5-5')
  })

  it('can be disabled', () => {
    render(<ReportBaselineSelector value={options[0]} options={options} onChange={jest.fn()} disabled />)
    expect(screen.getByLabelText('Baseline model')).toBeDisabled()
  })
})
