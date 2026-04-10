'use client'

import { BottomNav } from '@/components/BottomNav'
import { MessageCircle, Phone, HelpCircle, ChevronDown, ChevronUp, Clock, ExternalLink } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'
import { useQuery } from '@tanstack/react-query'
import { fetchPublicSettings } from '@/lib/api'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function SupportPage() {
    const { t, lang } = useI18n()
    const [openFaq, setOpenFaq] = useState<number | null>(null)

    const { data: settings } = useQuery({
        queryKey: ['public-settings'],
        queryFn: fetchPublicSettings,
        staleTime: 5 * 60 * 1000,
    })

    const consultantUsername = settings?.consultant_username || '@newton_support'
    const consultantPhone = settings?.consultant_phone || '+998 90 123 45 67'
    const consultantName = settings?.consultant_name || (lang === 'ru' ? 'Поддержка Newton' : 'Newton qo\'llab-quvvatlash')

    const faqItems: { q: string; a: string }[] = t('support.faq') as any || []

    return (
        <main className="pb-28 min-h-screen" style={{ background: '#0a0a1a' }}>
            {/* Header */}
            <div className="px-5 pt-8 pb-6">
                <h1 className="text-2xl font-black text-white">{t('support.title')}</h1>
                <p className="text-gray-500 text-[13px] mt-1">{t('support.subtitle')}</p>
            </div>

            <div className="px-5 space-y-4">

                {/* Consultant Card */}
                <div
                    className="rounded-3xl p-5 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(79,110,247,0.15) 0%, rgba(124,90,245,0.15) 100%)', border: '1px solid rgba(79,110,247,0.2)' }}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #4f6ef7, transparent)', transform: 'translate(30%, -30%)' }} />

                    <div className="flex items-center gap-4 mb-5">
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black"
                            style={{ background: 'linear-gradient(135deg, #4f6ef7, #7c5af5)' }}
                        >
                            💬
                        </div>
                        <div>
                            <p className="font-black text-white text-base">{consultantName}</p>
                            <p className="text-[12px] text-gray-400 mt-0.5">{t('support.description').substring(0, 55)}...</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <a
                            href={`https://t.me/${consultantUsername.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-all"
                            style={{ background: 'linear-gradient(135deg, #4f6ef7, #7c5af5)', color: '#fff' }}
                        >
                            <MessageCircle size={16} />
                            Telegram
                        </a>
                        <a
                            href={`tel:${consultantPhone.replace(/\s/g, '')}`}
                            className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm border active:scale-95 transition-all"
                            style={{ border: '1px solid rgba(79,110,247,0.3)', color: '#7c9ffa' }}
                        >
                            <Phone size={16} />
                            {t('support.call')}
                        </a>
                    </div>

                    <div className="mt-3 text-center">
                        <p className="text-[11px] text-gray-500 font-mono">{consultantPhone}</p>
                        <p className="text-[11px] text-gray-500 font-mono">{consultantUsername}</p>
                    </div>
                </div>

                {/* Working Hours */}
                <div
                    className="rounded-2xl p-4 flex items-center gap-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                        <Clock size={18} className="text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">{t('support.schedule')}</p>
                        <p className="text-[12px] text-gray-500 mt-0.5">{t('support.schedule_days')}</p>
                        <p className="text-[11px] text-gray-600">{t('support.schedule_sunday')}</p>
                    </div>
                </div>

                {/* FAQ */}
                <div>
                    <h2 className="text-base font-black text-white mb-3">{t('support.faq_title')}</h2>
                    <div className="space-y-2">
                        {(Array.isArray(faqItems) ? faqItems : []).map((item, i) => (
                            <div
                                key={i}
                                className="rounded-2xl overflow-hidden transition-all"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between p-4 text-left"
                                >
                                    <span className="text-sm font-semibold text-white flex items-center gap-3">
                                        <HelpCircle size={16} className="text-blue-400 shrink-0" />
                                        {item.q}
                                    </span>
                                    {openFaq === i
                                        ? <ChevronUp size={16} className="text-gray-500 shrink-0" />
                                        : <ChevronDown size={16} className="text-gray-500 shrink-0" />
                                    }
                                </button>
                                {openFaq === i && (
                                    <div className="px-4 pb-4">
                                        <p className="text-[13px] text-gray-400 leading-relaxed pl-7">{item.a}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <BottomNav />
        </main>
    )
}
