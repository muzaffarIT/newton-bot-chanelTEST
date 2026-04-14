'use client'

import { BottomNav } from '@/components/BottomNav'
import { User, Phone, GraduationCap, Settings, LogOut, Globe, Star, Edit2, Check, X, Loader2 } from 'lucide-react'
import { clearToken, fetchProfile, updateProfile, updateLanguage } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n } from '@/context/I18nContext'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const spring = { type: 'spring', stiffness: 380, damping: 30 } as const

/** Inline editable field row */
function EditableField({
    icon: Icon,
    label,
    value,
    field,
    placeholder,
    inputType = 'text',
    onSave,
}: {
    icon: any
    label: string
    value: string
    field: string
    placeholder?: string
    inputType?: string
    onSave: (field: string, val: string) => Promise<void>
}) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(value)
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (!draft.trim() && field === 'first_name') return
        setSaving(true)
        try {
            await onSave(field, draft.trim())
            setEditing(false)
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        setDraft(value)
        setEditing(false)
    }

    return (
        <div className="flex items-start gap-4 p-4 group">
            <div className="w-10 h-10 rounded-[12px] bg-blue-50 dark:bg-white/5 flex items-center justify-center text-blue-600 dark:text-gray-400 shrink-0 mt-0.5">
                <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{label}</p>

                <AnimatePresence mode="wait">
                    {editing ? (
                        <motion.div
                            key="editing"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-2"
                        >
                            <input
                                type={inputType}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                placeholder={placeholder || label}
                                autoFocus
                                className="flex-1 bg-transparent outline-none border-b-2 border-blue-500 text-[15px] font-semibold text-white pb-1 placeholder:text-gray-600"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSave()
                                    if (e.key === 'Escape') handleCancel()
                                }}
                            />
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0"
                            >
                                {saving ? (
                                    <Loader2 size={12} className="animate-spin text-white" />
                                ) : (
                                    <Check size={12} className="text-white" />
                                )}
                            </button>
                            <button
                                onClick={handleCancel}
                                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0"
                            >
                                <X size={12} className="text-gray-400" />
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="display"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2"
                        >
                            <p className={cn(
                                "text-[15px] font-semibold flex-1",
                                value ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-600 italic"
                            )}>
                                {value || `Не указано`}
                            </p>
                            <button
                                onClick={() => { setDraft(value); setEditing(true) }}
                                className="w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 active:opacity-100 bg-white/5 flex items-center justify-center transition-opacity"
                            >
                                <Edit2 size={12} className="text-gray-500" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

export default function ProfilePage() {
    const { t, lang, setLang } = useI18n()
    const queryClient = useQueryClient()
    const { data: profile, isLoading } = useQuery({ queryKey: ['profile'], queryFn: fetchProfile })
    const [langSaving, setLangSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)

    const handleLogout = () => {
        clearToken()
        window.location.reload()
    }

    const handleSaveField = async (field: string, value: string) => {
        await updateProfile({ [field]: value } as any)
        queryClient.invalidateQueries({ queryKey: ['profile'] })
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2000)
    }

    const handleLanguageSwitch = async () => {
        const newLang = lang === 'ru' ? 'uz' : 'ru'
        // Switch UI immediately for instant feedback
        setLang(newLang)
        setLangSaving(true)
        try {
            await updateLanguage(newLang)
            queryClient.invalidateQueries({ queryKey: ['profile'] })
        } catch (e) {
            // Language already switched in UI, just log the error silently
            console.warn('Language sync to backend failed, but local preference is saved', e)
        } finally {
            setLangSaving(false)
        }
    }

    const pts = profile?.points_balance || 0

    return (
        <main className="pb-24 pt-6 px-5 page-fade-in text-tg-text">
            {/* Save success flash */}
            <AnimatePresence>
                {saveSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-4 left-4 right-4 z-50 p-3 rounded-xl flex items-center gap-2 text-sm font-semibold"
                        style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}
                    >
                        <Check size={16} /> Данные сохранены
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Avatar */}
            <header className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-violet-600 rounded-3xl flex items-center justify-center text-4xl text-white font-bold shadow-xl mb-4 relative">
                    {isLoading ? (
                        <div className="skeleton w-24 h-24 rounded-3xl absolute inset-0" />
                    ) : (
                        <>
                            {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0) || ''}
                        </>
                    )}
                </div>
                <h1 className="text-xl font-bold">
                    {isLoading ? <span className="skeleton w-32 h-6 block rounded-lg" /> : `${profile?.first_name || ''} ${profile?.last_name || ''}`}
                </h1>
                <p className="text-gray-500 text-sm mt-0.5">Student ID: #{profile?.id?.slice(-5)}</p>
                <div className="mt-4 px-5 py-2 rounded-full flex items-center gap-2" style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)' }}>
                    <Star size={16} className="text-amber-400" fill="currentColor" />
                    <span className="font-black text-amber-400 tracking-widest text-[15px]">{pts} БАЛЛОВ</span>
                </div>
            </header>

            {/* Profile Info — Editable Fields */}
            <div className="space-y-3 mb-8">
                <h2 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest ml-4">
                    {t('profile.info_section')}
                </h2>
                <div className="bg-white dark:bg-[#15151e] border border-gray-100 dark:border-white/5 rounded-[24px] divide-y divide-gray-100 dark:divide-white/5 overflow-hidden shadow-sm">
                    <EditableField
                        icon={User}
                        label={t('profile.name')}
                        field="first_name"
                        value={profile?.first_name || ''}
                        placeholder={t('profile.name')}
                        onSave={handleSaveField}
                    />
                    <EditableField
                        icon={User}
                        label={t('profile.name')}
                        field="last_name"
                        value={profile?.last_name || ''}
                        placeholder={t('profile.name')}
                        onSave={handleSaveField}
                    />
                    <EditableField
                        icon={Phone}
                        label={t('profile.phone')}
                        field="phone"
                        value={profile?.phone || ''}
                        placeholder="+998 XX XXX XX XX"
                        inputType="tel"
                        onSave={handleSaveField}
                    />
                    <EditableField
                        icon={GraduationCap}
                        label={t('profile.grade')}
                        field="grade"
                        value={profile?.grade || ''}
                        placeholder="Напр., 10"
                        onSave={handleSaveField}
                    />
                </div>
                <p className="text-[10px] text-gray-500 ml-4">{t('profile.edit')}</p>
            </div>

            {/* Settings */}
            <div className="space-y-3">
                <h2 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest ml-4">
                    {t('profile.settings')}
                </h2>
                <div className="bg-white dark:bg-[#15151e] border border-gray-100 dark:border-white/5 rounded-[24px] p-2 shadow-sm">
                    <button
                        disabled={langSaving}
                        onClick={handleLanguageSwitch}
                        className="w-full flex items-center gap-4 p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-[18px] transition-colors"
                    >
                        <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                            <Globe size={18} />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-semibold text-sm">{t('profile.language_section')}</div>
                            <div className="text-xs text-gray-500">{lang === 'ru' ? t('profile.lang_ru') : t('profile.lang_uz')}</div>
                        </div>
                        <div className="text-gray-300">
                            {langSaving ? <Loader2 size={16} className="animate-spin" /> : <ChevronRightIcon size={16} />}
                        </div>
                    </button>

                    <button
                        onClick={() => { if (confirm(t('profile.logout_confirm'))) handleLogout() }}
                        className="w-full flex items-center gap-4 p-3 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-[18px] transition-colors text-red-500 mt-2"
                    >
                        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                            <LogOut size={18} />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-semibold text-sm">{t('profile.logout')}</div>
                        </div>
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

function ChevronRightIcon({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    )
}
