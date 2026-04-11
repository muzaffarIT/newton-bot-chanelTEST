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

const spring = { type: 'spring', stiffness: 400, damping: 30 } as const

export default function TestsPage() {
    const { t } = useI18n()
    const router = useRouter()
    const [search, setSearch] = useState('')
    const queryClient = useQueryClient()

    const { data: tests, isLoading } = useQuery({ queryKey: ['available-tests'], queryFn: fetchAvailableTests })

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
                <h1 className="text-2xl font-black text-white">{t('tests.title')}</h1>
                <p className="text-gray-500 text-[13px] mt-1">{t('tests.subtitle')}</p>
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
                    placeholder={t('tests.search')}
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
                        {filteredTests?.filter((test: any) => test.questions && test.questions.length > 0).map((test: any, i: number) => {
                            return (
                                <motion.div
                                    key={test.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ ...spring, delay: i * 0.06 }}
                                    onClick={() => router.push(`/tests/${test.id}/play`)}
                                    className="card cursor-pointer select-none"
                                    whileTap={{ scale: 0.97 }}
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 border border-indigo-500/20">
                                            <Zap size={10} className="fill-indigo-400" /> {t('tests.test')}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                                            <Clock size={12} /> {test.duration_minutes || 60} {t('tests.minutes')}
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-xl font-bold text-white leading-tight mb-2 pr-6">
                                        {test.title}
                                    </h3>
                                    {test.description && (
                                        <p className="text-sm text-gray-400 mb-6 line-clamp-2 leading-relaxed">
                                            {test.description}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between mt-auto bg-black/20 -mx-5 -mb-5 px-5 py-3 border-t border-white/5 rounded-b-[20px]">
                                        <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
                                            <BookOpen size={14} className="text-indigo-400/70" />
                                            {test.questions?.length || 0} {t('tests.questions')}
                                        </div>
                                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 text-white font-semibold text-[13px] group-hover:bg-indigo-500 transition-colors">
                                            <Zap size={14} className="text-indigo-400" />
                                            {t('tests.start')}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                        {filteredTests?.filter((test: any) => test.questions && test.questions.length > 0).length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="py-16 flex flex-col items-center justify-center text-center px-4"
                            >
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                                    <Search className="text-gray-500" size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">{t('tests.no_results')}</h3>
                                <p className="text-gray-500 text-[13px]">{t('tests.no_results_sub')}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </motion.main>
        <BottomNav />
        </>
    )
}
