'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { SubscriptionLock } from '@/components/dashboard/SubscriptionLock'
import { Loader2, Zap, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const PLANS = [
  { id: 'basic' as const, name: 'Basic', price: 'R$ 14,90/mês', desc: 'Questões e simulados essenciais' },
  { id: 'pro' as const, name: 'Pro', price: 'R$ 29,90/mês', desc: 'Recursos completos e IA', highlight: true },
  { id: 'elite' as const, name: 'Elite', price: 'R$ 49,90/mês', desc: 'Suporte premium e prioridade' },
]

export default function UpgradePage() {
  const router = useRouter()
  const [userName, setUserName] = useState('Estudante')
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | 'elite' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth/login')
        return
      }
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, plan_tier, subscription_status')
          .eq('id', user.id)
          .single()
        if (data?.full_name) setUserName(data.full_name.split(' ')[0])
        if (data?.subscription_status === 'active' && data?.plan_tier !== 'free') {
          router.replace('/portal/student/dashboard')
          return
        }
      } catch {
        /* ignore */
      }
      setLoading(false)
    }
    run()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (selectedPlan) {
    return (
      <SubscriptionLock planTier={selectedPlan} userName={userName} />
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Fazer Upgrade</h1>
        <p className="mt-2 text-slate-600">
          Escolha um plano para desbloquear todo o conteúdo da StudyTrack.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`relative overflow-hidden transition-all hover:shadow-lg ${
              plan.highlight ? 'ring-2 ring-blue-500 shadow-md' : ''
            }`}
          >
            {plan.highlight && (
              <div className="absolute top-0 right-0 rounded-bl-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                Popular
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                {plan.name}
              </CardTitle>
              <CardDescription>{plan.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-2xl font-bold text-slate-900">{plan.price}</p>
              <Button
                onClick={() => setSelectedPlan(plan.id)}
                className="w-full"
                variant={plan.highlight ? 'default' : 'outline'}
              >
                Escolher {plan.name}
                <ChevronRight size={16} className="ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-slate-500">
        Pagamento seguro via PIX ou cartão de crédito.
      </p>
    </div>
  )
}
