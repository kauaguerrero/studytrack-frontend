"use client";

import React, { useState, useEffect } from 'react';

export default function SimpleHome() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="font-bold text-xl text-slate-900">StudyTrack</div>
            <nav className="hidden md:flex space-x-8">
              <a href="#planos" className="text-slate-700 hover:text-blue-600 font-medium">Planos</a>
              <a href="/auth/login" className="text-slate-700 hover:text-blue-600 font-medium">Entrar</a>
            </nav>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      <main className="pt-16">
        <section className="py-20">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h1 className="text-4xl font-bold text-slate-900 mb-6">
              Seu guia pessoal para a aprovação.
            </h1>
            <p className="text-lg text-slate-600 mb-8">
              O StudyTrack caminha ao seu lado na jornada de estudos.
            </p>
            <a
              href="/auth/register"
              className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
            >
              Começar Minha Jornada
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}