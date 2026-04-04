'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { fetchResultDetail, requestConsultation } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { CheckCircle2, ChevronRight, Share2, Award, Zap, AlertTriangle, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/context/I18nContext'

export default function ResultPage() {
    const { t, lang: currentLang } = useI18n()
    const { id: resultId } = useParams()
    const router = useRouter()

    const { data: result, isLoading } = useQuery({
        queryKey: ['result', resultId],
        queryFn: () => fetchResultDetail(resultId as string)
    })

    if (isLoading) return <div className="min-h-screen flex items-center justify-center">{t('results.loading')}</div>
    if (!result) return <div className="p-10 text-center">{t('results.not_found')}</div>

    const score = result.correct_count
    const total = result.correct_count + result.incorrect_count
    const percentage = result.score_percentage
    const skills = result.skill_breakdown ? Object.values(result.skill_breakdown) : []

    return (
        <main className="pb-32 page-fade-in bg-tg-bg min-h-screen">
            <header className="bg-gradient-to-b from-tg-button/20 to-transparent p-10 pt-16 flex flex-col items-center">
                <div className="relative mb-6">
                    <div className="w-32 h-32 rounded-full border-8 border-tg-button/10 flex items-center justify-center">
                        <div className="text-4xl font-black text-tg-button">{percentage}%</div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-tg-button text-white p-2 rounded-full shadow-lg">
                        <Award size={24} />
                    </div>
                </div>

                <h1 className="text-xl font-bold text-center mb-1">{result.session?.test?.title}</h1>
                <p className="text-tg-hint text-sm mb-6">{t('results.date')} {new Date(result.created_at).toLocaleDateString()}</p>

                <div className="flex gap-4">
                    <div className="bg-white/50 dark:bg-black/20 backdrop-blur-md px-4 py-2 rounded-xl text-center">
                        <span className="block text-xs text-tg-hint uppercase font-bold tracking-widest">{t('results.correct')}</span>
                        <span className="text-lg font-bold text-green-500">{score} / {total}</span>
                    </div>
                    <div className="bg-white/50 dark:bg-black/20 backdrop-blur-md px-4 py-2 rounded-xl text-center">
                        <span className="block text-xs text-tg-hint uppercase font-bold tracking-widest">{t('results.level')}</span>
                        <span className="text-lg font-bold text-tg-button">{result.level}</span>
                    </div>
                </div>
            </header>

            <section className="px-6 space-y-8">
                {/* Diagnostics Text */}
                <div className="card border-l-4 border-l-tg-button">
                    <h3 className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                        <MessageSquare size={16} /> {t('results.analysis')}
                    </h3>
                    <p className="text-sm leading-relaxed text-tg-text whitespace-pre-wrap">
                        {result.recommendation?.summary_text || 'Newton Academy helps you grow!'}
                    </p>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="card bg-green-500/5 border-green-500/10">
                        <h4 className="text-green-500 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                            <Zap size={14} /> {t('results.strengths')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {skills?.filter((s: any) => s.isStrong).map((s: any) => (
                                <span key={s.name} className="px-3 py-1 bg-green-500/10 text-green-600 rounded-lg text-xs font-semibold uppercase">
                                    {s.name}
                                </span>
                            )) || <span className="text-tg-hint text-xs italic">...</span>}
                        </div>
                    </div>

                    <div className="card bg-orange-500/5 border-orange-500/10">
                        <h4 className="text-orange-500 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                            <AlertTriangle size={14} /> {t('results.weaknesses')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {skills?.filter((s: any) => s.isWeak).map((s: any) => (
                                <span key={s.name} className="px-3 py-1 bg-orange-500/10 text-orange-600 rounded-lg text-xs font-semibold uppercase">
                                    {s.name}
                                </span>
                            )) || <span className="text-tg-hint text-xs italic">...</span>}
                        </div>
                    </div>
                </div>

                {/* CTA Enrollment */}
                <div className="card bg-[#2481cc] text-white p-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold mb-2">{t('results.cta_title')}</h3>
                        <p className="text-white/80 text-xs mb-6">
                            {t('results.cta_desc')}
                        </p>
                        <button
                            onClick={() => {
                                confirm('Consultation?')
                                requestConsultation('OFFLINE').then(() => alert('OK'))
                            }}
                            className="w-full py-4 bg-white text-tg-button font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
                        >
                            {t('results.cta_btn')}
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                </div>
            </section>

            <div className="flex justify-center p-8">
                <button className="text-tg-hint flex items-center gap-2 text-sm font-medium">
                    <Share2 size={16} /> Поделиться результатом
                </button>
            </div>

            <BottomNav />
        </main>
    )
}
