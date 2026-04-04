'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLeads, updateLeadStatus } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'

const STATUSES = ['', 'NEW', 'REGISTERED', 'STARTED_TEST', 'TEST_COMPLETED', 'WAITING_CONTACT', 'CONTACTED', 'ENROLLED', 'REJECTED']

const STATUS_LABELS: Record<string, string> = {
    NEW: 'Новый', REGISTERED: 'Зарегистрирован', STARTED_TEST: 'Начал тест',
    TEST_COMPLETED: 'Прошёл тест', WAITING_CONTACT: 'Ждёт звонка',
    CONTACTED: 'Связались', ENROLLED: 'Записан', REJECTED: 'Отказ',
}

function LeadCard({ lead, onUpdateStatus }: { lead: any; onUpdateStatus: (id: string, status: string) => void }) {
    const [expanded, setExpanded] = useState(false)
    const user = lead.user

    return (
        <div className="card" onClick={() => setExpanded(!expanded)}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                        {user?.first_name} {user?.last_name || ''}
                    </p>
                    <p className="text-xs text-gray-400">{user?.phone || '—'} · {user?.grade || '?'} класс</p>
                </div>
                <span className={`badge-${lead.status.toLowerCase()} shrink-0 text-[10px]`}>
                    {STATUS_LABELS[lead.status] || lead.status}
                </span>
            </div>

            {expanded && (
                <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-gray-400 mb-1">Направление: {user?.direction?.name || '—'}</p>
                    <p className="text-xs text-gray-400 mb-3">
                        Родитель: {user?.parent?.father_name || user?.parent?.mother_name || '—'}
                    </p>
                    <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Изменить статус</p>
                    <div className="flex flex-wrap gap-1.5">
                        {['CONTACTED', 'WAITING_CONTACT', 'ENROLLED', 'REJECTED'].map(s => (
                            <button
                                key={s}
                                onClick={(e) => { e.stopPropagation(); onUpdateStatus(lead.id, s) }}
                                className={`px-2.5 py-1 rounded-full text-xs border transition-all ${lead.status === s
                                        ? 'bg-blue-600 border-blue-500 text-white'
                                        : 'border-white/10 text-gray-300 hover:border-blue-500'
                                    }`}
                            >
                                {STATUS_LABELS[s]}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function LeadsPage() {
    const [statusFilter, setStatusFilter] = useState('')
    const [page, setPage] = useState(1)
    const queryClient = useQueryClient()

    const { data, isLoading } = useQuery({
        queryKey: ['leads', page, statusFilter],
        queryFn: () => fetchLeads(page, statusFilter || undefined),
    })

    const mutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            updateLeadStatus(id, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
    })

    return (
        <div className="flex flex-col pb-24">
            {/* Header */}
            <div className="sticky top-0 bg-[#0f0f1a]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 z-40">
                <h1 className="text-lg font-bold mb-2">Лиды</h1>
                {/* Status filter tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {STATUSES.map(s => (
                        <button
                            key={s}
                            onClick={() => { setStatusFilter(s); setPage(1) }}
                            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${statusFilter === s
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {s ? (STATUS_LABELS[s] || s) : 'Все'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 flex flex-col gap-2">
                {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <div key={i} className="card h-16 bg-white/5 animate-pulse" />
                    ))
                ) : data?.leads?.length === 0 ? (
                    <div className="card text-center py-10">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="text-gray-400">Лидов нет</p>
                    </div>
                ) : (
                    data?.leads?.map((lead: any) => (
                        <LeadCard
                            key={lead.id}
                            lead={lead}
                            onUpdateStatus={(id, status) => mutation.mutate({ id, status })}
                        />
                    ))
                )}

                {/* Pagination */}
                {data && data.total > 25 && (
                    <div className="flex items-center justify-between mt-4">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 rounded-xl bg-white/5 text-sm disabled:opacity-30"
                        >
                            ← Назад
                        </button>
                        <span className="text-xs text-gray-400">
                            {page} / {Math.ceil(data.total / 25)}
                        </span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page * 25 >= data.total}
                            className="px-4 py-2 rounded-xl bg-white/5 text-sm disabled:opacity-30"
                        >
                            Вперёд →
                        </button>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    )
}
