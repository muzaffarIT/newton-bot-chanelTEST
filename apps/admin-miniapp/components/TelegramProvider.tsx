'use client'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { authWithInitData } from '@/lib/api'

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
})

export function TelegramProvider({ children }: { children: React.ReactNode }) {
    const [ready, setReady] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function init() {
            // Allow /login route to render without Telegram initData
            if (typeof window !== 'undefined' && window.location.pathname.includes('/login')) {
                setReady(true)
                return
            }

            try {
                // Dynamically import Telegram SDK (client-side only)
                const { retrieveLaunchParams } = await import('@telegram-apps/sdk')
                let launchParams: any = {}
                try {
                    launchParams = retrieveLaunchParams()
                } catch (e) {
                    console.warn('[MiniApp] Could not retrieve launch params', e)
                }

                const initDataRaw = launchParams.initDataRaw

                if (!initDataRaw) {
                    // Dev mode: bypass auth if in development
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('[MiniApp] Running in dev mode without Telegram initData')
                        setReady(true)
                        return
                    }
                    throw new Error('Данные Telegram не найдены. Откройте приложение внутри Telegram.')
                }

                if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
                    (window as any).Telegram.WebApp.ready();
                    (window as any).Telegram.WebApp.expand();
                    // Disable vertical swipes to prevent accidental closing
                    if ((window as any).Telegram.WebApp.disableVerticalSwipes) {
                        (window as any).Telegram.WebApp.disableVerticalSwipes();
                    }
                }

                await authWithInitData(initDataRaw as string)
                setReady(true)
            } catch (e: any) {
                console.error('[TelegramProvider] Auth failed', e)
                // In dev, still render the app
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0f] p-8">
                <div className="text-4xl mb-4 text-center">🔐</div>
                <p className="text-white font-medium text-center text-lg mb-2">Требуется доступ</p>
                <p className="text-gray-400 text-sm text-center">
                    {(error.includes('401') || error.toLowerCase().includes('admin') || error.toLowerCase().includes('не связан'))
                        ? 'Ваш Telegram-аккаунт не зарегистрирован как администратор. Обратитесь к владельцу системы или введите команду /make_me_admin в боте.' 
                        : error}
                </p>
                {(error.includes('401') || error.toLowerCase().includes('admin') || error.toLowerCase().includes('не связан')) && (
                     <p className="text-blue-400 text-xs mt-6 opacity-70">Newton Academy Security</p>
                )}
            </div>
        )
    }

    if (!ready) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#1a1a2e]">
                <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-white text-sm opacity-70">Newton Academy Admin</p>
            </div>
        )
    }

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}
