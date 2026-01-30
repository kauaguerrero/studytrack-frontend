'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { User, Mail, Gamepad2, ArrowRight, Loader2, Lock, LogIn, AlertCircle, Smartphone } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

// Utility fora do componente (Performance & Memory Leak prevention)
const formatPhone = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1')
}

export default function FaframAuthPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("login")
    
    const [loginData, setLoginData] = useState({ email: '', password: '' })
    const [registerData, setRegisterData] = useState({
        full_name: '', nickname: '', email: '', whatsapp: '', password: ''
    })

    const handleAuth = async (e: React.FormEvent, type: 'login' | 'register') => {
        e.preventDefault()
        setIsLoading(true)
        setErrorMessage(null)

        const endpoint = type === 'login' ? '/api/fafram/login' : '/api/fafram/register'
        const payload = type === 'login' ? loginData : registerData

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            
            const data = await res.json()

            if (res.ok && data.id) {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('fafram_user_id', data.id)
                    localStorage.setItem('fafram_nickname', data.nickname)
                }
                router.push('/fafram/game')
            } else {
                setErrorMessage(data.error || "Credenciais inválidas ou erro no servidor.")
            }
        } catch (error) {
            console.error(error)
            setErrorMessage("Erro de conexão. Verifique sua internet.")
        } finally {
            setIsLoading(false)
        }
    }

    // Classes padrões para inputs (DRY)
    const inputClasses = "pl-10 bg-slate-950/50 border-slate-800 h-12 text-white placeholder:text-slate-500 focus:border-indigo-500 transition-all"

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-purple-500/30">
            {/* Background Otimizado */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#050505] to-[#050505] pointer-events-none" />
            
            {/* --- HEADER RESPONSIVO E FLUIDO --- */}
            <header className="absolute top-0 left-0 w-full p-4 sm:p-6 z-20 flex justify-start">
                {/* UX FIX: 
                   Mobile: w-32 h-12 (Compacto)
                   Tablet: sm:w-48 sm:h-16 (Médio)
                   Desktop: lg:w-64 lg:h-24 (Impactante)
                   Transition: Suavidade ao redimensionar
                */}
            </header>

            {/* Container Principal centralizado (com ajuste de margem superior responsiva) */}
            <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-20 sm:mt-0">
                
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black tracking-tighter text-white">
                        FAFRAM <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">2026</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 text-sm">Curso de Sistemas de Informação</p>
                </div>

                <Tabs defaultValue="login" value={activeTab} onValueChange={(v) => { setActiveTab(v); setErrorMessage(null); }} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-900/80 border border-slate-800 mb-6 h-14 p-1 rounded-xl">
                        <TabsTrigger value="login" className="rounded-lg font-bold text-xs sm:text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white h-full transition-all">ENTRAR</TabsTrigger>
                        <TabsTrigger value="register" className="rounded-lg font-bold text-xs sm:text-sm data-[state=active]:bg-purple-600 data-[state=active]:text-white h-full transition-all">CRIAR CONTA</TabsTrigger>
                    </TabsList>

                    {/* Feedback de Erro Global */}
                    {errorMessage && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-200 text-sm animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {errorMessage}
                        </div>
                    )}

                    {/* --- ABA DE LOGIN --- */}
                    <TabsContent value="login">
                        <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl shadow-2xl rounded-xl">
                            <form onSubmit={(e) => handleAuth(e, 'login')}>
                                <CardHeader>
                                    <CardTitle className="text-white text-xl">Login</CardTitle>
                                    <CardDescription className="text-slate-400">Entre para continuar sua jornada.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                            <Input 
                                                required 
                                                type="email" 
                                                autoComplete="email" 
                                                autoCapitalize="none" 
                                                placeholder="Email Institucional" 
                                                className={inputClasses}
                                                value={loginData.email}
                                                onChange={e => setLoginData({...loginData, email: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                            <Input 
                                                required 
                                                type="password" 
                                                autoComplete="current-password" 
                                                placeholder="Senha" 
                                                className={inputClasses}
                                                value={loginData.password}
                                                onChange={e => setLoginData({...loginData, password: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex flex-col gap-4">
                                    <Button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 h-12 font-bold text-base shadow-lg shadow-indigo-500/20 transition-all">
                                        {isLoading ? <Loader2 className="animate-spin" /> : <><LogIn className="mr-2 h-5 w-5" /> ENTRAR</>}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </TabsContent>

                    {/* --- ABA DE CADASTRO --- */}
                    <TabsContent value="register">
                        <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-xl shadow-2xl rounded-xl">
                            <form onSubmit={(e) => handleAuth(e, 'register')}>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="relative group">
                                        <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                        <Input 
                                            required 
                                            autoComplete="name"
                                            autoCapitalize="words"
                                            placeholder="Nome Completo" 
                                            className={`${inputClasses} focus:border-purple-500`}
                                            value={registerData.full_name}
                                            onChange={e => setRegisterData({...registerData, full_name: e.target.value})}
                                        />
                                    </div>

                                    <div className="relative group">
                                        <Gamepad2 className="absolute left-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                        <Input 
                                            required 
                                            maxLength={15} 
                                            autoCapitalize="characters" 
                                            autoComplete="off"
                                            placeholder="NICKNAME (RANKING)" 
                                            className={`pl-10 bg-slate-950/50 border-slate-800 h-12 uppercase font-mono text-purple-400 font-bold tracking-wider focus:border-purple-500 placeholder:normal-case placeholder:font-sans placeholder:text-slate-500 placeholder:tracking-normal`}
                                            value={registerData.nickname}
                                            onChange={e => setRegisterData({...registerData, nickname: e.target.value.toUpperCase()})}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Input 
                                            required 
                                            type="email" 
                                            autoComplete="email"
                                            placeholder="Email" 
                                            className={`bg-slate-950/50 border-slate-800 h-12 text-white placeholder:text-slate-500 focus:border-purple-500`}
                                            value={registerData.email}
                                            onChange={e => setRegisterData({...registerData, email: e.target.value})}
                                        />
                                        
                                        <div className="relative">
                                            <Smartphone className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                                            <Input 
                                                required 
                                                type="tel" 
                                                inputMode="numeric" 
                                                autoComplete="tel"
                                                placeholder="(XX) 9..." 
                                                className={`pl-10 bg-slate-950/50 border-slate-800 h-12 text-white placeholder:text-slate-500 focus:border-purple-500`}
                                                value={registerData.whatsapp}
                                                onChange={e => setRegisterData({...registerData, whatsapp: formatPhone(e.target.value)})}
                                            />
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                        <Input 
                                            required 
                                            type="password" 
                                            autoComplete="new-password" 
                                            placeholder="Crie uma Senha" 
                                            className={`${inputClasses} focus:border-purple-500`}
                                            value={registerData.password}
                                            onChange={e => setRegisterData({...registerData, password: e.target.value})}
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" disabled={isLoading} className="w-full h-12 text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-purple-900/20">
                                        {isLoading ? <Loader2 className="animate-spin" /> : <span className="flex items-center">CADASTRAR E JOGAR <ArrowRight className="ml-2 w-5 h-5" /></span>}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </TabsContent>
                </Tabs>
                
                <p className="text-center text-[10px] uppercase tracking-widest text-slate-700 mt-8">
                    Ambiente Seguro • StudyTrack Engineering
                </p>
            </div>
        </div>
    )
}