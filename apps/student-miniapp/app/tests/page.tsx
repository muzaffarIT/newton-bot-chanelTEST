'use client'

import { BottomNav } from '@/components/BottomNav'
import { BookOpen, Clock, ChevronRight, Search, Zap } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAvailableTests, startSession } from '@/lib/api'
import { useI18n } from '@/context/I18nContext'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const spring = { type: 'spring', stiffness: 400, damping: 30 }

export default function TestsPage() {
    const { t } = useI18n()
    const router = useRouter()
    const [search, setSearch] = useState('')
    const queryClient = useQueryClient()

    const { data: tests, isLoading } = useQuery({ queryKey: ['available-tests'], queryFn: fetchAvailableTests })

    const startMutation = useMutation({
        mutationFn: startSession,
        onSuccess: (data, testId) => {
            queryClient.invalidateQueries({ queryKey: ['active-session'] })
            router.push(`/tests/${testId}/play`)
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'Ошибка запуска теста. Попробуйте ещё раз.')
        }
    })

    const filteredTests = tests?.filter((test: any) =>
        test.title.toLowerCase().includes(search.toLowerCase()) ||
        test.description?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <>
        <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pb-32 min-h-screen relative overflow-x-hidden"
        >
            {/* Ambient */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-[-10%] right-[-20%] w-[70vw] h-[70vw] rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)' }} />
            </div>

            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={spring}
                className="px-5 pt-8 pb-5"
            >
                <h1 className="text-2xl font-black text-white">Тесты</h1>
                <p className="text-gray-500 text-[13px] mt-1">Выберите дисциплину и пройдите тест</p>
            </motion.header>

            {/* Search */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.05 }}
                className="px-5 mb-5 relative"
            >
                <Search className="absolute left-9 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск тестов..."
                    className="input pl-11 text-[15px]"
                />
            </motion.div>

            {/* Tests List */}
            <div className="px-5 space-y-4">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-36 skeleton rounded-[20px]" />
                    ))
                ) : (
                    <AnimatePresence>
                        {filteredTests?.map((test: any, i: number) => {
                            const isLoading = startMutation.isPending && startMutation.variables === test.id
                            return (
                                <motion.div
                                    key={test.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ ...spring, delay: i * 0.06 }}
                                    onClick={() => !isLoading && startMutation.mutate(test.id)}
                                    className={cn("card cursor-pointer select-none", isLoading && "opacity-60 pointer-events-none")}
                                    whileTap={{ scale: 0.97 }}
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider" style={{ background: 'rgba(79,110,247,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                                            {test.duration_minutes > 60 ? '📋 Экзамен' : '⚡ Тест'}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-gray-500 text-[12px]">
                                            <Clock size={12} />
                                            {test.duration_minutes} мин
                                        </div>
                                    </div>

                                    <h3 className="font-extrabold text-[17px] text-white mb-1 leading-snug">{test.title}</h3>
                                    <p className="text-gray-500 text-[13px] line-clamp-2 leading-relaxed mb-4">
                                        {test.description || 'Нажмите, чтобы начать прохождение теста'}
                                    </p>

                                    <div className="flex items-center justify-between" style={{ paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                                        <span className="text-gray-600 text-[13px] flex items-center gap-1.5">
                                            <BookOpen size={14} />
                                            {test._count?.questions || test.questions?.length || 0} вопросов
                                        </span>
                                        <div className="flex items-center gap-2 text-[13px] font-bold px-4 py-2 rounded-xl" style={{ background: 'rgba(79,110,247,0.12)', color: '#818cf8' }}>
                                            {isLoading ? 'Загрузка...' : <><Zap size={14} /> Начать</>}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                )}

                {!isLoading && filteredTests?.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="card text-center py-16"
                        style={{ borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.08)' }}
                    >
                        <Search className="mx-auto text-gray-700 mb-3" size={32} />
                        <p className="text-gray-500 font-semibold">Тестов не найдено</p>
                        <p className="text-gray-700 text-[13px] mt-1">Попробуйте другой запрос</p>
                    </motion.div>
                )}
            </div>
        </motion.main>
        <BottomNav />
        </>
    )
}
