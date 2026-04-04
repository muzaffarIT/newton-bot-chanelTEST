'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, User, MessageCircle, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
    const pathname = usePathname()

    const navItems = [
        { href: '/', icon: Home, label: 'Главная' },
        { href: '/tests', icon: BookOpen, label: 'Тесты' },
        { href: '/shop', icon: ShoppingBag, label: 'Магазин' },
        { href: '/profile', icon: User, label: 'Кабинет' },
        { href: '/support', icon: MessageCircle, label: 'Поддержка' },
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 glass border-t border-tg-hint/10 px-6 py-3 flex justify-between items-center z-50">
            {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "nav-item",
                            isActive && "active"
                        )}
                    >
                        <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                )
            })}
        </nav>
    )
}
