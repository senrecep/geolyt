interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color =
    status === 'completed'
      ? 'bg-green-500/10 text-green-400'
      : status === 'failed'
        ? 'bg-red-500/10 text-red-400'
        : status === 'pending' ||
            status === 'collecting' ||
            status === 'scoring' ||
            status === 'synthesizing' ||
            status === 'reporting'
          ? 'bg-yellow-500/10 text-yellow-400'
          : 'bg-neutral-500/10 text-neutral-400'

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  )
}
