'use client'

import { useState, useEffect } from 'react'
import { api, fetchScheduledPosts, fetchChannels, fetchTests, cancelScheduledPost } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { cn } from '@/lib/utils'
import { Calendar, Clock, Send, Plus, X, Globe, MessageSquare, AlertCircle, CheckCircle, Clock3, Trash2 } from 'lucide-react'

const STATUS_CONFIG: Record<string, { color: string, bg: string, icon: any, label: string }> = {
    PENDING: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Clock3, label: 'В ожидании' },
    PUBLISHED: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle, label: 'Опубликовано' },
    FAILED: { color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertCircle, label: 'Ошибка' },
    CANCELLED: { color: 'text-gray-400', bg: 'bg-gray-500/10', icon: X, label: 'Отменено' },
}

export default function SchedulePage() {
    const [showForm, setShowForm] = useState(false)
    const [selectedChannels, setSelectedChannels] = useState<string[]>([])
    const [selectedTest, setSelectedTest] = useState('')
    const [publishNow, setPublishNow] = useState(false)
    const [scheduledAt, setScheduledAt] = useState('')
    const [language, setLanguage] = useState<'ru' | 'uz'>('ru')
    const [messageText, setMessageText] = useState('')
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PUBLISHED'>('ALL')

    const [posts, setPosts] = useState<any[]>([])
    const [channels, setChannels] = useState<any[]>([])
    const [tests, setTests] = useState<any[]>([])
    const [isLoadingData, setIsLoadingData] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editPostId, setEditPostId] = useState<string | null>(null)

    const toggleChannel = (id: string) => {
        setSelectedChannels(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        )
    }

    const loadData = async () => {
        try {
            setIsLoadingData(true)
            const [postsRes, channelsRes, testsRes] = await Promise.all([
                fetchScheduledPosts(1),
                fetchChannels(),
                fetchTests(1)
            ])
            setPosts(postsRes.posts || [])
            setChannels(channelsRes.channels || [])
            setTests(testsRes.tests || [])
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoadingData(false)
        }
    }

    useEffect(() => { loadData() }, [])

    const handleEdit = (post: any) => {
        setSelectedChannels([post.channel_id])
        setSelectedTest(post.test_id || '')
        setMessageText(post.message_tmpl || '')
        setLanguage(post.language === 'ru' ? 'ru' : 'uz')
        const date = new Date(post.publish_at)
        const tzOffset = date.getTimezoneOffset() * 60000
        const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16)
        setScheduledAt(localISOTime)
        setPublishNow(false)
        setEditPostId(post.id)
        setShowForm(true)
    }

    const onSubmit = async () => {
        if (selectedChannels.length === 0) return alert('Выберите хотя бы один канал!')
        if (!messageText && !selectedTest) return alert('Добавьте текст или тест!')
        
        try {
            setIsSubmitting(true)
            if (editPostId) {
                await cancelScheduledPost(editPostId)
            }
            await api.post('/api/admin/scheduler/schedule', {
                channelIds: selectedChannels,
                testId: selectedTest || undefined,
                publishNow,
                language,
                messageText: messageText || undefined,
                publishAt: publishNow || !scheduledAt ? undefined : new Date(scheduledAt).toISOString()
            })
            
            setShowForm(false)
            setPublishNow(false)
            setMessageText('')
            setSelectedTest('')
            setSelectedChannels([])
            setScheduledAt('')
            setEditPostId(null)
            loadData()
        } catch (err) {
            alert('Ошибка публикации. Проверьте настройки бота и права в канале.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Вы уверены, что хотите отменить этот пост?')) return
        try {
            await cancelScheduledPost(id)
            loadData()
        } catch (e) {
            alert('Ошибка при удалении поста')
        }
    }

    const filteredPosts = posts.filter(p => filter === 'ALL' || p.status === filter)

    return (
        <div className="flex flex-col min-h-screen pb-24 bg-[#0a0a0f]">
            {/* Header */}
            <div className="sticky top-0 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5 pt-12 pb-4 px-6 z-40">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Публикации</h1>
                        <p className="text-sm text-gray-400 font-medium">Планировщик постов</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="h-12 px-5 rounded-2xl bg-white text-black font-bold flex items-center gap-2 hover:bg-gray-200 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    >
                        <Plus size={18} /> Создать
                    </button>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl">
                    {(['ALL', 'PENDING', 'PUBLISHED'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={cn(
                                "flex-1 py-2 text-[13px] font-bold rounded-xl transition-all",
                                filter === tab ? "bg-white/10 text-white shadow" : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            {tab === 'ALL' ? 'Все' : tab === 'PENDING' ? 'Ожидают' : 'Опубликованы'}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="px-5 pt-6 flex flex-col gap-4">
                {isLoadingData ? (
                    <LoaderLines />
                ) : filteredPosts.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center opacity-50">
                        <Calendar size={48} className="mb-4 text-gray-400" />
                        <p className="font-medium text-gray-400">Пока нет публикаций</p>
                    </div>
                ) : (
                    filteredPosts.map((post: any) => {
                        const conf = STATUS_CONFIG[post.status] || STATUS_CONFIG['PENDING']
                        const Icon = conf.icon
                        return (
                            <div key={post.id} className="p-5 rounded-[24px] bg-[#161625] border border-white/5 shadow-lg relative overflow-hidden group animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className={cn("absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full pointer-events-none opacity-20", conf.bg.replace('/10', ''))} />
                                
                                <div className="flex justify-between items-start mb-3 relative z-10">
                                    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider", conf.bg, conf.color)}>
                                        <Icon size={12} /> {conf.label}
                                    </div>
                                    <div className="text-xs font-bold text-gray-500 bg-white/5 px-2.5 py-1 rounded-lg uppercase">
                                        {post.language === 'uz' ? '🇺🇿 UZ' : '🇷🇺 RU'}
                                    </div>
                                </div>
                                
                                <h3 className="font-bold text-[15px] text-white leading-snug mb-1 relative z-10 pr-8">
                                    {post.test?.title || 'Обычный пост'}
                                </h3>
                                {post.message_tmpl && <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">{post.message_tmpl}</p>}
                                
                                <div className="flex items-center justify-between mt-2 relative z-10">
                                    <div className="flex items-center gap-2 text-[12px] font-medium text-gray-500">
                                        <Clock size={14} className="text-gray-600" />
                                        {new Date(post.publish_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        <span className="mx-1">•</span>
                                        {post.channel?.name || 'Неизвестный канал'}
                                    </div>
                                    {post.status === 'PENDING' && (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleEdit(post)}
                                                className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(post.id)}
                                                className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {post.error_log && (
                                    <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                                        {post.error_log}
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {/* Create Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end animate-in fade-in duration-200">
                    <div 
                        onClick={() => setShowForm(false)} 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <div 
                        className="relative bg-[#161625] rounded-t-[32px] p-6 pb-32 border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-full duration-300"
                    >
                            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
                            <h2 className="text-xl font-bold text-white mb-6">Создать публикацию</h2>

                            <div className="space-y-5">
                                {/* Channels multi-select */}
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                                        <span className="flex items-center gap-2"><Globe size={14} /> Каналы для публикации</span>
                                        {selectedChannels.length > 0 && (
                                            <span className="text-blue-400 text-[11px] normal-case font-semibold">{selectedChannels.length} выбрано</span>
                                        )}
                                    </label>
                                    {channels.length === 0 ? (
                                        <p className="text-gray-500 text-sm py-2">Нет доступных каналов. Добавьте их в настройках.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {channels.map((ch: any) => {
                                                const isSelected = selectedChannels.includes(ch.id)
                                                return (
                                                    <button
                                                        key={ch.id}
                                                        type="button"
                                                        onClick={() => toggleChannel(ch.id)}
                                                        className={cn(
                                                            "px-4 py-2.5 rounded-2xl text-sm font-bold border-2 transition-all active:scale-95",
                                                            isSelected
                                                                ? "bg-blue-500/20 border-blue-500 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                                                                : "bg-[#0a0a0f] border-white/10 text-gray-400 hover:border-white/25"
                                                        )}
                                                    >
                                                        {isSelected && <span className="mr-1.5">✓</span>}
                                                        {ch.name}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Test */}
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Аттачмент теста</label>
                                    <select
                                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-2xl px-4 py-3.5 text-[15px] font-medium text-white outline-none focus:border-blue-500 transition-colors appearance-none"
                                        value={selectedTest}
                                        onChange={e => setSelectedTest(e.target.value)}
                                    >
                                        <option value="">Без теста (только текст)</option>
                                        {tests.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                                    </select>
                                </div>

                                {/* Text */}
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Описание к посту</label>
                                    <textarea
                                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-2xl px-4 py-4 text-[15px] text-white outline-none focus:border-blue-500 transition-colors resize-none h-28"
                                        placeholder="Напишите текст вашего поста..."
                                        value={messageText}
                                        onChange={e => setMessageText(e.target.value)}
                                    />
                                </div>

                                {/* Language & Timing */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Язык кнопки</label>
                                        <div className="flex bg-[#0a0a0f] border border-white/10 rounded-2xl p-1">
                                            {(['ru', 'uz'] as const).map(l => (
                                                <button
                                                    key={l}
                                                    onClick={() => setLanguage(l)}
                                                    className={cn("flex-1 py-2 text-[13px] font-bold rounded-xl transition-all uppercase", language === l ? "bg-white/10 text-white" : "text-gray-500")}
                                                >
                                                    {l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Когда</label>
                                        <div className="flex bg-[#0a0a0f] border border-white/10 rounded-2xl p-1">
                                            <button 
                                                onClick={() => { setPublishNow(true); setScheduledAt(''); }}
                                                className={cn("flex-1 py-2 text-[13px] font-bold rounded-xl transition-all", publishNow ? "bg-blue-600/20 text-blue-400" : "text-gray-500")}
                                            >
                                                Сейчас
                                            </button>
                                            <button 
                                                onClick={() => setPublishNow(false)}
                                                className={cn("flex-1 py-2 text-[13px] font-bold rounded-xl transition-all", !publishNow ? "bg-blue-600/20 text-blue-400" : "text-gray-500")}
                                            >
                                                Потом
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {!publishNow && (
                                    <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Точное время отправки</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-2xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-blue-500 config-cal-icon-white"
                                            value={scheduledAt}
                                            onChange={e => setScheduledAt(e.target.value)}
                                        />
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    onClick={onSubmit}
                                    disabled={selectedChannels.length === 0 || (!selectedTest && !messageText) || isSubmitting}
                                    className="w-full py-4 mt-6 bg-white text-black text-[15px] font-bold rounded-2xl disabled:opacity-30 disabled:border-white/10 disabled:bg-[#0a0a0f] disabled:text-gray-500 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                                >
                                    {isSubmitting ? <span className="animate-pulse">Подготовка...</span> : publishNow ? <><Send size={18}/> Опубликовать</> : <><Calendar size={18}/> Запланировать</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            <BottomNav />

            {/* Global style to fix the calendar icon on dark mode datetime-local fields in Chrome */}
            <style dangerouslySetInnerHTML={{__html: `
                .config-cal-icon-white::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    opacity: 0.5;
                    cursor: pointer;
                }
            `}} />
        </div>
    )
}

function LoaderLines() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="p-5 rounded-[24px] bg-[#161625] animate-pulse border border-white/5">
                    <div className="w-1/4 h-3 bg-white/10 rounded-full mb-4" />
                    <div className="w-3/4 h-5 bg-white/10 rounded-full mb-3" />
                    <div className="w-1/2 h-3 bg-white/10 rounded-full" />
                </div>
            ))}
        </div>
    )
}
