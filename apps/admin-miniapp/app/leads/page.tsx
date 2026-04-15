'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchLeads, fetchLead, updateLeadStatus, updateLeadTags,
    updateLeadComment, notifyLeadTelegram, syncLeadToSheets
} from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import {
    Phone, BookOpen, User, ChevronRight, Search, X, Tag, MessageSquare,
    Bell, Sheet, Award, TrendingUp, CheckCircle, Clock, AlertTriangle,
    Loader2, ArrowLeft, Star, Zap, Target, Calendar, BarChart2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ['', 'NEW', 'REGISTERED', 'STARTED_TEST', 'TEST_COMPLETED', 'WAITING_CONTACT', 'CONTACTED', 'ENROLLED', 'REJECTED']

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
    NEW:             { label: 'Новый',         color: 'text-gray-300',   bg: 'bg-gray-500/10 border-gray-500/20',    emoji: '👤' },
    REGISTERED:      { label: 'Зарег.',        color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',    emoji: '✅' },
    STARTED_TEST:    { label: 'Тест: начал',   color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20',emoji: '✏️' },
    TEST_COMPLETED:  { label: 'Тест: готово',  color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20',emoji: '📊' },
    WAITING_CONTACT: { label: 'Ждёт звонка',  color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20',emoji: '🔥' },
    CONTACTED:       { label: 'Связались',     color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20',    emoji: '📞' },
    ENROLLED:        { label: 'Записан',       color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20',emoji: '🏆' },
    REJECTED:        { label: 'Отказ',         color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',      emoji: '❌' },
}

const ACTION_STATUSES = ['WAITING_CONTACT', 'CONTACTED', 'ENROLLED', 'REJECTED']

const PRESET_TAGS = ['горячий', 'онлайн', 'оффлайн', 'перезвонить', 'записан', 'думает', 'дорого', 'VIP', 'тест_пройден']

function getLevelConfig(pct: number) {
    if (pct >= 85) return { label: 'Отлично',          color: '#10b981', emoji: '🏆' }
    if (pct >= 70) return { label: 'Хорошо',           color: '#3b82f6', emoji: '🌟' }
    if (pct >= 50) return { label: 'Удовлетв.',        color: '#f59e0b', emoji: '📈' }
    return          { label: 'Нужна работа',            color: '#ef4444', emoji: '💪' }
}

// ─── LeadCard ─────────────────────────────────────────────────────────────────

function LeadCard({ lead, onClick }: { lead: any; onClick: () => void }) {
    const user = lead.user
    const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG['NEW']
    const pct = lead.latestResult?.score_percentage
    const level = pct != null ? getLevelConfig(pct) : null
    const isHot = lead.status === 'WAITING_CONTACT'
    const initials = `${user?.first_name?.[0] || '?'}${user?.last_name?.[0] || ''}`.toUpperCase()

    return (
        <div
            onClick={onClick}
            className={cn(
                "relative rounded-[20px] p-4 border cursor-pointer active:scale-[0.98] transition-all duration-200",
                isHot
                    ? "bg-orange-500/8 border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.08)]"
                    : "bg-[#111120] border-white/6 hover:border-white/15"
            )}
        >
            {isHot && (
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30">
                    <span className="text-[10px]">🔥</span>
                    <span className="text-[9px] font-black text-orange-400 uppercase tracking-wider">Горячий</span>
                </div>
            )}

            <div className="flex items-start gap-3.5">
                <div
                    className="w-11 h-11 rounded-[14px] flex items-center justify-center font-black text-sm shrink-0"
                    style={{ background: isHot ? 'rgba(249,115,22,0.15)' : 'rgba(99,102,241,0.12)', color: isHot ? '#fb923c' : '#818cf8' }}
                >
                    {initials}
                </div>

                <div className="flex-1 min-w-0 pr-10">
                    <p className="font-bold text-[15px] text-white truncate leading-tight">
                        {user?.first_name} {user?.last_name || ''}
                    </p>
                    <p className="text-[12px] text-gray-500 mt-0.5">
                        {user?.phone || '—'} {user?.grade ? `· ${user.grade} кл.` : ''}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        {/* Status badge */}
                        <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border", cfg.bg, cfg.color)}>
                            {cfg.emoji} {cfg.label}
                        </span>

                        {/* Test score badge */}
                        {pct != null && level && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black border"
                                style={{ color: level.color, background: `${level.color}15`, borderColor: `${level.color}30` }}>
                                {level.emoji} {pct}%
                            </span>
                        )}

                        {/* Test count */}
                        {lead.testCount > 0 && (
                            <span className="text-[10px] text-gray-600 font-semibold">
                                {lead.testCount} тест{lead.testCount > 1 ? 'ов' : ''}
                            </span>
                        )}
                    </div>

                    {/* Tags */}
                    {lead.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {lead.tags.slice(0, 3).map((tag: string) => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-gray-500 font-medium">
                                    #{tag}
                                </span>
                            ))}
                            {lead.tags.length > 3 && <span className="text-[10px] text-gray-600">+{lead.tags.length - 3}</span>}
                        </div>
                    )}
                </div>

                <ChevronRight size={16} className="text-gray-700 shrink-0 mt-1" />
            </div>
        </div>
    )
}

// ─── Lead Detail Drawer ────────────────────────────────────────────────────────

function LeadDrawer({ leadId, onClose }: { leadId: string; onClose: () => void }) {
    const [tab, setTab] = useState<'profile' | 'tests' | 'history'>('profile')
    const [comment, setComment] = useState('')
    const [commentSaved, setCommentSaved] = useState(false)
    const [actionMsg, setActionMsg] = useState('')
    const queryClient = useQueryClient()

    const { data: lead, isLoading } = useQuery({
        queryKey: ['lead-detail', leadId],
        queryFn: () => fetchLead(leadId),
    })

    // React Query v5 doesn't have onSuccess on useQuery, so use useEffect instead
    useEffect(() => {
        if (lead) {
            setComment(lead.manager_comment || '')
        }
    }, [lead])

    const statusMut = useMutation({
        mutationFn: ({ status }: { status: string }) => updateLeadStatus(leadId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] })
            queryClient.invalidateQueries({ queryKey: ['lead-detail', leadId] })
            flash('✅ Статус обновлён')
        },
    })

    const tagMut = useMutation({
        mutationFn: (tags: string[]) => updateLeadTags(leadId, tags),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lead-detail', leadId] }),
    })

    const commentMut = useMutation({
        mutationFn: () => updateLeadComment(leadId, comment),
        onSuccess: () => { setCommentSaved(true); setTimeout(() => setCommentSaved(false), 2000) },
    })

    const notifyMut = useMutation({
        mutationFn: () => notifyLeadTelegram(leadId),
        onSuccess: () => flash('📩 Уведомление отправлено в Telegram'),
        onError: () => flash('❌ Ошибка. Проверьте ADMIN_GROUP_CHAT_ID'),
    })

    const sheetsMut = useMutation({
        mutationFn: () => syncLeadToSheets(leadId),
        onSuccess: () => flash('📊 Синхронизировано с Google Sheets'),
        onError: (e: any) => flash('❌ ' + (e?.response?.data?.message?.replace?.('Sheets sync failed: ', '') || 'Ошибка Sheets')),
    })

    const flash = (msg: string) => {
        setActionMsg(msg)
        setTimeout(() => setActionMsg(''), 3000)
    }

    const toggleTag = (tag: string) => {
        const current: string[] = lead?.tags || []
        const next = current.includes(tag) ? current.filter((t: string) => t !== tag) : [...current, tag]
        tagMut.mutate(next)
    }

    if (isLoading || !lead) return (
        <div className="flex-1 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
    )

    const user = lead.user
    const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG['NEW']
    const latestResult = lead.latestResult
    const allResults: any[] = lead.allResults || []
    const history: any[] = lead.history || []

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Drawer Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/6 shrink-0">
                <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center active:scale-95 transition-all">
                    <ArrowLeft size={18} className="text-gray-400" />
                </button>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-white text-[16px] leading-tight truncate">
                        {user?.first_name} {user?.last_name || ''}
                    </p>
                    <p className="text-[12px] text-gray-500">{user?.phone || '—'}</p>
                </div>
                <span className={cn("px-2.5 py-1 rounded-xl text-[11px] font-black border", cfg.bg, cfg.color)}>
                    {cfg.emoji} {cfg.label}
                </span>
            </div>

            {/* Flash message */}
            {actionMsg && (
                <div className="mx-5 mt-3 px-4 py-2.5 rounded-2xl bg-white/8 border border-white/10 text-[13px] text-white font-semibold text-center animate-in fade-in duration-200">
                    {actionMsg}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 px-5 pt-3 pb-1 shrink-0">
                {(['profile', 'tests', 'history'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={cn(
                            "flex-1 py-2 rounded-xl text-[12px] font-bold transition-all",
                            tab === t ? "bg-[#1e1e35] text-white border border-white/10" : "text-gray-600 hover:text-gray-400"
                        )}>
                        {t === 'profile' ? '👤 Профиль' : t === 'tests' ? '📊 Тесты' : '📋 История'}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 pt-3 space-y-4">

                {/* ── PROFILE TAB ─────────────────────────────────────────── */}
                {tab === 'profile' && (
                    <>
                        {/* Contact card */}
                        <div className="rounded-[20px] bg-[#111120] border border-white/6 p-4 space-y-3">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600">Контакт</h3>
                            <div className="flex flex-col gap-2">
                                {[
                                    { icon: <User size={14} />, label: 'ФИО', value: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || '—' },
                                    { icon: <Phone size={14} />, label: 'Телефон', value: user?.phone, link: user?.phone ? `tel:${user.phone}` : undefined },
                                    { icon: <BookOpen size={14} />, label: 'Класс', value: user?.grade ? `${user.grade} класс` : '—' },
                                    { icon: <Star size={14} />, label: 'Направление', value: user?.direction?.name || '—' },
                                    { icon: <User size={14} />, label: 'Родитель', value: user?.parent?.father_name || user?.parent?.mother_name || '—' },
                                    { icon: <Calendar size={14} />, label: 'Зарегистрирован', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '—' },
                                    { icon: <Zap size={14} />, label: 'Язык', value: user?.language_code === 'uz' ? '🇺🇿 Uzbek' : '🇷🇺 Русский' },
                                ].map(row => (
                                    <div key={row.label} className="flex items-center gap-2.5 py-1.5">
                                        <span className="text-gray-600 shrink-0">{row.icon}</span>
                                        <span className="text-[12px] text-gray-600 w-24 shrink-0">{row.label}</span>
                                        {row.link
                                            ? <a href={row.link} className="text-[13px] font-semibold text-blue-400 underline">{row.value}</a>
                                            : <span className="text-[13px] font-semibold text-white">{row.value}</span>
                                        }
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick actions */}
                        <div className="grid grid-cols-2 gap-2.5">
                            {user?.phone && (
                                <a href={`tel:${user.phone}`}
                                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold text-[13px] active:scale-95 transition-all">
                                    <Phone size={16} /> Позвонить
                                </a>
                            )}
                            {user?.telegram_id && (
                                <a href={`tg://user?id=${user.telegram_id}`}
                                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-blue-400 font-bold text-[13px] active:scale-95 transition-all">
                                    <MessageSquare size={16} /> Telegram
                                </a>
                            )}
                            <button onClick={() => notifyMut.mutate()} disabled={notifyMut.isPending}
                                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/25 text-orange-400 font-bold text-[13px] active:scale-95 transition-all disabled:opacity-50">
                                {notifyMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
                                Оповестить
                            </button>
                            <button onClick={() => sheetsMut.mutate()} disabled={sheetsMut.isPending}
                                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-500/10 border border-green-500/25 text-green-400 font-bold text-[13px] active:scale-95 transition-all disabled:opacity-50">
                                {sheetsMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <BarChart2 size={15} />}
                                → Sheets
                            </button>
                        </div>

                        {/* Status change */}
                        <div className="rounded-[20px] bg-[#111120] border border-white/6 p-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-3">Изменить статус</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {ACTION_STATUSES.map(s => {
                                    const c = STATUS_CONFIG[s]
                                    const isActive = lead.status === s
                                    return (
                                        <button key={s}
                                            onClick={() => statusMut.mutate({ status: s })}
                                            disabled={isActive || statusMut.isPending}
                                            className={cn(
                                                "py-2.5 px-3 rounded-xl text-[12px] font-bold transition-all border active:scale-95",
                                                isActive ? cn(c.bg, c.color) : "bg-white/3 border-white/8 text-gray-500 hover:text-gray-300"
                                            )}>
                                            {c?.emoji} {c?.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="rounded-[20px] bg-[#111120] border border-white/6 p-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-3 flex items-center gap-2">
                                <Tag size={11} /> Теги CRM
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_TAGS.map(tag => {
                                    const isActive = (lead.tags || []).includes(tag)
                                    return (
                                        <button key={tag} onClick={() => toggleTag(tag)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-xl text-[12px] font-bold border transition-all active:scale-95",
                                                isActive
                                                    ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                                                    : "bg-white/3 border-white/8 text-gray-600 hover:text-gray-400"
                                            )}>
                                            {isActive && '✓ '}#{tag}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Manager Comment */}
                        <div className="rounded-[20px] bg-[#111120] border border-white/6 p-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-3 flex items-center gap-2">
                                <MessageSquare size={11} /> Комментарий менеджера
                            </h3>
                            <textarea
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="Заметки о лиде, договорённости..."
                                rows={3}
                                className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-[13px] text-white outline-none focus:border-indigo-500 transition-colors resize-none placeholder:text-gray-700"
                            />
                            <button onClick={() => commentMut.mutate()} disabled={commentMut.isPending}
                                className="mt-2 w-full py-2.5 rounded-xl text-[13px] font-bold bg-indigo-600/80 hover:bg-indigo-600 text-white transition-all active:scale-95 disabled:opacity-50">
                                {commentSaved ? '✅ Сохранено' : commentMut.isPending ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </>
                )}

                {/* ── TESTS TAB ───────────────────────────────────────────── */}
                {tab === 'tests' && (
                    <>
                        {allResults.length === 0 ? (
                            <div className="text-center py-16 text-gray-600">
                                <Target size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="font-semibold">Тестов не сдавалось</p>
                            </div>
                        ) : allResults.map((r: any, i: number) => {
                            const pct = r.score_percentage ?? 0
                            const lvl = getLevelConfig(pct)
                            const skills: any[] = r.skill_breakdown ? Object.values(r.skill_breakdown) : []
                            const strong = skills.filter(s => s.isStrong)
                            const weak = skills.filter(s => s.isWeak)
                            return (
                                <div key={r.id} className="rounded-[20px] bg-[#111120] border border-white/6 p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-bold text-white text-[14px]">{r.test_title || 'Тест'}</p>
                                            <p className="text-[11px] text-gray-600 mt-0.5">
                                                {new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-2xl font-black" style={{ color: lvl.color }}>{pct}%</span>
                                            <span className="text-[10px] font-bold" style={{ color: lvl.color }}>{lvl.emoji} {lvl.label}</span>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-3">
                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: lvl.color, transition: 'width 0.6s' }} />
                                    </div>

                                    <div className="flex gap-3 text-[12px] text-gray-500 mb-3">
                                        <span className="text-emerald-400 font-semibold">✓ {r.correct_count} верных</span>
                                        <span className="text-red-400 font-semibold">✗ {r.incorrect_count} неверных</span>
                                    </div>

                                    {/* Recommendation */}
                                    {r.recommendation?.summary_text && (
                                        <p className="text-[12px] text-gray-400 leading-relaxed bg-white/3 rounded-xl p-3 mb-3 italic">
                                            "{r.recommendation.summary_text.slice(0, 200)}..."
                                        </p>
                                    )}

                                    {strong.length > 0 && (
                                        <div className="mb-2">
                                            <p className="text-[10px] font-black text-emerald-500 uppercase mb-1.5">✅ Сильные темы</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {strong.map((s: any) => (
                                                    <span key={s.name} className="text-[11px] px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">{s.name}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {weak.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-black text-orange-500 uppercase mb-1.5">⚡ Зоны роста</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {weak.map((s: any) => (
                                                    <span key={s.name} className="text-[11px] px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold">{s.name}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </>
                )}

                {/* ── HISTORY TAB ─────────────────────────────────────────── */}
                {tab === 'history' && (
                    <div className="relative">
                        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/6" />
                        <div className="space-y-4">
                            {history.map((h: any, i: number) => {
                                const cfg = STATUS_CONFIG[h.new_status]
                                return (
                                    <div key={h.id} className="flex items-start gap-4 relative">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0 border-2 border-[#080818] z-10",
                                            cfg?.bg || 'bg-gray-500/10'
                                        )}>
                                            {cfg?.emoji || '•'}
                                        </div>
                                        <div className="flex-1 pt-1">
                                            <p className={cn("text-[13px] font-bold", cfg?.color || 'text-gray-400')}>
                                                {cfg?.label || h.new_status}
                                            </p>
                                            <div className="flex gap-2 mt-0.5">
                                                <span className="text-[11px] text-gray-600">
                                                    {new Date(h.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {h.changed_by && h.changed_by !== 'SYSTEM' && (
                                                    <span className="text-[11px] text-indigo-500">• {h.changed_by}</span>
                                                )}
                                                {h.changed_by === 'SYSTEM' && (
                                                    <span className="text-[11px] text-gray-700">• Автоматически</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LeadsPage() {
    const [statusFilter, setStatusFilter] = useState('')
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [page, setPage] = useState(1)
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
    const queryClient = useQueryClient()
    const searchTimeout = useRef<any>(null)

    const { data, isLoading } = useQuery({
        queryKey: ['leads', page, statusFilter, search],
        queryFn: () => fetchLeads(page, statusFilter || undefined, search || undefined),
    })

    const statusMut = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => updateLeadStatus(id, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
    })

    const handleSearch = (val: string) => {
        setSearchInput(val)
        clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(() => { setSearch(val); setPage(1) }, 350)
    }

    const total = data?.total || 0
    const totalPages = Math.ceil(total / 25)

    // Count hot leads
    const hotCount = (data?.leads || []).filter((l: any) => l.status === 'WAITING_CONTACT').length

    return (
        <div className="flex flex-col min-h-screen bg-[#080818]" style={{ paddingBottom: selectedLeadId ? 0 : 90 }}>

            {/* Drawer overlay */}
            {selectedLeadId && (
                <div className="fixed inset-0 z-50 bg-[#080818] flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    <LeadDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
                </div>
            )}

            {/* Sticky Header */}
            <div className="sticky top-0 z-40 backdrop-blur-2xl border-b border-white/6"
                style={{ background: 'rgba(8,8,24,0.9)' }}>
                <div className="px-5 pt-5 pb-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[20px] font-black text-white flex items-center gap-2">
                                Лиды CRM
                                {hotCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[11px] font-black">
                                        🔥 {hotCount}
                                    </span>
                                )}
                            </h1>
                            <p className="text-[12px] text-gray-600">{total} записей</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                        <input
                            value={searchInput}
                            onChange={e => handleSearch(e.target.value)}
                            placeholder="Поиск по имени, телефону..."
                            className="w-full bg-white/4 border border-white/8 rounded-2xl pl-10 pr-10 py-2.5 text-[14px] text-white outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-700"
                        />
                        {searchInput && (
                            <button onClick={() => { setSearchInput(''); setSearch('') }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    {/* Status filter tabs */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                        {STATUSES.map(s => {
                            const cfg = s ? STATUS_CONFIG[s] : null
                            return (
                                <button key={s || 'all'}
                                    onClick={() => { setStatusFilter(s); setPage(1) }}
                                    className={cn(
                                        "shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border",
                                        statusFilter === s
                                            ? (cfg ? cn(cfg.bg, cfg.color) : "bg-white/10 text-white border-white/20")
                                            : "bg-white/3 text-gray-600 border-white/6 hover:text-gray-400"
                                    )}>
                                    {s ? `${cfg?.emoji} ${cfg?.label}` : 'Все'}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Lead List */}
            <div className="p-4 space-y-2.5">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-24 rounded-[20px] bg-white/3 animate-pulse" />
                    ))
                ) : data?.leads?.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-4xl mb-3">📭</p>
                        <p className="text-gray-500 font-semibold">Лидов не найдено</p>
                        <p className="text-gray-700 text-[13px] mt-1">
                            {statusFilter || search ? 'Попробуйте другой фильтр или поиск' : 'Лиды появятся после регистрации первых студентов'}
                        </p>
                    </div>
                ) : (
                    data?.leads?.map((lead: any) => (
                        <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLeadId(lead.id)} />
                    ))
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="px-4 py-2 rounded-xl bg-white/5 text-[13px] font-bold text-gray-400 disabled:opacity-30 active:scale-95 transition-all">
                            ← Назад
                        </button>
                        <span className="text-[12px] text-gray-600">{page} / {totalPages}</span>
                        <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                            className="px-4 py-2 rounded-xl bg-white/5 text-[13px] font-bold text-gray-400 disabled:opacity-30 active:scale-95 transition-all">
                            Вперёд →
                        </button>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    )
}
