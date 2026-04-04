'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchChannels, fetchTopics } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { clearToken } from '@/lib/api'

export default function SettingsPage() {
    const { data: channels } = useQuery({ queryKey: ['channels'], queryFn: fetchChannels })
    const { data: topics } = useQuery({ queryKey: ['topics'], queryFn: fetchTopics })

    return (
        <div className="flex flex-col pb-24">
            <div className="sticky top-0 bg-[#0f0f1a]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 z-40">
                <h1 className="text-lg font-bold">Настройки</h1>
            </div>

            <div className="p-4 flex flex-col gap-4">
                {/* Channels */}
                <div className="card">
                    <p className="font-semibold mb-3 flex items-center gap-2">
                        📡 <span>Каналы ({channels?.total ?? 0})</span>
                    </p>
                    <div className="flex flex-col gap-2">
                        {channels?.channels?.map((ch: any) => (
                            <div key={ch.id} className="flex items-center justify-between text-sm">
                                <span className="truncate">{ch.name}</span>
                                <span className={`text-xs ml-2 shrink-0 ${ch.is_active ? 'text-green-400' : 'text-red-400'}`}>
                                    {ch.is_active ? '✅ Активен' : '❌ Неактивен'}
                                </span>
                            </div>
                        ))}
                        {(!channels?.channels?.length) && (
                            <p className="text-xs text-gray-500">Каналы не добавлены</p>
                        )}
                    </div>
                </div>

                {/* Topics */}
                <div className="card">
                    <p className="font-semibold mb-3 flex items-center gap-2">
                        🏷️ <span>Темы ({topics?.total ?? 0})</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {topics?.topics?.map((t: any) => (
                            <span key={t.id} className="px-2.5 py-1 rounded-full bg-blue-600/20 text-blue-300 text-xs">
                                {t.name} ({t._count?.questions ?? 0})
                            </span>
                        ))}
                        {(!topics?.topics?.length) && (
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
