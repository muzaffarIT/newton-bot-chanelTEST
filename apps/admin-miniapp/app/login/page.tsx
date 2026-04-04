'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authWithCredentials } from '@/lib/api'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            await authWithCredentials(email, password)
            router.push('/')
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#0f0f1a]">
            <div className="card w-full max-w-sm shadow-2xl border-white/5 bg-white/5 backdrop-blur-xl p-8">
                <div className="text-center mb-8">
                    <div className="inline-block p-3 rounded-2xl bg-blue-600/20 text-blue-400 text-3xl mb-4">
                        🍎
                    </div>
                    <h1 className="text-2xl font-bold text-white">Newton Academy</h1>
                    <p className="text-sm text-gray-400 mt-1">Admin Panel</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5 ml-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 transition-all text-white"
                            placeholder="admin@newton.uz"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5 ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 transition-all text-white"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs py-2 px-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl mt-4 transition-all shadow-lg shadow-blue-600/20"
                    >
                        {loading ? 'Logging in...' : 'Sign In'}
                    </button>
                </form>

                <p className="text-center text-[10px] text-gray-500 mt-8 uppercase tracking-widest">
                    Newton Academy Management Board
                </p>
            </div>
        </div>
    )
}
