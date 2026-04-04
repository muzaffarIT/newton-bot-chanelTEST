'use client'

import { BottomNav } from '@/components/BottomNav'
import { MessageCircle, HelpCircle, PhoneCall, Globe, Send, Instagram, Phone, Star } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'
import { cn } from '@/lib/utils'

export default function SupportPage() {
    const { t } = useI18n()
    const contactMethods = [
        { label: 'Telegram Bot', icon: Send, color: 'bg-blue-500', value: '@newton_bot' },
        { label: 'Instagram', icon: Instagram, color: 'bg-pink-500', value: '@newton_academy' },
        { label: 'Phone', icon: Phone, color: 'bg-green-500', value: '+998 71 123-45-67' },
    ]

    return (
        <main className="pb-24 pt-6 px-5 page-fade-in text-tg-text">
            <h1 className="text-2xl font-bold mb-6">{t('profile.settings')}</h1>
            <div className="grid grid-cols-1 gap-4">
                <div className="card flex items-center gap-4">
                    <div className="w-12 h-12 bg-tg-button/10 rounded-2xl flex items-center justify-center text-tg-button">
                        <MessageCircle size={24} />
                    </div>
                    <div>
                        <p className="text-tg-hint text-xs">Среднее время ответа: 5 минут</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {contactMethods.map((method) => (
                        <button key={method.label} className="w-full flex items-center justify-between p-4 bg-tg-bg rounded-xl active:scale-[0.98] transition-all">
                            <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", method.color)}>
                                    <method.icon size={18} />
                                </div>
                                <span className="font-semibold text-sm">{method.label}</span>
                            </div>
                            <Star size={18} className="text-tg-hint opacity-30" />
                        </button>
                    ))}
                </div>
            </div>

            <section className="space-y-4">
                <h2 className="text-lg font-bold">Частые вопросы</h2>
                {[
                    'Как пересдать тест?',
                    'Когда будут результаты?',
                    'Как записаться на курс?',
                ].map((q) => (
                    <button key={q} className="w-full card flex items-center justify-between py-4 text-left">
                        <span className="text-sm font-medium flex items-center gap-3">
                            <HelpCircle size={18} className="text-tg-accent" />
                            {q}
                        </span>
                    </button>
                ))}
            </section>

            <BottomNav />
        </main>
    )
}
