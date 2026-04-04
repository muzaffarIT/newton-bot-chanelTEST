'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { ChevronLeft, Save } from 'lucide-react'

export default function CreateTestPage() {
    const router = useRouter()
    const queryClient = useQueryClient()

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [duration, setDuration] = useState(60)
    const [allowRetakes, setAllowRetakes] = useState(false)

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const { data: res } = await api.post('/api/admin/tests', data)
            return res
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['tests'] })
            router.push(`/tests/${data.id}`)
        }
    })

    return (
        <div className="flex flex-col pb-32">
            <header className="sticky top-0 bg-[#0f0f1a]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 z-40 flex items-center gap-3">
                <button onClick={() => router.back()} className="text-gray-400">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-bold">Новый тест</h1>
            </header>

            <main className="p-4 flex flex-col gap-6">
                <div className="card space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Название теста</label>
                        <input 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Напр., Вступительный тест"
                            className="input bg-white/5 border-white/10" 
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Описание</label>
                        <textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Краткое описание для студентов..."
                            className="input bg-white/5 border-white/10 min-h-[80px] py-3"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Время (мин)</label>
                            <input 
                                type="number" 
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value))}
                                className="input bg-white/5 border-white/10" 
                            />
                        </div>
                        <div className="flex flex-col justify-center">
                            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Пересдача</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    checked={allowRetakes}
                                    onChange={(e) => setAllowRetakes(e.target.checked)}
                                    className="w-5 h-5 rounded border-white/10 bg-white/5" 
                                />
                                <span className="text-sm">Разрешена</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button 
                    disabled={!title || createMutation.isPending}
                    onClick={() => createMutation.mutate({ title, description, duration_minutes: duration, allow_retakes: allowRetakes })}
                    className="btn-primary w-full py-4 mt-4 shadow-xl shadow-blue-600/20"
                >
                    <Save size={18} /> Создать тест
                </button>
            </main>

            <BottomNav />
        </div>
    )
}
