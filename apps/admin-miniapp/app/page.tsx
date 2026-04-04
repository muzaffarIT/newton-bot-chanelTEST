'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchStats } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'

function KpiCard({ label, value, icon, sub }: {
    label: string; value: string | number; icon: string; sub?: string
}) {
    return (
        <div className="card flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-xl shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-medium truncate">{label}</p>
                <p className="text-2xl font-bold leading-tight">{value}</p>
                {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
            </div>
        </div>
    )
}

function StatusBar({ data }: { data: Record<string, number> }) {
    const total = Object.values(data).reduce((a, b) => a + b, 0)
    if (total === 0) return null
    const colors: Record<string, string> = {
        NEW: 'bg-blue-500', REGISTERED: 'bg-purple-500', STARTED_TEST: 'bg-yellow-500',
        TEST_COMPLETED: 'bg-green-500', WAITING_CONTACT: 'bg-orange-500',
        CONTACTED: 'bg-teal-500', ENROLLED: 'bg-emerald-500', REJECTED: 'bg-red-500',
    }
    return (
        <div className="flex rounded-full overflow-hidden h-2 w-full gap-px">
            {Object.entries(data).map(([status, count]) => (
                <div
                    key={status}
                    className={`${colors[status] || 'bg-gray-500'} transition-all`}
                    style={{ width: `${(count / total) * 100}%` }}
                    title={`${status}: ${count}`}
                />
            ))}
        </div>
    )
}

export default function DashboardPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['stats'],
        queryFn: fetchStats,
        refetchInterval: 30000,
    })

    if (isLoading) {
        return (
            <div className="flex flex-col gap-3 p-4 pb-24 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="card h-20 bg-white/5" />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 pb-24">
                <div className="card text-center py-8">
                    <div className="text-4xl mb-3">⚠️</div>
                    <p className="text-red-400">Ошибка загрузки данных</p>
                </div>
            </div>
        )
    }

    const leadsByStatus: Record<string, number> = data?.leadsByStatus || {}
    const sessionsByStatus: Record<string, number> = data?.sessionsByStatus || {}

    return (
        <div className="flex flex-col pb-24">
            {/* Header */}
            <div className="sticky top-0 bg-[#0f0f1a]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 z-40">
                <h1 className="text-lg font-bold">Newton Academy</h1>
                <p className="text-xs text-gray-400">Панель управления</p>
            </div>

            <div className="p-4 flex flex-col gap-3">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <KpiCard label="Пользователи" value={data?.totalUsers ?? '—'} icon="👤" />
                    <KpiCard label="Лиды" value={data?.totalLeads ?? '—'} icon="🎯" />
                    <KpiCard label="Сессий" value={data?.totalSessions ?? '—'} icon="📝" />
                    <KpiCard label="Ср. балл" value={data?.avgScore ? `${data.avgScore}%` : '—'} icon="📊" />
                </div>

                {/* Lead funnel */}
                <div className="card">
                    <p className="text-sm font-semibold mb-3">Воронка лидов</p>
                    <StatusBar data={leadsByStatus} />
                    <div className="grid grid-cols-2 gap-2 mt-3">
                        {Object.entries(leadsByStatus).map(([status, count]) => (
                            <div key={status} className="flex items-center justify-between text-xs">
                                <span className="text-gray-400 truncate">{status}</span>
                                <span className="font-bold ml-2">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sessions */}
                <div className="card">
                    <p className="text-sm font-semibold mb-3">Сессии тестов</p>
                    <div className="flex flex-col gap-2">
                        {Object.entries(sessionsByStatus).map(([status, count]) => (
                            <div key={status} className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">{status}</span>
                                <span className="font-bold">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    )
}
