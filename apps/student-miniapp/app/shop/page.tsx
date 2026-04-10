'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchRewards, redeemReward, fetchProfile } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { Gift, Star, ShoppingBag, Zap, CheckCircle, Clock, Package, ChevronRight, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '@/context/I18nContext'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const spring = { type: 'spring', stiffness: 380, damping: 28 } as const

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
    DISCOUNT:      { label: 'Скидка',       color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
    MATERIAL:      { label: 'Материал',     color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
    CONSULTATION:  { label: 'Консультация', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
    TRIAL_LESSON:  { label: 'Пробный урок', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
}

function SuccessBanner({ title, onClose }: { title: string; onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={spring}
            className="fixed top-4 left-4 right-4 z-50 p-4 rounded-2xl flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, #065f46, #064e3b)', border: '1px solid rgba(52,211,153,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle size={20} className="text-emerald-400" />
            </div>
            <div className="flex-1">
                <p className="font-bold text-emerald-300 text-sm">Успешно получено!</p>
                <p className="text-emerald-400/70 text-xs mt-0.5">{title}</p>
            </div>
            <button onClick={onClose} className="text-emerald-500 text-lg font-bold leading-none px-1">×</button>
        </motion.div>
    )
}

function RewardCard({ reward, userPoints, onRedeem, isRedeeming }: {
    reward: any
    userPoints: number
    onRedeem: () => void
    isRedeeming: boolean
}) {
    const canAfford = userPoints >= reward.point_cost
    const inStock = reward.stock_limits == null || reward.stock_limits > 0
    const canBuy = canAfford && inStock && reward.is_active
    const meta = TYPE_META[reward.type] || { label: reward.type, color: '#6b7280', bg: 'rgba(107,114,128,0.12)' }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className={cn(
                "card p-0 overflow-hidden flex flex-col group",
                !canBuy && "opacity-70"
            )}
        >
            {/* Image */}
            <div className="relative h-44 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                {reward.image_url ? (
                    <img
                        src={reward.image_url}
                        alt={reward.title_ru}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Gift size={52} style={{ color: meta.color, opacity: 0.3 }} />
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f1a]/90 via-transparent to-transparent" />

                {/* Stock badge */}
                <div className="absolute top-3 right-3">
                    {!inStock ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                            <Package size={10} /> Нет в наличии
                        </span>
                    ) : reward.stock_limits != null ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/40 text-white/80 backdrop-blur-sm border border-white/10">
                            {reward.stock_limits} шт.
                        </span>
                    ) : null}
                </div>

                {/* Type badge */}
                <div className="absolute bottom-3 left-3">
                    <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-sm"
                        style={{ background: meta.bg, color: meta.color, borderColor: meta.color + '30' }}
                    >
                        {meta.label}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-extrabold text-[16px] text-white leading-tight mb-1">{reward.title_ru}</h3>
                {reward.description_ru && (
                    <p className="text-gray-500 text-[12px] line-clamp-2 leading-relaxed mb-3">
                        {reward.description_ru}
                    </p>
                )}

                <div className="mt-auto flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    {/* Price */}
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,166,35,0.15)' }}>
                            <Star size={12} className="text-amber-400" fill="currentColor" />
                        </div>
                        <span className="font-black text-amber-400 text-[15px]">{reward.point_cost}</span>
                        <span className="text-gray-600 text-[11px]">баллов</span>
                    </div>

                    {/* Button */}
                    <motion.button
                        whileTap={canBuy ? { scale: 0.92 } : undefined}
                        onClick={canBuy && !isRedeeming ? onRedeem : undefined}
                        disabled={!canBuy || isRedeeming}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold transition-all duration-200 disabled:cursor-not-allowed",
                            canBuy
                                ? "text-white"
                                : "text-gray-600 bg-white/5"
                        )}
                        style={canBuy ? {
                            background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)',
                            boxShadow: '0 2px 12px rgba(79,110,247,0.35)'
                        } : undefined}
                    >
                        {isRedeeming ? (
                            <span className="flex items-center gap-1">
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="inline-block"
                                >
                                    ⏳
                                </motion.span>
                                Обработка
                            </span>
                        ) : !inStock ? (
                            'Нет'
                        ) : !canAfford ? (
                            `Нужно ещё ${reward.point_cost - userPoints}`
                        ) : (
                            <><Zap size={13} fill="currentColor" /> Получить</>
                        )}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    )
}

