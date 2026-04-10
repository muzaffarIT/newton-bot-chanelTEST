'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { fetchActiveSession, startSession, saveAnswer, submitSession } from '@/lib/api'
import { ChevronRight, Send, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function TestPlayer() {
    const router = useRouter()
    const { id: testId } = useParams()
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
                        setError('Не указан ID теста')
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
                const msg = e.response?.data?.message || e.message || 'Ошибка загрузки теста'
                setError(msg)
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [testId])

    const saveMutation = useMutation({
        mutationFn: ({ questionId, optionId }: { questionId: string; optionId: string }) =>
            saveAnswer(session.id, questionId, optionId),
    })

    const submitMutation = useMutation({
        mutationFn: () => submitSession(session.id),
        onSuccess: () => router.push(`/results/${session.id}`),
        onError: (e: any) => alert(e.response?.data?.message || 'Ошибка при завершении теста'),
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
                <p className="text-gray-400 text-sm">Загрузка теста...</p>
            </div>
        )
    }

    // Error state
    if (error || !session) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-8 bg-[#0f0f1a]">
                <AlertCircle size={48} className="text-red-400" />
                <p className="text-white font-bold text-lg text-center">Ошибка загрузки теста</p>
                <p className="text-gray-500 text-sm text-center">{error || 'Сессия не найдена'}</p>
                <button
                    onClick={() => router.push('/tests')}
                    className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold"
                >
                    ← Назад к тестам
                </button>
            </div>
        )
    }

    const questions = session.test?.questions || []
    if (questions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-400">
                В тесте нет вопросов
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
                        <h3 className="text-lg font-bold">Вопросы</h3>
                        <span className="text-sm text-gray-500">{answeredCount}/{questions.length} отвечено</span>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                        {questions.map((q: any, i: number) => (
                            <button
                                key={q.id}
                                onClick={() => { setCurrentIndex(i); setShowGrid(false) }}
                                className={cn(
                                    "aspect-square rounded-xl flex items-center justify-center font-bold text-sm transition-all",
                                    currentIndex === i
                                        ? "bg-blue-600 text-white ring-2 ring-blue-500/50"
                                        : selectedAnswers[q.id]
                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                            : "bg-white/5 text-gray-500 border border-white/5"
                                )}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowGrid(false)}
                        className="w-full mt-8 py-4 bg-white/5 rounded-2xl font-bold"
                    >
                        Закрыть
                    </button>
                </div>
            )}

            {/* Main Content */}
            <main className="px-5 py-6 pb-36 relative z-10" key={currentQuestion.id}>
                <div className="mb-5">
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                        Вопрос {currentIndex + 1} / {questions.length}
                    </span>
                    <h2 className="text-xl font-bold text-white mt-2 leading-snug">
                        {currentQuestion.content}
                    </h2>
                </div>

                {/* Image */}
                {currentQuestion.image_url && (
                    <div className="mb-5 rounded-2xl overflow-hidden border border-white/10 bg-black/20">
                        <img
                            src={currentQuestion.image_url}
                            alt="Изображение к вопросу"
                            className="w-full object-cover max-h-56"
                        />
                    </div>
                )}

                {/* Options */}
                <div className="flex flex-col gap-3">
                    {currentQuestion.options.map((option: any, idx: number) => {
                        const isSelected = selectedAnswers[currentQuestion.id] === option.id
                        const letters = ['A', 'B', 'C', 'D', 'E', 'F']
                        return (
                            <button
                                key={option.id}
                                onClick={() => handleAnswerSelect(option.id)}
                                className={cn(
                                    "w-full text-left px-4 py-4 rounded-2xl border transition-all duration-200 active:scale-[0.97] flex items-center gap-4",
                                    isSelected
                                        ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                                        : "border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/8"
                                )}
                                style={isSelected ? {} : { borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}
                            >
                                <div className={cn(
                                    "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-all",
                                    isSelected ? "bg-blue-600 text-white" : "bg-white/5 text-gray-500"
                                )}>
                                    {letters[idx] || idx + 1}
                                </div>
                                <span className={cn(
                                    "font-medium text-[15px] leading-relaxed flex-1",
                                    isSelected ? "text-white" : "text-gray-300"
                                )}>
                                    {option.content}
                                </span>
                                {isSelected && (
                                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </main>

            {/* Footer Navigation */}
            <footer className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-4 bg-[#0f0f1a]/95 backdrop-blur-xl border-t border-white/5 z-30 flex items-center gap-3">
                <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                    className="flex-1 py-3.5 bg-white/5 text-white font-semibold rounded-2xl disabled:opacity-30 active:scale-95 transition-all text-[15px]"
                >
                    Назад
                </button>

                {currentIndex === questions.length - 1 ? (
                    <button
                        onClick={() => { if (confirm('Завершить тест и отправить ответы?')) submitMutation.mutate() }}
                        disabled={submitMutation.isPending}
                        className="flex-[2] py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                        {submitMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        Завершить
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentIndex(prev => prev + 1)}
                        className="flex-[2] py-3.5 bg-blue-600 text-white font-bold rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        Далее <ChevronRight size={18} />
                    </button>
                )}
            </footer>
        </div>
    )
}
