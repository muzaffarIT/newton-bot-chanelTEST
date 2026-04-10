'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLeads, updateLeadStatus } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { ChevronDown, ChevronUp, Phone, Book, User } from 'lucide-react'

const STATUSES = ['', 'NEW', 'REGISTERED', 'STARTED_TEST', 'TEST_COMPLETED', 'WAITING_CONTACT', 'CONTACTED', 'ENROLLED', 'REJECTED']

const STATUS_LABELS: Record<string, string> = {
    NEW: 'Новый', REGISTERED: 'Зарегистрирован', STARTED_TEST: 'Начал тест',
    TEST_COMPLETED: 'Прошёл тест', WAITING_CONTACT: 'Ждёт звонка',
    CONTACTED: 'Связались', ENROLLED: 'Записан', REJECTED: 'Отказ',
}

const ACTION_STATUSES = ['CONTACTED', 'WAITING_CONTACT', 'ENROLLED', 'REJECTED']

function LeadCard({ lead, onUpdateStatus }: { lead: any; onUpdateStatus: (id: string, status: string) => void }) {
    const [expanded, setExpanded] = useState(false)
    const user = lead.user
    const initials = `${user?.first_name?.[0] || '?'}${user?.last_name?.[0] || ''}`.toUpperCase()

    return (
        <div className="card transition-all" style={{ padding: 0 }}>
            {/* Card header — always visible */}
            <div
                className="flex items-center gap-3 p-4 cursor-pointer select-none"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center font-bold text-[13px] shrink-0" style={{ background: 'rgba(79,110,247,0.12)', color: '#818cf8' }}>
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] text-white truncate">
                        {user?.first_name} {user?.last_name || ''}
                    </p>
                    <p className="text-[12px] text-gray-600 mt-0.5">{user?.phone || '—'} · {user?.grade || '?'} кл.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`badge-${lead.status.toLowerCase()}`}>{STATUS_LABELS[lead.status] || lead.status}</span>
                    {expanded ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
                </div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="pt-3 space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-[13px] text-gray-500">
                            <Book size={13} />
                            <span>Направление: <span className="text-gray-300">{user?.direction?.name || '—'}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-[13px] text-gray-500">
                            <User size={13} />
                            <span>Родитель: <span className="text-gray-300">{user?.parent?.father_name || user?.parent?.mother_name || '—'}</span></span>
                        </div>
                        {user?.phone && (
                            <div className="flex items-center gap-2 text-[13px] text-gray-500">
                                <Phone size={13} />
                                <a href={`tel:${user.phone}`} className="text-blue-400 underline">{user.phone}</a>
                            </div>
                        )}
                    </div>
                    <p className="field-label mb-2">Изменить статус</p>
                    <div className="flex flex-wrap gap-1.5">
                        {ACTION_STATUSES.map(s => (
                            <button
                                key={s}
                                onClick={(e) => { e.stopPropagation(); onUpdateStatus(lead.id, s) }}
                                className="px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all active:scale-95"
                                style={
                                    lead.status === s
                                        ? { background: 'var(--accent)', color: 'white', border: '1px solid transparent' }
                                        : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                                }
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
        mutationFn: ({ id, status }: { id: string; status: string }) => updateLeadStatus(id, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
    })

    const total = data?.total || 0
    const totalPages = Math.ceil(total / 25)

    return (
        <div className="flex flex-col pb-24 min-h-screen">
            {/* Sticky Header */}
            <div className="sticky top-0 z-40 px-4 pt-5 pb-3 space-y-3" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-[18px] font-extrabold text-white">Лиды</h1>
                        <p className="text-[12px] text-gray-600">{total} записей</p>
                    </div>
                </div>
                {/* Filter tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                    {STATUSES.map(s => (
                        <button
                            key={s || 'all'}
                            onClick={() => { setStatusFilter(s); setPage(1) }}
                            className="shrink-0 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all"
                            style={
                                statusFilter === s
                                    ? { background: 'var(--accent)', color: 'white' }
                                    : { background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                            }
                        >
                            {s ? (STATUS_LABELS[s] || s) : 'Все'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 space-y-2.5">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-16 skeleton rounded-[18px]" />
                    ))
                ) : data?.leads?.length === 0 ? (
                    <div className="card text-center py-14" style={{ borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.07)', marginTop: 24 }}>
                        <p className="text-4xl mb-3">📭</p>
                        <p className="text-gray-500 font-semibold">Лидов не найдено</p>
                        <p className="text-gray-700 text-[13px] mt-1">
                            {statusFilter ? 'Попробуйте другой фильтр' : 'Лиды появятся после регистрации первых студентов'}
                        </p>
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
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="btn-ghost text-[13px] disabled:opacity-30"
                        >
                            ← Назад
                        </button>
                        <span className="text-[12px] text-gray-600">{page} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= totalPages}
                            className="btn-ghost text-[13px] disabled:opacity-30"
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
