'use client'

import { useState, useEffect } from 'react'
import { api, fetchScheduledPosts, fetchChannels, fetchTests, schedulePost } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'text-yellow-400', PUBLISHED: 'text-green-400',
    FAILED: 'text-red-400', CANCELLED: 'text-gray-500',
}

export default function SchedulePage() {
    const [showForm, setShowForm] = useState(false)
    const [selectedChannel, setSelectedChannel] = useState('')
    const [selectedTest, setSelectedTest] = useState('')
    const [publishNow, setPublishNow] = useState(false)
    const [scheduledAt, setScheduledAt] = useState('')
    const [language, setLanguage] = useState<'ru' | 'uz'>('ru')
    const [messageText, setMessageText] = useState('')

    // Data states
    const [posts, setPosts] = useState<any[]>([])
    const [channels, setChannels] = useState<any[]>([])
    const [tests, setTests] = useState<any[]>([])
    const [isLoadingData, setIsLoadingData] = useState(true)

    // Form states
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState(false)

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

    // Effect: Mount and fetch lists
    useEffect(() => {
        loadData()
    }, [])

    // Handler: Publish/Schedule
    const onSubmit = async () => {
        try {
            setIsSubmitting(true)
            setSubmitError(false)
            
            await api.post('/api/admin/scheduler/schedule', {
                channelId: selectedChannel,
                testId: selectedTest || undefined,
                publishNow,
                language,
                messageText: messageText || undefined,
                publishAt: publishNow || !scheduledAt ? undefined : new Date(scheduledAt).toISOString()
            })
            
            setShowForm(false)
            // Refresh list
            loadData()
        } catch (err) {
            console.error(err)
            setSubmitError(true)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col pb-24">
            <div className="sticky top-0 bg-[#0f0f1a]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 z-40 flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold">Посты</h1>
                    <p className="text-xs text-gray-400">Публикации в каналах</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-sm font-medium"
                >
                    + Пост
                </button>
            </div>

            {showForm && (
                <div className="mx-4 mt-4 card border border-blue-500/20">
                    <p className="font-semibold mb-3">Новый пост</p>

                    <label className="text-xs text-gray-400 mb-1 block">Канал</label>
                    <select
                        className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm mb-3 border border-white/10 outline-none"
                        value={selectedChannel}
                        onChange={e => setSelectedChannel(e.target.value)}
                    >
                        <option value="">Выберите канал...</option>
                        {channels.map((ch: any) => (
                            <option key={ch.id} value={ch.telegram_id}>{ch.name}</option>
                        ))}
                    </select>

                    <label className="text-xs text-gray-400 mb-1 block">Тест</label>
                    <select
                        className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm mb-3 border border-white/10 outline-none"
                        value={selectedTest}
                        onChange={e => setSelectedTest(e.target.value)}
                    >
                        <option value="">Выберите тест...</option>
                        {tests.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                    </select>

                    <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                        <input type="checkbox" checked={publishNow} onChange={e => setPublishNow(e.target.checked)}
                            className="rounded" />
                        Опубликовать сейчас
                    </label>

                    <label className="text-xs text-gray-400 mb-1 block">Язык</label>
                    <div className="flex gap-2 mb-3">
                        {['ru', 'uz'].map(lang => (
                            <button
                                key={lang}
                                onClick={() => setLanguage(lang as any)}
                                className={cn(
                                    "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                                    language === lang ? "bg-blue-600 border-blue-500" : "bg-white/5 border-white/10 text-gray-400"
                                )}
                            >
                                {lang.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <label className="text-xs text-gray-400 mb-1 block">Текст сообщения {selectedTest ? '(Опционально)' : '(Обязательно)'}</label>
                    <textarea
                        className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm mb-3 border border-white/10 outline-none resize-none h-24"
                        placeholder="Введите текст сообщения..."
                        value={messageText}
                        onChange={e => setMessageText(e.target.value)}
                    />

                    {!publishNow && (
                        <>
                            <label className="text-xs text-gray-400 mb-1 block">Дата и время</label>
                            <input
                                type="datetime-local"
                                className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm mb-3 border border-white/10 outline-none"
                                value={scheduledAt}
                                onChange={e => setScheduledAt(e.target.value)}
                            />
                        </>
                    )}

                    <button
                        onClick={onSubmit}
                        disabled={!selectedChannel || (!selectedTest && !messageText) || isSubmitting}
                        className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-40 mt-2"
                    >
                        {isSubmitting ? 'Отправка API...' : publishNow ? '🚀 Опубликовать' : '📅 Запланировать'}
                    </button>
                    {submitError && (
                        <p className="text-red-400 text-xs mt-2 text-center">Ошибка отправки формы. Проверьте данные.</p>
                    )}
                </div>
            )}

            <div className="p-4 flex flex-col gap-2">
                {isLoadingData
                    ? [...Array(3)].map((_, i) => <div key={i} className="card h-16 animate-pulse bg-white/5" />)
                    : posts.length === 0
                        ? <div className="card text-center py-10"><p className="text-gray-400">Нет постов</p></div>
                        : posts.map((post: any) => (
                            <div key={post.id} className="card">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{post.test?.title || 'Обычный пост (без теста)'}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {new Date(post.publish_at).toLocaleString('ru-RU')}
                                        </p>
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-black mr-2 uppercase text-blue-400",
                                    )}>
                                        {post.language}
                                    </span>
                                    <span className={`text-xs font-bold shrink-0 ${STATUS_COLORS[post.status] || 'text-gray-400'}`}>
                                        {post.status}
                                    </span>
                                </div>
                                {post.error_log && (
                                    <p className="text-xs text-red-400 mt-1 truncate">{post.error_log}</p>
                                )}
                            </div>
                        ))
                }
            </div>
            <BottomNav />
        </div>
    )
}
