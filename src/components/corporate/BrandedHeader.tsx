import React from 'react';

export default function BrandedHeader({ compact, logoUrl }: { compact?: boolean; logoUrl?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-sky-100 pb-2">
      <div className="flex items-center gap-3">
        <img
          src={logoUrl || '/logo-cheema.png.png'}
          alt="Logo"
          className={`object-contain border border-sky-200 rounded-lg bg-white ${compact ? 'w-10 h-10' : 'w-14 h-14'}`}
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
        />
        <div>
          <div className={`font-extrabold uppercase tracking-wide text-sky-700 ${compact ? 'text-lg' : 'text-2xl'}`}>Cheema Heart Complex</div>
          <div className={`font-extrabold uppercase text-sky-700 ${compact ? 'text-sm' : 'text-lg'}`}>& General Hospital</div>
          {!compact && (
            <div className="text-xs text-slate-600">
              Mian Zia-ul-Haq Road, Near Lords Hotel, District Courts Gujranwala. Tel: 055-325 59 59, 373 15 59
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
