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
        }
    })

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('https://telegra.ph/upload', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            if (data && data[0] && data[0].src) {
                setImageUrl('https://telegra.ph' + data[0].src)
            } else {
                alert('Ошибка загрузки файла')
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
        <div className="flex flex-col pb-32">
            <header className="sticky top-0 bg-[#0f0f1a]/80 backdrop-blur-xl border-b border-white/5 px-5 py-4 z-40 flex items-center justify-between shadow-xl shadow-black/20">
                <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 active:scale-90 transition-transform">
                    <ChevronLeft size={20} />
                </button>
                <div className="text-right">
                    <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Плюс Вопрос</h1>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Wow Редактор</p>
                </div>
            </header>

            <main className="p-5 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                {/* 1. Theme Selection */}
                <div className="space-y-4">
                    <div className="p-5 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 shadow-lg">
                        <label className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-3 block">1. Выбор Темы</label>
                        <select 
                            value={topicId}
                            onChange={(e) => setTopicId(e.target.value)}
                            className="w-full bg-black/40 rounded-2xl px-4 py-4 text-sm border border-white/5 outline-none appearance-none font-medium"
                        >
                            <option value="">-- Выберите тему --</option>
                            {topics.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 2. Text */}
                    <div className="p-5 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 shadow-lg group focus-within:border-blue-500/30 transition-colors">
                        <label className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-3 block">2. Содержание</label>
                        <textarea 
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Опишите саму суть вопроса..."
                            className="w-full bg-transparent border-none outline-none min-h-[80px] h-auto resize-none text-base placeholder:text-gray-600 font-medium"
                        />
                    </div>

                    {/* 3. Image Upload (Telegra.ph WOW effect) */}
                    <div className="p-5 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 shadow-lg">
                        <label className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-3 block flex items-center justify-between">
                            3. Медиа (Файл)
                            {imageUrl && <button onClick={() => setImageUrl('')} className="text-red-400 flex items-center gap-1"><X size={12}/> удалить</button>}
                        </label>
                        
                        <input 
                            type="file" 
                            accept="image/*" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            className="hidden" 
                        />

                        {imageUrl ? (
                            <div className="relative w-full h-40 rounded-2xl overflow-hidden group border border-white/10">
                                <img src={imageUrl} alt="Uploaded" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            </div>
                        ) : (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="w-full h-32 rounded-2xl border-2 border-dashed border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-blue-400 active:scale-95 disabled:opacity-50"
                            >
                                {isUploading ? <Loader2 size={32} className="animate-spin text-blue-500" /> : <UploadCloud size={32} />}
                                <span className="text-xs font-bold uppercase tracking-wider">{isUploading ? 'Загрузка медиа...' : 'Прикрепить картинку'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* 4. Options */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 shadow-lg">
                    <label className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-4 flex justify-between items-center">
                        4. Варианты Ответа
                        <span className="text-gray-500 text-[9px]">ОТМЕТЬТЕ ПРАВИЛЬНЫЙ</span>
                    </label>
                    
                    <div className="space-y-3">
                        {options.map((opt, i) => (
                            <div key={i} className={cn(
                                "flex items-center gap-3 p-2 rounded-2xl border transition-all duration-300",
                                opt.is_correct ? "border-green-500/50 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "border-white/5 bg-black/20"
                            )}>
                                <button 
                                    onClick={() => setCorrectOption(i)}
                                    className={cn(
                                        "w-10 h-10 shrink-0 flex items-center justify-center rounded-xl transition-all duration-300",
                                        opt.is_correct ? "bg-green-500 text-white shadow-lg shadow-green-500/40 scale-110" : "bg-white/5 text-gray-600 hover:bg-white/10"
                                    )}
                                >
                                    {opt.is_correct ? <CheckCircle size={18} strokeWidth={3} /> : <Circle size={18} />}
                                </button>
                                <input 
                                    value={opt.content}
                                    onChange={(e) => handleOptionChange(i, e.target.value)}
                                    placeholder={`Вариант ${i + 1}`}
                                    className="flex-1 bg-transparent outline-none border-none text-sm font-medium h-10 px-2"
                                />
                                <button 
                                    onClick={() => removeOption(i)}
                                    className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-red-500/40 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={addOption}
                        className="w-full py-4 mt-4 rounded-xl text-blue-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-blue-500/10 active:scale-95 transition-all"
                    >
                        <Plus size={16} /> Ещё вариант
                    </button>
                </div>

                <div className="h-4" /> {/* Spacer */}

                <button 
                    disabled={!content || !topicId || options.some(opt => !opt.content) || createMutation.isPending}
                    onClick={() => createMutation.mutate({ content, topic_id: topicId, image_url: imageUrl, options })}
                    className={cn(
                        "fixed bottom-20 left-4 right-4 z-50 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl transition-all duration-300",
                        !content || !topicId || options.some(opt => !opt.content) || createMutation.isPending 
                            ? "bg-white/5 text-gray-500 border border-white/5" 
                            : "bg-blue-600 text-white shadow-blue-600/40 active:scale-95"
                    )}
                >
                    {createMutation.isPending ? <Loader2 size={18} className="animate-spin"/> : <Save size={18} />}
                    {createMutation.isPending ? 'Загрузка...' : 'Сохранить'}
                </button>
            </main>
        </div>
    )
}
