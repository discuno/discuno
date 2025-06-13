import React from 'react'

interface LoadMoreButtonProps {
  onClick: () => void
  disabled: boolean
}

export const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({ onClick, disabled }) => (
  <button
    className="mt-6 rounded-lg bg-blue-600 p-2 text-white"
    onClick={onClick}
    disabled={disabled}
    aria-busy={disabled}
  >
    {disabled ? 'Loading...' : 'Load More'}
  </button>
)
