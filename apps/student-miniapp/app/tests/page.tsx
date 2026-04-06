'use client'

import { BottomNav } from '@/components/BottomNav'
import { BookOpen, Clock, ChevronRight, Search, Play } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchAvailableTests } from '@/lib/api'
import { useI18n } from '@/context/I18nContext'
import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function TestsPage() {
    const { t } = useI18n()
    const [search, setSearch] = useState('')
    const { data: tests, isLoading } = useQuery({ queryKey: ['available-tests'], queryFn: fetchAvailableTests })

    const filteredTests = tests?.filter((test: any) => 
        test.title.toLowerCase().includes(search.toLowerCase()) ||
        test.description?.toLowerCase().includes(search.toLowerCase())
    )
    return (
        <main className="pb-28 pt-8 px-5 page-fade-in relative min-h-screen">
            {/* Background Decor */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
            <div className="absolute bottom-[20%] right-[-10%] w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300 mb-2">
                    {t('tests.title') || 'Каталог заданий'}
                </h1>
                <p className="text-gray-400 text-sm font-medium leading-relaxed">
                    {t('tests.subtitle') || 'Выберите дисциплину и приступите к выполнению контрольных тестирований'}
                </p>
            </header>

            {/* Search Bar */}
            <div className="relative mb-8 group">
                <div className="absolute inset-0 bg-blue-500/5 rounded-2xl blur-md group-focus-within:bg-blue-500/10 transition-all pointer-events-none" />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={20} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('tests.search') || 'Поиск по базе знаний...'}
                    className="w-full bg-[#13131c]/80 border border-white/10 rounded-2xl p-4 pl-12 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none backdrop-blur-md shadow-inner"
                />
            </div>

            {/* Categories */}
            <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar snap-x">
                {['Все направления', 'Точные науки', 'Гуманитарные', 'Логика'].map((cat, i) => (
                    <button
                        key={cat}
                        className={`snap-start px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                            i === 0 
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                            : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Tests List */}
            <div className="space-y-5">
                {isLoading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-40 glass-card rounded-[24px] animate-pulse" />)
                ) : filteredTests?.map((test: any) => (
                    <Link key={test.id} href={`/tests/${test.id}/play`} className="block group">
                        <div className="glass-card rounded-[28px] flex flex-col gap-5 p-6 border border-white/10 group-hover:border-blue-500/30 group-hover:bg-[#1a1a2e]/60 transition-all group-active:scale-[0.98] relative overflow-hidden">
                            {/* Card Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />

                            <div className="flex justify-between items-start relative z-10">
                                <div className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-blue-500/20">
                                    {test.duration_minutes > 60 ? 'Экзамен' : 'Блиц-тест'}
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-400 text-xs font-semibold bg-black/20 px-3 py-1.5 rounded-lg">
                                    <Clock size={14} className="text-gray-500" />
                                    {test.duration_minutes} {t('tests.minutes') || 'мин'}
                                </div>
                            </div>

                            <div className="relative z-10">
                                <h3 className="font-bold text-xl mb-2 text-white group-hover:text-blue-50 transition-colors leading-tight">
                                    {test.title}
                                </h3>
                                <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
                                    {test.description || 'Описание тестирования не предоставлено руководителем.'}
                                </p>
                            </div>

                            <div className="flex items-center justify-between border-t border-white/5 pt-5 relative z-10">
                                <span className="text-gray-400 text-sm font-semibold flex items-center gap-2">
                                    <BookOpen size={16} className="text-gray-500" />
                                    {test._count?.questions || 0} {t('tests.questions') || 'вопросов'}
                                </span>
                                <div className="flex items-center gap-2 text-blue-400 text-sm font-bold bg-blue-500/10 px-4 py-2 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                                    {t('tests.start') || 'Перейти к тесту'} <ChevronRight size={16} />
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
                {!isLoading && filteredTests?.length === 0 && (
                    <div className="glass-card text-center py-20 rounded-[32px] border border-dashed border-white/10">
                         <Search className="mx-auto text-gray-600 mb-4" size={32} />
                        <p className="text-gray-400 font-medium">Модули не найдены в базе данных</p>
                    </div>
                )}
            </div>

            <BottomNav />
        </main>
    )
}
