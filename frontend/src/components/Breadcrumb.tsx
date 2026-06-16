/**
 * Breadcrumb Component
 * 
 * Displays a breadcrumb navigation trail for hierarchical navigation.
 * Used in DeckDetailPage and DeckCardsPage for navigation back to vocabulary list.
 * 
 * Follows the styling pattern of existing navigation components.
 */

import { Link } from 'react-router-dom'
import type { BreadcrumbProps } from '../types/index'

/**
 * Breadcrumb separator character
 */
const SEPARATOR = '>'

/**
 * Breadcrumb component - displays navigation breadcrumbs
 * 
 * @param props - Component props
 * @param props.items - Array of breadcrumb items with label and optional path
 * @returns JSX Element
 */
export default function Breadcrumb({ items }: BreadcrumbProps) {
  // Filter out items without labels
  const validItems = items.filter(item => item.label)

  if (validItems.length === 0) {
    return null
  }

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb" data-testid="breadcrumb">
      <ol className="breadcrumb-list" data-testid="breadcrumb-list">
        {validItems.map((item, index) => {
          const isLast = index === validItems.length - 1
          
          return (
            <li 
              key={index}
              className={`breadcrumb-item ${isLast ? 'breadcrumb-item-current' : ''}`}
              data-testid={`breadcrumb-item-${index}`}
            >
              {item.path ? (
                <Link 
                  to={item.path}
                  className="breadcrumb-link"
                  data-testid={`breadcrumb-link-${index}`}
                >
                  {item.label}
                </Link>
              ) : (
                <span className="breadcrumb-text" data-testid={`breadcrumb-text-${index}`}>
                  {item.label}
                </span>
              )}
              
              {!isLast && (
                <span className="breadcrumb-separator" data-testid={`breadcrumb-separator-${index}`}>
                  {SEPARATOR}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
