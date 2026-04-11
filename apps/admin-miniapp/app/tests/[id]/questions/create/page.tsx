'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, fetchTopics } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { ChevronLeft, Save, Plus, Trash2, CheckCircle, Circle, UploadCloud, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CreateQuestionPage() {
    const { id: testId } = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [content, setContent] = useState('')
    const [topicId, setTopicId] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [options, setOptions] = useState([
        { content: '', is_correct: true },
        { content: '', is_correct: false },
        { content: '', is_correct: false },
        { content: '', is_correct: false },
    ])

    const { data: topicsData } = useQuery({ queryKey: ['topics'], queryFn: fetchTopics })
    const topics = topicsData?.topics || []

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const { data: res } = await api.post(`/api/admin/tests/${testId}/questions`, data)
            return res
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['test', testId] })
            router.back()
        },
        onError: (err: any) => {
            alert('Ошибка: ' + (err.response?.data?.message || err.message))
        }
    })

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            if (res.ok && data.url) {
                setImageUrl(data.url)
            } else {
                alert(data.error || 'Ошибка загрузки файла')
            }
        } catch (err) {
            alert('Ошибка сервера при загрузке')
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleOptionChange = (index: number, val: string) => {
        const newOptions = [...options]
        newOptions[index].content = val
        setOptions(newOptions)
    }

    const setCorrectOption = (index: number) => {
        setOptions(options.map((opt, i) => ({ ...opt, is_correct: i === index })))
    }

    const addOption = () => {
        setOptions([...options, { content: '', is_correct: false }])
    }

    const removeOption = (index: number) => {
        if (options.length <= 2) return
        setOptions(options.filter((_, i) => i !== index))
    }

    return (
        <div className="flex flex-col pb-32 bg-[#0f0f1a] min-h-screen text-gray-100 font-sans">
            <header className="sticky top-0 bg-[#0f0f1a]/90 backdrop-blur-md border-b border-white/5 px-6 py-4 z-40 flex items-center justify-between">
                <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <div className="text-right">
                    <h1 className="text-base font-medium">Создание вопроса</h1>
                    <p className="text-[11px] text-gray-500 uppercase tracking-widest">Редактор</p>
                </div>
            </header>

            <main className="p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* 1. Theme Selection */}
                <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider flex justify-between">
                            1. Тема вопроса
                            <button 
                                onClick={async () => {
                                    const name = prompt('Введите название новой темы:')
                                    if(name) {
                                        try {
                                            const { data } = await api.post('/api/admin/topics', { name })
                                            await queryClient.invalidateQueries({ queryKey: ['topics'] })
                                            setTopicId(data.id)
                                        } catch(e) {
                                            alert('Ошибка создания темы')
                                        }
                                    }
                                }}
                                className="text-blue-400 normal-case hover:underline"
                            >
                                + Создать новую
                            </button>
                        </label>
                        <select 
                            value={topicId}
                            onChange={(e) => setTopicId(e.target.value)}
                            className="w-full bg-[#1c1c28] rounded-xl px-4 py-3 text-sm border border-white/5 outline-none font-medium focus:border-blue-500/50 transition-colors"
                        >
                            <option value="">-- Выберите тему --</option>
                            {topics.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 2. Text */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">2. Текст вопроса</label>
                        <textarea 
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Опишите суть вопроса..."
                            className="w-full bg-[#1c1c28] rounded-xl px-4 py-4 text-sm border border-white/5 outline-none min-h-[100px] h-auto resize-y font-medium focus:border-blue-500/50 transition-colors placeholder:text-gray-600"
                        />
                    </div>

                    {/* 3. Image Upload */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider flex items-center justify-between">
                            3. Медиа (опционально)
                            {imageUrl && <button onClick={() => setImageUrl('')} className="text-red-400 font-normal hover:text-red-300 transition-colors">удалить</button>}
                        </label>
                        
                        <input 
                            type="file" 
                            accept="image/*,application/pdf" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            className="hidden" 
                        />

                        {imageUrl ? (
                            <div className="relative w-full h-48 rounded-xl overflow-hidden group border border-white/10 flex items-center justify-center bg-white/5">
                                {imageUrl.startsWith('data:application/pdf') || imageUrl.endsWith('.pdf') ? (
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                        <span className="text-sm font-medium">PDF документ загружен</span>
                                    </div>
                                ) : (
                                    <img src={imageUrl} alt="Uploaded" className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ) : (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="w-full h-24 rounded-xl border border-dashed border-gray-600 hover:border-gray-400 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-200 active:scale-[0.98] disabled:opacity-50"
                            >
                                {isUploading ? <Loader2 size={24} className="animate-spin text-blue-500" /> : <UploadCloud size={24} />}
                                <span className="text-xs font-medium">{isUploading ? 'Загрузка файла...' : 'Прикрепить изображение или PDF'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* 4. Options */}
                <div className="flex flex-col gap-3 mt-4">
                    <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wider flex justify-between items-center">
                        4. Варианты Ответа
                        <span className="text-gray-500 lowercase font-normal italic">отметьте правильный</span>
                    </label>
                    
                    <div className="space-y-2">
                        {options.map((opt, i) => (
                            <div key={i} className={cn(
                                "flex items-center gap-3 p-2 rounded-xl transition-colors duration-200",
                                opt.is_correct ? "bg-green-500/10 border border-green-500/20" : "bg-[#1c1c28] border border-white/5"
                            )}>
                                <button 
                                    onClick={() => setCorrectOption(i)}
                                    className={cn(
                                        "w-8 h-8 shrink-0 flex items-center justify-center rounded-lg transition-colors",
                                        opt.is_correct ? "bg-green-500 text-white" : "text-gray-500 hover:bg-white/5"
                                    )}
                                >
                                    {opt.is_correct ? <CheckCircle size={18} /> : <Circle size={18} />}
                                </button>
                                <input 
                                    value={opt.content}
                                    onChange={(e) => handleOptionChange(i, e.target.value)}
                                    placeholder={`Вариант ${i + 1}`}
                                    className="flex-1 bg-transparent outline-none border-none text-sm font-medium"
                                />
                                <button 
                                    onClick={() => removeOption(i)}
                                    className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={addOption}
                        className="w-full py-3 mt-2 rounded-xl border border-dashed border-gray-600 text-gray-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/5 hover:border-gray-400 transition-colors active:scale-[0.98]"
                    >
                        <Plus size={16} /> Добавить вариант
                    </button>
                </div>

                <div className="h-4" /> {/* Spacer */}

                <button 
                    disabled={!content || !topicId || options.some(opt => !opt.content) || createMutation.isPending}
                    onClick={() => createMutation.mutate({ content, topic_id: topicId, image_url: imageUrl, options })}
                    className={cn(
                        "fixed bottom-6 left-6 right-6 z-50 py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200",
                        !content || !topicId || options.some(opt => !opt.content) || createMutation.isPending 
                            ? "bg-white/5 text-gray-500 cursor-not-allowed" 
                            : "bg-white text-black hover:bg-gray-100 active:scale-[0.98]"
                    )}
                >
                    {createMutation.isPending ? <Loader2 size={18} className="animate-spin"/> : <Save size={18} />}
                    {createMutation.isPending ? 'Загрузка...' : 'Сохранить'}
                </button>
            </main>
        </div>
    )
}
