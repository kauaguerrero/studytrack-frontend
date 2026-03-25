'use client'

import { useEffect, useRef, useState } from 'react'
import { reportError } from '@/lib/reportError'

export function useGameSound() {
  const [isMuted, setIsMuted] = useState(false)
  
  const correctSfx = useRef<HTMLAudioElement | null>(null)
  const errorSfx = useRef<HTMLAudioElement | null>(null)
  const bgmRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
        try {
            // Garanta que os arquivos existem em /public/sounds/
            correctSfx.current = new Audio('/sounds/correct.mp3')
            errorSfx.current = new Audio('/sounds/error.mp3')
            bgmRef.current = new Audio('/sounds/bgm.mp3')
            
            if (bgmRef.current) {
                bgmRef.current.loop = true
                bgmRef.current.volume = 0.3 
            }

            if (correctSfx.current) correctSfx.current.volume = 0.6
            if (errorSfx.current) errorSfx.current.volume = 0.5
        } catch (e) {
            console.error("Erro ao inicializar audio:", e)
            void reportError("GameSoundError", String(e))
        }
    }
    return () => {
        if (bgmRef.current) bgmRef.current.pause()
        if (correctSfx.current) correctSfx.current.pause()
        if (errorSfx.current) errorSfx.current.pause()
    }
  }, [])

  const playHit = () => {
    if (isMuted || !correctSfx.current) return
    correctSfx.current.currentTime = 0
    // O catch evita erro no console se o usuário não interagiu ainda
    correctSfx.current.play().catch(() => {}) 
  }

  const playMiss = () => {
    if (isMuted || !errorSfx.current) return
    errorSfx.current.currentTime = 0
    errorSfx.current.play().catch(() => {})
  }

  const toggleBGM = (play: boolean) => {
    if (!bgmRef.current) return
    if (play && !isMuted) {
        // Tenta tocar. Se falhar por autoplay, falha silenciosamente.
        bgmRef.current.play().catch(() => {})
    } else {
        bgmRef.current.pause()
    }
  }

  const toggleMute = () => {
    setIsMuted(prev => {
        const newState = !prev
        if (newState && bgmRef.current) bgmRef.current.pause()
        if (!newState && bgmRef.current) bgmRef.current.play().catch(() => {})
        return newState
    })
  }


  const testSound = () => {
    if (!correctSfx.current) return
    correctSfx.current.currentTime = 0
    correctSfx.current.play().catch(() => {})
  }

  return { playHit, playMiss, toggleBGM, toggleMute, isMuted, testSound }
}