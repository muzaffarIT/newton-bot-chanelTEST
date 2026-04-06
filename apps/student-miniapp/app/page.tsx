'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchProfile, fetchAvailableTests, fetchHistory } from '@/lib/api'
import { Trophy, Clock, BookOpen, ChevronRight, Play, Star, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { BottomNav } from '@/components/BottomNav'
import { useI18n } from '@/context/I18nContext'
import { cn } from '@/lib/utils'
import { motion, Variants } from 'framer-motion'

const container: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } as any }
}

export default function Dashboard() {
    const { t, setLang, lang } = useI18n()
    const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: fetchProfile })
    const { data: tests } = useQuery({ queryKey: ['available-tests'], queryFn: fetchAvailableTests })
    const { data: history } = useQuery({ queryKey: ['history'], queryFn: fetchHistory })

    useEffect(() => {
        if (profile?.language_code && profile.language_code !== lang) {
            setLang(profile.language_code)
        }
    }, [profile?.language_code])

    const completedCount = history?.filter((r: any) => r.session?.status === 'CHECKED' || r.session?.status === 'SUBMITTED').length ?? 0
    const inProgressCount = history?.filter((r: any) => r.session?.status === 'IN_PROGRESS').length ?? 0

    const stats = [
        { label: t('dashboard.stats.completed') || 'Завершено', value: completedCount, icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
        { label: t('dashboard.stats.in_progress') || 'В процессе', value: inProgressCount, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: t('dashboard.stats.available') || 'Доступно', value: tests?.length ?? 0, icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    ]

    const featuredTest = tests?.[0]

    return (
        <>
        <motion.main 
            variants={container}
            initial="hidden"
            animate="show"
            className="pb-28 pt-8 px-5 overflow-x-hidden relative"
        >
            {/* Background Glow Effects */}
            <div className="absolute top-0 left-0 w-full h-64 bg-blue-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
            <div className="absolute top-40 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

            {/* Header */}
            <motion.header variants={item} className="mb-10 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">
                        {t('dashboard.greeting', { name: profile?.first_name || 'Студент' }) || `Привет, ${profile?.first_name || 'Студент'}!`}
                        <motion.span 
                            animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                            transition={{ repeat: Infinity, repeatDelay: 3, duration: 1.5 }}
                            className="inline-block ml-2 text-2xl"
                        >👋</motion.span>
                    </h1>
                    <p className="text-gray-400 text-sm font-medium">{t('dashboard.title') || 'Твой учебный кабинет'}</p>
                </div>
                
                <Link href="/shop" className="relative group">
                    <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-full group-hover:bg-blue-500/30 transition-all" />
                    <div className="relative glass px-4 py-2 rounded-2xl flex items-center gap-2 border border-blue-500/30">
                        <Star size={18} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" fill="currentColor" />
                        <span className="font-bold text-lg text-white">{profile?.points_balance || 0}</span>
                    </div>
                </Link>
            </motion.header>

            {/* Quick Stats Grid */}
            <motion.div variants={item} className="grid grid-cols-3 gap-4 mb-10">
                {stats.map((stat) => (
                    <div key={stat.label} className="glass-card rounded-[24px] flex flex-col items-center justify-center text-center p-4 border-t border-white/5 relative overflow-hidden group">
                        <div className={cn("mb-3 p-2 rounded-xl", stat.bg)}>
                            <stat.icon className={stat.color} size={22} />
                        </div>
                        <span className="text-2xl font-bold text-white mb-1">{stat.value}</span>
                        <span className="text-[11px] text-gray-400 font-medium">{stat.label}</span>
                    </div>
                ))}
            </motion.div>

            {/* Featured Test Section */}
            <motion.section variants={item} className="mb-10">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles size={18} className="text-blue-400" />
                        {t('dashboard.featured_title') || 'Рекомендуем'}
                    </h2>
                    <Link href="/tests" className="text-blue-400 text-sm font-medium hover:text-blue-300">
                        {t('dashboard.all') || 'Все тесты'}
                    </Link>
                </div>

                {featuredTest ? (
                    <Link href={`/tests/${featuredTest.id}/play`}>
                        <motion.div 
                            whileHover={{ scale: 0.98 }}
                            whileTap={{ scale: 0.95 }}
                            className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-[32px] p-8 text-white shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] border border-white/10"
                        >
                            <div className="relative z-10">
                                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-5 border border-white/20">
                                    ⏱ {featuredTest.duration_minutes} МИНУТ
                                </span>
                                <h3 className="text-2xl font-bold mb-2 leading-tight">{featuredTest.title}</h3>
                                <p className="text-indigo-100/80 text-sm mb-8 font-medium">
                                    {featuredTest.questions?.length ?? 0} ВОПРОСОВ
                                </p>
                                <div className="flex items-center justify-center gap-2 bg-white text-indigo-600 py-4 px-8 rounded-[20px] font-bold shadow-lg shadow-white/20">
                                    <Play size={18} fill="currentColor" />
                                    СТАРТ
                                </div>
                            </div>
                            
                            {/* Abstract Decor */}
                            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
                            <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-blue-400/20 rounded-full blur-3xl" />
                        </motion.div>
                    </Link>
                ) : (
                    <div className="glass-card text-center py-10 rounded-[32px] border-dashed border-2 border-white/10">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="text-gray-500" size={28} />
                        </div>
                        <p className="text-gray-400 font-medium">Тестов пока нет</p>
                    </div>
                )}
            </motion.section>

            {/* History Section */}
            <motion.section variants={item}>
                <h2 className="text-xl font-bold text-white mb-5">{t('dashboard.history_title') || 'История'}</h2>
                <div className="space-y-3">
                    {history && history.length > 0 ? (
                        history.slice(0, 3).map((result: any) => (
                            <Link key={result.id} href={`/results/${result.id}`}>
                                <motion.div 
                                    whileHover={{ x: 4 }}
                                    className="glass-card flex items-center gap-4 p-4 rounded-[24px] cursor-pointer"
                                >
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                                        <BookOpen className="text-blue-400" size={22} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-white mb-0.5 text-[15px]">{result.session?.test?.title || 'Тест'}</h4>
                                        <p className="text-gray-400 text-[11px] font-medium">
                                            {new Date(result.created_at).toLocaleDateString('ru-RU', {
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    <div className="text-right flex flex-col items-end justify-center">
                                        <span className="font-bold text-white text-[15px]">{Math.round(result.score_percentage)}%</span>
                                        <div className={cn("w-2 h-2 rounded-full mt-1", {
                                            'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]': result.level === 'HIGH',
                                            'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]': result.level === 'MEDIUM',
                                            'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]': result.level === 'LOW',
                                        })} />
                                    </div>
                                    <ChevronRight size={20} className="text-gray-500 ml-1" />
                                </motion.div>
                            </Link>
                        ))
                    ) : (
                        <div className="glass-card text-center py-8 rounded-[24px]">
                            <Trophy className="mx-auto text-gray-600 mb-3" size={28} />
                            <p className="text-gray-500 text-sm font-medium mb-3">Вы ещё не проходили тесты</p>
                            <Link href="/tests" className="inline-block text-blue-400 text-sm font-bold bg-blue-500/10 px-4 py-2 rounded-xl">
                                Начать первый тест →
                            </Link>
                        </div>
                    )}
                </div>
            </motion.section>

        </motion.main>
            <BottomNav />
        </>
    )
}
