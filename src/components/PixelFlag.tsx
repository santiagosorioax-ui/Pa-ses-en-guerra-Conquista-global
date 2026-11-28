import type { CountrySeed } from '../data/countries195';

interface PixelFlagProps {
  country: CountrySeed;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function PixelFlag({ country, size = 'md' }: PixelFlagProps) {
  const iso = country.iso2.toLowerCase();
  const sizeClass =
    size === 'sm'
      ? 'flag-real-sm'
      : size === 'lg'
        ? 'flag-real-lg'
        : size === 'xl'
          ? 'flag-real-xl'
          : 'flag-real-md';

  return (
    <span
      role="img"
      aria-label={`Bandera de ${country.name}`}
      className={`fi fi-${iso} flag-real ${sizeClass} border border-slate-700/80 rounded-[3px] overflow-hidden bg-slate-900/60 shadow-sm`}
    />
  );
}
