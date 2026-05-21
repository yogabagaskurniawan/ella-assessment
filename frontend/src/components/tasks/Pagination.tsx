type PaginationProps = {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
}

function getPaginationPages(current: number, total: number): (number | '...')[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1)
    }
    const pages: (number | '...')[] = []
    pages.push(1)
    if (current > 3) pages.push('...')
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
    return pages
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
    if (totalPages === 0) return null
    // if (totalPages <= 1) return null
    return (
        <div className="flex items-center justify-center gap-2 mt-6">
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                ← Prev
            </button>

            {getPaginationPages(page, totalPages).map((p, i) =>
                p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">
                    ...
                </span>
                ) : (
                <button
                    key={p}
                    onClick={() => onPageChange(Number(p))}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    page === p
                        ? 'bg-indigo-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    {p}
                </button>
                )
            )}

            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Next →
            </button>
        </div>
    )
}