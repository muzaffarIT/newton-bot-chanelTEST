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
        <main className="pb-24 pt-6 px-5 page-fade-in">
            <header className="mb-6">
                <h1 className="text-2xl font-bold mb-2">{t('tests.title')}</h1>
                <p className="text-tg-hint text-sm">{t('tests.subtitle')}</p>
            </header>

            {/* Search Bar */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-tg-hint" size={18} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('tests.search')}
                    className="input pl-12"
                />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                {['Все', 'Математика', 'Английский', 'IQ'].map((cat, i) => (
                    <button
                        key={cat}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${i === 0 ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary text-tg-text'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Tests List */}
            <div className="space-y-4">
                {isLoading ? (
                    [1, 2, 3].map(i => <div key={i} className="card h-32 bg-tg-secondary animate-pulse" />)
                ) : filteredTests?.map((test: any) => (
                    <Link key={test.id} href={`/tests/${test.id}/play`} className="card flex flex-col gap-4 active:scale-[0.98] transition-all">
                        <div className="flex justify-between items-start">
                            <div className="bg-tg-accent/10 text-tg-accent text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                {test.duration_minutes > 60 ? 'Exam' : 'Quiz'}
                            </div>
                            <div className="flex items-center gap-1 text-tg-hint text-xs">
                                <Clock size={14} />
                                {test.duration_minutes} {t('tests.minutes')}
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-lg mb-1">{test.title}</h3>
                            <p className="text-tg-hint text-xs line-clamp-2">
                                {test.description}
                            </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-4">
                            <span className="text-tg-text text-sm font-semibold">{test._count?.questions || 0} {t('tests.questions')}</span>
                            <div className="flex items-center gap-1 text-tg-accent text-sm font-bold">
                                {t('tests.start')} <ChevronRight size={16} />
                            </div>
                        </div>
                    </Link>
                ))}
                {!isLoading && filteredTests?.length === 0 && (
                    <div className="text-center py-20 text-tg-hint italic">Ничего не найдено</div>
                )}
            </div>

            <BottomNav />
        </main>
    )
}
