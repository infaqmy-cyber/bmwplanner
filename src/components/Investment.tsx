import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { LineChart, ExternalLink, ShieldCheck, Landmark, Target, TrendingUp, Info, Save, Loader2, Calendar, Wallet, Percent, ArrowRight, AlertCircle, User } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { netWorthService, profileService, budgetService, retirementService } from '../services';
import { NetWorthItem, UserProfile, BudgetProfile, RetirementSettings } from '../types';
import { auth } from '../firebase';
import NumericInput from './NumericInput';

export default function InvestmentModule({ switchTab }: { switchTab?: (tab: any) => void } = {}) {
  const { viewingUserId } = useApp();
  const [netWorthItems, setNetWorthItems] = useState<NetWorthItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [budget, setBudget] = useState<BudgetProfile | null>(null);
  const [retirementSettings, setRetirementSettings] = useState<RetirementSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'retirement'>('summary');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const userId = viewingUserId || auth.currentUser?.uid;
    if (!userId) return;

    const unsubNet = netWorthService.subscribe(setNetWorthItems, userId);
    const unsubProfile = profileService.subscribe(data => {
      if (data.length > 0) setProfile(data[0]);
    }, userId);
    const unsubBudget = budgetService.subscribe(data => {
      if (data.length > 0) setBudget(data[0]);
    }, userId);
    const unsubRetirement = retirementService.subscribe(data => {
      if (data.length > 0) setRetirementSettings(data[0]);
    }, userId);

    return () => {
      unsubNet();
      unsubProfile();
      unsubBudget();
      unsubRetirement();
    };
  }, [viewingUserId]);

  // Include all NetWorth assets for the projection
  const investmentNetWorthAssets = netWorthItems.filter(i => i.type === 'Asset');

  const totalInvestment = investmentNetWorthAssets.reduce((acc, i) => acc + (i.value || 0), 0);

  const categoriesFound = useMemo(() => {
    const cats = new Set<string>(investmentNetWorthAssets.map(i => i.category || ''));
    const baseCats = [
      'Tunai & Setara Tunai',
      'Bank dan Akaun Simpanan',
      'Saham, saham amanah, koperasi',
      'Hartanah',
      'Emas, Perak & Logam Berharga',
      'AKAUN KWSP',
      'Sijil Takaful (Nilai Tunai)'
    ];
    
    const sorted = baseCats.filter(cat => cats.has(cat));
    const others = Array.from(cats).filter(cat => !baseCats.includes(cat)).sort();
    
    return [...sorted, ...others];
  }, [investmentNetWorthAssets]);

  // Split by liquidity
  const liquidAssets = investmentNetWorthAssets.filter(i => i.isLiquid);
  const fixedAssets = investmentNetWorthAssets.filter(i => !i.isLiquid);

  const surplusItems = budget?.items?.filter(i => i.category === 'surplus') || [];
  const plannedInvestmentItems = surplusItems.filter(i => i.subCategory === 'Investment');
  const totalPlannedInvestment = plannedInvestmentItems.reduce((acc, i) => acc + (i.monthly || 0), 0);

  // Retirement Calculations
  const currentAge = useMemo(() => {
    if (!profile?.dob) return 35; // Default if not set
    const birthDate = new Date(profile.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }, [profile?.dob]);

  const monthlyExpenses = useMemo(() => {
    if (!budget) return 0;
    return budget.items
      .filter(i => i.category === 'expense')
      .reduce((acc, i) => acc + (i.monthly || 0), 0);
  }, [budget]);

  const annualExpenses = monthlyExpenses * 12;
  const annualIncome = profile?.income || 0;
  const baselineAnnual = annualIncome > 0 ? annualIncome : annualExpenses;

  const rSettings = retirementSettings || {
    userId: auth.currentUser?.uid || '',
    targetAge: 60,
    inflationRate: 5,
    postRetirementSpendingRatio: 70,
    expectedRoi: 6,
    assetRois: {},
    excludedAssetIds: [],
    isRenting: false,
    monthlyRent: 0,
    updatedAt: new Date().toISOString()
  };

  const yearsToRetirement = Math.max(0, rSettings.targetAge - currentAge);
  const futureAnnualBaseline = baselineAnnual * Math.pow(1 + (rSettings.inflationRate / 100), yearsToRetirement);
  
  // Future rent calculation (if renting)
  const futureMonthlyRent = rSettings.isRenting 
    ? rSettings.monthlyRent * Math.pow(1 + (rSettings.inflationRate / 100), yearsToRetirement)
    : 0;

  const postRetirementAnnualNeeds = (futureAnnualBaseline * (rSettings.postRetirementSpendingRatio / 100)) + (futureMonthlyRent * 12);
  const requiredRetirementFund = postRetirementAnnualNeeds / (rSettings.expectedRoi / 100);

  // Asset Projections
  const assetProjections = useMemo(() => {
    const projected = investmentNetWorthAssets.map(item => {
      const roi = rSettings.assetRois[item.id!] || 0;
      const isHome = item.name?.toLowerCase().includes("rumah kediaman");
      // Auto exclude home if not renting
      const isAutoExcluded = !rSettings.isRenting && isHome;
      const isExcluded = isAutoExcluded || (rSettings.excludedAssetIds || []).includes(item.id!);
      
      const futureValue = (item.value || 0) * Math.pow(1 + (roi / 100), yearsToRetirement);
      return { ...item, roi, futureValue, isExcluded, isAutoExcluded };
    });

    const categoryOrder = [
      'Tunai & Setara Tunai',
      'Bank dan Akaun Simpanan',
      'Saham, saham amanah, koperasi',
      'Hartanah',
      'Emas, Perak & Logam Berharga',
      'AKAUN KWSP',
      'Sijil Takaful (Nilai Tunai)'
    ];

    return projected.sort((a, b) => {
      const orderA = categoryOrder.findIndex(cat => cat.toLowerCase() === (a.category || '').toLowerCase());
      const orderB = categoryOrder.findIndex(cat => cat.toLowerCase() === (b.category || '').toLowerCase());
      
      const valA = orderA === -1 ? 999 : orderA;
      const valB = orderB === -1 ? 999 : orderB;
      
      if (valA !== valB) return valA - valB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [investmentNetWorthAssets, rSettings.assetRois, rSettings.excludedAssetIds, yearsToRetirement]);

  const totalProjectedAssets = assetProjections
    .filter(i => !i.isExcluded)
    .reduce((acc, i) => acc + i.futureValue, 0);

  const gap = totalProjectedAssets - requiredRetirementFund;

  const handleUpdateSettings = (updates: Partial<RetirementSettings>) => {
    setRetirementSettings(prev => ({
      ...(prev || rSettings),
      ...updates,
      updatedAt: new Date().toISOString()
    }));
  };

  const toggleAssetExclusion = (assetId: string) => {
    const currentExcluded = rSettings.excludedAssetIds || [];
    const newExcluded = currentExcluded.includes(assetId)
      ? currentExcluded.filter(id => id !== assetId)
      : [...currentExcluded, assetId];
    handleUpdateSettings({ excludedAssetIds: newExcluded });
  };

  const handleUpdateAssetRoi = (assetId: string, roi: number) => {
    handleUpdateSettings({
      assetRois: { ...rSettings.assetRois, [assetId]: roi }
    });
  };

  const handleSaveSettings = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      const dataToSave = { ...rSettings, userId: auth.currentUser.uid, updatedAt: new Date().toISOString() };
      if (retirementSettings?.id) {
        await retirementService.update(retirementSettings.id, dataToSave);
      } else {
        await retirementService.add(dataToSave);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Allocation Chart Data
  const allocationData = useMemo(() => {
    const liquidValue = liquidAssets.reduce((acc, i) => acc + (i.value || 0), 0);
    const fixedValue = fixedAssets.reduce((acc, i) => acc + (i.value || 0), 0);
    
    return [
      { name: 'Aset Cair', value: liquidValue, color: '#10B981' },
      { name: 'Aset Tetap', value: fixedValue, color: '#3B82F6' }
    ].filter(d => d.value > 0);
  }, [liquidAssets, fixedAssets]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Modul 5: PELABURAN</h1>
          <p className="text-xs text-slate-400 font-medium tracking-wider uppercase mt-1">pelaburan dan persaraan</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-tight transition-all ${activeTab === 'summary' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Ringkasan Aset
          </button>
          <button 
            onClick={() => setActiveTab('retirement')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-tight transition-all ${activeTab === 'retirement' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Analisa Persaraan
          </button>
        </div>
      </header>

      {activeTab === 'summary' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#1A365D] text-white rounded-xl p-6 shadow-lg relative overflow-hidden">
              <LineChart size={80} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
              <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Investment Value</p>
              <p className="text-4xl font-mono font-light tracking-tighter">RM {totalInvestment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-[9px] font-bold uppercase text-white/50">
                <span>Aset Pelaburan (Sync): RM {totalInvestment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[420px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   ALLOCATION BREAKDOWN
                </h3>
              </div>
              
              <div className="flex-1 w-full flex items-center justify-center py-4 min-h-[320px]">
                {allocationData.length > 0 ? (
                  <div className="relative">
                    <PieChart width={300} height={300}>
                      <Pie
                        data={allocationData}
                        cx={150}
                        cy={150}
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                        stroke="none"
                        isAnimationActive={true}
                      >
                        {allocationData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: 'none', 
                          borderRadius: '12px', 
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', 
                          fontSize: '10px', 
                          textTransform: 'uppercase', 
                          fontWeight: 'bold',
                          padding: '8px 12px'
                        }}
                        formatter={(value: number) => `RM ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      />
                    </PieChart>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total</p>
                      <p className="text-sm font-mono font-black text-slate-800 tracking-tighter">
                        RM {totalInvestment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300 text-[10px] uppercase font-black italic gap-2 text-center">
                    <AlertCircle size={24} />
                    Tiada data pelaburan
                  </div>
                )}
              </div>

              <div className="space-y-3 mt-6">
                <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                    <span className="text-[9px] font-black text-emerald-700 uppercase">Aset Cair</span>
                  </div>
                  <span className="text-[10px] font-mono font-black text-emerald-800">
                    RM {liquidAssets.reduce((acc, i) => acc + (i.value || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
                    <span className="text-[9px] font-black text-blue-700 uppercase">Aset Tetap</span>
                  </div>
                  <span className="text-[10px] font-mono font-black text-blue-800">
                    RM {fixedAssets.reduce((acc, i) => acc + (i.value || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Planned Investments from Cashflow */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-[#1A365D] text-white px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-400" />
                  Plan Pelaburan Bulanan (Sync dari Aliran Tunai)
                </h4>
                <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">
                  TOTAL: RM {totalPlannedInvestment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/bln
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {plannedInvestmentItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Wallet size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{item.label || 'Pelaburan Tertentu'}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold text-slate-800">RM {item.monthly?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-[8px] text-slate-400 font-black uppercase">Bulanan</p>
                    </div>
                  </div>
                ))}
                {plannedInvestmentItems.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-[10px] italic">
                    Tiada plan pelaburan bulanan dikesan di Aliran Tunai.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Landmark size={14} className="text-blue-500" />
                  RINGKASAN ASET PELABURAN
                </h4>
                <span className="text-[10px] font-black text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-100 shadow-sm">
                  TOTAL: RM {totalInvestment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="p-4 space-y-10">
                {/* SECTION: ASET CAIR */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b-2 border-emerald-100 pb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                    <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">ASET CAIR (LIQUID ASSETS)</h5>
                  </div>
                  
                  <div className="space-y-6 pl-2">
                    {liquidAssets.length > 0 ? (
                      categoriesFound.map((category, catIdx) => {
                        const items = liquidAssets.filter(i => (i.category || '').toLowerCase() === category.toLowerCase());
                        if (items.length === 0) return null;
                        return (
                          <div key={`liquid-cat-${category}`} className="space-y-3">
                            <div className="flex items-center gap-2 bg-slate-50 px-2 py-0.5 rounded w-fit border border-slate-100">
                              <span className="text-[9px] font-black text-slate-300">{catIdx + 1}.</span>
                              <h6 className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{category}</h6>
                            </div>
                            <div className="space-y-2 pl-4 border-l border-slate-100 ml-1">
                              {items.map((item, itemIdx) => (
                                <AssetRow 
                                  key={`liquid-${category}-${itemIdx}`} 
                                  item={item} 
                                  index={`${catIdx + 1}.${itemIdx + 1}`} 
                                  onNavigate={() => switchTab && switchTab('networth')}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[10px] text-slate-300 italic py-2">Tiada aset cair dikesan.</p>
                    )}
                  </div>
                </div>

                {/* SECTION: ASET TETAP */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">ASET TETAP (FIXED ASSETS)</h5>
                  </div>

                  <div className="space-y-6 pl-2">
                    {fixedAssets.length > 0 ? (
                      categoriesFound.map((category, catIdx) => {
                        const items = fixedAssets.filter(i => (i.category || '').toLowerCase() === category.toLowerCase());
                        if (items.length === 0) return null;
                        return (
                          <div key={`fixed-cat-${category}`} className="space-y-3">
                            <div className="flex items-center gap-2 bg-slate-50 px-2 py-0.5 rounded w-fit border border-slate-100">
                              <span className="text-[9px] font-black text-slate-300">{catIdx + 1}.</span>
                              <h6 className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{category}</h6>
                            </div>
                            <div className="space-y-2 pl-4 border-l border-slate-100 ml-1">
                              {items.map((item, itemIdx) => (
                                <AssetRow 
                                  key={`fixed-${category}-${itemIdx}`} 
                                  item={item} 
                                  index={`${catIdx + 1}.${itemIdx + 1}`} 
                                  onNavigate={() => switchTab && switchTab('networth')}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[10px] text-slate-300 italic py-2">Tiada aset tetap dikesan.</p>
                    )}
                  </div>
                </div>

                {investmentNetWorthAssets.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                    <Landmark className="mx-auto text-slate-200 mb-2" size={32} />
                    <p className="text-slate-400 text-[10px] italic">Tiada aset pelaburan (bercaj) dikesan di Net Worth.</p>
                    <p className="text-slate-300 text-[8px] uppercase mt-1 tracking-tight italic">Sila tambah aset di Modul Net Worth & tandakan Caj/Kos</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Retirement Inputs & Core Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={16} className="text-blue-600" />
                    MAKLUMAT ASAS PERSARAAN
                  </h3>
                  <button 
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase transition-all hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Simpan Tetapan
                  </button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <RetirementInput 
                      label="Umur Sekarang" 
                      value={currentAge} 
                      disabled 
                      icon={<User /> } 
                      suffix="Tahun"
                    />
                    <RetirementInput 
                      label="Sasaran Umur Bersara" 
                      value={rSettings.targetAge} 
                      onChange={v => handleUpdateSettings({ targetAge: v })} 
                      icon={<Target />} 
                      suffix="Tahun"
                    />
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase text-blue-600 tracking-wider">
                        <span>Tempoh Menuju Persaraan</span>
                        <span>{yearsToRetirement} TAHUN LAGI</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <RetirementInput 
                      label="Anggaran Inflasi / Kenaikan Kos" 
                      value={rSettings.inflationRate} 
                      onChange={v => handleUpdateSettings({ inflationRate: v })} 
                      icon={<TrendingUp />} 
                      suffix="% Setahun"
                    />
                    <RetirementInput 
                      label="Nisbah Perbelanjaan Pasca-Persaraan" 
                      value={rSettings.postRetirementSpendingRatio} 
                      onChange={v => handleUpdateSettings({ postRetirementSpendingRatio: v })} 
                      icon={<Percent />} 
                      suffix="% daripada Kos Sekarang"
                      tooltip="Biasanya 70-100% daripada perbelanjaan sekarang"
                    />
                    <RetirementInput 
                      label=" ROI Dana Persaraan (Yield)" 
                      value={rSettings.expectedRoi} 
                      onChange={v => handleUpdateSettings({ expectedRoi: v })} 
                      icon={<TrendingUp />} 
                      suffix="% Setahun"
                      tooltip="ROI yang dijangka dijana oleh dana persaraan anda untuk menanggung kos sara hidup"
                    />
                  </div>
                </div>
              </div>

              {/* Home / Rental Selection */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={16} className="text-blue-600" />
                    PILIHAN KEDIAMAN PERSARAAN
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Status Kediaman</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Adakah anda akan menyewa selepas bersara?</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleUpdateSettings({ isRenting: false })}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${!rSettings.isRenting ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}
                      >
                        Rumah Sendiri
                      </button>
                      <button 
                        onClick={() => handleUpdateSettings({ isRenting: true })}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${rSettings.isRenting ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}
                      >
                        Menyewa
                      </button>
                    </div>
                  </div>

                  {rSettings.isRenting && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <RetirementInput 
                        label="Anggaran Sewa Bulanan (Nilai Sekarang)" 
                        value={rSettings.monthlyRent} 
                        onChange={v => handleUpdateSettings({ monthlyRent: v })} 
                        icon={<Wallet />} 
                        suffix="RM / Bulan"
                        tooltip="Masukkan nilai sewa bulanan hari ini. Sistem akan menambah inflasi secara automatik."
                      />
                      <p className="mt-2 text-[10px] text-blue-600 font-bold uppercase italic">
                        Unjuran Sewa Umur {rSettings.targetAge}: RM {futureMonthlyRent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / bulan
                      </p>
                    </div>
                  )}

                  {!rSettings.isRenting && (
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                      <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-blue-700 font-medium leading-relaxed uppercase">
                        Sila pastikan aset "Rumah Kediaman" anda di dalam jadual unjuran di bawah adalah **DIKECUALIKAN** (uncheck) jika anda bercadang untuk mendiaminya dan bukan untuk dijual sebagai sebahagian daripada dana persaraan.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Expense Analysis */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Wallet size={16} className="text-blue-600" />
                    ANGGARAN KEPERLUAN PERSARAAN
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <MetricCard 
                      label="Kewangan Baseline Sekarang (Tahunan)" 
                      value={baselineAnnual} 
                      subLabel={annualIncome > 0 ? `RM ${(annualIncome/12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Pendapatan sebulan` : `RM ${monthlyExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Perbelanjaan sebulan`}
                    />
                    <MetricCard 
                      label={`Anggaran Keperluan Umur ${rSettings.targetAge}`} 
                      value={futureAnnualBaseline} 
                      subLabel={`Kenaikan inflasi ${rSettings.inflationRate}% selama ${yearsToRetirement} tahun`}
                      highlight
                    />
                    <MetricCard 
                      label="Gaya Hidup Selepas Bersara (Tahunan)" 
                      value={postRetirementAnnualNeeds} 
                      subLabel={`${rSettings.postRetirementSpendingRatio}% daripada baseline masa depan`}
                      highlight
                    />
                    <div className="bg-blue-900 text-white p-6 rounded-2xl shadow-lg border border-blue-800 relative overflow-hidden">
                      <Target size={60} className="absolute -right-4 -bottom-4 opacity-10" />
                      <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Dana Persaraan Diperlukan</p>
                      <p className="text-3xl font-mono font-bold tracking-tighter">RM {requiredRetirementFund.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="mt-2 text-[9px] font-medium text-blue-200/70 border-t border-white/10 pt-2 uppercase tracking-wide">
                        Berdasarkan Yield {rSettings.expectedRoi}% Setahun
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Quick Stats */}
            <div className="space-y-6">
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ringkasan Dana</p>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-[11px] font-bold text-slate-500">DANA SASARAN</span>
                      <span className="text-sm font-mono font-black text-slate-800">RM {requiredRetirementFund.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[11px] font-bold text-slate-500">UNJURAN DANA</span>
                      <span className="text-sm font-mono font-black text-emerald-600">RM {totalProjectedAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GAP PERSARAAN</span>
                        <span className={`text-lg font-mono font-black ${gap >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          RM {Math.abs(gap).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${gap >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                          style={{ width: `${Math.min(100, (totalProjectedAssets / requiredRetirementFund) * 100)}%` }} 
                        />
                      </div>
                      <p className={`mt-2 text-[9px] font-bold uppercase text-center ${gap >=0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                        {gap >= 0 ? 'Sasaran Berjaya Dicapai!' : 'Terdapat Kekurangan Dana.'}
                      </p>
                    </div>
                  </div>
               </div>

               <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-xl flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Info size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-tight mb-1">Nasihat Pakar</h4>
                    <p className="text-[11px] leading-relaxed text-blue-100 font-medium">
                      {gap < 0 
                        ? `Anda mempunyai kekurangan sebanyak RM ${Math.abs(gap).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Pertimbangkan untuk meningkatkan simpanan bulanan atau mencari pelaburan dengan ROI yang lebih tinggi.`
                        : `Tahniah! Unjuran aset anda mencukupi untuk persaraan. Teruskan memantau inflasi dan pastikan gaya hidup anda kekal dalam bajet.`
                      }
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('summary')}
                    className="w-full bg-white text-blue-600 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-colors"
                  >
                    Kemas Kini Aset
                  </button>
               </div>
            </div>
          </div>

          {/* Asset Projection Cards Grouped by Category */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-600" />
                UNJURAN DANA PERSARAAN (MODUL 4)
              </h3>
            </div>
            
            <div className="p-6 space-y-10">
              {categoriesFound.map(category => {
                const items = assetProjections.filter(i => (i.category || '').toLowerCase() === category.toLowerCase());
                if (items.length === 0) return null;
                return (
                  <div key={category} className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-0.5 rounded w-fit border border-slate-100">{category}</h4>
                    <div className="space-y-3">
                      {items.map(asset => (
                        <ProjectionAssetCard 
                          key={asset.id} 
                          asset={asset} 
                          yearsToRetirement={yearsToRetirement} 
                          onToggle={() => toggleAssetExclusion(asset.id!)}
                          onRoiChange={(roi) => handleUpdateAssetRoi(asset.id!, roi)}
                          onNavigate={() => switchTab && switchTab('networth')}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {assetProjections.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                  <Landmark className="mx-auto text-slate-200 mb-2" size={32} />
                  <p className="text-slate-400 text-[10px] italic">Tiada aset pelaburan (bercaj) dikesan di Net Worth.</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-100 border-t border-slate-200">
               <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                 <div className="flex gap-10">
                    <div className="text-center md:text-left">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">JUMLAH DANA SEKARANG (BERTANDA)</p>
                      <p className="text-xl font-mono font-black text-slate-800">
                        RM {assetProjections.filter(i => !i.isExcluded).reduce((acc, i) => acc + (i.value || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center md:text-left border-l border-slate-200 pl-10">
                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">UNJURAN DANA PADA {rSettings.targetAge} TAHUN</p>
                      <p className="text-xl font-mono font-black text-blue-600">
                        RM {totalProjectedAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                 </div>
                 
                 <button 
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-50"
                 >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Simpan Unjuran ROI
                 </button>
               </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-amber-50 px-6 py-4 border-b border-amber-200 flex items-center justify-between">
              <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={16} />
                KESIMPULAN GAP PERSARAAN
              </h3>
            </div>
            <div className="p-8 flex flex-col md:flex-row items-center justify-around gap-8 text-center">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DANA PERSARAAN SEBENAR</p>
                  <p className="text-2xl font-mono font-black text-slate-800">RM {requiredRetirementFund.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <ArrowRight size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UNJURAN DANA AKAN DATANG</p>
                  <p className="text-2xl font-mono font-black text-emerald-600">RM {totalProjectedAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 rotate-90 md:rotate-0">
                  <ArrowRight size={20} />
                </div>
                <div className="bg-white p-6 rounded-2xl border-4 border-slate-100 min-w-[200px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GAP</p>
                  <p className={`text-4xl font-mono font-black ${gap >= 0 ? 'text-emerald-500' : 'text-rose-500 underline underline-offset-8 decoration-rose-200'}`}>
                    RM {Math.abs(gap).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AssetRowProps {
  item: NetWorthItem;
  index?: string;
  onNavigate?: () => void;
  key?: string | number | null;
}

function AssetRow({ item, index, onNavigate }: AssetRowProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group relative">
      <div className="flex items-center gap-3">
        {index && (
          <div className="absolute -left-5 text-[8px] font-black text-slate-200">
            {index}
          </div>
        )}
        <button
          type="button"
          onClick={onNavigate}
          title="Buka modul Nilai Bersih (Net Worth) untuk menyunting aset ini"
          className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors cursor-pointer"
        >
          <ExternalLink size={18} />
        </button>
        <div>
          <p className="text-xs font-bold text-slate-700 leading-none">{item.name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono font-bold text-slate-800 leading-none mb-1.5">RM {item.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <div className="flex flex-wrap items-center gap-1.5 justify-end">
          {item.hasCharge && (
            <span className="flex items-center gap-0.5 text-[8px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-100">
               <ShieldCheck size={10} /> + CAJ / KOS
            </span>
          )}
          <span className={`text-[8px] font-black px-1 py-0.5 rounded border ${item.isLiquid ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
            {item.isLiquid ? 'CAIR' : 'FIXED'}
          </span>
        </div>
      </div>
    </div>
  );
}

interface ProjectionCardProps {
  asset: any;
  yearsToRetirement: number;
  onToggle: () => void;
  onRoiChange: (roi: number) => void;
  onNavigate?: () => void;
  key?: string | number | null;
}

function ProjectionAssetCard({ 
  asset, 
  yearsToRetirement, 
  onToggle, 
  onRoiChange,
  onNavigate
}: ProjectionCardProps) {
  return (
    <div className={`p-4 rounded-2xl bg-white border border-slate-100 transition-all group relative ${asset.isExcluded ? 'opacity-40 grayscale' : 'hover:border-blue-200 hover:shadow-md'}`}>
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Left Section: Action & info */}
        <div className="flex items-center gap-4 flex-1">
          {asset.isAutoExcluded ? (
            <div className="w-5 h-5 flex items-center justify-center">
              <ShieldCheck size={16} className="text-slate-400" />
            </div>
          ) : (
            <input 
              type="checkbox"
              checked={!asset.isExcluded}
              onChange={onToggle}
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition-all cursor-pointer"
            />
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onNavigate}
              title="Buka modul Nilai Bersih (Net Worth) untuk menyunting aset ini"
              className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors cursor-pointer"
            >
              <ExternalLink size={18} />
            </button>
            <div>
              <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
                {asset.name}
                {asset.isAutoExcluded && <span className="ml-2 text-[8px] text-blue-500 uppercase font-black">(DIKECUALIKAN - RUMAH SENDIRI)</span>}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${asset.isLiquid ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                  {asset.isLiquid ? 'CAIR' : 'FIXED'}
                </span>
                {asset.hasCharge && (
                  <span className="flex items-center gap-0.5 text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                     <ShieldCheck size={10} /> + CAJ / KOS
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Values & Inputs */}
        <div className="grid grid-cols-2 md:flex md:items-center gap-4 md:gap-8 justify-between md:justify-end">
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nilai Semasa</p>
            <p className="text-xs font-mono font-bold text-slate-700">RM {asset.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          
          <div className="text-right md:border-l border-slate-100 md:pl-8">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">ROI (%)</p>
            <div className="flex justify-end">
              <input 
                type="number" 
                step="0.5"
                disabled={asset.isExcluded}
                value={asset.roi}
                onChange={(e) => onRoiChange(parseFloat(e.target.value) || 0)}
                className="w-14 bg-slate-50 border border-slate-200 rounded-lg py-0.5 px-2 text-right text-xs font-mono font-bold text-blue-600 outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-30"
              />
            </div>
          </div>

          <div className="text-right border-l border-slate-100 pl-4 md:pl-8 col-span-2 md:col-span-1">
            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Nilai {yearsToRetirement} Thn</p>
            <p className="text-sm font-mono font-black text-slate-800">
              RM {asset.futureValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RetirementInput({ label, value, onChange, icon, suffix, disabled, tooltip }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        {tooltip && (
          <div className="group relative">
            <Info size={10} className="text-slate-300" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 font-medium">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <div className={`relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 ${disabled ? 'opacity-50' : 'group focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600'} transition-all`}>
        <div className="text-slate-300 group-focus-within:text-blue-500 transition-colors mr-3">
          {icon}
        </div>
        <NumericInput 
          disabled={disabled}
          value={value} 
          onChange={val => onChange?.(val)}
          className="bg-transparent text-sm font-mono font-bold text-slate-700 outline-none flex-1 truncate"
        />
        {suffix && <span className="text-[10px] font-bold text-slate-400 ml-2 uppercase shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function MetricCard({ label, value, subLabel, highlight }: { label: string, value: number, subLabel: string, highlight?: boolean }) {
  return (
    <div className={`p-5 rounded-2xl border ${highlight ? 'bg-white border-blue-100' : 'bg-slate-50/50 border-slate-100'}`}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-xl font-mono font-bold ${highlight ? 'text-blue-600' : 'text-slate-800'}`}>RM {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      <p className="text-[9px] text-slate-400 font-medium mt-1 uppercase tracking-tight">{subLabel}</p>
    </div>
  );
}
