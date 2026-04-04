'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchProfile, fetchAvailableTests, fetchHistory } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { Trophy, Clock, BookOpen, ChevronRight, Play, Star } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/context/I18nContext'
import { cn } from '@/lib/utils'

export default function Dashboard() {
    const { t, setLang, lang } = useI18n()
    const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: fetchProfile })
    const { data: tests } = useQuery({ queryKey: ['available-tests'], queryFn: fetchAvailableTests })
    const { data: history } = useQuery({ queryKey: ['history'], queryFn: fetchHistory })

    // Update language when profile loaded
    useEffect(() => {
        if (profile?.language_code && profile.language_code !== lang) {
            setLang(profile.language_code)
        }
    }, [profile?.language_code])

    const completedCount = history?.filter((r: any) => r.session?.status === 'CHECKED' || r.session?.status === 'SUBMITTED').length ?? 0
    const inProgressCount = history?.filter((r: any) => r.session?.status === 'IN_PROGRESS').length ?? 0

    const stats = [
        { label: t('dashboard.stats.completed'), value: completedCount, icon: Trophy, color: 'text-yellow-500' },
        { label: t('dashboard.stats.in_progress'), value: inProgressCount, icon: Clock, color: 'text-blue-500' },
        { label: t('dashboard.stats.available'), value: tests?.length ?? 0, icon: BookOpen, color: 'text-green-500' },
    ]

    // Featured test = первый активный
    const featuredTest = tests?.[0]

    return (
        <main className="pb-24 pt-6 px-5 page-fade-in">
            <header className="mb-8 flex justify-between items-start">
                <div>
                    <p className="text-tg-hint text-sm mb-1 uppercase tracking-wider font-semibold">{t('dashboard.title')}</p>
                    <h1 className="text-2xl font-bold text-tg-text">
                        {t('dashboard.greeting', { name: profile?.first_name || '...' })}
                    </h1>
                </div>
                <Link href="/shop" className="bg-tg-button/10 text-tg-button px-4 py-2 rounded-2xl flex items-center gap-2 active:scale-95 transition-all">
                    <Star size={18} fill="currentColor" />
                    <span className="font-bold text-lg">{profile?.points_balance || 0}</span>
                </Link>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mb-8">
                {stats.map((stat) => (
                    <div key={stat.label} className="card flex flex-col items-center justify-center text-center p-3">
                        <stat.icon className={cn("mb-2", stat.color)} size={20} />
                        <span className="text-lg font-bold leading-none">{stat.value}</span>
                        <span className="text-[10px] text-tg-hint mt-1">{stat.label}</span>
                    </div>
                ))}
            </div>

            {/* Featured Test Card */}
            <section className="mb-8">
                <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
                    {t('dashboard.featured_title')}
                    <Link href="/tests" className="text-tg-accent text-sm font-normal">{t('dashboard.all')}</Link>
                </h2>

                {featuredTest ? (
                    <Link href={`/tests/${featuredTest.id}`}>
                        <div className="relative overflow-hidden bg-gradient-to-br from-[#2481cc] to-[#1a6fb3] rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all">
                            <div className="relative z-10">
                                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase mb-4 tracking-widest">
                                    {featuredTest.duration_minutes} мин
                                </span>
                                <h3 className="text-xl font-bold mb-2">{featuredTest.title}</h3>
                                <p className="text-white/80 text-sm mb-6 max-w-[200px]">
                                    {featuredTest.questions?.length ?? 0} вопросов
                                    {featuredTest.description && ` • ${featuredTest.description.slice(0, 40)}...`}
                                </p>
                                <div className="flex items-center gap-2 bg-white text-tg-accent py-3 px-6 rounded-2xl font-bold w-fit">
                                    <Play size={18} fill="currentColor" />
                                    {t('tests.start')}
                                </div>
                            </div>
                            <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-[-20%] left-[-10%] w-32 h-32 bg-blue-400/20 rounded-full blur-2xl"></div>
                        </div>
                    </Link>
                ) : (
                    <div className="card text-center py-8">
                        <BookOpen className="mx-auto text-tg-hint mb-3" size={32} />
                        <p className="text-tg-hint text-sm">Тестов пока нет</p>
                    </div>
                )}
            </section>

            {/* Recent History */}
            <section>
                <h2 className="text-lg font-bold mb-4">{t('dashboard.history_title')}</h2>
                <div className="space-y-3">
                    {history && history.length > 0 ? (
                        history.slice(0, 3).map((result: any) => (
                            <Link key={result.id} href={`/results/${result.id}`}>
                                <div className="card flex items-center gap-4 active:bg-tg-bg transition-colors">
                                    <div className="w-12 h-12 bg-tg-bg rounded-xl flex items-center justify-center border border-white/10">
                                        <BookOpen className="text-tg-accent" size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-sm">{result.session?.test?.title || 'Тест'}</h4>
                                        <p className="text-tg-hint text-xs">
                                            {new Date(result.created_at).toLocaleDateString('ru-RU', {
                                                day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-bold text-sm">{Math.round(result.score_percentage)}%</span>
                                        <span className={cn("text-[10px] font-medium", {
                                            'text-green-500': result.level === 'HIGH',
                                            'text-yellow-500': result.level === 'MEDIUM',
                                            'text-red-500': result.level === 'LOW',
                                        })}>
                                            {result.level === 'HIGH' ? 'Отлично' : result.level === 'MEDIUM' ? 'Хорошо' : 'Нужна практика'}
                                        </span>
                                    </div>
                                    <ChevronRight size={18} className="text-tg-hint" />
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="card text-center py-8">
                            <Trophy className="mx-auto text-tg-hint mb-3" size={32} />
                            <p className="text-tg-hint text-sm">Вы ещё не проходили тесты</p>
                            <Link href="/tests" className="mt-3 inline-block text-tg-accent text-sm font-medium">
                                Начать тест →
                            </Link>
                        </div>
                    )}
                </div>
            </section>

        </main>
    )
}
