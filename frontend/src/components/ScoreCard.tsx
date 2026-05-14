import type { ScoreCardProps } from '@/types'

export default function ScoreCard({ label, value }: ScoreCardProps) {
  return (
    <div className="score-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  )
}
