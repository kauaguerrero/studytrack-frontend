'use client';

// Barra de força de senha: 4 segmentos que enchem e mudam de cor conforme
// os critérios são atendidos (8+ caracteres, maiúscula+minúscula, número,
// símbolo). Usada nas telas que criam/definem senha — nunca no login.

export function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH_META = [
  { label: '', bar: '', text: '' },
  { label: 'Fraca', bar: 'bg-red-500', text: 'text-red-600' },
  { label: 'Razoável', bar: 'bg-amber-500', text: 'text-amber-600' },
  { label: 'Boa', bar: 'bg-lime-500', text: 'text-lime-600' },
  { label: 'Forte', bar: 'bg-emerald-500', text: 'text-emerald-600' },
] as const;

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const strength = passwordStrength(password);
  const meta = STRENGTH_META[strength];

  return (
    <div className="pt-1.5">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              seg <= strength ? meta.bar : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>
      {strength > 0 && (
        <p className={`mt-1.5 text-[12px] font-bold ${meta.text}`}>{meta.label}</p>
      )}
    </div>
  );
}