export default function ShopPage() {
    const { t } = useI18n()
    const queryClient = useQueryClient()
    const [successTitle, setSuccessTitle] = useState<string | null>(null)
    const [redeemingId, setRedeemingId] = useState<string | null>(null)

    const { data: rewards, isLoading } = useQuery({
        queryKey: ['rewards'],
        queryFn: fetchRewards
    })

    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: fetchProfile
    })

    const redeemMutation = useMutation({
        mutationFn: redeemReward,
        onSuccess: (_, rewardId) => {
            const reward = rewards?.find((r: any) => r.id === rewardId)
            setSuccessTitle(reward?.title_ru || 'Награда получена')
            queryClient.invalidateQueries({ queryKey: ['profile'] })
            queryClient.invalidateQueries({ queryKey: ['rewards'] })
            setRedeemingId(null)
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'Ошибка при получении награды')
            setRedeemingId(null)
        }
    })

    const handleRedeem = (reward: any) => {
        if (!confirm(`Потратить ${reward.point_cost} баллов на "${reward.title_ru}"?`)) return
        setRedeemingId(reward.id)
        redeemMutation.mutate(reward.id)
    }

    const pts = profile?.points_balance ?? 0

    return (
        <>
            <AnimatePresence>
                {successTitle && (
                    <SuccessBanner title={successTitle} onClose={() => setSuccessTitle(null)} />
                )}
            </AnimatePresence>

            <main className="pb-28 min-h-screen relative">
                {/* Background ambient */}
                <div className="fixed inset-0 pointer-events-none -z-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[50vh] rounded-full opacity-30"
                        style={{ background: 'radial-gradient(ellipse, rgba(245,166,35,0.08) 0%, transparent 70%)' }} />
                </div>

                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={spring}
                    className="px-5 pt-8 pb-6"
                >
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles size={18} className="text-amber-400" />
                                <h1 className="text-2xl font-black text-white">Магазин наград</h1>
                            </div>
                            <p className="text-gray-500 text-[13px]">Обменяйте баллы на ценные награды</p>
                        </div>

                        {/* Balance widget */}
                        <motion.div
                            whileHover={{ scale: 1.04 }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl shrink-0"
                            style={{ background: 'linear-gradient(135deg, rgba(245,166,35,0.15), rgba(245,166,35,0.05))', border: '1px solid rgba(245,166,35,0.25)' }}
                        >
                            <Star size={16} className="text-amber-400" fill="currentColor" />
                            <span className="font-black text-amber-300 text-lg leading-none">{pts}</span>
                        </motion.div>
                    </div>

                    {/* Balance bar */}
                    {(rewards?.length ?? 0) > 0 && (
                        <div className="mt-4 p-3 rounded-xl flex items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <ShoppingBag size={16} className="text-gray-500 shrink-0" />
                            <p className="text-[12px] text-gray-500">
                                У вас <span className="text-amber-400 font-bold">{pts}</span> баллов ·{' '}
                                {rewards?.filter((r: any) => r.point_cost <= pts && r.stock_limits !== 0 && r.is_active).length ?? 0} наград доступно
                            </p>
                        </div>
                    )}
                </motion.header>

                {/* Content */}
                <div className="px-5">
                    {isLoading ? (
                        <div className="grid grid-cols-1 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-64 skeleton rounded-[20px]" />
                            ))}
                        </div>
                    ) : rewards?.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20"
                        >
                            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
                                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                                <Gift size={36} className="text-gray-600" />
                            </div>
                            <p className="font-bold text-gray-400 text-lg">Магазин пуст</p>
                            <p className="text-gray-600 text-sm mt-1.5">Награды скоро появятся — следите за обновлениями!</p>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {rewards?.map((reward: any) => (
                                <RewardCard
                                    key={reward.id}
                                    reward={reward}
                                    userPoints={pts}
                                    onRedeem={() => handleRedeem(reward)}
                                    isRedeeming={redeemingId === reward.id}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <BottomNav />
            </main>
        </>
    )
}
