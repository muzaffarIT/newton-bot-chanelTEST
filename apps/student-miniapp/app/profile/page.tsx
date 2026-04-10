'use client'

import { BottomNav } from '@/components/BottomNav'
import { User, Phone, MapPin, GraduationCap, Settings, LogOut, ChevronRight, Globe, Star } from 'lucide-react'
import { clearToken, fetchProfile } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/context/I18nContext'
import { api } from '@/lib/api'

export default function ProfilePage() {
    const { t, lang, setLang } = useI18n()
    const { data: profile, refetch } = useQuery({ queryKey: ['profile'], queryFn: fetchProfile })

    const handleLogout = () => {
        clearToken()
        window.location.reload()
    }

    const handleLanguageSwitch = async () => {
        const newLang = lang === 'ru' ? 'uz' : 'ru'
        setLang(newLang)
        // Opt: await api.post('/api/student/profile/language', { language: newLang })
        alert(newLang === 'ru' ? 'Язык изменен на Русский' : 'Til o\'zbek tiliga o\'zgartirildi')
        refetch()
    }

    const menuItems = [
        { label: t('profile.name'), icon: User, value: profile ? `${profile.first_name} ${profile.last_name || ''}` : '...' },
        { label: t('profile.phone'), icon: Phone, value: profile?.phone || '...' },
        { label: t('profile.grade'), icon: GraduationCap, value: profile?.grade ? `${profile.grade} Grade` : '...' },
        { label: t('profile.direction'), icon: MapPin, value: profile?.direction?.name || '...' },
        { label: t('profile.lang'), icon: Globe, value: lang === 'uz' ? 'O\'zbekcha' : 'Русский', hasArrow: true, onClick: handleLanguageSwitch },
    ]

    return (
        <main className="pb-24 pt-6 px-5 page-fade-in text-tg-text">
            <header className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-tr from-tg-button to-blue-400 rounded-3xl flex items-center justify-center text-4xl text-white font-bold shadow-xl mb-4">
                    {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
                </div>
                <h1 className="text-xl font-bold">{profile?.first_name} {profile?.last_name}</h1>
                <p className="text-tg-hint text-sm">Student ID: #{profile?.id?.slice(-5)}</p>
                <div className="mt-4 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-5 py-2 rounded-full flex items-center gap-2">
                    <Star size={16} fill="currentColor" />
                    <span className="font-bold tracking-widest">{profile?.points_balance || 0} БАЛЛОВ</span>
                </div>
            </header>

            <div className="space-y-4 mb-8">
                <h2 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest ml-4">{t('profile.info')}</h2>
                <div className="bg-white dark:bg-[#15151e] border border-gray-100 dark:border-white/5 rounded-[24px] divide-y divide-gray-100 dark:divide-white/5 overflow-hidden shadow-sm">
                    {menuItems.map((item, i) => (
                        <div 
                            key={i} 
                            onClick={item.onClick}
                            className={item.onClick ? "cursor-pointer flex items-center gap-4 p-4 active:bg-gray-50 dark:active:bg-white/5 transition-colors" : "flex items-center gap-4 p-4"}
                        >
                            <div className="w-10 h-10 rounded-[12px] bg-blue-50 dark:bg-white/5 flex items-center justify-center text-blue-600 dark:text-gray-400">
                                <item.icon size={18} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{item.label}</p>
                                <p className="text-[15px] font-semibold text-gray-900 dark:text-white">{item.value}</p>
                            </div>
                            {item.hasArrow && <ChevronRight size={18} className="text-gray-400" />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest ml-4">{t('profile.settings')}</h2>
                <div className="bg-white dark:bg-[#15151e] border border-gray-100 dark:border-white/5 rounded-[24px] space-y-1 p-2 shadow-sm">
                    <button 
                        onClick={() => alert(lang === 'ru' ? 'Настройки в разработке' : 'Sozlamalar ishlab chiqilmoqda')}
                        className="w-full flex items-center gap-4 p-3 rounded-xl active:bg-gray-50 dark:active:bg-white/5 transition-colors text-left text-[15px] font-semibold text-gray-900 dark:text-white"
                    >
                        <div className="w-10 h-10 rounded-[12px] bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500">
                            <Settings size={18} />
                        </div>
                        {t('profile.app_settings')}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 p-3 rounded-xl active:bg-red-50 dark:active:bg-red-500/10 transition-colors text-left text-[15px] font-bold text-red-500"
                    >
                        <div className="w-10 h-10 rounded-[12px] bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500">
                            <LogOut size={18} />
                        </div>
                        {t('profile.logout')}
                    </button>
                </div>
            </div>

            <p className="text-center text-gray-400 text-[10px] mt-8 font-medium tracking-widest uppercase">
                Newton Academy v1.0.0
            </p>

            <BottomNav />
        </main>
    )
}
