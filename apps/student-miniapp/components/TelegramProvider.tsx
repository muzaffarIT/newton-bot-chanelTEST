'use client'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { authWithInitData, setToken } from '@/lib/api'

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
})

export function TelegramProvider({ children }: { children: React.ReactNode }) {
    const [ready, setReady] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function init() {
            try {
                // Dynamically import Telegram SDK
                const { retrieveLaunchParams, isTMA } = await import('@telegram-apps/sdk')

                let initDataRaw = ''
                try {
                    const lp = retrieveLaunchParams()
                    initDataRaw = lp.initDataRaw || ''
                } catch (e) {
                    console.warn('[StudentMiniApp] Not launched as TMA', e)
                }

                if (!initDataRaw) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('[StudentMiniApp] Dev mode: bypassing auth')
                        setReady(true)
                        return
                    }
                    throw new Error('Пожалуйста, откройте это приложение в Telegram')
                }

                if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
                    (window as any).Telegram.WebApp.ready();
                    (window as any).Telegram.WebApp.expand();
                    if ((window as any).Telegram.WebApp.disableVerticalSwipes) {
                        (window as any).Telegram.WebApp.disableVerticalSwipes();
                    }
                }

                await authWithInitData(initDataRaw)
                setReady(true)
            } catch (e: any) {
                console.error('[StudentMiniApp] Auth failed', e)
                if (process.env.NODE_ENV === 'development') {
                    setReady(true)
                } else {
                    setError(e.message || 'Ошибка авторизации')
                }
            }
        }
        init()
    }, [])

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-tg-bg p-10 text-center">
                <div className="text-6xl mb-6">🎓</div>
                <h1 className="text-xl font-bold mb-4">Newton Academy</h1>
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6">
                    {error}
                </div>
                <p className="text-tg-hint text-sm">
                    Нажмите кнопку в меню бота, чтобы войти в свой учебный кабинет
                </p>
            </div>
        )
    }

    if (!ready) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-tg-bg">
                <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 border-4 border-tg-button/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-tg-button border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">N</div>
                </div>
                <p className="text-tg-text font-medium animate-pulse">Загрузка кабинета...</p>
            </div>
        )
    }

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}
