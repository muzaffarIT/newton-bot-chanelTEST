'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, User, MessageCircle, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/context/I18nContext'

export function BottomNav() {
    const pathname = usePathname()
    const { t } = useI18n()

    const navItems = [
        { href: '/', icon: Home, labelKey: 'nav.home' },
        { href: '/tests', icon: BookOpen, labelKey: 'nav.tests' },
        { href: '/shop', icon: ShoppingBag, labelKey: 'nav.shop' },
        { href: '/profile', icon: User, labelKey: 'nav.profile' },
        { href: '/support', icon: MessageCircle, labelKey: 'nav.support' },
    ]

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-[9999]"
            style={{
                background: 'rgba(10, 10, 26, 0.97)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)',
                transform: 'translateZ(0)',
                WebkitTransform: 'translateZ(0)',
            }}
        >
            <div className="flex items-center justify-around px-2 py-2">
                {navItems.map(({ href, icon: Icon, labelKey }) => {
                    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
                    return (
                        <Link
                            key={href}
                            href={href}
                            className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 relative"
                        >
                            {isActive && (
                                <span
                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                                    style={{ background: 'linear-gradient(90deg, #4f6ef7, #7c5af5)' }}
                                />
                            )}
                            <Icon
                                size={22}
                                strokeWidth={isActive ? 2.5 : 1.8}
                                className={cn(
                                    'transition-all duration-200',
                                    isActive
                                        ? 'text-[#6b8aff] drop-shadow-[0_0_6px_rgba(107,138,255,0.6)]'
                                        : 'text-gray-500'
                                )}
                            />
                            <span
                                className={cn(
                                    'text-[10px] font-semibold transition-colors duration-200',
                                    isActive ? 'text-[#6b8aff]' : 'text-gray-600'
                                )}
                            >
                                {t(labelKey)}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
