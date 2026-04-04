'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { Gift, Plus, Trash2, Edit, CheckCircle, Package, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StoreManagerPage() {
    const qc = useQueryClient()
    const [isAdding, setIsAdding] = useState(false)

    const { data: rewards, isLoading } = useQuery({
        queryKey: ['admin-rewards'],
        queryFn: async () => {
            const { data } = await api.get('/api/admin/store/rewards')
            return data
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/api/admin/store/rewards/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-rewards'] })
    })

    return (
        <div className="flex flex-col pb-32">
            <header className="sticky top-0 bg-[#0f0f1a]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 z-40 flex justify-between items-center">
                <div>
                    <h1 className="text-lg font-bold">Магазин</h1>
                    <p className="text-xs text-gray-400">Управление наградами</p>
                </div>
                <button 
                    onClick={() => setIsAdding(true)}
                    className="bg-blue-600 text-white p-2 rounded-xl active:scale-90 transition-transform"
                >
                    <Plus size={20} />
                </button>
            </header>

            <main className="p-4 flex flex-col gap-4">
                {isLoading ? (
                    [...Array(3)].map((_, i) => <div key={i} className="card h-24 bg-white/5 animate-pulse" />)
                ) : rewards?.length === 0 ? (
                    <div className="card text-center py-10 opacity-50">
                        <Package className="mx-auto mb-2" size={40} />
                        <p className="text-sm italic">Товаров пока нет</p>
                    </div>
                ) : (
                    rewards?.map((reward: any) => (
                        <div key={reward.id} className="card flex items-center gap-4">
                            <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center shrink-0 border border-white/5 overflow-hidden">
                                {reward.image_url ? (
                                    <img src={reward.image_url} alt="" className="w-full h-full object-cover" />
                                ) : <Gift className="text-gray-600" size={24} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm truncate">{reward.title_ru}</h3>
                                <p className="text-xs text-blue-400 font-black mt-1">⭐ {reward.points_cost} баллов</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">В наличии: {reward.stock} шт.</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 text-gray-500 hover:text-white transition-colors">
                                    <Edit size={18} />
                                </button>
                                <button 
                                    onClick={() => { if(confirm('Удалить товар?')) deleteMutation.mutate(reward.id) }}
                                    className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </main>

            <BottomNav />
        </div>
    )
}
