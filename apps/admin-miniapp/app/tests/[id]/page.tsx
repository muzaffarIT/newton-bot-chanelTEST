'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTest, api } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { ChevronLeft, ChevronRight, Plus, Save, Trash2, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function TestEditorPage() {
    const { id } = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const [isEditing, setIsEditing] = useState(false)

    const { data: test, isLoading } = useQuery({
        queryKey: ['test', id],
        queryFn: () => fetchTest(id as string)
    })

    const updateTestMutation = useMutation({
        mutationFn: async (data: any) => {
            const { data: res } = await api.put(`/api/admin/tests/${id}`, data)
            return res
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['test', id] })
            setIsEditing(false)
        }
    })

    const deleteQuestionMutation = useMutation({
        mutationFn: async (qId: string) => {
            await api.delete(`/api/admin/tests/questions/${qId}`)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['test', id] })
    })

    if (isLoading) return <div className="p-10 text-center animate-pulse">Загрузка данных теста...</div>
    if (!test) return <div className="p-10 text-center">Тест не найден</div>

    return (
        <div className="flex flex-col pb-32">
            <header className="sticky top-0 bg-[#0f0f1a]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 z-40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="text-gray-400">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold truncate max-w-[200px]">{test.title}</h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Редактор теста</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-blue-400 font-bold text-sm"
                >
                    {isEditing ? 'Отмена' : 'Настройки'}
                </button>
            </header>

            <main className="p-4 flex flex-col gap-6">
                {/* Test Settings Form (Visible when isEditing) */}
                {isEditing && (
                    <div className="card space-y-4 border-blue-500/30 bg-blue-500/5 animate-in slide-in-from-top duration-300">
                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Название</label>
                            <input 
                                defaultValue={test.title} 
                                id="test-title"
                                className="input bg-white/5 border-white/10" 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Время (мин)</label>
                                <input 
                                    type="number" 
                                    defaultValue={test.duration_minutes} 
                                    id="test-duration"
                                    className="input bg-white/5 border-white/10" 
                                />
                            </div>
                            <div className="flex flex-col justify-center">
                                <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Пересдача</label>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" defaultChecked={test.allow_retakes} id="test-retakes" className="w-5 h-5 rounded border-white/10 bg-white/5" />
                                    <span className="text-sm">Разрешена</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => {
                                const title = (document.getElementById('test-title') as HTMLInputElement).value
                                const duration = parseInt((document.getElementById('test-duration') as HTMLInputElement).value)
                                const retakes = (document.getElementById('test-retakes') as HTMLInputElement).checked
                                updateTestMutation.mutate({ title, duration_minutes: duration, allow_retakes: retakes })
                            }}
                            className="btn-primary w-full py-3"
                        >
                            <Save size={18} /> Сохранить изменения
                        </button>
                    </div>
                )}

                {/* Questions List */}
                <div className="flex items-center justify-between">
                    <h2 className="font-black text-sm uppercase tracking-widest text-gray-500">Вопросы ({test.questions?.length})</h2>
                    <button 
                        onClick={() => router.push(`/tests/${id}/questions/create`)}
                        className="bg-blue-600 text-white p-2 rounded-xl active:scale-90 transition-transform"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    {test.questions?.map((q: any, idx: number) => (
                        <div key={q.id} className="card group">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-black text-white/20">#{idx + 1}</span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => router.push(`/tests/${id}/questions/${q.id}`)}
                                        className="p-1.5 text-gray-400 hover:text-white"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                    <button 
                                        onClick={() => { if(confirm('Удалить вопрос?')) deleteQuestionMutation.mutate(q.id) }}
                                        className="p-1.5 text-red-400/50 hover:text-red-500"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <p className="font-semibold text-sm leading-relaxed mb-4">{q.text}</p>
                            
                            {q.image_url && (
                                <div className="relative h-32 w-full bg-white/5 rounded-xl mb-4 overflow-hidden border border-white/5">
                                    <img src={q.image_url} alt="Question" className="w-full h-full object-contain" />
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-1.5">
                                {q.options?.map((opt: any) => (
                                    <div key={opt.id} className={cn(
                                        "flex items-center gap-2 p-2 rounded-lg text-xs",
                                        opt.is_correct ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-white/5 text-gray-400"
                                    )}>
                                        {opt.is_correct ? <CheckCircle size={14} /> : <XCircle size={14} className="opacity-30" />}
                                        <span className="truncate">{opt.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {test.questions?.length === 0 && (
                        <div className="text-center py-10 bg-white/5 rounded-2xl border border-dashed border-white/10">
                            <p className="text-gray-500 text-sm">В этом тесте пока нет вопросов</p>
                        </div>
                    )}
                </div>
            </main>

            <BottomNav />
        </div>
    )
}
