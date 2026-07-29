import type { MetadataRoute } from 'next';

/**
 * Manifest PWA — necessário para o Chrome/Android disparar o evento
 * `beforeinstallprompt` (usado pelo hint de instalação no app do aluno,
 * PushManager.tsx). Sem manifest válido, o navegador nunca oferece instalar.
 *
 * `start_url` aponta para o hub de redirecionamento por papel (/portal),
 * que já resolve o aluno para /partners/{slug}/student/dashboard.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StudyTrack — Estude direcionado',
    short_name: 'StudyTrack',
    description: 'Banco de questões, simulados e desempenho para o ENEM e vestibulares.',
    start_url: '/portal',
    scope: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/logost.png',
        sizes: '500x500',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logost.png',
        sizes: '500x500',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
