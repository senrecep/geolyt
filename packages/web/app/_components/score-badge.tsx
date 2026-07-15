interface ScoreBadgeProps {
  score: number | undefined
  label: string
}

export function ScoreBadge({ score, label }: ScoreBadgeProps) {
  const value = score ?? 0
  const color =
    value >= 80
      ? 'text-green-400'
      : value >= 60
        ? 'text-yellow-400'
        : value >= 40
          ? 'text-orange-400'
          : 'text-red-400'

  return (
    <div className="flex flex-col items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-[var(--color-muted-foreground)]">{label}</span>
    </div>
  )
}
