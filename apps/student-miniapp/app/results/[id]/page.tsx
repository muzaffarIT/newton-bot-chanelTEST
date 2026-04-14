'use client'

import React, { useState, useEffect } from 'react'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { fetchResultDetail, requestConsultation, fetchProfile, updateProfile } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { CheckCircle2, ChevronRight, Share2, Award, Zap, AlertTriangle, MessageSquare, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/context/I18nContext'

export default function ResultPage() {
    const { t, lang: currentLang } = useI18n()
    const { id: resultId } = useParams()
    const router = useRouter()

    const [consultRequested, setConsultRequested] = useState(false)
    const [consultLoading, setConsultLoading] = useState(false)

    const handleRequestConsultation = async () => {
        setConsultLoading(true)
        try {
            await requestConsultation('OFFLINE')
            setConsultRequested(true)
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.message || 'Ошибка. Попробуйте снова.'
            alert('Ошибка: ' + msg)
        } finally {
            setConsultLoading(false)
        }
    }

    const { data: profile, refetch: refetchProfile } = useQuery({
        queryKey: ['profile'],
        queryFn: fetchProfile
    })

    const { data: result, isLoading } = useQuery({
        queryKey: ['result', resultId],
        queryFn: () => fetchResultDetail(resultId as string)
    })

    const [isSubmittingInfo, setIsSubmittingInfo] = useState(false)
    const [infoForm, setInfoForm] = useState({ first_name: '', last_name: '', phone: '' })

    // Auto-fill form from whatever profile has
    useEffect(() => {
        if (profile) {
            setInfoForm({
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                phone: profile.phone || ''
            })
        }
    }, [profile])

    if (isLoading || !profile) return <div className="min-h-screen flex items-center justify-center">{t('results.loading')}</div>
    if (!result) return <div className="p-10 text-center">{t('results.not_found')}</div>

    const needsInfo = (!profile.phone || !profile.last_name || profile.first_name === 'Студент');

    const score = result.correct_count
    const total = result.correct_count + result.incorrect_count
    const percentage = result.score_percentage
    const skills = result.skill_breakdown ? Object.values(result.skill_breakdown) : []

    const handleSaveInfo = async () => {
        if (!infoForm.first_name.trim() || !infoForm.last_name.trim() || !infoForm.phone.trim()) {
            return alert('Пожалуйста, заполните все поля!')
        }
        setIsSubmittingInfo(true)
        try {
            await updateProfile(infoForm)
            await refetchProfile()
        } catch (e) {
            alert('Ошибка при сохранении данных')
        } finally {
            setIsSubmittingInfo(false)
        }
    }

    return (
        <main className="pb-32 page-fade-in relative min-h-screen">
            {needsInfo && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-5">
                    <div className="bg-[#1c1c28] p-6 rounded-[28px] w-full max-w-sm border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                            <Zap size={32} className="text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-center text-white mb-2">Отличная работа! 🎉</h2>
                        <p className="text-sm text-center text-gray-400 mb-6 leading-relaxed">
                            Чтобы увидеть детальный разбор ошибок и получить диагностический PDF-отчет, заполните профиль:
                        </p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 ml-1 mb-1 block">Имя *</label>
                                <input 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Иван"
                                    value={infoForm.first_name}
                                    onChange={e => setInfoForm(p => ({ ...p, first_name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 ml-1 mb-1 block">Фамилия *</label>
                                <input 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Иванов"
                                    value={infoForm.last_name}
                                    onChange={e => setInfoForm(p => ({ ...p, last_name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 ml-1 mb-1 block">Телефон *</label>
                                <input 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                                    placeholder="+998 90 123 45 67"
                                    value={infoForm.phone}
                                    onChange={e => setInfoForm(p => ({ ...p, phone: e.target.value }))}
                                />
                            </div>
                            
                            <button 
                                onClick={handleSaveInfo}
                                disabled={isSubmittingInfo}
                                className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-2xl transition-all disabled:opacity-50"
                            >
                                {isSubmittingInfo ? 'Сохранение...' : 'Узнать результат'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            onClick={handleRequestConsultation}
                            disabled={consultLoading || consultRequested}
                            className={cn(
                                "w-full py-4 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_10px_25px_rgba(0,0,0,0.15)]",
                                consultRequested 
                                    ? "bg-emerald-500 text-white" 
                                    : "bg-white text-indigo-600 hover:shadow-[0_10px_35px_rgba(0,0,0,0.2)] disabled:opacity-60"
                            )}
                        >
                            {consultLoading && <Loader2 size={18} className="animate-spin" />}
                            {consultRequested ? (
                                <><CheckCircle2 size={18} /> Заявка отправлена! Ждите звонка</>
                            ) : (
                                <>{t('results.cta_btn') || 'Оставить заявку'} {!consultLoading && <ChevronRight size={18} />}</>
                            )}
                        </button>
                    </div>
                </div>
            </section>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="flex-1 max-w-[250px] mx-auto py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Скачать PDF
                </button>
                <button className="flex-1 max-w-[250px] mx-auto py-4 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <Share2 size={20} /> Поделиться
                </button>
            </div>

            <div className="print:hidden">
                <BottomNav />
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { margin: 10mm; }
                    body { background: white !important; color: black !important; }
                    .glass-card { background: none !important; border: 1px solid #ddd !important; border-radius: 8px !important; color: black !important; padding: 16px !important; margin-bottom: 12px; page-break-inside: avoid; }
                    .text-white, .text-gray-300, .text-gray-400, .text-emerald-400, .text-blue-400, .text-orange-400 { color: black !important; }
                    .page-fade-in { padding-bottom: 0 !important; }
                }
            `}} />
        </main>
    )
}
