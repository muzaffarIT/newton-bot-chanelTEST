'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { fetchActiveSession, startSession, saveAnswer, submitSession } from '@/lib/api'
import { ChevronRight, Send, Clock, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/context/I18nContext'

export default function TestPlayer() {
    const router = useRouter()
    const { id: testId } = useParams()
    const { t } = useI18n()
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const [showGrid, setShowGrid] = useState(false)

    // Session state
    const [session, setSession] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const initRef = useRef(false)

    // Initialize: fetch active session or start a new one
    useEffect(() => {
        if (initRef.current) return
        initRef.current = true

        const init = async () => {
            setLoading(true)
            try {
                // 1. Try fetching an existing active session
                let activeSession = await fetchActiveSession(testId as string)

                // 2. If no session exists (or it's for a different test), start a new one
                if (!activeSession || (testId && activeSession.test_id !== testId)) {
                    if (!testId) {
                        setError('No test ID')
                        return
                    }
                    activeSession = await startSession(testId as string)
                }

                setSession(activeSession)

                // Restore previously saved answers
                if (activeSession?.answers) {
                    const answersMap: Record<string, string> = {}
                    activeSession.answers.forEach((ans: any) => {
                        answersMap[ans.question_id] = ans.selected_option_id || ans.option_id
                    })
                    setSelectedAnswers(answersMap)
                }
            } catch (e: any) {
                const msg = e.response?.data?.message || e.message || t('test_player.error')
                setError(msg)
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [testId, t])

    const saveMutation = useMutation({
        mutationFn: ({ questionId, optionId }: { questionId: string; optionId: string }) =>
            saveAnswer(session.id, questionId, optionId),
    })

    const isSubmittingRef = useRef(false)

    const submitMutation = useMutation({
        mutationFn: () => submitSession(session.id),
        onSuccess: (data: any) => {
            // Backend returns { session, result } — navigate to result.id
            const resultId = data?.result?.id || data?.id || session.id
            router.push(`/results/${resultId}`)
        },
        onError: (e: any) => alert(e.response?.data?.message || t('common.error')),
    })

    // Timer — counts down to expires_at, auto-submits when done
    useEffect(() => {
        if (!session?.expires_at) return
        const expireTime = new Date(session.expires_at).getTime()

        const updateTimer = () => {
            const diff = Math.floor((expireTime - Date.now()) / 1000)
            if (diff <= 0) {
                setTimeLeft(0)
                // Auto-submit only once
                if (!isSubmittingRef.current && !submitMutation.isPending) {
                    isSubmittingRef.current = true
                    submitMutation.mutate()
                }
                return false
            }
            setTimeLeft(diff)
            return true
        }

        if (updateTimer()) {
            const interval = setInterval(() => {
                if (!updateTimer()) clearInterval(interval)
            }, 1000)
            return () => clearInterval(interval)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session])

    const handleAnswerSelect = (optionId: string) => {
        const q = questions[currentIndex]
        setSelectedAnswers(prev => ({ ...prev, [q.id]: optionId }))
        saveMutation.mutate({ questionId: q.id, optionId })
    }

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0f0f1a]">
                <Loader2 size={36} className="text-blue-500 animate-spin" />
                <p className="text-gray-400 font-medium text-sm tracking-wide">{t('test_player.loading')}</p>
            </div>
        )
    }

    // Error state
    if (error || !session) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-8 bg-[#0f0f1a]">
                <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center">
                    <AlertCircle size={32} className="text-red-400" />
                </div>
                <div className="text-center">
                    <p className="text-white font-black text-xl mb-2">{t('test_player.error')}</p>
                    <p className="text-gray-400 text-sm">{error}</p>
                </div>
                <button
                    onClick={() => router.push('/tests')}
                    className="mt-6 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20 flex items-center gap-2"
                >
                    <ArrowLeft size={18} /> {t('test_player.back_to_tests')}
                </button>
            </div>
        )
    }

    const questions = session.test?.questions || []
    if (questions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-400 flex-col gap-4 bg-[#0f0f1a]">
                <p className="font-medium text-center opacity-70">{t('test_player.no_questions')}</p>
                <button onClick={() => router.back()} className="text-blue-400 font-bold hover:text-blue-300 transition-colors uppercase text-[11px] tracking-widest">{t('test_player.back_to_tests')}</button>
            </div>
        )
    }

    const currentQuestion = questions[currentIndex]

    return (
        <div className="flex flex-col min-h-screen bg-[#0f0f1a] text-gray-100 font-sans selection:bg-blue-500/30">
            {/* Ambient Background Gradient Glow */}
            <div className="fixed top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-900/15 via-[#0f0f1a]/50 to-[#0f0f1a] pointer-events-none -z-10" />

            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#0f0f1a]/80 backdrop-blur-2xl border-b border-white/5 px-6 py-4 flex items-center justify-between shadow-2xl shadow-black/40">
                <button
                    onClick={() => setShowGrid(!showGrid)}
                    className="group flex flex-col gap-1 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors active:scale-95"
                >
                    <div className="grid grid-cols-2 gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        {[0,1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 bg-current rounded-[2px]" />)}
                    </div>
                </button>

                {/* Timer */}
                {timeLeft !== null && (
                    <div className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-2xl border font-mono font-black text-base tracking-wider transition-all",
                        timeLeft < 60
                            ? "bg-red-500/15 border-red-500/40 text-red-400 animate-pulse shadow-[0_0_16px_rgba(239,68,68,0.2)]"
                            : timeLeft < 300
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                : "bg-[#1c1c28] border-white/8 text-white"
                    )}>
                        <Clock
                            size={15}
                            className={cn(
                                timeLeft < 60 ? "text-red-400" :
                                timeLeft < 300 ? "text-amber-400" : "text-blue-400"
                            )}
                        />
                        <span>{formatTime(timeLeft)}</span>
                    </div>
                )}

                <button
                    onClick={() => { if (confirm('Уверены, что хотите завершить тест?')) submitMutation.mutate() }}
                    disabled={submitMutation.isPending}
                    className="px-5 py-2.5 bg-gradient-to-tr from-blue-600 to-indigo-500 hover:opacity-90 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 active:scale-95 transition-all text-white disabled:opacity-50"
                >
                    Завершить
                </button>
            </header>

            {/* Progress Bar Component */}
            <div className="w-full h-1.5 bg-white/5">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
            </div>

            {/* Question Matrix (Grid View) */}
            {showGrid && (
                <div className="absolute top-[88px] left-0 right-0 p-6 bg-[#0f0f1a]/95 backdrop-blur-3xl z-30 border-b border-white/5 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6 flex justify-between">
                        Матрица вопросов
                        <span className="text-blue-400">{Object.keys(selectedAnswers).length}/{questions.length} решено</span>
                    </h3>
                    <div className="grid grid-cols-5 sm:grid-cols-7 gap-3">
                        {questions.map((q: any, i: number) => {
                            const isAnswered = !!selectedAnswers[q.id]
                            const isCurrent = currentIndex === i
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => { setCurrentIndex(i); setShowGrid(false) }}
                                    className={cn(
                                        "aspect-square rounded-2xl flex items-center justify-center text-sm font-bold transition-all active:scale-90",
                                        isCurrent ? "bg-white text-black shadow-lg shadow-white/20 scale-110 z-10" :
                                        isAnswered ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 font-black" :
                                        "bg-[#1c1c28] text-gray-400 border border-white/5 hover:bg-white/10"
                                    )}
                                >
                                    {i + 1}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            <main className="flex-1 px-6 py-8 pb-40">
                <div className="mb-8 relative max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-black uppercase tracking-widest mb-5">
                        Вопрос {currentIndex + 1} / {questions.length}
                    </div>
                    
                    <h2 className="text-2xl font-semibold text-white leading-relaxed tracking-tight">
                        {currentQuestion.content}
                    </h2>

                    {currentQuestion.image_url && (
                        currentQuestion.image_url.startsWith('data:application/pdf') || currentQuestion.image_url.endsWith('.pdf') ? (
                            <a 
                                href={currentQuestion.image_url} 
                                download="question_document.pdf"
                                target="_blank"
                                rel="noreferrer"
                                className="group mt-6 flex items-center gap-4 p-5 rounded-3xl bg-[#1c1c28] border border-white/5 hover:border-blue-500/30 transition-all shadow-lg hover:shadow-blue-500/10"
                            >
                                <div className="w-14 h-14 shrink-0 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-base font-bold text-white mb-1 truncate">Справочный документ</div>
                                    <div className="text-xs text-gray-500 truncate">Нажмите, чтобы открыть или скачать PDF</div>
                                </div>
                                <div className="w-10 h-10 shrink-0 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                </div>
                            </a>
                        ) : (
                            <div className="mt-8 rounded-3xl overflow-hidden border border-white/10 bg-[#1c1c28] shadow-2xl relative group">
                                <img src={currentQuestion.image_url} alt="Question" className="w-full max-h-72 object-contain bg-white/5" />
                                <div className="absolute inset-0 border border-white/5 rounded-3xl pointer-events-none" />
                            </div>
                        )
                    )}
                </div>

                <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                    {/* Check if options exist, sometimes tests might have missing ones */}
                    {currentQuestion.options && currentQuestion.options.length > 0 ? (
                        currentQuestion.options.map((option: any, idx: number) => {
                            const isSelected = selectedAnswers[currentQuestion.id] === option.id
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleAnswerSelect(option.id)}
                                    className={cn(
                                        "group w-full text-left p-5 rounded-3xl border-2 transition-all flex items-center gap-5 outline-none focus:ring-4 focus:ring-blue-500/20",
                                        isSelected 
                                            ? "border-blue-500 bg-gradient-to-r from-blue-500/10 to-blue-500/5 shadow-[0_4px_20px_-5px_rgba(59,130,246,0.3)] transform -translate-y-0.5" 
                                            : "border-transparent bg-[#1c1c28] hover:bg-white/10 hover:border-white/10 active:scale-[0.98]"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-lg font-black transition-all duration-300", 
                                        isSelected 
                                            ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-110" 
                                            : "bg-[#0f0f1a] text-gray-500 border border-white/5 group-hover:bg-white/5 group-hover:text-gray-300"
                                    )}>
                                        {String.fromCharCode(65 + idx)}
                                    </div>
                                    <span className={cn(
                                        "font-medium text-[16px] flex-1 leading-snug transition-colors",
                                        isSelected ? "text-white font-semibold" : "text-gray-300"
                                    )}>
                                        {option.content}
                                    </span>
                                </button>
                            )
                        })
                    ) : (
                        <div className="p-8 text-center border border-dashed border-white/10 rounded-3xl text-gray-500 font-medium bg-[#1c1c28]">
                            Варианты ответов отсутствуют
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom Nav Controls */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#0f0f1a]/80 backdrop-blur-2xl border-t border-white/5 p-6 z-40 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                <div className="max-w-2xl mx-auto flex gap-4">
                    <button
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="w-[60px] md:w-16 h-[60px] md:h-16 shrink-0 rounded-2xl bg-white/5 text-gray-400 flex items-center justify-center hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
                    >
                        <ChevronRight size={28} className="rotate-180" />
                    </button>
                    
                    <button
                        onClick={() => {
                            if (currentIndex < questions.length - 1) {
                                setCurrentIndex(prev => prev + 1)
                            } else {
                                if (confirm('Все вопросы пройдены. Завершить тест?')) submitMutation.mutate()
                            }
                        }}
                        disabled={submitMutation.isPending}
                        className={cn(
                            "flex-1 h-[60px] md:h-16 rounded-2xl font-bold flex flex-col items-center justify-center gap-0.5 transition-all shadow-lg active:scale-[0.98]",
                            currentIndex === questions.length - 1
                                ? "bg-gradient-to-tr from-blue-700 to-indigo-600 shadow-blue-500/20 text-white disabled:opacity-50" 
                                : "bg-gradient-to-r from-blue-600 to-indigo-500 shadow-blue-600/30 text-white disabled:opacity-50"
                        )}
                    >
                        {submitMutation.isPending ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : (
                            <>
                                <span className="text-base md:text-lg">{currentIndex < questions.length - 1 ? 'Далее' : 'Завершить'}</span>
                                <span className="text-[10px] md:text-xs uppercase tracking-widest font-black opacity-80">
                                    {currentIndex < questions.length - 1 ? `К вопросу ${currentIndex + 2}` : 'Отправить ответы'}
                                </span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
