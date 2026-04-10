'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchChannels, fetchTopics, api } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { clearToken } from '@/lib/api'
import { Plus, Trash2, Radio, Tag, Info, LogOut, XCircle, Save, CheckCircle, MessageCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function SettingsPage() {
    const queryClient = useQueryClient()
    const { data: channels, isLoading: chLoading } = useQuery({ queryKey: ['channels'], queryFn: fetchChannels })
    const { data: topics, isLoading: topLoading } = useQuery({ queryKey: ['topics'], queryFn: fetchTopics })
    const { data: appSettings } = useQuery({
        queryKey: ['app-settings'],
        queryFn: async () => { const { data } = await api.get('/api/admin/settings'); return data }
    })

    const [isAddingChannel, setIsAddingChannel] = useState(false)
    const [channelName, setChannelName] = useState('')
    const [channelId, setChannelId] = useState('')
    const [channelError, setChannelError] = useState('')

    const [isAddingTopic, setIsAddingTopic] = useState(false)
    const [topicName, setTopicName] = useState('')
    const [topicDesc, setTopicDesc] = useState('')
    const [topicError, setTopicError] = useState('')

    const [contacts, setContacts] = useState({
        consultant_username: '@newton_support',
        consultant_phone: '+998 90 123 45 67',
        consultant_name: 'Поддержка Newton',
        school_name: 'Newton Academy',
    })
    const [contactsSaved, setContactsSaved] = useState(false)

    useEffect(() => {
        if (appSettings) {
            setContacts({
                consultant_username: appSettings.consultant_username || '@newton_support',
                consultant_phone: appSettings.consultant_phone || '+998 90 123 45 67',
                consultant_name: appSettings.consultant_name || 'Поддержка Newton',
                school_name: appSettings.school_name || 'Newton Academy',
            })
        }
    }, [appSettings])

    const saveContactsMut = useMutation({
        mutationFn: async () => { await api.patch('/api/admin/settings', contacts) },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['app-settings'] })
            setContactsSaved(true)
            setTimeout(() => setContactsSaved(false), 2500)
        }
    })

    const createChannelMut = useMutation({
        mutationFn: async () => {
            const trimmedId = channelId.trim()
            const trimmedName = channelName.trim()
            if (!trimmedName) throw new Error('Введите название канала')
            if (!trimmedId) throw new Error('Введите Telegram ID канала')
            if (!trimmedId.startsWith('-') && !trimmedId.startsWith('@')) {
                throw new Error('ID канала должен начинаться с \"-100...\" или \"@username\"')
            }
            await api.post('/api/admin/channels', { name: trimmedName, telegram_id: trimmedId })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] })
            setIsAddingChannel(false)
            setChannelName('')
            setChannelId('')
            setChannelError('')
        },
        onError: (err: any) => {
            setChannelError(err.response?.data?.message || err.message || 'Ошибка при добавлении канала')
        }
    })

    const deleteChannelMut = useMutation({
        mutationFn: async (id: string) => { await api.delete(`/api/admin/channels/${id}`) },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] })
    })

    const createTopicMut = useMutation({
        mutationFn: async () => {
            if (!topicName.trim()) throw new Error('Введите название темы')
            await api.post('/api/admin/topics', { name: topicName.trim(), description: topicDesc.trim() || undefined })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['topics'] })
            setIsAddingTopic(false)
            setTopicName('')
            setTopicDesc('')
            setTopicError('')
        },
        onError: (err: any) => {
            setTopicError(err.response?.data?.message || err.message || 'Ошибка')
        }
    })

    return (
        <div className="flex flex-col pb-24">
            <div className="sticky top-0 bg-[#0f0f1a]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 z-40">
                <h1 className="text-lg font-bold">Настройки</h1>
                <p className="text-[11px] text-gray-500">Каналы, контакты и система</p>
            </div>

            <div className="p-4 flex flex-col gap-4">

                {/* ── Contacts ─────────────────── */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <p className="font-semibold flex items-center gap-2 text-sm">
                            <MessageCircle size={15} className="text-emerald-400" />
                            Контакты поддержки
                        </p>
                        {contactsSaved && (
                            <span className="text-emerald-400 text-xs flex items-center gap-1 font-semibold">
                                <CheckCircle size={12} /> Сохранено
                            </span>
                        )}
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Имя консультанта</label>
                            <input value={contacts.consultant_name} onChange={e => setContacts(p => ({ ...p, consultant_name: e.target.value }))} placeholder="Поддержка Newton" className="input text-sm py-2.5" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Telegram @username</label>
                            <input value={contacts.consultant_username} onChange={e => setContacts(p => ({ ...p, consultant_username: e.target.value }))} placeholder="@newton_support" className="input text-sm py-2.5 font-mono" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Телефон</label>
                            <input value={contacts.consultant_phone} onChange={e => setContacts(p => ({ ...p, consultant_phone: e.target.value }))} placeholder="+998 90 123 45 67" className="input text-sm py-2.5" type="tel" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Название школы</label>
                            <input value={contacts.school_name} onChange={e => setContacts(p => ({ ...p, school_name: e.target.value }))} placeholder="Newton Academy" className="input text-sm py-2.5" />
                        </div>
                        <button onClick={() => saveContactsMut.mutate()} disabled={saveContactsMut.isPending} className="btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                            {saveContactsMut.isPending ? 'Сохранение...' : <><Save size={14} /> Сохранить контакты</>}
                        </button>
                    </div>
                </div>

                {/* ── Channels ─────────────────── */}
                <div className="card">
                    <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold flex items-center gap-2 text-sm">
                            <Radio size={15} className="text-blue-400" />
                            <span>Каналы <span className="text-gray-500">({channels?.total ?? 0})</span></span>
                        </p>
                        <button onClick={() => { setIsAddingChannel(!isAddingChannel); setChannelError('') }} className="text-blue-400 text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-lg hover:bg-blue-500/10 transition-colors">
                            {isAddingChannel ? 'Отмена' : '+ Добавить'}
                        </button>
                    </div>

                    {isAddingChannel && (
                        <div className="mb-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                            <p className="text-[11px] text-blue-300 font-semibold uppercase tracking-wider">Новый канал</p>
                            <div className="space-y-2">
                                <input placeholder="Название канала" value={channelName} onChange={e => { setChannelName(e.target.value); setChannelError('') }} className="input bg-black/30 text-sm py-2.5 border-white/10" />
                                <input placeholder="Telegram ID (-1001234567890)" value={channelId} onChange={e => { setChannelId(e.target.value); setChannelError('') }} className="input bg-black/30 text-sm py-2.5 font-mono border-white/10" />
                            </div>
                            {channelError && <p className="text-red-400 text-xs flex items-center gap-1"><XCircle size={12} /> {channelError}</p>}
                            <p className="text-[10px] text-gray-500 leading-relaxed">💡 Добавьте бота в канал как администратора, затем используйте <code className="text-blue-300">/add_channel</code> в боте — он автоматически подхватит.</p>
                            <button onClick={() => createChannelMut.mutate()} disabled={!channelName.trim() || !channelId.trim() || createChannelMut.isPending} className="btn-primary w-full py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                                {createChannelMut.isPending ? 'Добавление...' : <><Plus size={15} /> Добавить канал</>}
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        {chLoading ? [1, 2].map(i => <div key={i} className="h-12 skeleton rounded-xl" />) : channels?.channels?.length ? (
                            channels.channels.map((ch: any) => (
                                <div key={ch.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 group">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${ch.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{ch.name}</p>
                                        <p className="text-[10px] text-gray-500 font-mono">{ch.telegram_id}</p>
                                    </div>
                                    <button onClick={() => { if (confirm(`Удалить канал "${ch.name}"?`)) deleteChannelMut.mutate(ch.id) }} className="p-1.5 text-red-400/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 active:opacity-100">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        ) : <p className="text-xs text-gray-500 py-2 text-center italic">Каналы не добавлены. Нажмите «+ Добавить» выше.</p>}
                    </div>
                </div>

                {/* ── Topics ─────────────────── */}
                <div className="card">
                    <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold flex items-center gap-2 text-sm">
                            <Tag size={15} className="text-purple-400" />
                            <span>Темы <span className="text-gray-500">({topics?.total ?? 0})</span></span>
                        </p>
                        <button onClick={() => { setIsAddingTopic(!isAddingTopic); setTopicError('') }} className="text-purple-400 text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-lg hover:bg-purple-500/10 transition-colors">
                            {isAddingTopic ? 'Отмена' : '+ Добавить'}
                        </button>
                    </div>
                    {isAddingTopic && (
                        <div className="mb-4 p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3">
                            <p className="text-[11px] text-purple-300 font-semibold uppercase">Новая тема</p>
                            <input placeholder="Название темы (напр. Математика)" value={topicName} onChange={e => { setTopicName(e.target.value); setTopicError('') }} className="input bg-black/30 text-sm py-2.5 border-white/10" />
                            <input placeholder="Описание (необязательно)" value={topicDesc} onChange={e => setTopicDesc(e.target.value)} className="input bg-black/30 text-sm py-2.5 border-white/10" />
                            {topicError && <p className="text-red-400 text-xs flex items-center gap-1"><XCircle size={12} /> {topicError}</p>}
                            <button onClick={() => createTopicMut.mutate()} disabled={!topicName.trim() || createTopicMut.isPending} className="btn-primary w-full py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                                {createTopicMut.isPending ? 'Создание...' : <><Plus size={15} /> Создать тему</>}
                            </button>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {topLoading ? [1, 2, 3].map(i => <div key={i} className="h-7 w-20 skeleton rounded-full" />) : topics?.topics?.length ? (
                            topics.topics.map((t: any) => (
                                <span key={t.id} className="px-3 py-1 rounded-full bg-purple-600/15 text-purple-300 text-xs border border-purple-500/20">
                                    {t.name} <span className="text-purple-500">({t._count?.questions ?? 0})</span>
                                </span>
                            ))
                        ) : <p className="text-xs text-gray-500 italic">Темы не добавлены</p>}
                    </div>
                </div>

                {/* ── About ─────────────────── */}
                <div className="card">
                    <p className="font-semibold mb-3 flex items-center gap-2 text-sm">
                        <Info size={15} className="text-gray-400" />О системе
                    </p>
                    <div className="flex flex-col gap-1 text-xs text-gray-500 mb-4">
                        <p>Newton Academy Bot Platform</p>
                        <p>Admin Mini App v1.0</p>
                    </div>
                    <button onClick={() => { clearToken(); window.location.reload() }} className="w-full py-2.5 rounded-xl bg-red-600/15 text-red-400 text-sm font-semibold border border-red-500/20 flex items-center justify-center gap-2 hover:bg-red-600/25 transition-colors">
                        <LogOut size={15} /> Выйти из аккаунта
                    </button>
                </div>
            </div>

            <BottomNav />
        </div>
    )
}
