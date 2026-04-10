'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchProfile, fetchAvailableTests, fetchHistory } from '@/lib/api'
import { Trophy, BookOpen, ChevronRight, Zap, Star, Flame, Target, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { BottomNav } from '@/components/BottomNav'
import { useI18n } from '@/context/I18nContext'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const spring = { type: 'spring', stiffness: 400, damping: 28 }

function StatCard({ label, value, icon: Icon, color, delay = 0 }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay }}
            className="flex-1 rounded-[18px] p-4 flex flex-col items-center text-center gap-2 relative overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
            <div className={cn("w-10 h-10 rounded-[12px] flex items-center justify-center", color.bg)}>
                <Icon size={20} className={color.text} />
            </div>
            <span className="text-2xl font-black text-white leading-none">{value}</span>
            <span className="text-[11px] font-semibold text-gray-500 leading-tight">{label}</span>
        </motion.div>
    )
}

export default function Dashboard() {
    const { t, setLang, lang } = useI18n()
    const { data: profile, isLoading: profileLoading } = useQuery({ queryKey: ['profile'], queryFn: fetchProfile })
    const { data: tests } = useQuery({ queryKey: ['available-tests'], queryFn: fetchAvailableTests })
    const { data: history } = useQuery({ queryKey: ['history'], queryFn: fetchHistory })

    useEffect(() => {
        if (profile?.language_code && profile.language_code !== lang) {
            setLang(profile.language_code)
        }
    }, [profile?.language_code])

    const completedCount = history?.filter((r: any) => r.session?.status === 'CHECKED' || r.session?.status === 'SUBMITTED').length ?? 0
    const totalScore = history?.reduce((acc: number, r: any) => acc + (r.score_percentage || 0), 0) ?? 0
    const avgScore = completedCount > 0 ? Math.round(totalScore / completedCount) : 0
    const pts = profile?.points_balance || 0

    const greetingHour = new Date().getHours()
    const greeting = greetingHour < 12 ? '🌅 Доброе утро' : greetingHour < 17 ? '☀️ Добрый день' : '🌙 Добрый вечер'

    const stats = [
        { label: 'Завершено', value: completedCount, icon: Trophy, color: { bg: 'bg-amber-500/10', text: 'text-amber-400' } },
        { label: 'Средний балл', value: `${avgScore}%`, icon: TrendingUp, color: { bg: 'bg-blue-500/10', text: 'text-blue-400' } },
        { label: 'Тестов', value: tests?.length ?? 0, icon: BookOpen, color: { bg: 'bg-violet-500/10', text: 'text-violet-400' } },
    ]

    const featuredTest = tests?.[0]
    const recentResult = history?.[0]

    return (
        <>
        <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pb-32 min-h-screen relative overflow-x-hidden"
        >
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-[-15%] left-[-20%] w-[80vw] h-[80vw] rounded-full" style={{ background: 'radial-gradient(circle, rgba(79,110,247,0.12) 0%, transparent 70%)' }} />
                <div className="absolute bottom-[10%] right-[-20%] w-[60vw] h-[60vw] rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)' }} />
            </div>

            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={spring}
                className="px-5 pt-8 pb-4 flex justify-between items-start"
            >
                <div>
                    <p className="text-[13px] font-medium text-gray-500 mb-0.5">{greeting}</p>
                    <h1 className="text-2xl font-black text-white leading-tight">
                        {profileLoading ? <span className="skeleton w-32 h-7 block rounded-lg" /> : profile?.first_name || 'Студент'} 👋
                    </h1>
                    <p className="text-gray-500 text-[13px] font-medium mt-0.5">Твой прогресс растёт каждый день</p>
                </div>

                <motion.div whileTap={{ scale: 0.92 }}>
                    <Link href="/shop" className="flex items-center gap-2 px-4 py-2.5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid rgba(245,166,35,0.25)' }}>
                        <Star size={16} className="text-amber-400" fill="currentColor" />
                        <span className="font-black text-amber-400 text-[15px]">{pts}</span>
                    </Link>
                </motion.div>
            </motion.header>

            {/* Streak banner */}
            {completedCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...spring, delay: 0.05 }}
                    className="mx-5 mb-5 px-4 py-3 rounded-2xl flex items-center gap-3"
                    style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(239,68,68,0.10))', border: '1px solid rgba(249,115,22,0.2)' }}
                >
                    <Flame size={22} className="text-orange-400 animate-float shrink-0" />
                    <p className="text-[13px] font-bold text-orange-300">
                        Ты прошёл {completedCount} тест{completedCount === 1 ? '' : 'а'}! Продолжай в том же духе 🔥
                    </p>
                </motion.div>
            )}

            {/* Stats */}
            <div className="px-5 mb-6 flex gap-3">
                {stats.map((s, i) => (
                    <StatCard key={s.label} {...s} delay={0.1 + i * 0.05} />
                ))}
            </div>

            {/* Featured Test CTA */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.25 }}
                className="px-5 mb-6"
            >
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[15px] font-extrabold text-white flex items-center gap-2">
                        <Zap size={16} className="text-amber-400" fill="currentColor" />
                        Рекомендуем сегодня
                    </h2>
                    <Link href="/tests" className="text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>
                        Все → 
                    </Link>
                </div>

                {featuredTest ? (
                    <Link href="/tests">
                        <motion.div
                            whileTap={{ scale: 0.97 }}
                            className="relative overflow-hidden rounded-[24px] p-6"
                            style={{ background: 'linear-gradient(135deg, #1e3a8a, #312e81, #1e1b4b)', border: '1px solid rgba(99,102,241,0.3)' }}
                        >
                            {/* Decorative circles */}
                            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
                            <div className="absolute -bottom-12 -left-4 w-40 h-40 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />

                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide uppercase mb-4" style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>
                                    <Target size={11} /> Диагностика
                                </div>
                                <h3 className="text-xl font-black text-white mb-1 leading-snug">{featuredTest.title}</h3>
                                <p className="text-indigo-200/70 text-[13px] mb-5">
                                    {featuredTest.questions?.length ?? 0} вопросов · {featuredTest.duration_minutes} мин
                                </p>
                                <div className="inline-flex items-center gap-2 py-3 px-6 rounded-[14px] font-bold text-[15px]" style={{ background: 'white', color: '#312e81' }}>
                                    <Zap size={16} fill="currentColor" /> Начать тест
                                </div>
                            </div>
                        </motion.div>
                    </Link>
                ) : (
                    <div className="card text-center py-10 border-dashed" style={{ borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <BookOpen className="text-gray-600 mx-auto mb-2" size={28} />
                        <p className="text-gray-500 text-[14px]">Тесты скоро появятся</p>
                    </div>
                )}
            </motion.section>

            {/* Recent Result */}
            {recentResult && (
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.3 }}
                    className="px-5 mb-6"
                >
                    <h2 className="text-[15px] font-extrabold text-white mb-3">Последний результат</h2>
                    <Link href={`/results/${recentResult.id}`}>
                        <motion.div whileTap={{ scale: 0.97 }} className="card flex items-center gap-4">
                            <div className="w-14 h-14 rounded-[16px] flex items-center justify-center font-black text-lg shrink-0" style={{ background: 'linear-gradient(135deg, rgba(79,110,247,0.2), rgba(124,58,237,0.2))' }}>
                                {Math.round(recentResult.score_percentage)}%
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-white truncate">{recentResult.session?.test?.title || 'Тест'}</p>
                                <p className="text-[12px] text-gray-500 mt-0.5">
                                    {new Date(recentResult.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                                </p>
                            </div>
                            <ChevronRight size={18} className="text-gray-600 shrink-0" />
                        </motion.div>
                    </Link>
                </motion.section>
            )}

            {/* Motivation quote */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mx-5 px-5 py-4 rounded-2xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
                <p className="text-[13px] text-gray-400 leading-relaxed italic">
                    "Каждый эксперт когда-то был новичком. Каждый профессионал начинал с одного шага." — Харви Спектер
                </p>
            </motion.div>
        </motion.main>
        <BottomNav />
        </>
    )
}
