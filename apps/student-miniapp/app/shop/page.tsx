'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { api, fetchRewards, redeemReward, fetchProfile } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { Gift, Star, ChevronRight, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '@/context/I18nContext'

export default function ShopPage() {
    const { t } = useI18n()
    const { data: rewards, isLoading } = useQuery({ 
        queryKey: ['rewards'], 
        queryFn: fetchRewards
    })
    
    const { data: profile, refetch: refetchProfile } = useQuery({
        queryKey: ['profile'],
        queryFn: fetchProfile
    })

    const redeemMutation = useMutation({
        mutationFn: redeemReward,
        onSuccess: () => {
            alert(t('shop.success'))
            refetchProfile()
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'Error executing purchase')
        }
    })

    return (
        <main className="pb-24 pt-6 px-5 page-fade-in">
            <header className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold mb-1">{t('shop.title')}</h1>
                    <p className="text-tg-hint text-sm">{t('shop.subtitle')}</p>
                </div>
                <div className="bg-tg-button/10 text-tg-button px-4 py-2 rounded-2xl flex items-center gap-2">
                    <Star size={18} fill="currentColor" />
                    <span className="font-bold text-lg">{profile?.points_balance || 0}</span>
                </div>
            </header>

            {isLoading ? (
                <div className="text-center py-20 text-tg-hint">{t('shop.loading')}</div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {rewards?.map((reward: any) => (
                        <div key={reward.id} className="card p-0 overflow-hidden flex flex-col">
                            <div className="h-40 bg-tg-secondary relative">
                                {reward.image_url ? (
                                    <img src={reward.image_url} alt={reward.title_ru} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Gift size={48} className="text-tg-hint opacity-20" />
                                    </div>
                                )}
                                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    {reward.stock === 0 ? t('shop.out_of_stock') : `${reward.stock} Pcs`}
                                </div>
                            </div>
                            
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="font-bold text-lg mb-1">{reward.title_ru}</h3>
                                <p className="text-tg-hint text-xs mb-6 line-clamp-2">
                                    {reward.description_ru}
                                </p>
                                
                                <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-1 text-tg-button font-black">
                                        <Star size={16} fill="currentColor" />
                                        <span>{reward.point_cost} {t('shop.balance')}</span>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (confirm(t('shop.confirm', { points: reward.point_cost, title: reward.title_ru }))) {
                                                redeemMutation.mutate(reward.id)
                                            }
                                        }}
                                        disabled={reward.stock === 0 || (profile?.points_balance < reward.point_cost)}
                                        className="btn-primary py-2 px-6 rounded-xl text-sm disabled:opacity-30"
                                    >
                                        {t('shop.redeem')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {rewards?.length === 0 && (
                        <div className="text-center py-20 bg-tg-secondary rounded-3xl">
                            <ShoppingCart className="mx-auto mb-4 opacity-20" size={48} />
                            <p className="text-tg-hint italic">{t('shop.no_items')}</p>
                        </div>
                    )}
                </div>
            )}

            <BottomNav />
        </main>
    )
}
