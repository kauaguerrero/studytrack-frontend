'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle, XCircle, Loader2, ArrowRight, Mail } from 'lucide-react'

type Status = 'loading' | 'success' | 'error'

function ConfirmEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setErrorMsg('Link inválido. Nenhum token encontrado.')
      setStatus('error')
      return
    }

    fetch(`${apiUrl}/api/account/change-email/confirm?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          setStatus('success')
        } else {
          setErrorMsg(data?.error || 'Token inválido ou expirado.')
          setStatus('error')
        }
      })
      .catch(() => {
        setErrorMsg('Erro de conexão. Tente novamente.')
        setStatus('error')
      })
  }, [searchParams, apiUrl])

  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-slate-900 overflow-hidden">
      {/* Coluna principal */}
      <div className="w-full lg:w-1/2 flex flex-col h-screen relative z-20 bg-white">
        {/* Logo */}
        <div className="flex-none p-6 lg:p-8">
          <div
            className="flex items-center gap-0 group cursor-pointer w-fit"
            onClick={() => router.push('/')}
          >
            <div className="group-hover:scale-110 transition-transform duration-300 flex items-center justify-center -mr-3">
              <Image
                src="/logost-transparente-sombra.png"
                alt="StudyTrack Logo"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">StudyTrack</div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-8">
          <div className="w-full max-w-[440px] mx-auto pb-4">

            {/* Loading */}
            {status === 'loading' && (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
                    Confirmando e-mail...
                  </h1>
                  <p className="text-slate-500 text-base leading-relaxed">
                    Aguarde enquanto validamos seu link.
                  </p>
                </div>
              </div>
            )}

            {/* Sucesso */}
            {status === 'success' && (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
                    E-mail atualizado!
                  </h1>
                  <p className="text-slate-500 text-base leading-relaxed">
                    Seu endereço de e-mail foi alterado com sucesso. Use o novo e-mail no próximo login.
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/portal')}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-14 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all"
                  >
                    <span>Ir para o Perfil</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold h-12 rounded-2xl transition-all text-sm"
                  >
                    Fazer login com o novo e-mail
                  </button>
                </div>
              </div>
            )}

            {/* Erro */}
            {status === 'error' && (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
                    Link inválido
                  </h1>
                  <p className="text-slate-500 text-base leading-relaxed">
                    {errorMsg}
                  </p>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 text-left">
                  <p className="font-semibold mb-1">O que pode ter acontecido?</p>
                  <ul className="space-y-1 list-disc list-inside text-amber-700">
                    <li>O link expirou (validade de 1 hora)</li>
                    <li>Uma nova solicitação foi feita, invalidando este link</li>
                    <li>O link foi usado anteriormente</li>
                  </ul>
                </div>
                <button
                  onClick={() => router.push('/portal')}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-14 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all"
                >
                  <span>Solicitar novo link</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Painel decorativo */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-8">
            <div className="w-20 h-20 bg-white/80 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Mail className="w-10 h-10 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Troca de E-mail</h2>
            <p className="text-slate-600 max-w-sm leading-relaxed">
              Mantenha seus dados sempre atualizados para garantir acesso contínuo à sua conta.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    }>
      <ConfirmEmailForm />
    </Suspense>
  )
}
