'use client';

function getWindowApiBase() {
  if (typeof window === 'undefined') return null;

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:5000`;
}

export function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const derived = getWindowApiBase();
  if (derived) return derived.replace(/\/$/, '');

  return 'http://127.0.0.1:5000';
}
