'use client'
export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 mb-2">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-8 bg-gray-100 dark:bg-gray-800 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
export function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
    </div>
  )
}
export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
      </div>
      <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      <SkeletonTable rows={6} cols={5} />
    </div>
  )
}
