'use client'

import { useState, useEffect } from 'react'
import { fetchStats } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { Users, Target, BookOpen, BarChart3, TrendingUp, RefreshCw } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
    NEW: 'Новый', REGISTERED: 'Зарегистрирован', STARTED_TEST: 'Начал тест',
    TEST_COMPLETED: 'Завершил тест', WAITING_CONTACT: 'Ожидает контакта',
    CONTACTED: 'Контактирован', ENROLLED: 'Записан', REJECTED: 'Отклонён',
}

const STATUS_COLORS: Record<string, string> = {
    NEW: '#3b82f6', REGISTERED: '#8b5cf6', STARTED_TEST: '#f59e0b',
    TEST_COMPLETED: '#22c55e', WAITING_CONTACT: '#f97316',
    CONTACTED: '#14b8a6', ENROLLED: '#10b981', REJECTED: '#ef4444',
}

const SESSION_LABELS: Record<string, { label: string; color: string }> = {
    IN_PROGRESS: { label: 'В процессе', color: '#3b82f6' },
    SUBMITTED: { label: 'Завершённые', color: '#8b5cf6' },
    CHECKED: { label: 'Проверены', color: '#22c55e' },
    EXPIRED: { label: 'Истекли', color: '#ef4444' },
}

function KpiCard({ label, value, icon: Icon, color, sub }: any) {
    return (
        <div className="card flex items-start gap-3 page-fade-in">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
                <Icon size={18} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="field-label">{label}</p>
                <p className="text-2xl font-black text-white leading-tight">{value}</p>
                {sub && <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>}
            </div>
        </div>
    )
}

function FunnelBar({ data }: { data: Record<string, number> }) {
    const total = Object.values(data).reduce((a, b) => a + b, 0)
    if (total === 0) return <p className="text-gray-600 text-sm text-center py-2">Нет данных</p>
    return (
        <div className="space-y-3">
            <div className="flex rounded-full overflow-hidden h-2.5 gap-px" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {Object.entries(data).map(([status, count]) => (
                    <div
                        key={status}
                        className="transition-all rounded-full"
                        style={{ width: `${(count / total) * 100}%`, background: STATUS_COLORS[status] || '#6b7280' }}
                        title={`${status}: ${count}`}
                    />
                ))}
            </div>
            <div className="space-y-2">
                {Object.entries(data).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-[13px]">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[status] || '#6b7280' }} />
                            <span className="text-gray-400">{STATUS_LABELS[status] || status}</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-white">{count}</span>
                            <span className="text-gray-600 text-[11px]">{Math.round((count / total) * 100)}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function DashboardPage() {
    const [data, setData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    async function loadDashboardData() {
        try {
            setIsLoading(true)
            const res = await fetchStats()
            setData(res)
            setLastUpdated(new Date())
        } catch (err) {
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadDashboardData()
        const id = setInterval(loadDashboardData, 30000)
        return () => clearInterval(id)
    }, [])

    const kpis = [
        { label: 'Пользователи', value: data?.totalUsers ?? '—', icon: Users, color: '#4f6ef7' },
        { label: 'Всего лидов', value: data?.totalLeads ?? '—', icon: Target, color: '#a78bfa' },
        { label: 'Сессий', value: data?.totalSessions ?? '—', icon: BookOpen, color: '#34d399' },
        { label: 'Средний балл', value: data?.avgScore ? `${Math.round(data.avgScore)}%` : '—', icon: BarChart3, color: '#fb923c' },
    ]

    return (
        <div className="flex flex-col pb-24 min-h-screen">
            {/* Header */}
            <div className="sticky top-0 z-40 px-4 pt-5 pb-3" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-[18px] font-extrabold text-white">Newton Academy</h1>
                        <p className="text-[12px] text-gray-600 mt-0.5">
                            {lastUpdated ? `Обновлено ${lastUpdated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : 'Панель управления'}
                        </p>
                    </div>
                    <button
                        onClick={loadDashboardData}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                        <RefreshCw size={15} className={`text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* KPI grid */}
                <div className="grid grid-cols-2 gap-3">
                    {kpis.map((k, i) => (
                        <div key={k.label} className="stagger-{i+1}">
                            {isLoading && !data ? (
                                <div className="card h-20 skeleton" />
                            ) : (
                                <KpiCard {...k} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Lead Funnel */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
                        <p className="font-bold text-[15px] text-white">Воронка лидов</p>
                    </div>
                    {isLoading && !data ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-4 skeleton rounded" />)}
                        </div>
                    ) : (
                        <FunnelBar data={data?.leadsByStatus || {}} />
                    )}
                </div>

                {/* Sessions */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <BookOpen size={16} style={{ color: '#22c55e' }} />
                        <p className="font-bold text-[15px] text-white">Статус сессий</p>
                    </div>
                    {isLoading && !data ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-5 skeleton rounded" />)}
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {Object.entries(data?.sessionsByStatus || {}).map(([status, count]: any) => {
                                const meta = SESSION_LABELS[status] || { label: status, color: '#6b7280' }
                                return (
                                    <div key={status} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
                                            <span className="text-gray-400 text-[13px]">{meta.label}</span>
                                        </div>
                                        <span className="font-bold text-white text-[14px]">{count}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            <BottomNav />
        </div>
    )
}
