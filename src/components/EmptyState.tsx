interface EmptyStateProps {
  message?: string
}

export default function EmptyState({ message = '当前筛选条件下没有数据，请调整筛选条件。' }: EmptyStateProps) {
  return (
    <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
      {message}
    </div>
  )
}
