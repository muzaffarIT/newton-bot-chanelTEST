'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Users, Calendar, ShoppingBag, Settings, Receipt } from 'lucide-react'

const NAV = [
    { href: '/', icon: Home, label: 'Дашборд' },
    { href: '/leads', icon: Users, label: 'Лиды' },
    { href: '/tests', icon: BookOpen, label: 'Тесты' },
    { href: '/schedule', icon: Calendar, label: 'Посты' },
    { href: '/settings', icon: Settings, label: 'Ещё' },
]

export function BottomNav() {
    const path = usePathname()
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#12122a]/95 backdrop-blur-md border-t border-white/5 z-50 safe-area-inset-bottom">
            <div className="flex items-center justify-around py-2 px-2">
                {NAV.map(({ href, icon: Icon, label }) => {
                    const active = path === href || (href !== '/' && path.startsWith(href))
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${active
                                    ? 'bg-blue-600/20 text-blue-400'
                                    : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <Icon size={20} />
                            <span className="text-[10px] font-medium">{label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
