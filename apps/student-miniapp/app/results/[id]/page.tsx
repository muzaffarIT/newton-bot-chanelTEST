'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { fetchResultDetail, requestConsultation, fetchProfile, updateProfile } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import {
    CheckCircle2, ChevronRight, Share2, Award, Zap, AlertTriangle,
    MessageSquare, Loader2, Download, ArrowLeft, Trophy, Target,
    TrendingUp, BookOpen, Phone
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/context/I18nContext'

// ── Circular Progress Ring ────────────────────────────────────────────────────
function ProgressRing({ percent, color, size = 140, stroke = 10 }: {
    percent: number; color: string; size?: number; stroke?: number
}) {
    const r = (size - stroke) / 2
    const circ = 2 * Math.PI * r
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const t = setTimeout(() => setProgress(percent), 150)
        return () => clearTimeout(t)
    }, [percent])

    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ - (circ * progress) / 100}
                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
            />
        </svg>
    )
}

// ── Level Config ──────────────────────────────────────────────────────────────
function getLevelConfig(pct: number) {
    if (pct >= 85) return { label: 'Отлично', emoji: '🏆', color: '#10b981', ring: '#10b981', bg: 'from-emerald-600/20 to-teal-600/10', border: 'border-emerald-500/30' }
    if (pct >= 70) return { label: 'Хорошо', emoji: '🌟', color: '#3b82f6', ring: '#3b82f6', bg: 'from-blue-600/20 to-indigo-600/10', border: 'border-blue-500/30' }
    if (pct >= 50) return { label: 'Удовлетворительно', emoji: '📈', color: '#f59e0b', ring: '#f59e0b', bg: 'from-amber-600/15 to-orange-600/10', border: 'border-amber-500/30' }
    return { label: 'Нужна работа', emoji: '💪', color: '#ef4444', ring: '#ef4444', bg: 'from-red-600/15 to-pink-600/10', border: 'border-red-500/20' }
}

