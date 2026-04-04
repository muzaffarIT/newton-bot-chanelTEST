'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchActiveSession, saveAnswer, submitSession } from '@/lib/api'
import { ChevronLeft, ChevronRight, Send, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function TestPlayer() {
    const router = useRouter()
    const { id: testId } = useParams()
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const [showGrid, setShowGrid] = useState(false)

    // Fetch active session or start a new one (start logic handled in parent/tests page)
    const { data: session, isLoading, error } = useQuery({
        queryKey: ['active-session'],
        queryFn: fetchActiveSession,
        refetchOnWindowFocus: false,
    })

    const saveMutation = useMutation({
        mutationFn: ({ questionId, optionId }: { questionId: string, optionId: string }) =>
            saveAnswer(session.id, questionId, optionId)
    })

    const submitMutation = useMutation({
        mutationFn: () => submitSession(session.id),
        onSuccess: () => router.push(`/results/${session.id}`)
    })

    // Timer logic
    useEffect(() => {
        if (session?.expires_at) {
            const expireTime = new Date(session.expires_at).getTime()
            const interval = setInterval(() => {
                const now = new Date().getTime()
                const diff = Math.floor((expireTime - now) / 1000)
                if (diff <= 0) {
                    clearInterval(interval)
                    setTimeLeft(0)
                    submitMutation.mutate() // Auto-submit
                } else {
                    setTimeLeft(diff)
                }
            }, 1000)
            return () => clearInterval(interval)
        }
    }, [session])

    // Resume logic: load previously saved answers
    useEffect(() => {
        if (session?.answers) {
            const answersMap: Record<string, string> = {}
            session.answers.forEach((ans: any) => {
                answersMap[ans.question_id] = ans.option_id
            })
            setSelectedAnswers(answersMap)
        }
    }, [session])

    if (isLoading) return <div className="min-h-screen flex items-center justify-center">Загрузка теста...</div>
    if (error || !session) return <div className="p-10 text-center">Ошибка загрузки сессии</div>

    const questions = session.test.questions
    const currentQuestion = questions[currentIndex]

    const handleAnswerSelect = (optionId: string) => {
        setSelectedAnswers(prev => ({ ...prev, [currentQuestion.id]: optionId }))
        saveMutation.mutate({ questionId: currentQuestion.id, optionId })
    }

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`
    }

    return (
        <div className="min-h-screen bg-tg-bg text-tg-text">
            {/* Sticky Header */}
            <header className="sticky top-0 z-30 glass border-b border-white/5 px-5 py-4 flex items-center justify-between">
                <button
                    onClick={() => setShowGrid(!showGrid)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-tg-secondary"
                >
                    <div className="grid grid-cols-2 gap-0.5">
                        <div className="w-1.5 h-1.5 bg-tg-text rounded-sm opacity-60" />
                        <div className="w-1.5 h-1.5 bg-tg-text rounded-sm opacity-60" />
                        <div className="w-1.5 h-1.5 bg-tg-text rounded-sm opacity-60" />
                        <div className="w-1.5 h-1.5 bg-tg-text rounded-sm opacity-60" />
                    </div>
                </button>

                <div className={cn(
                    "flex-1 mx-4 flex justify-center",
                )}>
                    <div className={cn(
                        "flex items-center gap-2 font-mono font-bold px-3 py-1 rounded-full",
                        timeLeft && timeLeft < 300 ? "bg-red-500/10 text-red-500 animate-pulse" : "bg-tg-accent/10 text-tg-accent"
                    )}>
                        <Clock size={16} />
                        {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
                    </div>
                </div>

                <button
                    onClick={() => { if (confirm('Завершить тест?')) submitMutation.mutate() }}
                    className="text-tg-accent font-bold text-sm"
                >
                    Готово
                </button>
            </header>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-tg-secondary">
                <div
                    className="h-full bg-tg-accent transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
            </div>

            {/* Question Grid Overlay */}
            {showGrid && (
                <div className="fixed inset-0 z-40 bg-tg-bg/95 backdrop-blur-md pt-24 px-6 animate-in fade-in zoom-in duration-200">
                    <h3 className="text-lg font-bold mb-6">Навигация по вопросам</h3>
                    <div className="grid grid-cols-5 gap-3">
                        {questions.map((q: any, i: number) => (
                            <button
                                key={q.id}
                                onClick={() => {
                                    setCurrentIndex(i)
                                    setShowGrid(false)
                                }}
                                className={cn(
                                    "aspect-square rounded-xl flex items-center justify-center font-bold transition-all",
                                    currentIndex === i 
                                        ? "bg-tg-accent text-white ring-4 ring-tg-accent/20"
                                        : selectedAnswers[q.id]
                                            ? "bg-green-500/20 text-green-500 border border-green-500/30"
                                            : "bg-tg-secondary text-tg-hint border border-white/5"
                                )}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => setShowGrid(false)}
                        className="w-full mt-10 py-4 bg-white/5 rounded-2xl font-bold"
                    >
                        Закрыть
                    </button>
                </div>
            )}

            <main className="p-6 pb-32">
                <div className="mb-6">
                    <span className="text-tg-hint text-xs font-bold uppercase tracking-widest">
                        Вопрос {currentIndex + 1} из {questions.length}
                    </span>
                    <h2 className="text-xl font-bold mt-2 leading-tight">
                        {currentQuestion.text}
                    </h2>
                </div>

                {currentQuestion.image_url && (
                    <img src={currentQuestion.image_url} alt="Question" className="rounded-2xl w-full mb-6 border border-white/10" />
                )}

                {/* Options */}
                <div className="space-y-3">
                    {currentQuestion.options.map((option: any) => (
                        <button
                            key={option.id}
                            onClick={() => handleAnswerSelect(option.id)}
                            className={cn(
                                "w-full text-left p-4 rounded-2xl border-2 transition-all",
                                selectedAnswers[currentQuestion.id] === option.id
                                    ? "border-tg-accent bg-tg-accent/5"
                                    : "border-transparent bg-tg-secondary active:bg-white/5"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
                                    selectedAnswers[currentQuestion.id] === option.id ? "border-tg-accent bg-tg-accent" : "border-tg-hint"
                                )}>
                                    {selectedAnswers[currentQuestion.id] === option.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                                <span className="font-medium">{option.text}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </main>

            {/* Footer Navigation */}
            <footer className="fixed bottom-0 left-0 right-0 p-6 glass border-t border-white/5 flex items-center gap-4">
                <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                    className="flex-1 py-4 bg-tg-secondary text-tg-text font-bold rounded-2xl disabled:opacity-30 active:scale-95 transition-all"
                >
                    Назад
                </button>

                {currentIndex === questions.length - 1 ? (
                    <button
                        onClick={() => submitMutation.mutate()}
                        className="flex-[2] btn-primary"
                    >
                        Отправить <Send size={18} />
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentIndex(prev => prev + 1)}
                        className="flex-[2] btn-primary"
                    >
                        Далее <ChevronRight size={18} />
                    </button>
                )}
            </footer>
        </div>
    )
}
