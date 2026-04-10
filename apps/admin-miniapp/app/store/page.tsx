'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { Gift, Plus, Trash2, Edit2, X, Save, Package, Star, Loader2, CheckCircle, UploadCloud, FileText, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const REWARD_TYPES = [
    { value: 'DISCOUNT', label: '🏷️ Скидка' },
    { value: 'MATERIAL', label: '📚 Материал' },
    { value: 'CONSULTATION', label: '🎯 Консультация' },
    { value: 'TRIAL_LESSON', label: '📖 Пробный урок' },
]

const TYPE_COLORS: Record<string, string> = {
    DISCOUNT: '#3b82f6',
    MATERIAL: '#8b5cf6',
    CONSULTATION: '#f59e0b',
    TRIAL_LESSON: '#10b981',
}

interface RewardFormState {
    title_ru: string
    title_uz: string
    description_ru: string
    description_uz: string
    point_cost: string
    stock_limits: string
    type: string
    image_url: string
    is_active: boolean
}

const emptyForm: RewardFormState = {
    title_ru: '',
    title_uz: '',
    description_ru: '',
    description_uz: '',
    point_cost: '',
    stock_limits: '',
    type: 'DISCOUNT',
    image_url: '',
    is_active: true,
}

function RewardModal({
    reward,
    onClose,
    onSave,
    isPending,
}: {
    reward?: any
    onClose: () => void
    onSave: (data: any) => void
    isPending: boolean
}) {
    const [form, setForm] = useState<RewardFormState>(
        reward
            ? {
                  title_ru: reward.title_ru || '',
                  title_uz: reward.title_uz || '',
                  description_ru: reward.description_ru || '',
                  description_uz: reward.description_uz || '',
                  point_cost: String(reward.point_cost || ''),
                  stock_limits: reward.stock_limits != null ? String(reward.stock_limits) : '',
                  type: reward.type || 'DISCOUNT',
                  image_url: reward.image_url || '',
                  is_active: reward.is_active ?? true,
              }
            : emptyForm,
    )
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const set = (key: keyof RewardFormState, val: any) =>
        setForm((prev) => ({ ...prev, [key]: val }))

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setIsUploading(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await fetch('/api/upload', { method: 'POST', body: fd })
            const data = await res.json()
            if (res.ok && data.url) {
                set('image_url', data.url)
            } else {
                alert(data.error || 'Ошибка загрузки')
            }
        } catch {
            alert('Ошибка сервера при загрузке')
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleSubmit = () => {
        if (!form.title_ru.trim() || !form.point_cost) return
        onSave({
            title_ru: form.title_ru.trim(),
            title_uz: form.title_uz.trim() || form.title_ru.trim(),
            description_ru: form.description_ru.trim() || undefined,
            description_uz: form.description_uz.trim() || undefined,
            point_cost: parseInt(form.point_cost),
            stock_limits: form.stock_limits ? parseInt(form.stock_limits) : undefined,
            type: form.type,
            image_url: form.image_url.trim() || undefined,
            is_active: form.is_active,
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#0f0f1a] border-t border-white/10 rounded-t-3xl p-5 pb-8 max-h-[90vh] overflow-y-auto">
                {/* Handle */}
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />

                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-bold">{reward ? 'Редактировать товар' : 'Новый товар'}</h2>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Type */}
                    <div>
                        <label className="label-xs">Тип награды</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            {REWARD_TYPES.map((t) => (
                                <button
                                    key={t.value}
                                    onClick={() => set('type', t.value)}
                                    className={cn(
                                        'py-2 px-3 rounded-xl text-xs font-semibold border transition-all',
                                        form.type === t.value
                                            ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                                            : 'border-white/10 bg-white/5 text-gray-400',
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Titles */}
                    <div>
                        <label className="label-xs">Название (рус.) *</label>
                        <input
                            value={form.title_ru}
                            onChange={(e) => set('title_ru', e.target.value)}
                            placeholder="Напр., Скидка 10% на курс"
                            className="input mt-1 text-sm"
                        />
                    </div>
                    <div>
                        <label className="label-xs">Название (узб.)</label>
                        <input
                            value={form.title_uz}
                            onChange={(e) => set('title_uz', e.target.value)}
                            placeholder="Masalan, Kursga 10% chegirma"
                            className="input mt-1 text-sm"
                        />
                    </div>

                    {/* Descriptions */}
                    <div>
                        <label className="label-xs">Описание (рус.)</label>
                        <textarea
                            value={form.description_ru}
                            onChange={(e) => set('description_ru', e.target.value)}
                            placeholder="Краткое описание..."
                            className="input mt-1 text-sm min-h-[64px]"
                        />
                    </div>

                    {/* Cost & Stock */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label-xs">Стоимость (баллы) *</label>
                            <input
                                type="number"
                                value={form.point_cost}
                                onChange={(e) => set('point_cost', e.target.value)}
                                placeholder="500"
                                min="1"
                                className="input mt-1 text-sm"
                            />
                        </div>
                        <div>
                            <label className="label-xs">Кол-во в наличии</label>
                            <input
                                type="number"
                                value={form.stock_limits}
                                onChange={(e) => set('stock_limits', e.target.value)}
                                placeholder="∞ (безлимит)"
                                min="0"
                                className="input mt-1 text-sm"
                            />
                        </div>
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="label-xs">Изображение товара</label>
                        <div className="mt-1">
                            {form.image_url ? (
                                <div className="relative">
                                    {form.image_url.startsWith('data:application/pdf') ? (
                                        <div className="w-full h-24 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center gap-2 text-sm text-gray-400">
                                            <FileText size={20} className="text-red-400" />
                                            PDF загружен
                                        </div>
                                    ) : (
                                        <img src={form.image_url} alt="" className="w-full h-28 object-cover rounded-xl border border-white/10" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                    )}
                                    <button
                                        onClick={() => set('image_url', '')}
                                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-full h-24 border-2 border-dashed border-white/15 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-blue-500/50 hover:text-blue-400 transition-colors disabled:opacity-50"
                                >
                                    {isUploading ? (
                                        <><Loader2 size={20} className="animate-spin" /><span className="text-xs">Загрузка...</span></>
                                    ) : (
                                        <><UploadCloud size={20} /><span className="text-xs">Загрузить изображение или PDF</span></>
                                    )}
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </div>
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-sm font-semibold">Активен (виден студентам)</span>
                        <button
                            onClick={() => set('is_active', !form.is_active)}
                            className={cn(
                                'w-12 h-6 rounded-full transition-colors relative',
                                form.is_active ? 'bg-blue-600' : 'bg-white/10',
                            )}
                        >
                            <span
                                className={cn(
                                    'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                                    form.is_active ? 'translate-x-7' : 'translate-x-1',
                                )}
                            />
                        </button>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!form.title_ru.trim() || !form.point_cost || isPending}
                        className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                    >
                        {isPending ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        {isPending ? 'Сохранение...' : reward ? 'Сохранить изменения' : 'Создать товар'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function StoreManagerPage() {
    const qc = useQueryClient()
    const [showModal, setShowModal] = useState(false)
    const [editingReward, setEditingReward] = useState<any>(null)
    const [successId, setSuccessId] = useState<string | null>(null)

    const { data: rewards, isLoading } = useQuery({
        queryKey: ['admin-rewards'],
        queryFn: async () => {
            const { data } = await api.get('/api/admin/store/rewards')
            return data
        },
    })

    const createMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/api/admin/store/rewards', data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-rewards'] })
            setShowModal(false)
        },
    })

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) =>
            await api.put(`/api/admin/store/rewards/${id}`, data),
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: ['admin-rewards'] })
            setSuccessId(vars.id)
            setEditingReward(null)
            setTimeout(() => setSuccessId(null), 2000)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/api/admin/store/rewards/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-rewards'] }),
    })

    const handleSave = (data: any) => {
        if (editingReward) {
            updateMutation.mutate({ id: editingReward.id, data })
        } else {
            createMutation.mutate(data)
        }
    }

    return (
        <div className="flex flex-col pb-32">
            <header className="sticky top-0 bg-[#0f0f1a]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 z-40 flex justify-between items-center">
                <div>
                    <h1 className="text-lg font-bold">Магазин</h1>
                    <p className="text-xs text-gray-500">
                        {rewards?.length ?? 0} товаров
                    </p>
                </div>
                <button
                    onClick={() => { setEditingReward(null); setShowModal(true) }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-semibold active:scale-90 transition-transform"
                >
                    <Plus size={16} /> Добавить
                </button>
            </header>

            <main className="p-4 flex flex-col gap-3">
                {isLoading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="card h-28 skeleton" />
                    ))
                ) : rewards?.length === 0 ? (
                    <div className="card text-center py-16">
                        <Package className="mx-auto mb-3 text-gray-600" size={48} />
                        <p className="font-semibold text-gray-400">Товаров пока нет</p>
                        <p className="text-xs text-gray-600 mt-1">Нажмите «Добавить» чтобы создать первый товар</p>
                    </div>
                ) : (
                    rewards?.map((reward: any) => {
                        const color = TYPE_COLORS[reward.type] || '#6b7280'
                        const isSuccess = successId === reward.id
                        return (
                            <div
                                key={reward.id}
                                className={cn(
                                    'card flex items-start gap-4 transition-all duration-300',
                                    isSuccess && 'border-green-500/40 bg-green-500/5',
                                )}
                            >
                                {/* Image / Icon */}
                                <div
                                    className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                                    style={{ background: color + '15', border: `1px solid ${color}30` }}
                                >
                                    {reward.image_url ? (
                                        <img src={reward.image_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Gift size={24} style={{ color }} />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="font-bold text-[14px] truncate">{reward.title_ru}</h3>
                                        {isSuccess && <CheckCircle size={14} className="text-green-400 shrink-0" />}
                                    </div>
                                    <div className="flex items-center gap-1 mb-1">
                                        <Star size={12} className="text-amber-400" fill="currentColor" />
                                        <span className="text-xs font-black text-amber-400">{reward.point_cost}</span>
                                        <span className="text-[10px] text-gray-600 ml-1">баллов</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                            style={{ background: color + '15', color }}
                                        >
                                            {REWARD_TYPES.find((t) => t.value === reward.type)?.label || reward.type}
                                        </span>
                                        <span className="text-[10px] text-gray-600">
                                            {reward.stock_limits != null ? `${reward.stock_limits} шт.` : 'Безлимит'}
                                        </span>
                                        {!reward.is_active && (
                                            <span className="text-[10px] text-red-400 font-semibold">Скрыт</span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-1 shrink-0">
                                    <button
                                        onClick={() => { setEditingReward(reward); setShowModal(true) }}
                                        className="p-2 text-gray-500 hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-500/10"
                                    >
                                        <Edit2 size={15} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Удалить "${reward.title_ru}"?`)) {
                                                deleteMutation.mutate(reward.id)
                                            }
                                        }}
                                        className="p-2 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </main>

            {/* Create / Edit Modal */}
            {showModal && (
                <RewardModal
                    reward={editingReward}
                    onClose={() => { setShowModal(false); setEditingReward(null) }}
                    onSave={handleSave}
                    isPending={createMutation.isPending || updateMutation.isPending}
                />
            )}

            <BottomNav />
        </div>
    )
}
