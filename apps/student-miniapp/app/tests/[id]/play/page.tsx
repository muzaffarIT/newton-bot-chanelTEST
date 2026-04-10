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

    // Initialize: fetch active session or start a new one
    useEffect(() => {
        const init = async () => {
            setLoading(true)
            try {
                // 1. Try fetching an existing active session
                let activeSession = await fetchActiveSession()

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

    const submitMutation = useMutation({
        mutationFn: () => submitSession(session.id),
        onSuccess: () => router.push(`/results/${session.id}`),
        onError: (e: any) => alert(e.response?.data?.message || t('common.error')),
    })

    // Timer
    useEffect(() => {
        if (!session?.expires_at) return
        const expireTime = new Date(session.expires_at).getTime()
        const interval = setInterval(() => {
            const diff = Math.floor((expireTime - Date.now()) / 1000)
            if (diff <= 0) {
                clearInterval(interval)
                setTimeLeft(0)
                submitMutation.mutate()
            } else {
                setTimeLeft(diff)
            }
        }, 1000)
        return () => clearInterval(interval)
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
                <Loader2 size={36} className="text-blue-400 animate-spin" />
                <p className="text-gray-400 text-sm">{t('test_player.loading')}</p>
            </div>
        )
    }

    // Error state
    if (error || !session) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-8 bg-[#0f0f1a]">
                <AlertCircle size={48} className="text-red-400" />
                <p className="text-white font-bold text-lg text-center">{t('test_player.error')}</p>
                <p className="text-gray-500 text-sm text-center">{error}</p>
                <button
                    onClick={() => router.push('/tests')}
                    className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
                >
                    <ArrowLeft size={18} /> {t('test_player.back_to_tests')}
                </button>
            </div>
        )
    }

    const questions = session.test?.questions || []
    if (questions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-400 flex-col gap-4">
                <p>{t('test_player.no_questions')}</p>
                <button onClick={() => router.back()} className="text-blue-400">{t('test_player.back_to_tests')}</button>
            </div>
        )
    }

    const currentQuestion = questions[currentIndex]
    const answeredCount = Object.keys(selectedAnswers).length

    return (
        <div className="min-h-screen bg-[#0f0f1a] text-white relative font-sans">
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-[200px] bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#0f0f1a]/90 backdrop-blur-xl border-b border-white/5 px-5 py-4 flex items-center justify-between">
                <button
                    onClick={() => setShowGrid(!showGrid)}
                    className="flex flex-col gap-1 p-2.5 rounded-xl bg-white/5"
                >
                    <div className="grid grid-cols-2 gap-0.5 opacity-60">
                        {[0,1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 bg-white rounded-sm" />)}
                    </div>
                </button>

                {/* Timer */}
                <div className={cn(
                    "flex items-center gap-2 font-mono font-semibold text-sm px-4 py-1.5 rounded-full",
                    timeLeft !== null && timeLeft < 300
                        ? "bg-red-500/10 text-red-400 animate-pulse"
                        : "bg-blue-500/10 text-blue-400"
                )}>
                    <Clock size={14} />
                    {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
                </div>

                <button
                    onClick={() => { if (confirm('Завершить тест?')) submitMutation.mutate() }}
                    disabled={submitMutation.isPending}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-sm active:scale-95 transition-all"
                >
                    Готово
                </button>
            </header>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/5">
                <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
            </div>

            {/* Question Grid Overlay */}
            {showGrid && (
                <div className="fixed inset-0 z-40 bg-[#0f0f1a]/98 backdrop-blur-md pt-20 px-6">
                    <div className="flex justify-between items-center mb-6">
            <main className="flex-1 px-5 py-6">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                    {t('test_player.question')} {currentIndex + 1} {t('test_player.of')} {questions.length}
                </span>
                <h2 className="text-xl font-bold text-white mt-2 leading-snug">
                    {currentQuestion.content}
                </h2>
                {currentQuestion.image_url && (
                    <img src={currentQuestion.image_url} alt="Question" className="mt-4 rounded-xl max-h-48 w-auto border border-white/10" />
                )}
                <div className="mt-8 flex flex-col gap-3">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest pl-1">{t('test_player.options')}</p>
                    {currentQuestion.options.map((option: any, idx: number) => {
                        const isSelected = selectedAnswers[currentQuestion.id] === option.id
                        return (
                            <button
                                key={option.id}
                                onClick={() => handleAnswerSelect(option.id)}
                                className={cn(
                                    "w-full text-left px-4 py-4 rounded-2xl border transition-all flex items-center gap-4",
                                    isSelected ? "border-blue-500 bg-blue-500/10" : "border-white/5 bg-white/5 hover:bg-white/10"
                                )}
                            >
                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black", isSelected ? "bg-blue-600" : "bg-white/10")}>
                                    {String.fromCharCode(65 + idx)}
                                </div>
                                <span className="font-medium text-[15px] flex-1">{option.content}</span>
                            </button>
                        )
                    })}
                </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-5 bg-[#0f0f1a] border-t border-white/5 z-40">
                <div className="flex gap-3">
                    <button
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="flex-1 py-3.5 rounded-2xl bg-white/5 text-white font-bold disabled:opacity-30 border border-white/5"
                    >
                        {t('test_player.back')}
                    </button>
                    {currentIndex === questions.length - 1 ? (
                        <button
                            onClick={() => { if (confirm(t('test_player.submit_confirm'))) submitMutation.mutate() }}
                            disabled={submitMutation.isPending}
                            className="flex-[2] py-3.5 rounded-2xl bg-blue-600 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> {t('test_player.finish')}</>}
                        </button>
                    ) : (
                        <button
                            onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                            className="flex-[2] py-3.5 rounded-2xl bg-white text-black font-bold flex items-center justify-center gap-2"
                        >
                            {t('test_player.next')} <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className={cn("fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-opacity duration-300", showGrid ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
                <div className={cn("absolute bottom-0 left-0 right-0 bg-[#161625] rounded-t-3xl pt-2 pb-8 transition-transform duration-300", showGrid ? 'translate-y-0' : 'translate-y-full')}>
                    <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-3" onClick={() => setShowGrid(false)} />
                    <div className="px-6 py-4 flex items-center justify-between">
                        <h3 className="text-white font-bold text-lg">{t('test_player.navigation')}</h3>
                        <span className="text-sm font-medium px-3 py-1 rounded-lg bg-white/5 text-gray-400">
                            {answeredCount} / {questions.length} {t('test_player.answered')}
                        </span>
                    </div>
                    <div className="grid grid-cols-5 gap-3 px-6">
                        {questions.map((q: any, i: number) => (
                            <button
                                key={q.id}
                                onClick={() => { setCurrentIndex(i); setShowGrid(false) }}
                                className={cn(
                                    "w-12 h-12 rounded-2xl font-bold text-[15px] flex items-center justify-center transition-all",
                                    currentIndex === i ? "bg-blue-500 text-white" : selectedAnswers[q.id] ? "bg-green-500/20 text-green-400" : "bg-white/5 text-gray-500"
                                )}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    <div className="px-6 mt-6">
                        <button onClick={() => setShowGrid(false)} className="w-full py-4 rounded-2xl bg-white/10 text-white font-bold">
                            {t('test_player.close')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
