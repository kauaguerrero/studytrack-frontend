/**
 * Web push do aluno — registro do service worker e assinatura VAPID.
 *
 * A chave pública vem do backend (GET /api/student/push/public-key); a
 * assinatura é salva em push_subscriptions via POST /subscribe (Bearer).
 * Tudo é no-op silencioso quando o browser não suporta push ou o backend
 * não tem VAPID configurado.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://studytrack-backend.fly.dev').replace(/\/$/, '');

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

async function fetchPublicKey(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/student/push/public-key`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.public_key === 'string' && data.public_key ? data.public_key : null;
  } catch {
    return null;
  }
}

/**
 * Garante uma assinatura push ativa e a registra no backend.
 * Requer Notification.permission === 'granted' (peça a permissão antes,
 * num gesto do usuário). Retorna true em caso de sucesso.
 */
export async function ensurePushSubscription(accessToken: string): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false;

  const registration = await getRegistration();
  if (!registration) return false;

  try {
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const publicKey = await fetchPublicKey();
      if (!publicKey) return false;
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
    }

    const res = await fetch(`${API_BASE}/api/student/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(subscription.toJSON()),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Pede permissão (gesto do usuário) e assina. Retorna o estado final. */
export async function requestAndSubscribe(
  accessToken: string,
): Promise<'subscribed' | 'denied' | 'unsupported' | 'error'> {
  if (!isPushSupported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  return (await ensurePushSubscription(accessToken)) ? 'subscribed' : 'error';
}

/** Cancela a assinatura deste dispositivo (local + backend). */
export async function disablePush(accessToken: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return true;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await fetch(`${API_BASE}/api/student/push/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ endpoint }),
    });
    return true;
  } catch {
    return false;
  }
}

/** true se este dispositivo já tem assinatura push ativa. */
export async function hasActiveSubscription(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    return Boolean(await registration?.pushManager.getSubscription());
  } catch {
    return false;
  }
}
