'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTests } from '@/lib/api'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'

export default function TestsPage() {
    const router = useRouter()
    const [page, setPage] = useState(1)
    const { data, isLoading } = useQuery({
        queryKey: ['tests', page],
        queryFn: () => fetchTests(page),
    })

    return (
        <div className="flex flex-col pb-24">
            <div className="sticky top-0 bg-[#0f0f1a]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 z-40 flex justify-between items-center">
                <div>
                    <h1 className="text-lg font-bold">Тесты</h1>
                    <p className="text-xs text-gray-400">{data?.total ?? '...'} тестов</p>
                </div>
                <button 
                    onClick={() => router.push('/tests/create')}
                    className="bg-blue-600 text-white p-2 rounded-xl active:scale-90 transition-transform"
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="p-4 flex flex-col gap-2">
                {isLoading
                    ? [...Array(4)].map((_, i) => <div key={i} className="card h-20 animate-pulse bg-white/5" />)
                    : data?.tests?.map((test: any) => (
                        <div key={test.id} className="card active:scale-[0.98] transition-transform" onClick={() => router.push(`/tests/${test.id}`)}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">{test.title}</p>
                                    {test.description && (
                                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{test.description}</p>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs text-blue-400 font-bold">{test._count?.questions ?? 0} вопр.</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{test._count?.sessions ?? 0} сессий</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-gray-500">⏱ {test.duration_minutes} мин</span>
                                {test.allow_retakes
                                    ? <span className="text-xs text-green-400">✅ Пересдача</span>
                                    : <span className="text-xs text-gray-500">🔒 Без пересдачи</span>
                                }
                            </div>
                        </div>
                    ))
                }

                {data && data.total > 20 && (
                    <div className="flex items-center justify-between mt-4">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="px-4 py-2 rounded-xl bg-white/5 text-sm disabled:opacity-30">← Назад</button>
                        <span className="text-xs text-gray-400">{page} / {Math.ceil(data.total / 20)}</span>
                        <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= data.total}
                            className="px-4 py-2 rounded-xl bg-white/5 text-sm disabled:opacity-30">Вперёд →</button>
                    </div>
                )}
            </div>
            <BottomNav />
        </div>
    )
}
