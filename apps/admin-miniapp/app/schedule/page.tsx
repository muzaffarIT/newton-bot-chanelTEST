'use client'

import { useState, useEffect } from 'react'
import { api, fetchScheduledPosts, fetchChannels, fetchTests, cancelScheduledPost } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, Send, Plus, X, Globe, MessageSquare, AlertCircle, CheckCircle, Clock3, Trash2 } from 'lucide-react'

const STATUS_CONFIG: Record<string, { color: string, bg: string, icon: any, label: string }> = {
    PENDING: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Clock3, label: 'В ожидании' },
    PUBLISHED: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle, label: 'Опубликовано' },
    FAILED: { color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertCircle, label: 'Ошибка' },
    CANCELLED: { color: 'text-gray-400', bg: 'bg-gray-500/10', icon: X, label: 'Отменено' },
}

export default function SchedulePage() {
    const [showForm, setShowForm] = useState(false)
    const [selectedChannel, setSelectedChannel] = useState('')
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

    const onSubmit = async () => {
        if (!selectedChannel) return alert('Выберите канал!')
        if (!messageText && !selectedTest) return alert('Добавьте текст или тест!')
        
        try {
            setIsSubmitting(true)
            await api.post('/api/admin/scheduler/schedule', {
                channelId: selectedChannel,
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
                            <motion.div key={post.id} initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="p-5 rounded-[24px] bg-[#161625] border border-white/5 shadow-lg relative overflow-hidden group">
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
                                        <button 
                                            onClick={() => handleDelete(post.id)}
                                            className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>

                                {post.error_log && (
                                    <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                                        {post.error_log}
                                    </div>
                                )}
                            </motion.div>
                        )
                    })
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-50 flex flex-col justify-end">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                            onClick={() => setShowForm(false)} 
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative bg-[#161625] rounded-t-[32px] p-6 pb-12 border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto"
                        >
                            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
                            <h2 className="text-xl font-bold text-white mb-6">Создать публикацию</h2>

                            <div className="space-y-5">
                                {/* Channel */}
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Канал для публикации</label>
                                    <div className="relative">
                                        <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <select
                                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-[15px] font-medium text-white outline-none focus:border-blue-500 transition-colors appearance-none"
                                            value={selectedChannel}
                                            onChange={e => setSelectedChannel(e.target.value)}
                                        >
                                            <option value="" disabled>Выберите канал...</option>
                                            {channels.map((ch: any) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                                        </select>
                                    </div>
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
                                        <button 
                                            onClick={() => { setPublishNow(!publishNow); setScheduledAt(''); }}
                                            className={cn("w-full h-[42px] rounded-2xl font-bold text-[13px] transition-colors border", publishNow ? "bg-blue-600/20 text-blue-400 border-blue-500/30" : "bg-[#0a0a0f] text-gray-400 border-white/10")}
                                        >
                                            {publishNow ? '🚀 Прямо сейчас' : '📅 По расписанию'}
                                        </button>
                                    </div>
                                </div>

                                {!publishNow && (
                                    <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="pt-2">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Точное время отправки</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-2xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-blue-500 config-cal-icon-white"
                                            value={scheduledAt}
                                            onChange={e => setScheduledAt(e.target.value)}
                                        />
                                    </motion.div>
                                )}

                                {/* Submit */}
                                <button
                                    onClick={onSubmit}
                                    disabled={!selectedChannel || (!selectedTest && !messageText) || isSubmitting}
                                    className="w-full py-4 mt-6 bg-white text-black text-[15px] font-bold rounded-2xl disabled:opacity-30 disabled:border-white/10 disabled:bg-[#0a0a0f] disabled:text-gray-500 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                                >
                                    {isSubmitting ? <span className="animate-pulse">Подготовка...</span> : publishNow ? <><Send size={18}/> Опубликовать</> : <><Calendar size={18}/> Запланировать</>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
