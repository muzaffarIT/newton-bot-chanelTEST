'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, User, MessageCircle, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50">
            <nav className="glass rounded-[28px] px-2 py-3 flex justify-between items-center shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] border border-white/10">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center w-16 h-12"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="bottomNavIndicator"
                                    className="absolute inset-0 bg-blue-500/20 rounded-[20px] -z-10 border border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                />
                            )}
                            <motion.div
                                whileTap={{ scale: 0.9 }}
                                className={cn(
                                    "flex flex-col items-center gap-1 transition-colors duration-300",
                                    isActive ? "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" : "text-gray-500 hover:text-gray-400"
                                )}
                            >
                                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "mb-0.5" : ""} />
                            </motion.div>
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