// ── PDF Generation ────────────────────────────────────────────────────────────
function generatePDF(result: any, profile: any) {
    const pct = result.score_percentage ?? 0
    const correct = result.correct_count ?? 0
    const total = (result.correct_count ?? 0) + (result.incorrect_count ?? 0)
    const testTitle = result.session?.test?.title || 'Тест'
    const date = new Date(result.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Студент'

    const lvl = getLevelConfig(pct)

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Результат теста — ${testTitle}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Arial, sans-serif; background: #fff; color: #0f172a; padding: 32px; }
  .header { background: linear-gradient(135deg, #1e3a8a, #312e81); color: white; border-radius: 16px; padding: 32px; margin-bottom: 24px; text-align: center; }
  .logo { font-size: 13px; opacity: 0.7; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
  .title { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  .date { font-size: 13px; opacity: 0.6; }
  .student { font-size: 16px; margin-top: 12px; font-weight: 600; opacity: 0.9; }
  .score-section { display: flex; gap: 16px; margin-bottom: 24px; }
  .score-card { flex: 1; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; }
  .score-big { font-size: 48px; font-weight: 900; color: #1e3a8a; }
  .score-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
  .score-sub { font-size: 14px; color: #475569; margin-top: 6px; font-weight: 600; }
  .level-badge { display: inline-block; padding: 6px 16px; border-radius: 999px; font-weight: 700; font-size: 14px; background: #dbeafe; color: #1d4ed8; }
  .section { background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #e2e8f0; }
  .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px; }
  .text-body { font-size: 14px; line-height: 1.7; color: #334155; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip-green { background: #dcfce7; color: #15803d; border-radius: 8px; padding: 4px 12px; font-size: 13px; font-weight: 600; }
  .chip-red { background: #fee2e2; color: #dc2626; border-radius: 8px; padding: 4px 12px; font-size: 13px; font-weight: 600; }
  .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
  .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .bar-label { width: 100px; font-size: 12px; color: #475569; }
  .bar-track { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; background: #3b82f6; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">Newton Academy</div>
  <div class="title">${testTitle}</div>
  <div class="date">${date}</div>
  <div class="student">👤 ${name}</div>
</div>

<div class="score-section">
  <div class="score-card">
    <div class="score-big">${pct}%</div>
    <div class="score-label">Результат</div>
    <div class="score-sub">${correct} из ${total} верных</div>
  </div>
  <div class="score-card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
    <div style="font-size:36px;margin-bottom:8px;">${lvl.emoji}</div>
    <span class="level-badge">${lvl.label}</span>
    <div class="score-label" style="margin-top:8px;">Уровень знаний</div>
  </div>
</div>

${result.recommendation?.summary_text ? `
<div class="section">
  <div class="section-title">📊 Академический анализ</div>
  <div class="text-body">${result.recommendation.summary_text}</div>
</div>` : ''}

${(result.skill_breakdown && Object.values(result.skill_breakdown).some((s: any) => s.isStrong)) ? `
<div class="section">
  <div class="section-title">✅ Освоенные темы</div>
  <div class="chips">
    ${Object.values(result.skill_breakdown).filter((s: any) => s.isStrong).map((s: any) => `<span class="chip-green">${s.name}</span>`).join('')}
  </div>
</div>` : ''}

${(result.skill_breakdown && Object.values(result.skill_breakdown).some((s: any) => s.isWeak)) ? `
<div class="section">
  <div class="section-title">⚡ Темы для улучшения</div>
  <div class="chips">
    ${Object.values(result.skill_breakdown).filter((s: any) => s.isWeak).map((s: any) => `<span class="chip-red">${s.name}</span>`).join('')}
  </div>
</div>` : ''}

<div class="footer">
  Этот отчёт сгенерирован Newton Academy · newtonacademy.uz<br>
  Дата: ${date}
</div>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) { alert('Разрешите всплывающие окна и попробуйте снова'); return }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 600)
}

// ── Share ─────────────────────────────────────────────────────────────────────
async function shareResult(result: any) {
    const pct = result.score_percentage ?? 0
    const testTitle = result.session?.test?.title || 'Тест'
    const text = `🎓 Я прошёл тест «${testTitle}» в Newton Academy!\n📊 Результат: ${pct}%\n\nПройди и ты! → https://t.me/NewtonAcademyBot`

    if (typeof navigator !== 'undefined' && navigator.share) {
        try {
            await navigator.share({ title: 'Мой результат — Newton Academy', text })
            return
        } catch {}
    }
    // Fallback: copy to clipboard
    try {
        await navigator.clipboard.writeText(text)
        alert('Ссылка скопирована! Теперь поделитесь в нужном месте.')
    } catch {
        alert(text)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════

export default function ResultPage() {
    const { t, lang } = useI18n()
    const { id: resultId } = useParams()
    const router = useRouter()
    const [consultRequested, setConsultRequested] = useState(false)
    const [consultLoading, setConsultLoading] = useState(false)
    const [isSubmittingInfo, setIsSubmittingInfo] = useState(false)
    const [infoForm, setInfoForm] = useState({ first_name: '', last_name: '', phone: '' })
    const [shareMsg, setShareMsg] = useState('')

    const { data: profile, refetch: refetchProfile } = useQuery({ queryKey: ['profile'], queryFn: fetchProfile })
    const { data: result, isLoading } = useQuery({
        queryKey: ['result', resultId],
        queryFn: () => fetchResultDetail(resultId as string)
    })

    useEffect(() => {
        if (profile) setInfoForm({ first_name: profile.first_name || '', last_name: profile.last_name || '', phone: profile.phone || '' })
    }, [profile])

    const handleRequestConsultation = async () => {
        setConsultLoading(true)
        try { await requestConsultation('OFFLINE'); setConsultRequested(true) }
        catch (e: any) { alert('Ошибка: ' + (e?.response?.data?.message || e?.message || 'Попробуйте снова')) }
        finally { setConsultLoading(false) }
    }

    const handleSaveInfo = async () => {
        if (!infoForm.first_name.trim() || !infoForm.last_name.trim() || !infoForm.phone.trim()) return alert('Заполните все поля!')
        setIsSubmittingInfo(true)
        try { await updateProfile(infoForm); await refetchProfile() }
        catch { alert('Ошибка при сохранении') }
        finally { setIsSubmittingInfo(false) }
    }

    const handleShare = async () => {
        await shareResult(result)
        setShareMsg('Скопировано!')
        setTimeout(() => setShareMsg(''), 2000)
    }

    // ── Loading / error states ──────────────────────────────────────────────
    if (isLoading || !profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#080818]">
                <Loader2 size={36} className="text-blue-500 animate-spin" />
                <p className="text-gray-400 text-sm">{t('results.loading')}</p>
            </div>
        )
    }

    if (!result) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-8 bg-[#080818]">
                <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle size={36} className="text-red-400" />
                </div>
                <p className="text-white font-black text-xl text-center">{t('results.not_found')}</p>
                <button onClick={() => router.push('/tests')}
                    className="mt-2 px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 active:scale-95 transition-all">
                    <ArrowLeft size={18} /> {t('test_player.back_to_tests')}
                </button>
            </div>
        )
    }

    // ── Data ────────────────────────────────────────────────────────────────
    const pct = Math.round(result.score_percentage ?? 0)
    const correct = result.correct_count ?? 0
    const total = correct + (result.incorrect_count ?? 0)
    const wrong = result.incorrect_count ?? 0
    const lvl = getLevelConfig(pct)
    const skills: any[] = result.skill_breakdown ? Object.values(result.skill_breakdown) : []
    const strong = skills.filter(s => s.isStrong)
    const weak = skills.filter(s => s.isWeak)
    const needsInfo = (!profile.phone || !profile.last_name || profile.first_name === 'Студент')
    const studentName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Студент'
    const dateStr = new Date(result.created_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })

    return (
        <main className="min-h-screen bg-[#080818] text-white pb-32 relative overflow-hidden" id="result-root">
            {/* Ambient glows */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className={cn("absolute top-[-10%] right-[-15%] w-[400px] h-[400px] rounded-full blur-[120px] opacity-30 bg-gradient-to-br", lvl.bg)} />
                <div className="absolute bottom-[10%] left-[-10%] w-80 h-80 bg-indigo-700/15 rounded-full blur-[100px]" />
            </div>

            {/* Profile info modal */}
            {needsInfo && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-5">
                    <div className="bg-[#14142a] p-7 rounded-[28px] w-full max-w-sm border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                            <Zap size={32} className="text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-center text-white mb-2">Отличная работа! 🎉</h2>
                        <p className="text-sm text-center text-gray-400 mb-6 leading-relaxed">
                            Заполните профиль, чтобы увидеть детальный разбор и скачать PDF-отчёт
                        </p>
                        <div className="space-y-3">
                            {(['first_name', 'last_name', 'phone'] as const).map((field) => (
                                <input key={field}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-blue-500 transition-colors text-sm"
                                    placeholder={field === 'first_name' ? 'Имя' : field === 'last_name' ? 'Фамилия' : '+998 90 000 00 00'}
                                    value={infoForm[field]}
                                    onChange={e => setInfoForm(p => ({ ...p, [field]: e.target.value }))}
                                />
                            ))}
                            <button onClick={handleSaveInfo} disabled={isSubmittingInfo}
                                className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                                {isSubmittingInfo ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                                {isSubmittingInfo ? 'Сохранение...' : 'Узнать результат'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Back button */}
            <div className="px-5 pt-6 pb-2">
                <button onClick={() => router.push('/tests')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white text-sm font-semibold transition-colors active:scale-95">
                    <ArrowLeft size={18} /> {t('results.back')}
                </button>
            </div>

            {/* Hero Score Section */}
            <header className="flex flex-col items-center px-5 pt-4 pb-8">
                <div className="relative mb-6">
                    <ProgressRing percent={pct} color={lvl.ring} size={160} stroke={12} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-black leading-none" style={{ color: lvl.color }}>{pct}</span>
                        <span className="text-lg font-bold text-gray-400 leading-none">%</span>
                    </div>
                    <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-2xl border-2 border-[#080818]"
                        style={{ background: `${lvl.color}22`, borderColor: `${lvl.color}44` }}>
                        {lvl.emoji}
                    </div>
                </div>

                <h1 className="text-2xl font-black text-center text-white mb-1 leading-tight max-w-[80%]">
                    {result.session?.test?.title}
                </h1>
                <p className="text-gray-500 text-sm mb-6">{dateStr}</p>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                    {[
                        { label: 'Верных', value: correct, color: '#10b981' },
                        { label: 'Неверных', value: wrong, color: '#ef4444' },
                        { label: 'Всего', value: total, color: '#6366f1' },
                    ].map(s => (
                        <div key={s.label}
                            className="rounded-[20px] p-4 text-center flex flex-col items-center gap-1"
                            style={{ background: `${s.color}12`, border: `1.5px solid ${s.color}28` }}>
                            <span className="text-2xl font-black" style={{ color: s.color }}>{s.value}</span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{s.label}</span>
                        </div>
                    ))}
                </div>
            </header>

            <section className="px-5 space-y-4">
                {/* Level Badge */}
                <div className={cn("rounded-[24px] p-5 border flex items-center gap-4", lvl.border, `bg-gradient-to-br ${lvl.bg}`)}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                        style={{ background: `${lvl.color}18` }}>
                        {lvl.emoji}
                    </div>
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{t('results.level')}</p>
                        <p className="text-xl font-black text-white">{lvl.label}</p>
                        <p className="text-[12px] text-gray-400 mt-0.5">
                            {pct >= 85 ? 'Превосходный результат! Продолжай в том же духе.' :
                             pct >= 70 ? 'Хороший результат. Есть пространство для роста.' :
                             pct >= 50 ? 'Неплохо! Поработай над слабыми темами.' :
                             'Не сдавайся — каждая ошибка учит чему-то новому.'}
                        </p>
                    </div>
                </div>

                {/* Progress bar visualization */}
                <div className="rounded-[24px] p-5 border border-white/6" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                        <Target size={13} /> Полоса результатов
                    </h3>
                    <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-[1.2s] ease-out"
                            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${lvl.ring}aa, ${lvl.ring})` }} />
                    </div>
                    <div className="flex justify-between mt-2">
                        <span className="text-[11px] text-gray-500">0%</span>
                        <span className="text-[11px] font-bold" style={{ color: lvl.color }}>{pct}%</span>
                        <span className="text-[11px] text-gray-500">100%</span>
                    </div>
                </div>

                {/* Analysis text */}
                {result.recommendation?.summary_text && (
                    <div className="rounded-[24px] p-5 border-l-4 border border-blue-500/30"
                        style={{ background: 'rgba(59,130,246,0.06)', borderLeftColor: '#3b82f6' }}>
                        <h3 className="text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 text-blue-400">
                            <MessageSquare size={13} /> {t('results.analysis')}
                        </h3>
                        <p className="text-[14px] leading-relaxed text-gray-300 font-medium">
                            {result.recommendation.summary_text}
                        </p>
                    </div>
                )}

                {/* Strengths */}
                {strong.length > 0 && (
                    <div className="rounded-[24px] p-5 border border-emerald-500/20" style={{ background: 'rgba(16,185,129,0.05)' }}>
                        <h4 className="text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 text-emerald-400">
                            <CheckCircle2 size={13} /> {t('results.strengths')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {strong.map((s: any) => (
                                <span key={s.name} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold">
                                    ✓ {s.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Weaknesses */}
                {weak.length > 0 && (
                    <div className="rounded-[24px] p-5 border border-orange-500/20" style={{ background: 'rgba(245,158,11,0.05)' }}>
                        <h4 className="text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 text-orange-400">
                            <TrendingUp size={13} /> {t('results.weaknesses')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {weak.map((s: any) => (
                                <span key={s.name} className="px-3 py-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl text-xs font-bold">
                                    ↑ {s.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                        onClick={() => generatePDF(result, profile)}
                        className="flex items-center justify-center gap-2 py-4 rounded-[20px] font-bold text-sm active:scale-95 transition-all border border-white/10"
                        style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Download size={18} className="text-blue-400" />
                        <span>Скачать PDF</span>
                    </button>
                    <button
                        onClick={handleShare}
                        className="flex items-center justify-center gap-2 py-4 rounded-[20px] font-bold text-sm active:scale-95 transition-all border border-white/10 relative"
                        style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Share2 size={18} className="text-purple-400" />
                        <span>{shareMsg || 'Поделиться'}</span>
                    </button>
                </div>

                {/* Consultation CTA */}
                <div className="relative overflow-hidden rounded-[28px] p-7 mt-2"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #4c1d95 100%)', border: '1px solid rgba(99,102,241,0.3)' }}>
                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none opacity-20"
                        style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.8), transparent)' }} />
                    <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full pointer-events-none opacity-15"
                        style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.8), transparent)' }} />

                    <div className="relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
                            <Phone size={22} className="text-white" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2 leading-snug">
                            {t('results.cta_title') || 'Хотите улучшить результат?'}
                        </h3>
                        <p className="text-indigo-200/80 text-sm mb-6 leading-relaxed">
                            {t('results.cta_desc') || 'Запишитесь на профессиональную консультацию с экспертом академии.'}
                        </p>
                        <button
                            onClick={handleRequestConsultation}
                            disabled={consultLoading || consultRequested}
                            className={cn(
                                "w-full py-4 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all",
                                consultRequested
                                    ? "bg-emerald-500/80 text-white border border-emerald-400/30"
                                    : "bg-white text-indigo-700 hover:bg-white/90 disabled:opacity-60"
                            )}>
                            {consultLoading && <Loader2 size={18} className="animate-spin" />}
                            {consultRequested
                                ? <><CheckCircle2 size={18} /> Заявка отправлена! Ждите</>
                                : <>{t('results.cta_btn') || 'Оставить заявку'} {!consultLoading && <ChevronRight size={18} />}</>}
                        </button>
                    </div>
                </div>

                {/* Back to tests */}
                <button
                    onClick={() => router.push('/tests')}
                    className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all border border-white/8 text-gray-400"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <BookOpen size={18} /> {t('results.back') || 'Все тесты'}
                </button>
            </section>

            <div className="print:hidden">
                <BottomNav />
            </div>
        </main>
    )
}
