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
        <main className="pb-32 page-fade-in relative min-h-screen">
            {/* Background Decor */}
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
            <div className="absolute bottom-[20%] left-[-10%] w-80 h-80 bg-emerald-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

            <header className="pt-16 pb-12 flex flex-col items-center relative">
                {/* Center Circle Glow */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/20 rounded-full blur-[50px] -z-10 pointer-events-none" />

                <div className="relative mb-6 group">
                    <div className="w-36 h-36 rounded-full glass flex items-center justify-center border-4 border-white/10 shadow-[0_0_40px_rgba(59,130,246,0.15)] group-hover:scale-105 transition-transform duration-500">
                        <div className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-400 to-indigo-300">
                            {percentage}%
                        </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-3 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.4)] border-2 border-[#0a0a0f]">
                        <Award size={24} />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center text-white mb-2 max-w-[80%] leading-tight">
                    {result.session?.test?.title}
                </h1>
                <p className="text-gray-400 text-sm font-medium mb-8">
                    {t('results.date') || 'Сдано:'} {new Date(result.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>

                <div className="flex gap-4 w-full px-6 max-w-sm">
                    <div className="flex-1 glass-card p-4 rounded-[20px] text-center border border-white/5">
                        <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">{t('results.correct') || 'Правильно'}</span>
                        <span className="text-2xl font-bold text-emerald-400">{score} <span className="text-gray-500 text-lg">/ {total}</span></span>
                    </div>
                    <div className="flex-1 glass-card p-4 rounded-[20px] text-center border border-white/5">
                        <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">{t('results.level') || 'Уровень'}</span>
                        <span className="text-lg font-bold text-blue-400 mt-1 block">{result.level}</span>
                    </div>
                </div>
            </header>

            <section className="px-5 space-y-5">
                {/* Diagnostics Text */}
                <div className="glass-card p-6 rounded-[28px] border-l-4 border-l-blue-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                    <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-white">
                        <MessageSquare size={16} className="text-blue-400" /> {t('results.analysis') || 'Академический анализ'}
                    </h3>
                    <p className="text-[15px] leading-relaxed text-gray-300 whitespace-pre-wrap font-medium">
                        {result.recommendation?.summary_text || 'Newton Academy помогает раскрыть ваш потенциал! Наши эксперты готовы проанализировать ваши результаты и составить индивидуальный план развития.'}
                    </p>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="glass-card p-5 rounded-[24px] border border-emerald-500/10 bg-emerald-500/5">
                        <h4 className="text-emerald-400 text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <CheckCircle2 size={16} /> {t('results.strengths') || 'Освоенные зоны'}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {skills?.filter((s: any) => s.isStrong).map((s: any) => (
                                <span key={s.name} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold">
                                    {s.name}
                                </span>
                            )) || <span className="text-gray-500 text-xs italic font-medium">Данные формируются...</span>}
                        </div>
                    </div>

                    <div className="glass-card p-5 rounded-[24px] border border-orange-500/10 bg-orange-500/5">
                        <h4 className="text-orange-400 text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <AlertTriangle size={16} /> {t('results.weaknesses') || 'Зоны роста'}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {skills?.filter((s: any) => s.isWeak).map((s: any) => (
                                <span key={s.name} className="px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-xl text-xs font-bold">
                                    {s.name}
                                </span>
                            )) || <span className="text-gray-500 text-xs italic font-medium">Данные формируются...</span>}
                        </div>
                    </div>
                </div>

                {/* CTA Enrollment */}
                <div className="mt-8 relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 rounded-[32px] text-white shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] border border-white/10 group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] group-hover:bg-white/20 transition-colors pointer-events-none" />
                    
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold mb-3 leading-tight tracking-tight">
                            {t('results.cta_title') || 'Готовы к большему?'}
                        </h3>
                        <p className="text-indigo-100/90 text-[15px] mb-8 font-medium leading-relaxed">
                            {t('results.cta_desc') || 'Запишитесь на профессиональную консультацию, чтобы разобрать ошибки с экспертом академии.'}
                        </p>
                        <button
                            onClick={() => {
                                if(confirm('Запросить консультацию с экспертом Newton Academy?')) {
                                    requestConsultation('OFFLINE').then(() => alert('Заявка успешно отправлена! Ожидайте звонка менеджера.'))
                                }
                            }}
                            className="w-full py-4 bg-white text-indigo-600 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:shadow-[0_10px_35px_rgba(0,0,0,0.2)]"
                        >
                            {t('results.cta_btn') || 'Оставить заявку'}
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </section>

            <div className="flex justify-center mt-10">
                <button className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold bg-white/5 px-6 py-3 rounded-full">
                    <Share2 size={16} /> Поделиться результатом
                </button>
            </div>

            <BottomNav />
        </main>
    )
}
