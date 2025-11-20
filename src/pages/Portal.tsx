import React from 'react';
import { Link } from 'react-router-dom';

export default function Portal() {
  // Removed welcome banner with user name and date

  const Card = ({ title, desc, to, icon, accent, tint, hoverTint }: { title: string; desc: string; to: string; icon: React.ReactNode; accent: string; tint: string; hoverTint: string }) => (
    <Link to={to} className="group">
      <div className={`rounded-2xl ${tint} backdrop-blur border border-slate-200/70 shadow-sm p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${hoverTint} focus:ring-2 focus:ring-offset-2 focus:ring-sky-300`}>
        <div className={`mx-auto h-14 w-14 rounded-2xl flex items-center justify-center ${accent} text-white shadow-inner transition-transform duration-200 group-hover:scale-105`}>
          {icon}
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <p className="text-slate-600 mt-1 leading-relaxed">{desc}</p>
        </div>
        <button className="mt-5 inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-sky-600 text-white text-sm font-medium shadow hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-300">
          Open <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </button>
      </div>
    </Link>
  );

  const IconStethoscope = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 animate-[pulse_3s_ease-in-out_infinite] group-hover:animate-none">
      <path d="M6 2a1 1 0 0 1 1 1v5a4 4 0 1 0 8 0V3a1 1 0 1 1 2 0v5a6 6 0 0 1-5 5.917V18a4 4 0 1 0 8 0v-1a1 1 0 1 1 2 0v1a6 6 0 1 1-12 0v-4.083A6 6 0 0 1 5 8V3a1 1 0 0 1 1-1Z" />
    </svg>
  );
  const IconTestTube = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 transition-colors duration-200 group-hover:text-white">
      <path d="M7 2h10v2H7v2.586l8.707 8.707a4 4 0 1 1-5.657 5.657L5 15.243V4a2 2 0 0 1 2-2Z" />
    </svg>
  );
  const IconPills = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 transition-transform duration-200 group-hover:rotate-3">
      <path d="M4.5 12a5.5 5.5 0 1 1 11 0v.5h-5a.5.5 0 0 0-.5.5v5H10a5.5 5.5 0 1 1-5.5-6Z" />
      <path d="M13 12.5h6a.5.5 0 0 1 .5.5v6a5.5 5.5 0 0 1-6.5-6.5Z" />
    </svg>
  );
  const IconLedger = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 transition-transform duration-200 group-hover:scale-110">
      <path d="M4 3a2 2 0 0 0-2 2v13a3 3 0 0 0 3 3h13a2 2 0 0 0 2-2V6a3 3 0 0 0-3-3H4Zm2 4h8v2H6V7Zm0 4h12v2H6v-2Zm0 4h8v2H6v-2Z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-teal-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-center text-slate-800 tracking-tight">
          MindSpire Complete Hospital Management System
        </h1>
        <p className="text-slate-600 text-center mt-2">Select a module to start</p>

        {/* Modules grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <Card
            title="Hospital"
            desc="Appointments, admissions, billing, and EMR."
            to="/login"
            icon={IconStethoscope}
            accent="bg-sky-500"
            tint="bg-sky-50"
            hoverTint="hover:bg-sky-100"
          />
          <Card
            title="Lab"
            desc="Lab orders, tests, and results management."
            to="/lab/login"
            icon={IconTestTube}
            accent="bg-emerald-500"
            tint="bg-emerald-50"
            hoverTint="hover:bg-emerald-100"
          />
          <Card
            title="Outdoor Pharmacy"
            desc="Prescriptions, inventory, and POS."
            to="/pharmacy/login"
            icon={IconPills}
            accent="bg-indigo-500"
            tint="bg-indigo-50"
            hoverTint="hover:bg-indigo-100"
          />
          <Card
            title="Indoor Pharmacy"
            desc="Separate indoor POS, inventory, and reporting."
            to="/indoor/login"
            icon={IconPills}
            accent="bg-purple-500"
            tint="bg-purple-50"
            hoverTint="hover:bg-purple-100"
          />
          <Card
            title="Finance"
            desc="Financial management and accounting."
            to="/finance/login"
            icon={IconLedger}
            accent="bg-amber-500"
            tint="bg-amber-50"
            hoverTint="hover:bg-amber-100"
          />
        </div>

        {/* Footer */}
        <p className="mt-10 text-center text-sm text-slate-500">
          Powered by <strong>Mindspire Healthcare Technologies</strong> • <a href="https://mindspire.org" className="text-sky-600 hover:underline">mindspire.org</a>
        </p>
      </div>
    </div>
  );
}
