'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchChannels, fetchTopics, api } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { clearToken } from '@/lib/api'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export default function SettingsPage() {
    const queryClient = useQueryClient()
    const { data: channels } = useQuery({ queryKey: ['channels'], queryFn: fetchChannels })
    const { data: topics } = useQuery({ queryKey: ['topics'], queryFn: fetchTopics })

    const [isAddingChannel, setIsAddingChannel] = useState(false)
    const [channelName, setChannelName] = useState('')
    const [channelId, setChannelId] = useState('')

    const [isAddingTopic, setIsAddingTopic] = useState(false)
    const [topicName, setTopicName] = useState('')
    const [topicDesc, setTopicDesc] = useState('')

    const createChannelMut = useMutation({
        mutationFn: async () => {
            await api.post('/api/admin/channels', { name: channelName, telegram_id: channelId })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] })
            setIsAddingChannel(false)
            setChannelName('')
            setChannelId('')
        }
    })

    const createTopicMut = useMutation({
        mutationFn: async () => {
            await api.post('/api/admin/topics', { name: topicName, description: topicDesc })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['topics'] })
            setIsAddingTopic(false)
            setTopicName('')
            setTopicDesc('')
        }
    })

    return (
        <div className="flex flex-col pb-24">
            <div className="sticky top-0 bg-[#0f0f1a]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 z-40">
                <h1 className="text-lg font-bold">Настройки</h1>
            </div>

            <div className="p-4 flex flex-col gap-4">
                {/* Channels */}
                <div className="card">
                    <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold flex items-center gap-2">
                            📡 <span>Каналы ({channels?.total ?? 0})</span>
                        </p>
                        <button onClick={() => setIsAddingChannel(!isAddingChannel)} className="text-blue-400 p-1 font-bold text-xs uppercase cursor-pointer">
                            {isAddingChannel ? 'Отмена' : '+ Добавить'}
                        </button>
                    </div>

                    {isAddingChannel && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30 text-center shadow-[0_0_20px_rgba(37,99,235,0.15)] animate-in slide-in-from-top-4">
                            <p className="text-xs text-blue-200 mb-3 leading-relaxed">
                                Для удобства и безопасности каналы добавляются через бота. <br/><br/>
                                Введите команду <b>/add_channel</b> в чате с ботом, нажмите «Выбрать канал» и Telegram сам подтянет его ID!
                            </p>
                            <button 
                                onClick={() => {
                                    if(window.Telegram?.WebApp) {
                                        // This will ask to send a message /add_channel to the bot natively!
                                        window.Telegram.WebApp.close();
                                    }
                                }} 
                                className="btn-primary w-full py-2.5 flex items-center justify-center text-xs shadow-xl shadow-blue-600/20"
                            >
                                Перейти в бот
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        {channels?.channels?.map((ch: any) => (
                            <div key={ch.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-white/5">
                                <span className="truncate flex-1">{ch.name} <span className="text-[10px] text-gray-400 block">{ch.telegram_id}</span></span>
                                <span className={`text-xs ml-2 shrink-0 ${ch.is_active ? 'text-green-400' : 'text-red-400'}`}>
                                    {ch.is_active ? '✅' : '❌'}
                                </span>
                            </div>
                        ))}
                        {(!channels?.channels?.length) && !isAddingChannel && (
                            <p className="text-xs text-gray-500">Каналы не добавлены</p>
                        )}
                    </div>
                </div>

                {/* Topics */}
                <div className="card">
                    <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold flex items-center gap-2">
                            🏷️ <span>Темы ({topics?.total ?? 0})</span>
                        </p>
                        <button onClick={() => setIsAddingTopic(!isAddingTopic)} className="text-blue-400 p-1">
                            {isAddingTopic ? 'Отмена' : <Plus size={18} />}
                        </button>
                    </div>

                    {isAddingTopic && (
                        <div className="mb-4 space-y-2 p-3 bg-white/5 rounded-xl border border-white/10">
                            <input placeholder="Название темы (напр. Математика)" value={topicName} onChange={e => setTopicName(e.target.value)} className="input bg-black/20 text-xs py-2" />
                            <input placeholder="Краткое описание" value={topicDesc} onChange={e => setTopicDesc(e.target.value)} className="input bg-black/20 text-xs py-2" />
                            <button onClick={() => createTopicMut.mutate()} disabled={!topicName} className="btn-primary w-full py-2 flex items-center justify-center text-xs">Создать тему</button>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        {topics?.topics?.map((t: any) => (
                            <span key={t.id} className="px-2.5 py-1 rounded-full bg-blue-600/20 text-blue-300 text-xs">
                                {t.name} ({t._count?.questions ?? 0})
                            </span>
                        ))}
                        {(!topics?.topics?.length) && !isAddingTopic && (
                            <p className="text-xs text-gray-500">Темы не добавлены</p>
                        )}
                    </div>
                </div>

                {/* About */}
                <div className="card">
                    <p className="font-semibold mb-3">ℹ️ О системе</p>
                    <div className="flex flex-col gap-1 text-xs text-gray-400">
                        <p>Newton Academy Bot Platform</p>
                        <p>Admin Mini App v1.0</p>
                        <p>Backend: NestJS + Prisma + BullMQ</p>
                    </div>
                    <button
                        onClick={() => {
                            clearToken()
                            window.location.reload()
                        }}
                        className="mt-4 w-full py-2 rounded-xl bg-red-600/20 text-red-400 text-sm font-medium border border-red-500/20"
                    >
                        Выйти из аккаунта
                    </button>
                </div>
            </div>

            <BottomNav />
        </div>
    )
}
