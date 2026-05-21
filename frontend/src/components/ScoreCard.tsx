import type { ScoreCardProps } from '@/types'

export default function ScoreCard({ label, value }: ScoreCardProps) {
  const testId = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="score-card" data-testid={`score-card-${testId}`}>
      <div className="label">{label}</div>
      <div className="value" data-testid={`${testId}-score`}>{value}</div>
    </div>
  )
}
