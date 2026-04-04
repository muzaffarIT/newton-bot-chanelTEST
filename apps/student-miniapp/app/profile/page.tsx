'use client'

import { BottomNav } from '@/components/BottomNav'
import { User, Phone, MapPin, GraduationCap, Settings, LogOut, ChevronRight, Globe, Star } from 'lucide-react'
import { clearToken, fetchProfile } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/context/I18nContext'

export default function ProfilePage() {
    const { t } = useI18n()
    const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: fetchProfile })

    const handleLogout = () => {
        clearToken()
        window.location.reload()
    }

    const menuItems = [
        { label: t('profile.name'), icon: User, value: profile ? `${profile.first_name} ${profile.last_name || ''}` : '...' },
        { label: t('profile.phone'), icon: Phone, value: profile?.phone || '...' },
        { label: t('profile.grade'), icon: GraduationCap, value: profile?.grade ? `${profile.grade} Grade` : '...' },
        { label: t('profile.direction'), icon: MapPin, value: profile?.direction?.name || '...' },
        { label: t('profile.lang'), icon: Globe, value: profile?.language_code === 'uz' ? 'O\'zbekcha' : 'Русский', hasArrow: true },
    ]

    return (
        <main className="pb-24 pt-6 px-5 page-fade-in text-tg-text">
            <header className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-tr from-tg-button to-blue-400 rounded-3xl flex items-center justify-center text-4xl text-white font-bold shadow-xl mb-4">
                    {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
                </div>
                <h1 className="text-xl font-bold">{profile?.first_name} {profile?.last_name}</h1>
                <p className="text-tg-hint text-sm">Student ID: #{profile?.id?.slice(-5)}</p>
                <div className="mt-4 bg-tg-button/10 text-tg-button px-4 py-1.5 rounded-full flex items-center gap-2">
                    <Star size={14} fill="currentColor" />
                    <span className="font-bold text-sm tracking-widest">{profile?.points_balance || 0} PTS</span>
                </div>
            </header>

            <div className="space-y-4 mb-8">
                <h2 className="text-tg-hint text-xs font-bold uppercase tracking-widest ml-1">{t('profile.info')}</h2>
                <div className="card divide-y divide-white/5 p-0 overflow-hidden">
                    {menuItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 active:bg-tg-bg transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-tg-bg flex items-center justify-center text-tg-hint">
                                <item.icon size={18} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] text-tg-hint font-medium uppercase">{item.label}</p>
                                <p className="text-sm font-semibold">{item.value}</p>
                            </div>
                            {item.hasArrow && <ChevronRight size={18} className="text-tg-hint" />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-tg-hint text-xs font-bold uppercase tracking-widest ml-1">{t('profile.settings')}</h2>
                <div className="card space-y-2 p-2">
                    <button className="w-full flex items-center gap-4 p-3 rounded-xl active:bg-tg-bg transition-colors text-left text-sm font-semibold">
                        <div className="w-8 h-8 rounded-lg bg-tg-bg flex items-center justify-center text-tg-hint">
                            <Settings size={18} />
                        </div>
                        {t('profile.app_settings')}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 p-3 rounded-xl active:bg-tg-bg transition-colors text-left text-sm font-bold text-red-500"
                    >
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                            <LogOut size={18} />
                        </div>
                        {t('profile.logout')}
                    </button>
                </div>
            </div>

            <p className="text-center text-tg-hint text-[10px] mt-8 opacity-50 font-medium tracking-widest uppercase">
                Newton Academy v1.0.0
            </p>

            <BottomNav />
        </main>
    )
}
