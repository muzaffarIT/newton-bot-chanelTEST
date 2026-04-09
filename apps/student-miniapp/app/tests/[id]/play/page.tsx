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
        <div className="min-h-screen bg-[#f8f9fc] dark:bg-[#0f0f1a] text-gray-900 dark:text-white relative overflow-hidden font-sans transition-colors duration-500">
            {/* Subtle background gradient instead of neon glow */}
            <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10 pointer-events-none" />

            {/* Sticky Header */}
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0f0f1a]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 px-6 py-4 flex items-center justify-between">
                <button
                    onClick={() => setShowGrid(!showGrid)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 active:scale-95 transition-all"
                >
                    <div className="grid grid-cols-2 gap-0.5 opacity-60">
                        <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                        <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                        <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                        <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                    </div>
                </button>

                <div className="flex-1 mx-4 flex justify-center animate-in slide-in-from-top-2 duration-300">
                    <div className={cn(
                        "flex items-center gap-2 font-mono font-medium text-sm px-4 py-1.5 rounded-full transition-colors",
                        timeLeft && timeLeft < 300 
                            ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 animate-pulse" 
                            : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                    )}>
                        <Clock size={14} />
                        {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
                    </div>
                </div>

                <button
                    onClick={() => { if (confirm('Завершить тест?')) submitMutation.mutate() }}
                    className="text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 px-4 py-2 rounded-xl font-medium text-sm active:scale-95 transition-all"
                >
                    Готово
                </button>
            </header>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-gray-200 dark:bg-white/5">
                <div
                    className="h-full bg-blue-500 transition-all duration-500 ease-out"
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

            <main className="p-6 pb-32 relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300" key={currentQuestion.id}>
                <div className="space-y-3 mb-6">
                    <div className="inline-block px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-wide">
                        Вопрос {currentIndex + 1} из {questions.length}
                    </div>
                    <h2 className="text-xl md:text-2xl font-semibold leading-relaxed text-gray-900 dark:text-white">
                        {currentQuestion.content}
                    </h2>
                </div>

                {currentQuestion.image_url && (
                    <div className="relative mb-6 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20">
                        <img src={currentQuestion.image_url} alt="Медиа" className="w-full object-cover max-h-64 scale-95" />
                    </div>
                )}

                {/* Options */}
                <div className="flex flex-col gap-3">
                    {currentQuestion.options.map((option: any) => (
                        <button
                            key={option.id}
                            onClick={() => handleAnswerSelect(option.id)}
                            className={cn(
                                "w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 active:scale-[0.98]",
                                selectedAnswers[currentQuestion.id] === option.id
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-sm"
                                    : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/10"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                    selectedAnswers[currentQuestion.id] === option.id 
                                    ? "border-blue-500 bg-blue-500" 
                                    : "border-gray-300 dark:border-gray-600 bg-transparent"
                                )}>
                                    {selectedAnswers[currentQuestion.id] === option.id && <div className="w-1.5 h-1.5 bg-white rounded-full animate-in zoom-in duration-200" />}
                                </div>
                                <span className={cn(
                                    "font-medium text-[15px] leading-relaxed transition-colors",
                                    selectedAnswers[currentQuestion.id] === option.id ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
                                )}>
                                    {option.content}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </main>

            {/* Footer Navigation */}
            <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 dark:bg-[#0f0f1a]/90 backdrop-blur-xl border-t border-gray-200 dark:border-white/5 z-30 flex items-center gap-4">
                <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                    className="flex-1 py-3.5 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-semibold rounded-xl disabled:opacity-40 active:scale-95 transition-all hover:bg-gray-200 dark:hover:bg-white/10"
                >
                    Назад
                </button>

                {currentIndex === questions.length - 1 ? (
                    <button
                        onClick={() => { if (confirm('Вы уверены, что хотите завершить тест?')) submitMutation.mutate() }}
                        className="flex-[2] py-3.5 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 hover:opacity-90 shadow-sm"
                    >
                        Завершить <Send size={18} />
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentIndex(prev => prev + 1)}
                        className="flex-[2] py-3.5 bg-blue-600 text-white font-semibold rounded-xl active:scale-95 transition-all hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm"
                    >
                        Далее <ChevronRight size={18} />
                    </button>
                )}
            </footer>
        </div>
    )
}
