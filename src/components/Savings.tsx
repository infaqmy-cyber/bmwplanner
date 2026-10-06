import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { 
  Vault, 
  Flame, 
  Wallet, 
  CheckCircle2, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Edit2, 
  Info, 
  AlertCircle, 
  GraduationCap, 
  Sparkles, 
  ShieldCheck, 
  Wrench, 
  CalendarDays, 
  Check, 
  HelpCircle, 
  PiggyBank,
  ArrowRight,
  RotateCcw,
  PlusCircle
} from 'lucide-react';
import { netWorthService, budgetService, profileService, savingsService } from '../services';
import { NetWorthItem, BudgetProfile, UserProfile, Savings } from '../types';
import { motion } from 'motion/react';
import NumericInput from './NumericInput';

export default function SavingsModule() {
  const { viewingUserId } = useApp();
  const [netWorthItems, setNetWorthItems] = useState<NetWorthItem[]>([]);
  const [budgetProfile, setBudgetProfile] = useState<BudgetProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savingsList, setSavingsList] = useState<Savings[]>([]);
  
  // Active sub-tab state
  const [activeSubTab, setActiveSubTab] = useState<'emergency' | 'sinking'>('emergency');
  
  // Sinking Fund Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState(0);
  const [currentAmount, setCurrentAmount] = useState(0);
  const [subType, setSubType] = useState<'Short Term' | 'Education' | 'Other'>('Short Term');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual Income Override (for simulation)
  const [customIncome, setCustomIncome] = useState<number | null>(null);

  // Load choices from local storage
  const [emergencyMonths, setEmergencyMonths] = useState<3 | 6>(() => {
    const saved = localStorage.getItem('emergency_fund_months');
    return saved === '3' ? 3 : 6;
  });

  useEffect(() => {
    const unsubNetWorth = netWorthService.subscribe(setNetWorthItems, viewingUserId);
    const unsubBudget = budgetService.subscribe((data) => {
      if (data && data.length > 0) setBudgetProfile(data[0]);
    }, viewingUserId);
    const unsubProfile = profileService.subscribe((data) => {
      if (data && data.length > 0) setProfile(data[0]);
    }, viewingUserId);
    const unsubSavings = savingsService.subscribe((data) => {
      setSavingsList(data || []);
    }, viewingUserId);

    return () => {
      unsubNetWorth();
      unsubBudget();
      unsubProfile();
      unsubSavings();
    };
  }, [viewingUserId]);

  const handleSelectMonths = (months: 3 | 6) => {
    setEmergencyMonths(months);
    localStorage.setItem('emergency_fund_months', months.toString());
  };

  // Filter NetWorth items that are liquid and have no charge (User request: tick cair, no tick caj)
  const liquidAssetsNoCharge = netWorthItems.filter(i => i.type === 'Asset' && i.isLiquid && !i.hasCharge);
  const totalOverallSavings = liquidAssetsNoCharge.reduce((acc, i) => acc + (i.value || 0), 0);

  const surplusItems = budgetProfile?.items?.filter(i => i.category === 'surplus') || [];
  const plannedSavingsItems = surplusItems.filter(i => i.subCategory === 'Saving');
  const totalPlannedSavings = plannedSavingsItems.reduce((acc, i) => acc + (i.monthly || 0), 0);

  // Calculate Net Monthly Income from Cashflow
  const netMonthlyIncome = budgetProfile?.items?.filter(i => i.category === 'income')
    .reduce((acc, i) => acc + (i.monthly || 0) * (i.subCategory === 'deduction' ? -1 : 1), 0) || 0;

  // Sync / Fallback monthly income logic
  const monthlyIncomeCalculated = useMemo(() => {
    if (netMonthlyIncome > 1) return netMonthlyIncome;
    if (profile?.income) return profile.income / 12;
    return 0;
  }, [netMonthlyIncome, profile?.income]);

  // Use manual custom override if set, otherwise fallback to calculated income
  const activeIncome = customIncome !== null ? customIncome : (monthlyIncomeCalculated || 3000);

  // Filter out any Emergency items from the list since we handle the core emergency calculation dynamically
  const sinkingFundItems = useMemo(() => {
    return savingsList.filter(s => s.type !== 'Emergency');
  }, [savingsList]);

  // Calculations for Emergency Fund
  const emergencyTarget = activeIncome * emergencyMonths;
  const emergencyShortfall = Math.max(0, emergencyTarget - totalOverallSavings);
  const emergencyPercent = Math.min(100, (totalOverallSavings / Math.max(1, emergencyTarget)) * 100);

  // Calculations for Sinking Fund
  const totalSinkingTarget = useMemo(() => {
    return sinkingFundItems.reduce((acc, s) => acc + (s.targetAmount || 0), 0);
  }, [sinkingFundItems]);

  const totalSinkingCurrentSaved = useMemo(() => {
    return sinkingFundItems.reduce((acc, s) => acc + (s.currentAmount || 0), 0);
  }, [sinkingFundItems]);

  // Pool of savings available for Sinking Fund (Overall Savings minus Emergency Fund Target)
  const remainingSavingsPool = Math.max(0, totalOverallSavings - emergencyTarget);
  const sinkingShortfall = Math.max(0, totalSinkingTarget - remainingSavingsPool);
  const sinkingPoolPercent = totalSinkingTarget > 0 
    ? Math.min(100, (remainingSavingsPool / totalSinkingTarget) * 100) 
    : 100;

  // Icon mapping for sinking fund titles
  const getSinkingFundIcon = (itemTitle: string) => {
    const t = itemTitle.toLowerCase();
    if (t.includes('sekolah') || t.includes('anak') || t.includes('belajar') || t.includes('yuran') || t.includes('buku') || t.includes('didik') || t.includes('universiti')) {
      return <GraduationCap size={16} className="text-blue-600" />;
    }
    if (t.includes('raya') || t.includes('perayaan') || t.includes('idul') || t.includes('fitri') || t.includes('adha') || t.includes('gawai') || t.includes('tahun baru') || t.includes('cny') || t.includes('christmas')) {
      return <Sparkles size={16} className="text-amber-600" />;
    }
    if (t.includes('roadtax') || t.includes('cukai jalan') || t.includes('kereta') || t.includes('insurans') || t.includes('takaful') || t.includes('kenderaan') || t.includes('motor')) {
      return <ShieldCheck size={16} className="text-indigo-600" />;
    }
    if (t.includes('rumah') || t.includes('cat') || t.includes('senggara') || t.includes('bocor') || t.includes('paip') || t.includes('bina') || t.includes('perabot')) {
      return <Wrench size={16} className="text-emerald-600" />;
    }
    if (t.includes('cuti') || t.includes('pelancongan') || t.includes('jalan') || t.includes('hotel') || t.includes('flight') || t.includes('tiket') || t.includes('melancong')) {
      return <CalendarDays size={16} className="text-rose-600" />;
    }
    return <Wallet size={16} className="text-slate-600" />;
  };

  // Form Handlers
  const handleEditItem = (item: Savings) => {
    setEditingId(item.id || null);
    setTitle(item.title);
    setTargetAmount(item.targetAmount || 0);
    setCurrentAmount(item.currentAmount || 0);
    setSubType(item.type as any || 'Short Term');
    setIsFormOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || targetAmount <= 0) return;
    setIsSubmitting(true);
    try {
      const itemData = {
        title: title.trim(),
        targetAmount,
        currentAmount,
        type: subType,
      };
      if (editingId) {
        await savingsService.update(editingId, itemData);
      } else {
        await savingsService.add(itemData, viewingUserId);
      }
      // Reset form
      setTitle('');
      setTargetAmount(0);
      setCurrentAmount(0);
      setSubType('Short Term');
      setEditingId(null);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Error saving sinking fund:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Adakah anda pasti mahu memadam item sinking fund ini?')) {
      try {
        await savingsService.remove(id);
      } catch (err) {
        console.error('Error deleting sinking fund:', err);
      }
    }
  };

  const handleCancelEdit = () => {
    setTitle('');
    setTargetAmount(0);
    setCurrentAmount(0);
    setSubType('Short Term');
    setEditingId(null);
    setIsFormOpen(false);
  };

  const presets = [
    { label: "Belanja Sekolah Anak", amount: 2000, type: "Education" as const },
    { label: "Persiapan Hari Raya", amount: 1500, type: "Short Term" as const },
    { label: "Cukai Jalan & Takaful", amount: 1200, type: "Short Term" as const },
    { label: "Senggaraan Rumah", amount: 2500, type: "Other" as const },
    { label: "Percutian Keluarga", amount: 5000, type: "Other" as const }
  ];

  const handleApplyPreset = (preset: typeof presets[0]) => {
    setTitle(preset.label);
    setTargetAmount(preset.amount);
    setSubType(preset.type);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Modul 3: SIMPANAN</h1>
          <p className="text-xs text-slate-400 font-medium tracking-wider uppercase mt-1">Sistem Urus Tabung Kecemasan & Sinking Fund</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            type="button"
            onClick={() => setActiveSubTab('emergency')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-tight transition-all ${activeSubTab === 'emergency' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Emergency Fund (Kecemasan)
          </button>
          <button 
            type="button"
            onClick={() => setActiveSubTab('sinking')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-tight transition-all ${activeSubTab === 'sinking' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Sinking Fund (Simpanan Bertujuan)
          </button>
        </div>
      </header>

      {/* Main Integrated Savings Summary Card */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <Vault size={110} className="absolute -right-4 -bottom-6 opacity-10 rotate-12" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Jumlah Simpanan Sedia Ada (Aset Cair Tanpa Caj)</p>
            <p className="text-4xl font-mono font-light tracking-tighter">
              RM {totalOverallSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-white/60 text-[9px] font-medium uppercase mt-2">
              Sync automatik dari aset cair tanpa caj di Modul Net Worth
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 flex flex-col justify-between text-xs min-w-[200px]">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="opacity-80">Pelan Bulanan:</span>
              <span className="font-mono font-bold">RM {totalPlannedSavings.toLocaleString()}/bln</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="opacity-80">Bil. Sinking Fund:</span>
              <span className="font-bold">{sinkingFundItems.length} item</span>
            </div>
          </div>
        </div>
      </div>

      {activeSubTab === 'emergency' ? (
        /* ======================== TAB 1: EMERGENCY FUND ======================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-8 space-y-6">
            
            {/* Target Settings Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Flame size={16} className="text-orange-500" />
                  PILIHAN SASARAN DANA KECEMASAN
                </h3>
              </div>

              {/* Selection for 3 vs 6 Months */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sasaran Tempoh</label>
                <div className="flex bg-slate-100 p-1 rounded-xl w-full">
                  <button 
                    type="button"
                    onClick={() => handleSelectMonths(3)}
                    className={`flex-1 py-3 text-center rounded-lg text-xs font-black uppercase tracking-wider transition-all ${emergencyMonths === 3 ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                  >
                    3 Bulan Pendapatan
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleSelectMonths(6)}
                    className={`flex-1 py-3 text-center rounded-lg text-xs font-black uppercase tracking-wider transition-all ${emergencyMonths === 6 ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                  >
                    6 Bulan Pendapatan
                  </button>
                </div>
              </div>

              {/* Income Simulator Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    Pendapatan Bulanan Bersih (RM)
                    <span className="group relative cursor-pointer text-slate-300 hover:text-slate-500">
                      <Info size={12} />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2 rounded w-48 shadow-lg z-50 normal-case font-medium">
                        Diambil daripada Modul 1 Aliran Tunai. Anda boleh mengubah nilai ini secara manual di sebelah kanan untuk simulasi kecemasan.
                      </span>
                    </span>
                  </label>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Nilai Auto-Sync</span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Daripada Aliran Tunai</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800">
                      RM {monthlyIncomeCalculated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Simulasi Pendapatan Manual (Override)</label>
                    {customIncome !== null && (
                      <button 
                        type="button"
                        onClick={() => setCustomIncome(null)}
                        className="text-[9px] font-black text-rose-600 uppercase tracking-tighter flex items-center gap-0.5 hover:text-rose-800"
                      >
                        <RotateCcw size={10} /> Reset Sync
                      </button>
                    )}
                  </div>
                  <div>
                    <NumericInput
                      value={activeIncome}
                      onChange={setCustomIncome}
                      className="w-full text-sm rounded-lg border-slate-200"
                      placeholder="e.g. 3000"
                    />
                    <p className="text-[8px] text-slate-400 mt-1 italic">
                      {customIncome !== null ? "⚠️ Anda sedang menggunakan nilai simulasi manual." : "✓ Menggunakan nilai automatik yang dilaraskan."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Target vs Current Analysis Panel */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest pb-3 border-b border-slate-100">
                PERBANDINGAN SASARAN VS SIMPANAN SEDIA ADA
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sasaran Card */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Sasaran Emergency Fund</span>
                    <span className="text-[9px] text-amber-600 font-extrabold uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                      Formula: {emergencyMonths} Bulan × RM {activeIncome.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-mono font-extrabold text-slate-800">
                      RM {emergencyTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Dikehendaki</p>
                  </div>
                </div>

                {/* Sedia Ada Card */}
                <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block mb-1">Simpanan Sedia Ada</span>
                    <span className="text-[9px] text-emerald-600 font-extrabold uppercase bg-white px-2 py-0.5 rounded border border-emerald-200">
                      Aset Cair Tanpa Kos/Caj
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-mono font-extrabold text-emerald-800">
                      RM {totalOverallSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-emerald-600 font-bold uppercase mt-1">Simpanan Berjaya</p>
                  </div>
                </div>
              </div>

              {/* Progress and status display */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-3">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-slate-500">Tahap Pencapaian</span>
                  <span className={emergencyPercent >= 100 ? "text-emerald-600 font-black" : "text-amber-600"}>
                    {emergencyPercent.toFixed(1)}% ({emergencyPercent >= 100 ? "Sempurna" : "Dalam Proses"})
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden flex shadow-inner">
                  <motion.div 
                    className={`h-full ${emergencyPercent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${emergencyPercent}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>

                {emergencyShortfall > 0 ? (
                  <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 mt-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-rose-500" />
                    <div>
                      <p className="text-xs font-bold uppercase">Jurang Sasaran (Shortfall)</p>
                      <p className="text-[11px] leading-normal mt-0.5">
                        Anda memerlukan tambahan sebanyak <strong className="font-mono text-sm text-rose-700">RM {emergencyShortfall.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> lagi untuk melengkapkan pelan perlindungan {emergencyMonths} bulan pendapatan anda.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 mt-2">
                    <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold uppercase">Sasaran Dipenuhi!</p>
                      <p className="text-[11px] leading-normal mt-0.5">
                        Tahniah! Simpanan cair anda bernilai <strong className="font-mono text-emerald-700">RM {totalOverallSavings.toLocaleString()}</strong> mencukupi sepenuhnya untuk melindung kecemasan sehingga {emergencyMonths} bulan berturut-turut.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Indicator / Formulas info originally from savings */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-[#1A365D] text-white p-4">
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
                  <Info size={16} className="text-amber-400" />
                  ANALISIS & INDIKATOR SIMPANAN KECEMASAN
                </h3>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <p className="text-[11px] font-black text-emerald-800 uppercase mb-1.5 tracking-widest">Formula Kewangan Standard</p>
                  <p className="text-xs text-slate-600 leading-normal font-medium">
                    Formula standard digunakan untuk menilai sejauh mana simpanan cecair semasa mampu menampung kelangsungan hidup sekiranya punca pendapatan utama terputus secara tiba-tiba.
                  </p>
                  <p className="text-xs font-bold text-emerald-900 mt-3">Formula: <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-600">Jumlah simpanan ÷ Pendapatan bulanan = XX bulan</span></p>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Garis Panduan Indikator</p>
                  <div className="space-y-3">
                    {[
                      { range: '0 bulan', status: 'AMAT KRITIKAL', color: 'rose', desc: 'Tiada langsung simpanan cecair. Anda berisiko terdedah kepada beban hutang buruk apabila berlaku kecemasan.' },
                      { range: '1 ke 3 bulan', status: 'KRITIKAL', color: 'orange', desc: 'Persediaan minimum. Anda perlu meningkatkan simpanan secara konsisten untuk sekurang-kurangnya 3 bulan pendapatan.' },
                      { range: '3 ke 6 bulan', status: 'SELAMAT', color: 'blue', desc: 'Kedudukan kukuh. Anda berada dalam zon selamat dan dilindungi daripada gangguan kewangan mengejut.' },
                      { range: '6 bulan ke atas', status: 'AMAT SELAMAT', color: 'emerald', desc: 'Sangat mantap. Anda digalakkan melaburkan baki lebihan simpanan ke instrumen berproduktiviti tinggi.' },
                    ].map((ind, i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="mt-0.5 font-bold text-slate-400 text-xs">{i + 1}.</div>
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-700">
                            <span className="text-slate-400 font-bold">{ind.range}:</span>{' '}
                            <span className={`text-${ind.color}-600 uppercase tracking-tight`}>{ind.status}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 leading-normal opacity-80 group-hover:opacity-100 transition-opacity">
                            {ind.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-inner">
                    <div className="bg-slate-200/50 p-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Status Kiraan Formula Kewangan Anda</div>
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="px-6 py-4 font-bold text-slate-600">Jumlah Simpanan Cecair (Aset Tanpa Caj)</td>
                          <td className="px-6 py-4 text-emerald-600 font-mono font-bold w-1/3">RM</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">{totalOverallSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 font-bold text-slate-600">÷ Pendapatan Bulanan (Dipakai)</td>
                          <td className="px-6 py-4 text-emerald-600 font-mono font-bold w-1/3">RM</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">{activeIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="px-6 py-4 font-black text-slate-900">Kelangsungan Simpanan Anda</td>
                          <td colSpan={2} className="px-6 py-4 text-right font-mono font-black text-emerald-700 text-lg">
                            {(totalOverallSavings / Math.max(activeIncome, 1)).toFixed(1)} bulan
                          </td>
                        </tr>
                        {(() => {
                          const ratio = totalOverallSavings / Math.max(activeIncome, 1);
                          let status = 'AMAT KRITIKAL';
                          let bgColor = 'bg-rose-500';
                          if (ratio >= 6) { status = 'AMAT SELAMAT'; bgColor = 'bg-emerald-600'; }
                          else if (ratio >= 3) { status = 'SELAMAT'; bgColor = 'bg-blue-600'; }
                          else if (ratio >= 1) { status = 'KRITIKAL'; bgColor = 'bg-orange-500'; }
                          else if (ratio > 0) { status = 'AMAT KRITIKAL'; bgColor = 'bg-rose-600'; }
                          else if (ratio === 0) { status = 'TIADA SIMPANAN'; bgColor = 'bg-slate-900'; }

                          return (
                            <tr className={`${bgColor} text-white`}>
                              <td className="px-6 py-5 font-black uppercase tracking-[0.2em]">KEDUDUKAN (INDIKATOR)</td>
                              <td colSpan={2} className="px-6 py-5 text-right font-black uppercase tracking-widest text-xl">
                                {status}
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Sync List and checklists) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Checklist items */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Flame size={14} className="text-orange-500" />
                CHECKLIST EMERGENCY FUND
              </h4>
              <div className="space-y-4">
                {[
                  { label: 'Matlamat Minima RM1,000', done: totalOverallSavings >= 1000 },
                  { label: `Sasaran 3 Bulan (RM ${(activeIncome * 3).toLocaleString(undefined, { maximumFractionDigits: 0 })})`, done: totalOverallSavings >= (activeIncome * 3) },
                  { label: `Sasaran 6 Bulan (RM ${(activeIncome * 6).toLocaleString(undefined, { maximumFractionDigits: 0 })})`, done: totalOverallSavings >= (activeIncome * 6) },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${step.done ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-100 text-slate-300'}`}>
                      <small className="text-[8px] font-bold">✓</small>
                    </div>
                    <span className={`text-xs ${step.done ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sync Liquid Assets */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Wallet size={14} className="text-emerald-500" />
                  ASET CAIR DISINKRONISASI
                </h4>
              </div>
              <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                {liquidAssetsNoCharge.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <TrendingUp size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{item.name}</p>
                        <p className="text-[8px] text-slate-400 uppercase font-black truncate">{item.category}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-mono font-bold text-emerald-700">RM {item.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-[7px] text-emerald-600 font-black flex items-center gap-0.5 justify-end uppercase">
                        ✓ Sync
                      </p>
                    </div>
                  </div>
                ))}
                {liquidAssetsNoCharge.length === 0 && (
                  <div className="p-4 text-center">
                    <AlertCircle size={20} className="mx-auto text-slate-300 mb-1" />
                    <p className="text-slate-400 text-[10px] italic">Tiada aset cair tanpa caj dikesan di Net Worth.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Budget Allocation Info */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={14} className="text-indigo-500" />
                  Peruntukan Simpanan Bulanan
                </h4>
              </div>
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {plannedSavingsItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Wallet size={14} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 truncate">{item.label || 'Simpanan'}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-mono font-bold text-slate-800">RM {item.monthly?.toLocaleString()}</p>
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Bulanan</p>
                    </div>
                  </div>
                ))}
                {plannedSavingsItems.length === 0 && (
                  <div className="p-6 text-center text-slate-400 text-[9px] italic">
                    Tiada simpanan dikesan di Aliran Tunai.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ======================== TAB 2: SINKING FUND ======================== */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Sinking Fund Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Available Sinking Pool */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  Simpanan Tersedia Sinking Fund
                  <span className="group relative cursor-pointer text-slate-300 hover:text-slate-500">
                    <Info size={11} />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2 rounded w-48 shadow-lg z-50 normal-case font-medium leading-normal">
                      Jumlah baki simpanan cair sedia ada selepas ditolak sasaran Dana Kecemasan (RM {emergencyTarget.toLocaleString()}).
                    </span>
                  </span>
                </span>
                <p className="text-2xl font-mono font-black text-emerald-600 mt-2">
                  RM {remainingSavingsPool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="border-t border-slate-100 pt-3 mt-4 text-[9px] text-slate-400 font-bold uppercase flex justify-between">
                <span>Formula:</span>
                <span>Simpanan - Sasaran Kecemasan</span>
              </div>
            </div>

            {/* Card 2: Total Sinking Target */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sasaran Sinking Fund</span>
                <p className="text-2xl font-mono font-black text-blue-600 mt-2">
                  RM {totalSinkingTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="border-t border-slate-100 pt-3 mt-4 text-[9px] text-slate-400 font-bold uppercase flex justify-between">
                <span>Bilangan Sasaran:</span>
                <span className="text-slate-700">{sinkingFundItems.length} Item Berdaftar</span>
              </div>
            </div>

            {/* Card 3: Status / Indicator Card */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-sm ${sinkingShortfall === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest">Kedudukan Sinking Fund</span>
                <p className="text-sm font-bold leading-snug mt-2">
                  {sinkingShortfall === 0 
                    ? "✓ Simpanan sedia ada mencukupi sepenuhnya untuk semua matlamat Sinking Fund anda!" 
                    : `⚠️ Anda memerlukan RM ${sinkingShortfall.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lagi untuk mencukupi.`}
                </p>
              </div>
              <div className="border-t border-amber-200/50 pt-3 mt-4 text-[9px] font-black uppercase flex justify-between">
                <span>Pencapaian Pool:</span>
                <span>{sinkingPoolPercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Sinking Fund Sub-layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* List of Sinking Fund Items (Left side) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <PiggyBank size={16} className="text-blue-500" />
                    SENARAI TABUNGAN SINKING FUND
                  </h3>
                  {!isFormOpen && (
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setTitle('');
                        setTargetAmount(0);
                        setCurrentAmount(0);
                        setIsFormOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase transition-all hover:bg-blue-700"
                    >
                      <Plus size={12} /> Tambah Item Sinking Fund
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-100">
                  {sinkingFundItems.map((item) => {
                    const pct = item.targetAmount > 0 
                      ? Math.min(100, ((item.currentAmount || 0) / item.targetAmount) * 100) 
                      : 0;
                    return (
                      <div key={item.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            {getSinkingFundIcon(item.title)}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-black text-slate-700 truncate">{item.title}</h4>
                              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                {item.type === 'Education' ? 'Pendidikan' : item.type === 'Short Term' ? 'Jangka Pendek' : 'Lain-lain'}
                              </span>
                            </div>
                            {/* Individual Item Progress Bar */}
                            <div className="w-full max-w-sm space-y-1 pt-1">
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                                <div 
                                  className={`h-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
                                <span>RM {(item.currentAmount || 0).toLocaleString()} dikumpul</span>
                                <span className={pct >= 100 ? "text-emerald-600 font-extrabold" : "text-blue-600"}>
                                  {pct.toFixed(0)}% ({pct >= 100 ? "Tercapai" : "Urus"})
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Money figures and editing controls */}
                        <div className="flex items-center gap-6 justify-between md:justify-end flex-shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">Sasaran Tabungan</p>
                            <p className="text-sm font-mono font-black text-slate-800">
                              RM {item.targetAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>

                          <div className="flex gap-1">
                            <button 
                              type="button"
                              onClick={() => handleEditItem(item)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded transition-all"
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteItem(item.id!)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded transition-all"
                              title="Padam"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {sinkingFundItems.length === 0 && (
                    <div className="p-10 text-center text-slate-400 space-y-2">
                      <HelpCircle size={32} className="mx-auto text-slate-200" />
                      <p className="text-xs italic">Tiada rekod sinking fund ditemui.</p>
                      <p className="text-[9px] uppercase font-bold text-slate-300">Sila isikan borang di sebelah kanan atau gunakan presets untuk mula merancang.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Form to Add/Edit Sinking Fund Items (Right side) */}
            <div className="lg:col-span-4 space-y-4">
              
              {isFormOpen && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    {editingId ? <Edit2 size={14} className="text-blue-500" /> : <PlusCircle size={14} className="text-emerald-500" />}
                    {editingId ? 'KEMASKINI SINKING FUND' : 'TAMBAH SINKING FUND'}
                  </h3>

                  <form onSubmit={handleSaveItem} className="space-y-4">
                    
                    {/* Presets suggestions */}
                    {!editingId && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Cadangan Item Sinking Fund:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {presets.map((p, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleApplyPreset(p)}
                              className="text-[9px] bg-slate-50 hover:bg-amber-50 hover:text-amber-700 border border-slate-100 hover:border-amber-200 px-2 py-1 rounded-lg text-slate-600 font-bold uppercase transition-colors"
                            >
                              + {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Item Tabungan</label>
                      <input 
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Belanja Sekolah Anak"
                        className="w-full text-xs rounded-lg border-slate-200 focus:ring-blue-500 focus:border-blue-500 p-2.5 bg-slate-50"
                        required
                        maxLength={150}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jumlah Sasaran (RM)</label>
                        <NumericInput 
                          value={targetAmount}
                          onChange={setTargetAmount}
                          placeholder="e.g. 2000"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simpanan Dikumpul Semasa (RM)</label>
                        <NumericInput 
                          value={currentAmount}
                          onChange={setCurrentAmount}
                          placeholder="e.g. 500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kategori</label>
                      <select
                        value={subType}
                        onChange={(e) => setSubType(e.target.value as any)}
                        className="w-full text-xs rounded-lg border-slate-200 p-2.5 bg-slate-50 font-bold"
                      >
                        <option value="Short Term">Simpanan Jangka Pendek</option>
                        <option value="Education">Pendidikan Anak</option>
                        <option value="Other">Lain-lain / Tabungan Khas</option>
                      </select>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button 
                        type="submit"
                        disabled={isSubmitting || !title.trim() || targetAmount <= 0}
                        className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs uppercase tracking-tight hover:bg-blue-700 transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? 'Menyimpan...' : 'Simpan Tabungan'}
                      </button>
                      <button 
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3 py-2 bg-slate-100 text-slate-500 font-bold rounded-lg text-xs uppercase tracking-tight hover:bg-slate-200 transition-all"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Informative Guidance */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Info size={14} className="text-blue-500" />
                  MENGENAI SINKING FUND
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Sinking Fund ditubuhkan khusus untuk matlamat bertarikh atau bermusim selain kecemasan. Berbeza dengan tabung kecemasan yang tidak boleh disentuh, Sinking Fund sengaja diwujudkan untuk dibelanjakan apabila sampai masanya.
                </p>
                <div className="text-[9px] text-slate-400 font-bold uppercase space-y-1 pt-1 border-t border-slate-100">
                  <p className="flex items-center gap-1"><Check size={10} className="text-emerald-500" /> Elakkan kejutan kos cukai jalan & takaful</p>
                  <p className="flex items-center gap-1"><Check size={10} className="text-emerald-500" /> Kurangkan stress belanja raya & sekolah</p>
                  <p className="flex items-center gap-1"><Check size={10} className="text-emerald-500" /> Urus perbelanjaan secara terkawal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
