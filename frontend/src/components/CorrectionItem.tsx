import type { CorrectionItemProps } from '@/types'

export default function CorrectionItem({ correction }: CorrectionItemProps) {
  return (
    <div className="correction-item">
      <div className="original">{correction.original}</div>
      <div className="corrected">{correction.corrected}</div>
      <div className="explanation">{correction.explanation}</div>
    </div>
  )
}
