/**
 * Breadcrumb Component Tests
 * 
 * Tests for the Breadcrumb component used in DeckDetailPage and DeckCardsPage.
 * Part of Issue #201: Implement vocabulary deck detail pages
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Breadcrumb from './Breadcrumb'
import type { BreadcrumbItem } from '../types/index'

describe('Breadcrumb Component', () => {
  
  // Test basic rendering with items
  it('renders breadcrumb with items', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/' },
      { label: 'Vocabulary', path: '/vocabulary' },
      { label: 'Deck' }
    ]
    
    render(
      <MemoryRouter>
        <Breadcrumb items={items} />
      </MemoryRouter>
    )
    
    // Check breadcrumb container
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
    
    // Check breadcrumb list
    expect(screen.getByTestId('breadcrumb-list')).toBeInTheDocument()
    
    // Check all items are rendered
    expect(screen.getByTestId('breadcrumb-item-0')).toBeInTheDocument()
    expect(screen.getByTestId('breadcrumb-item-1')).toBeInTheDocument()
    expect(screen.getByTestId('breadcrumb-item-2')).toBeInTheDocument()
    
    // Check labels
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Vocabulary')).toBeInTheDocument()
    expect(screen.getByText('Deck')).toBeInTheDocument()
    
    // Check links for items with paths
    expect(screen.getByTestId('breadcrumb-link-0')).toBeInTheDocument()
    expect(screen.getByTestId('breadcrumb-link-1')).toBeInTheDocument()
    
    // Check current item (no link)
    expect(screen.getByTestId('breadcrumb-text-2')).toBeInTheDocument()
    
    // Check separators
    expect(screen.getByTestId('breadcrumb-separator-0')).toBeInTheDocument()
    expect(screen.getByTestId('breadcrumb-separator-1')).toBeInTheDocument()
    
    // Last item should not have separator
    expect(screen.queryByTestId('breadcrumb-separator-2')).not.toBeInTheDocument()
  })

  // Test with single item
  it('renders with single item (no separators)', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/' }
    ]
    
    render(
      <MemoryRouter>
        <Breadcrumb items={items} />
      </MemoryRouter>
    )
    
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByTestId('breadcrumb-link-0')).toBeInTheDocument()
    
    // No separators for single item
    expect(screen.queryByTestId(/breadcrumb-separator/)).not.toBeInTheDocument()
  })

  // Test with empty items array
  it('returns null when items array is empty', () => {
    const { container } = render(
      <MemoryRouter>
        <Breadcrumb items={[]} />
      </MemoryRouter>
    )
    
    expect(container.firstChild).toBeNull()
  })

  // Test with items that have empty labels (filtered out)
  it('filters out items with empty labels', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/' },
      { label: '', path: '/empty' },
      { label: 'Vocabulary', path: '/vocabulary' },
      { label: '', path: '/another-empty' }
    ]
    
    render(
      <MemoryRouter>
        <Breadcrumb items={items} />
      </MemoryRouter>
    )
    
    // Only items with labels should be rendered
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Vocabulary')).toBeInTheDocument()
    expect(screen.queryByText('')).not.toBeInTheDocument()
    
    // Should only have 2 items
    expect(screen.getByTestId('breadcrumb-item-0')).toBeInTheDocument()
    expect(screen.getByTestId('breadcrumb-item-1')).toBeInTheDocument()
    expect(screen.queryByTestId('breadcrumb-item-2')).not.toBeInTheDocument()
  })

  // Test accessibility
  it('has proper accessibility attributes', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/' },
      { label: 'Vocabulary' }
    ]
    
    const { container } = render(
      <MemoryRouter>
        <Breadcrumb items={items} />
      </MemoryRouter>
    )
    
    // Check nav element with aria-label
    const nav = container.querySelector('nav')
    expect(nav).toBeInTheDocument()
    expect(nav).toHaveAttribute('aria-label', 'Breadcrumb')
    
    // Check ol element
    const list = container.querySelector('ol')
    expect(list).toBeInTheDocument()
    expect(list).toHaveClass('breadcrumb-list')
    
    // Check li elements
    const listItems = container.querySelectorAll('li')
    expect(listItems).toHaveLength(2)
    expect(listItems[0]).toHaveClass('breadcrumb-item')
    expect(listItems[1]).toHaveClass('breadcrumb-item', 'breadcrumb-item-current')
  })

  // Test links navigate to correct paths
  it('has links with correct hrefs', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/' },
      { label: 'Vocabulary', path: '/vocabulary' },
      { label: 'Current' }
    ]
    
    render(
      <MemoryRouter>
        <Breadcrumb items={items} />
      </MemoryRouter>
    )
    
    // Check link hrefs
    const homeLink = screen.getByTestId('breadcrumb-link-0')
    expect(homeLink).toHaveAttribute('href', '/')
    
    const vocabularyLink = screen.getByTestId('breadcrumb-link-1')
    expect(vocabularyLink).toHaveAttribute('href', '/vocabulary')
  })
})
