'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { ChevronLeft, Save, Plus, Trash2, CheckCircle, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CreateQuestionPage() {
    const { id: testId } = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()

    const [text, setText] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [options, setOptions] = useState([
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
    ])

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const { data: res } = await api.post(`/api/admin/tests/${testId}/questions`, data)
            return res
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['test', testId] })
            router.back()
        }
    })

    const handleOptionChange = (index: number, val: string) => {
        const newOptions = [...options]
        newOptions[index].text = val
        setOptions(newOptions)
    }

    const setCorrectOption = (index: number) => {
        setOptions(options.map((opt, i) => ({ ...opt, is_correct: i === index })))
    }

    const addOption = () => {
        setOptions([...options, { text: '', is_correct: false }])
    }

    const removeOption = (index: number) => {
        if (options.length <= 2) return
        setOptions(options.filter((_, i) => i !== index))
    }

    return (
        <div className="flex flex-col pb-32">
            <header className="sticky top-0 bg-[#0f0f1a]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 z-40 flex items-center gap-3">
                <button onClick={() => router.back()} className="text-gray-400">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-bold">Новый вопрос</h1>
            </header>

            <main className="p-4 flex flex-col gap-6">
                <div className="card space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Текст вопроса</label>
                        <textarea 
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Введите текст вопроса..."
                            className="input bg-white/5 border-white/10 min-h-[100px] py-3 h-auto"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">URL Изображения (опц.)</label>
                        <input 
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://..."
                            className="input bg-white/5 border-white/10" 
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-xs text-gray-500 font-bold uppercase flex justify-between">
                        Варианты ответов
                        <span className="text-blue-400 lowercase font-normal italic">выберите правильный</span>
                    </label>
                    
                    {options.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                            <button 
                                onClick={() => setCorrectOption(i)}
                                className={cn(
                                    "shrink-0 w-12 flex items-center justify-center rounded-xl transition-all",
                                    opt.is_correct ? "bg-green-500 text-white" : "bg-white/5 text-gray-600"
                                )}
                            >
                                {opt.is_correct ? <CheckCircle size={20} /> : <Circle size={20} />}
                            </button>
                            <input 
                                value={opt.text}
                                onChange={(e) => handleOptionChange(i, e.target.value)}
                                placeholder={`Вариант ${i + 1}`}
                                className={cn(
                                    "flex-1 input bg-white/5",
                                    opt.is_correct ? "border-green-500/50" : "border-white/10"
                                )}
                            />
                            <button 
                                onClick={() => removeOption(i)}
                                className="shrink-0 w-12 bg-red-500/10 text-red-500/50 rounded-xl flex items-center justify-center"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}

                    <button 
                        onClick={addOption}
                        className="w-full py-3 border border-dashed border-white/10 rounded-xl text-gray-500 text-sm font-bold flex items-center justify-center gap-2 active:bg-white/5 transition-all"
                    >
                        <Plus size={16} /> Добавить вариант
                    </button>
                </div>

                <button 
                    disabled={!text || options.some(opt => !opt.text) || createMutation.isPending}
                    onClick={() => createMutation.mutate({ text, image_url: imageUrl, options })}
                    className="btn-primary w-full py-4 mt-4 shadow-xl shadow-blue-600/20"
                >
                    <Save size={18} /> Сохранить вопрос
                </button>
            </main>

            <BottomNav />
        </div>
    )
}
