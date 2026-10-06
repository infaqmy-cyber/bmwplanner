import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { ScrollText, CheckCircle2, Circle, AlertTriangle, ExternalLink, Landmark, ShieldCheck, Download, Save, Loader2, Info, Plus, Trash2, Heart, User, Users, ArrowRight, ChevronRight, PieChart as PieChartIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { netWorthService, protectionService, inheritanceSettingsService } from '../services';
import { NetWorthItem, Protection, InheritanceSettings } from '../types';
import { auth } from '../firebase';
import NumericInput from './NumericInput';

export default function InheritanceModule() {
  const { viewingUserId } = useApp();
  const [netWorthItems, setNetWorthItems] = useState<NetWorthItem[]>([]);
  const [protectionItems, setProtectionItems] = useState<Protection[]>([]);
  const [settings, setSettings] = useState<InheritanceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const userId = viewingUserId || auth.currentUser?.uid;
    if (!userId) return;

    const unsubNetWorth = netWorthService.subscribe(setNetWorthItems, userId);
    const unsubProtection = protectionService.subscribe(setProtectionItems, userId);
    const unsubSettings = inheritanceSettingsService.subscribe(data => {
      if (data.length > 0) {
        setSettings(data[0]);
      } else {
        const defaultSettings: InheritanceSettings = {
          userId,
          funeralCosts: { van: 0, grave: 0, others: 0, customItems: [] },
          debts: { zakat: 0, fidyah: 0, badalHaji: 0, customAllahDebts: [] },
          maritalPropertyPercentage: 50,
          wasiatWaqaf: { wasiat: 0, waqaf: 0, others: 0 },
          hibah: { takaful: 0, property: 0, others: 0 },
          heirs: {
            hasFather: false,
            hasMother: false,
            hasHusband: false,
            hasWife: false,
            sonCount: 0,
            daughterCount: 0,
            hasSiblings: false
          },
          hibahAssetIds: [],
          updatedAt: new Date().toISOString()
        };
        setSettings(defaultSettings);
      }
      setIsLoading(false);
    }, userId);

    return () => {
      unsubNetWorth();
      unsubProtection();
      unsubSettings();
    };
  }, [viewingUserId, auth.currentUser?.uid]);

  const handleUpdateSettings = (updates: Partial<InheritanceSettings>) => {
    setSettings(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const targetUid = viewingUserId || auth.currentUser?.uid || settings.userId;
      if (settings.id) {
        await inheritanceSettingsService.set(settings.id, { ...settings, userId: targetUid, updatedAt: new Date().toISOString() }, targetUid);
      } else {
        const newId = await inheritanceSettingsService.add({ ...settings, updatedAt: new Date().toISOString() }, targetUid);
        if (newId) {
          setSettings(prev => prev ? { ...prev, id: newId } : null);
        }
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const totalAssets = netWorthItems.filter(i => i.type === 'Asset').reduce((acc, i) => acc + (i.value || 0), 0);
  const totalLiabilities = netWorthItems.filter(i => i.type === 'Liability').reduce((acc, i) => acc + (i.value || 0), 0);
  const netWorthValue = totalAssets - totalLiabilities;

  const liabilityCovered = netWorthItems.filter(i => i.type === 'Liability' && i.hasCoverage).reduce((acc, i) => acc + (i.value || 0), 0);
  const totalDeathBenefit = protectionItems.reduce((acc, i) => acc + (i.deathBenefit || 0), 0);

  const ASSET_CATEGORY_ORDER = [
    'Bank dan akaun Simpanan',
    'Hartanah',
    'Saham, saham amanah, koperasi',
    'Emas, Perak & Logam Berharga',
    'AKAUN KWSP',
    'Sijil Takaful (Nilai Tunai)'
  ];

  const categorizedAssetsWithItems = useMemo(() => {
    const categories: { [key: string]: NetWorthItem[] } = {};
    netWorthItems.filter(i => i.type === 'Asset').forEach(item => {
      // Normalize category casing for matching but keep original for display
      const cat = item.category || 'AKAUN KWSP';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(item);
    });
    
    // Sort categories based on predefined order
    const sortedCategories: { [key: string]: NetWorthItem[] } = {};
    ASSET_CATEGORY_ORDER.forEach(orderedCat => {
      // Find the key in categories that matches orderedCat (case-insensitive)
      const matchingKey = Object.keys(categories).find(
        k => k.toLowerCase() === orderedCat.toLowerCase()
      );
      if (matchingKey) {
        sortedCategories[matchingKey] = categories[matchingKey];
      }
    });
    
    // Add any categories not in the predefined list at the end
    Object.keys(categories).forEach(cat => {
      const isInOrder = ASSET_CATEGORY_ORDER.some(
        orderedCat => orderedCat.toLowerCase() === cat.toLowerCase()
      );
      if (!isInOrder) {
        sortedCategories[cat] = categories[cat];
      }
    });

    return sortedCategories;
  }, [netWorthItems]);

  const hibahAssets = useMemo(() => {
    const assetIds = settings?.hibahAssetIds || [];
    return netWorthItems.filter(i => i.id && assetIds.includes(i.id));
  }, [netWorthItems, settings?.hibahAssetIds]);

  const hibahAssetsValue = hibahAssets.reduce((acc, i) => acc + (i.value || 0), 0);

  const liabilitiesList = useMemo(() => netWorthItems.filter(i => i.type === 'Liability'), [netWorthItems]);

  // Total Estate Value (Harta Pusaka Kasar)
  const estateGrossValue = totalAssets + totalDeathBenefit;
  
  // Hibah Deduction
  const autoHibahTakaful = protectionItems.reduce((acc, i) => {
    return acc + ((i.deathBenefit || 0) * (i.nominationHibahPercentage || 0) / 100);
  }, 0);

  const totalHibah = autoHibahTakaful + hibahAssetsValue;
  const estateResidual = estateGrossValue - totalHibah;

  // 1. Funeral Expenses
  const funeralCustomTotal = settings?.funeralCosts?.customItems?.reduce((acc, i) => acc + (i.value || 0), 0) || 0;
  const funeralTotal = (settings?.funeralCosts?.van || 0) + (settings?.funeralCosts?.grave || 0) + (settings?.funeralCosts?.others || 0) + funeralCustomTotal;
  const balanceAfterFuneral = estateResidual - funeralTotal;

  // 2. Debts
  const netLiabilities = totalLiabilities - liabilityCovered; // Human debts from Net Worth
  const allahCustomDebtsTotal = settings?.debts?.customAllahDebts?.reduce((acc, i) => acc + (i.value || 0), 0) || 0;
  const allahDebtTotal = (settings?.debts?.zakat || 0) + (settings?.debts?.fidyah || 0) + (settings?.debts?.badalHaji || 0) + allahCustomDebtsTotal;
  const debtTotal = netLiabilities + allahDebtTotal;
  const balanceAfterDebts = balanceAfterFuneral - debtTotal;

  // 3. Marital Property (Harta Sepencarian)
  const maritalAmount = (balanceAfterDebts * (settings?.maritalPropertyPercentage || 0)) / 100;
  const balanceAfterMarital = balanceAfterDebts - maritalAmount;

  // 4. Wasiat / Waqaf
  const wasiatWaqafTotal = (settings?.wasiatWaqaf?.wasiat || 0) + (settings?.wasiatWaqaf?.waqaf || 0) + (settings?.wasiatWaqaf?.others || 0);
  // Cap at 1/3
  const allowedWasiat = Math.min(wasiatWaqafTotal, balanceAfterMarital / 3);
  const balanceAfterWasiat = balanceAfterMarital - allowedWasiat;

  const faraidAmount = balanceAfterWasiat;

  const faraidResults = useMemo(() => {
    if (!settings || faraidAmount <= 0) return [];
    const { heirs } = settings;
    const { hasFather, hasMother, hasHusband, hasWife, sonCount, daughterCount, hasSiblings } = heirs;
    
    const hasDescendants = sonCount > 0 || daughterCount > 0;
    let totalFixedShare = 0;
    const distributions: { name: string; shareLabel: string; amount: number; type: 'fixed' | 'asabah' }[] = [];

    // 1. Spouses (Ashabul Furud)
    if (hasHusband) {
      const share = hasDescendants ? 1/4 : 1/2;
      distributions.push({ name: 'Suami', shareLabel: hasDescendants ? '1/4' : '1/2', amount: faraidAmount * share, type: 'fixed' });
      totalFixedShare += share;
    } else if (hasWife) {
      const share = hasDescendants ? 1/8 : 1/4;
      distributions.push({ name: 'Isteri', shareLabel: hasDescendants ? '1/8' : '1/4', amount: faraidAmount * share, type: 'fixed' });
      totalFixedShare += share;
    }

    // 2. Mother (Ashabul Furud)
    if (hasMother) {
      const share = (hasDescendants || hasSiblings) ? 1/6 : 1/3;
      distributions.push({ name: 'Ibu', shareLabel: (hasDescendants || hasSiblings) ? '1/6' : '1/3', amount: faraidAmount * share, type: 'fixed' });
      totalFixedShare += share;
    }

    // 3. Father (Ashabul Furud / Asabah)
    let fatherFixedShare = 0;
    if (hasFather) {
      if (sonCount > 0) {
        fatherFixedShare = 1/6;
        distributions.push({ name: 'Ayah', shareLabel: '1/6', amount: faraidAmount * fatherFixedShare, type: 'fixed' });
        totalFixedShare += fatherFixedShare;
      } else if (daughterCount > 0) {
        fatherFixedShare = 1/6;
        totalFixedShare += fatherFixedShare;
      } else {
        // Pure Asabah, handled later
      }
    }

    // 4. Daughters (Ashabul Furud - ONLY IF NO SONS)
    if (sonCount === 0 && daughterCount > 0) {
      const share = daughterCount === 1 ? 1/2 : 2/3;
      distributions.push({ name: `${daughterCount} Anak Perempuan`, shareLabel: daughterCount === 1 ? '1/2' : '2/3', amount: faraidAmount * share, type: 'fixed' });
      totalFixedShare += share;
    }

    // 5. Asabah (Residue)
    const remainderPercentage = Math.max(0, 1 - totalFixedShare);
    
    if (remainderPercentage > 0) {
      if (sonCount > 0) {
        // Sons and Daughters share remainder 2:1
        const totalPortions = (sonCount * 2) + (daughterCount * 1);
        if (sonCount > 0) {
          distributions.push({ 
            name: `${sonCount} Anak Lelaki`, 
            shareLabel: 'Asabah', 
            amount: faraidAmount * remainderPercentage * ((sonCount * 2) / totalPortions),
            type: 'asabah'
          });
        }
        if (daughterCount > 0) {
          distributions.push({ 
            name: `${daughterCount} Anak Perempuan`, 
            shareLabel: 'Asabah bi-Ghairihi', 
            amount: faraidAmount * remainderPercentage * ((daughterCount * 1) / totalPortions),
            type: 'asabah'
          });
        }
      } else if (hasFather) {
        // Father takes all residue (either as sole Asabah or 1/6 + Asabah)
        const totalFatherAmount = (faraidAmount * fatherFixedShare) + (faraidAmount * remainderPercentage);
        const label = daughterCount > 0 ? '1/6 + Asabah' : 'Asabah';
        distributions.push({ name: 'Ayah', shareLabel: label, amount: totalFatherAmount, type: 'asabah' });
      } else if (hasSiblings) {
        // Simplified: Siblings take residue if no father or sons
        distributions.push({ name: 'Adik-beradik', shareLabel: 'Asabah', amount: faraidAmount * remainderPercentage, type: 'asabah' });
      } else if (totalFixedShare < 1) {
        // Radd: Proportional return to other Furud (Simplified for this app)
        // Adjust existing distributions
        // In a real case, mother/daughters get Radd, but not spouse.
      }
    }

    return distributions;
  }, [settings, faraidAmount]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  if (isLoading) return <div className="p-20 text-center uppercase tracking-widest text-slate-400 font-bold">Memuatkan...</div>;

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Modul 7: PEWARISAN</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Perancangan pewarisan pusaka, wasiat, hibah dan faraidh</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-[#1A365D] text-white hover:bg-slate-800'
            }`}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {saveSuccess ? 'Tetapan Disimpan' : 'Simpan Tetapan'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Data Input & Breakdown */}
        <div className="lg:col-span-12 space-y-8">
          
          {/* Section 1: Net Worth Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/40 transition-all"
            >
              <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <Landmark size={18} className="text-slate-300" />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest">SENARAI ASET</h3>
                </div>
                <span className="text-[9px] font-bold opacity-50 tracking-tighter">MODUL 1 - NET WORTH</span>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <SummaryRow label="Total Aset" value={totalAssets} isBold highlight />
                  <div className="space-y-4">
                    {(Object.entries(categorizedAssetsWithItems) as [string, NetWorthItem[]][]).map(([cat, items], catIdx) => (
                      <div key={cat} className="animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="flex justify-between items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-300">{catIdx + 1}.</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{cat}</span>
                          </div>
                          <span className="text-[10px] font-mono font-black text-slate-600">RM {items.reduce((a, b) => a + (b.value || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="pl-6 space-y-1.5 border-l border-slate-100 ml-2">
                          {items.map((item, itemIdx) => {
                            const isHibah = settings?.hibahAssetIds?.includes(item.id!);
                            return (
                              <div key={item.id} className="flex justify-between items-center group/item p-1.5 hover:bg-slate-50 rounded-xl transition-colors relative">
                                <div className="absolute -left-5 text-[8px] font-black text-slate-200">
                                  {catIdx + 1}.{itemIdx + 1}
                                </div>
                                <div className="flex flex-col">
                                  <span className={`text-[10px] font-bold uppercase ${isHibah ? 'text-rose-600' : 'text-slate-600'}`}>{item.name}</span>
                                  {isHibah && <span className="text-[7px] font-black text-rose-400 uppercase leading-none mt-0.5">Harta Telah Dihibahkan</span>}
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className={`font-mono text-[10px] font-bold ${isHibah ? 'text-rose-500' : 'text-slate-500'}`}>RM {item.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  <div className="flex items-center gap-2 group/hibah">
                                    <span className={`text-[8px] font-black uppercase transition-all ${isHibah ? 'text-rose-500 translate-x-0 opacity-100' : 'text-slate-300 opacity-0 -translate-x-1 group-hover/hibah:opacity-100 group-hover/hibah:translate-x-0'}`}>
                                      Hibah
                                    </span>
                                    <button
                                      onClick={() => {
                                        const currentIds = settings?.hibahAssetIds || [];
                                        const newIds = isHibah 
                                          ? currentIds.filter(id => id !== item.id)
                                          : [...currentIds, item.id!];
                                        handleUpdateSettings({ hibahAssetIds: newIds });
                                      }}
                                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all border-2 ${isHibah ? 'bg-rose-500 border-rose-500 shadow-lg shadow-rose-200' : 'bg-white border-slate-100 group-hover/hibah:border-rose-100'}`}
                                      title={isHibah ? "Batal Hibah" : "Hibahkan Harta"}
                                    >
                                      {isHibah ? (
                                        <Heart size={12} className="text-white fill-white animate-pulse" />
                                      ) : (
                                        <Heart size={12} className="text-slate-200 group-hover/hibah:text-rose-300 transition-colors" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {Object.keys(categorizedAssetsWithItems).length === 0 && (
                      <p className="text-[9px] text-slate-300 italic pl-4">Tiada rekod aset dikesan.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/40 transition-all"
            >
              <div className="bg-emerald-700 text-white px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <ShieldCheck size={18} className="text-emerald-200" />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest">MANFAAT TAKAFUL KEMATIAN</h3>
                </div>
                <span className="text-[9px] font-bold opacity-50 tracking-tighter">MODUL 2 - PERLINDUNGAN</span>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-3">
                  <SummaryRow label="Jumlah Pampasan Kematian" value={totalDeathBenefit} isBold />
                  <div className="pl-4 space-y-3 border-l-2 border-slate-50">
                    {protectionItems.map((item, idx) => (
                      <div key={item.id} className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex justify-between items-center text-[10px] uppercase font-bold text-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="w-4 shrink-0 text-[10px] font-black text-slate-300">{idx + 1}.</div>
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          <div>
                            <p className="text-emerald-800">{item.policyName}</p>
                            <p className="text-[8px] text-slate-400 font-black">{item.company || 'Penyedia Takaful'}</p>
                            <div className="flex gap-2 mt-1">
                              <span className="text-[7px] bg-slate-100 text-slate-500 px-1 rounded">Biasa: {item.nominationNormalPercentage || 0}%</span>
                              <span className="text-[7px] bg-emerald-100 text-emerald-600 px-1 rounded">Hibah: {item.nominationHibahPercentage || 0}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-emerald-600">RM {item.deathBenefit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    ))}
                    {protectionItems.length === 0 && (
                      <p className="text-[9px] text-slate-300 italic pl-4">Tiada polisi dikesan dalam Modul Protection.</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-emerald-800">
                  <SummaryRow label="JUMLAH HARTA PUSAKA KASAR" value={estateGrossValue} isBold highlight />
                </div>
              </div>
            </motion.div>
          </div>

          {/* New Section: HIBAH */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 bg-white rounded-3xl border border-rose-100 overflow-hidden shadow-xl shadow-rose-200/20"
          >
            <div className="bg-rose-600 text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Plus size={18} className="text-rose-100" />
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-widest">TOLAKAN HIBAH</h3>
              </div>
              <span className="text-[9px] font-bold opacity-50 tracking-tighter">PEMBERIAN SEMASA HIDUP</span>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                  RINGKASAN HIBAH
                </h4>
                <div className="space-y-3">
                  <OutputRow 
                    label="Hibah Takaful (Modul 2)" 
                    value={autoHibahTakaful} 
                    sublabel="* Autofill: Berdasarkan penamaan hibah setiap sijil"
                  />

                  {hibahAssets.map(asset => (
                    <div key={asset.id} className="animate-in slide-in-from-top-1 duration-200">
                       <OutputRow 
                        label={`Hibah ${asset.name}`} 
                        value={asset.value || 0} 
                        sublabel={`* Autofill: Aset ${asset.category}`}
                      />
                    </div>
                  ))}

                  {hibahAssets.length === 0 && autoHibahTakaful === 0 && (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                      <Heart size={24} className="mx-auto text-slate-200 mb-2" />
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Tiada hibah dikesan</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col justify-center items-center text-center space-y-4 bg-rose-50 rounded-3xl p-6 border border-rose-100">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm text-rose-500">
                  <Heart size={32} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Total Hibah Dikecualikan</p>
                  <p className="text-3xl font-mono font-black text-rose-600">RM {totalHibah.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="pt-4 border-t border-rose-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                    * Hibah tidak tertakluk kepada Faraid dan tidak termasuk dalam pengurusan pusaka.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-900 text-white px-8 py-5 flex justify-between items-center">
               <div className="flex items-center gap-3">
                 <ArrowRight size={20} className="text-emerald-400" />
                 <span className="text-[11px] font-black uppercase tracking-widest">BAKI HARTA UNTUK TERTIB PENGURUSAN PUSAKA</span>
               </div>
               <span className="text-2xl font-mono font-black text-emerald-400">RM {estateResidual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </motion.div>

          <div className="bg-[#1A365D] text-white p-3 rounded-lg text-center shadow-lg">
            <h2 className="text-sm font-black uppercase tracking-[0.3em]">PENGURUSAN PUSAKA</h2>
          </div>

          {/* ESTATE DISTRIBUTION ORDER */}
          <div className="relative space-y-12">
            {/* Step Connection Line */}
            <div className="absolute left-6 top-8 bottom-8 w-px bg-slate-100 hidden md:block" />

            {/* 1. Funeral Expenses */}
            <DistributionSection
              step={1}
              title="KOS KHAIRAT KEMATIAN"
              description="Perbelanjaan pertama yang wajib diselesaikan sebelum hutang atau wasiat."
              baki={balanceAfterFuneral}
              icon={<Heart size={16} className="text-rose-500" />}
            >
              <InputRow 
                label="Van Jenazah" 
                value={settings?.funeralCosts?.van} 
                onChange={v => handleUpdateSettings({ funeralCosts: { ...(settings?.funeralCosts || { van: 0, grave: 0, others: 0, customItems: [] }), van: v } })} 
              />
              <InputRow 
                label="Kubur" 
                value={settings?.funeralCosts?.grave} 
                onChange={v => handleUpdateSettings({ funeralCosts: { ...(settings?.funeralCosts || { van: 0, grave: 0, others: 0, customItems: [] }), grave: v } })} 
              />
              <InputRow 
                label="Lain-lain" 
                value={settings?.funeralCosts?.others} 
                onChange={v => handleUpdateSettings({ funeralCosts: { ...(settings?.funeralCosts || { van: 0, grave: 0, others: 0, customItems: [] }), others: v } })} 
              />
              
              {settings?.funeralCosts?.customItems?.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-2 gap-4 items-center pl-4 py-1 border-l-2 border-slate-100">
                  <input
                    type="text"
                    value={item.label}
                    onChange={e => {
                      const customItems = [...(settings?.funeralCosts?.customItems || [])];
                      customItems[idx].label = e.target.value;
                      handleUpdateSettings({ funeralCosts: { ...(settings?.funeralCosts || { van: 0, grave: 0, others: 0, customItems: [] }), customItems } });
                    }}
                    placeholder="Nama Item..."
                    className="bg-transparent text-[11px] font-bold text-slate-700 outline-none uppercase pb-1 border-b border-transparent focus:border-slate-300"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400">RM</span>
                    <NumericInput
                      value={item.value || 0}
                      onChange={val => {
                        const customItems = [...(settings?.funeralCosts?.customItems || [])];
                        customItems[idx].value = val;
                        handleUpdateSettings({ funeralCosts: { ...(settings?.funeralCosts || { van: 0, grave: 0, others: 0, customItems: [] }), customItems } });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none"
                    />
                    <button 
                      onClick={() => {
                        const customItems = (settings?.funeralCosts?.customItems || []).filter((_, i) => i !== idx);
                        handleUpdateSettings({ funeralCosts: { ...(settings?.funeralCosts || { van: 0, grave: 0, others: 0, customItems: [] }), customItems } });
                      }}
                      className="text-slate-300 hover:text-rose-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => {
                  const customItems = [...(settings?.funeralCosts?.customItems || []), { id: Math.random().toString(36).substr(2, 9), label: '', value: 0 }];
                  handleUpdateSettings({ funeralCosts: { ...(settings?.funeralCosts || { van: 0, grave: 0, others: 0, customItems: [] }), customItems } });
                }}
                className="text-[9px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1 hover:underline mt-2"
              >
                <Plus size={12} /> TAMBAH ITEM BARU
              </button>
            </DistributionSection>

            {/* 2. Debts */}
            <DistributionSection
              step={2}
              title="PENGURUSAN HUTANG"
              description="Hutang kepada Allah (Zakat, Haji) dan hutang sesama manusia."
              baki={balanceAfterDebts}
              icon={<ShieldCheck size={16} className="text-blue-500" />}
            >
              <div className="space-y-4">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded w-fit border border-slate-100">
                  HUTANG DENGAN MANUSIA
                </h4>
                <div className="space-y-2">
                  {liabilitiesList.map(item => (
                    <div key={item.id} className="grid grid-cols-2 gap-4 items-center pl-4 py-1 border-l-2 border-slate-100 opacity-80">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-700 uppercase">{item.name}</span>
                        {item.hasCoverage && (
                          <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ring-1 ring-emerald-200">
                            Covered
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-[10px] font-mono text-slate-400">RM</span>
                        <span className={`text-xs font-mono font-bold ${item.hasCoverage ? 'text-slate-300 line-through' : 'text-slate-800'}`}>
                          {item.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {liabilitiesList.length === 0 && (
                    <p className="text-[10px] text-slate-400 italic pl-4">Tiada hutang dikesan dalam Net Worth.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded w-fit border border-slate-100">
                  HUTANG DENGAN ALLAH
                </h4>
                <div className="space-y-3">
                  <InputRow 
                    label="Hutang Zakat" 
                    value={settings?.debts?.zakat} 
                    onChange={v => handleUpdateSettings({ debts: { ...(settings?.debts || { zakat: 0, fidyah: 0, badalHaji: 0, customAllahDebts: [] }), zakat: v } })} 
                  />
                  <InputRow 
                    label="Hutang Fidyah Puasa" 
                    value={settings?.debts?.fidyah} 
                    onChange={v => handleUpdateSettings({ debts: { ...(settings?.debts || { zakat: 0, fidyah: 0, badalHaji: 0, customAllahDebts: [] }), fidyah: v } })} 
                  />
                  <InputRow 
                    label="Badal Haji" 
                    value={settings?.debts?.badalHaji} 
                    onChange={v => handleUpdateSettings({ debts: { ...(settings?.debts || { zakat: 0, fidyah: 0, badalHaji: 0, customAllahDebts: [] }), badalHaji: v } })} 
                  />
                  
                  {settings?.debts?.customAllahDebts?.map((debt, idx) => (
                    <div key={debt.id} className="grid grid-cols-2 gap-4 items-center pl-4 py-1 border-l-2 border-slate-100 animate-in slide-in-from-top-1 duration-200">
                      <input
                        type="text"
                        value={debt.label}
                        onChange={e => {
                          const customAllahDebts = [...(settings?.debts?.customAllahDebts || [])];
                          customAllahDebts[idx].label = e.target.value;
                          handleUpdateSettings({ debts: { ...(settings?.debts || { zakat: 0, fidyah: 0, badalHaji: 0, customAllahDebts: [] }), customAllahDebts } });
                        }}
                        placeholder="Hutang Lain..."
                        className="bg-transparent text-[11px] font-bold text-slate-700 outline-none uppercase pb-1 border-b border-transparent focus:border-slate-300"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">RM</span>
                        <NumericInput
                          value={debt.value || 0}
                          onChange={val => {
                            const customAllahDebts = [...(settings?.debts?.customAllahDebts || [])];
                            customAllahDebts[idx].value = val;
                            handleUpdateSettings({ debts: { ...(settings?.debts || { zakat: 0, fidyah: 0, badalHaji: 0, customAllahDebts: [] }), customAllahDebts } });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-100"
                        />
                        <button 
                          onClick={() => {
                            const customAllahDebts = (settings?.debts?.customAllahDebts || []).filter((_, i) => i !== idx);
                            handleUpdateSettings({ debts: { ...(settings?.debts || { zakat: 0, fidyah: 0, badalHaji: 0, customAllahDebts: [] }), customAllahDebts } });
                          }}
                          className="text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => {
                      const customAllahDebts = [...(settings?.debts?.customAllahDebts || []), { id: Math.random().toString(36).substr(2, 9), label: '', value: 0 }];
                      handleUpdateSettings({ debts: { ...(settings?.debts || { zakat: 0, fidyah: 0, badalHaji: 0, customAllahDebts: [] }), customAllahDebts } });
                    }}
                    className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline mt-2 ml-4"
                  >
                    <Plus size={12} /> TAMBAH HUTANG LAIN
                  </button>
                </div>
              </div>
            </DistributionSection>

            {/* 3. Harta Sepencarian */}
            <DistributionSection
              step={3}
              title="HARTA SEPENCARIAN"
              description="Tuntutan pasangan ke atas harta yang diperoleh bersama sepanjang tempoh perkahwinan."
              baki={balanceAfterMarital}
              icon={<Users size={16} className="text-emerald-500" />}
            >
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Peratus Bahagian Pasangan</p>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="5"
                      value={settings?.maritalPropertyPercentage || 0}
                      onChange={e => handleUpdateSettings({ maritalPropertyPercentage: parseInt(e.target.value) })}
                      className="w-48 accent-emerald-500"
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-mono font-black text-emerald-600">{settings?.maritalPropertyPercentage}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center px-4">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Jumlah Harta Sepencarian</span>
                  <span className="text-sm font-mono font-black text-rose-500">RM ({maritalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                </div>
              </div>
            </DistributionSection>

            {/* 4. Wasiat Waqaf */}
            <DistributionSection
              step={4}
              title="WASIAT WAQAF (Maksima 1/3)"
              description="Pemberian kepada bukan waris atau tujuan kebajikan."
              baki={balanceAfterWasiat}
              icon={<ScrollText size={16} className="text-amber-500" />}
            >
              <InputRow 
                label="Wasiat" 
                value={settings?.wasiatWaqaf?.wasiat} 
                onChange={v => handleUpdateSettings({ wasiatWaqaf: { ...(settings?.wasiatWaqaf || { wasiat: 0, waqaf: 0, others: 0 }), wasiat: v } })} 
              />
              <InputRow 
                label="Waqaf" 
                value={settings?.wasiatWaqaf?.waqaf} 
                onChange={v => handleUpdateSettings({ wasiatWaqaf: { ...(settings?.wasiatWaqaf || { wasiat: 0, waqaf: 0, others: 0 }), waqaf: v } })} 
              />
              <InputRow 
                label="Lain-lain" 
                value={settings?.wasiatWaqaf?.others} 
                onChange={v => handleUpdateSettings({ wasiatWaqaf: { ...(settings?.wasiatWaqaf || { wasiat: 0, waqaf: 0, others: 0 }), others: v } })} 
              />
              {wasiatWaqafTotal > (balanceAfterMarital / 3) && (
                <div className="mt-4 p-3 bg-rose-50 rounded-lg border border-rose-100 flex items-center gap-3">
                  <AlertTriangle size={16} className="text-rose-500 shrink-0" />
                  <p className="text-[10px] text-rose-700 font-bold leading-tight">
                    AMARAN: Jumlah Wasiat & Waqaf melebihi 1/3 baki harta bersih (RM {(balanceAfterMarital / 3).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Mengikut syarak, masa 1/3 sahaja dibenarkan kecuali dipersetujui semua waris.
                  </p>
                </div>
              )}
            </DistributionSection>

            {/* 5. Faraid */}
            <div className="relative pl-0 md:pl-12 group">
              <div className="absolute left-[22px] top-6 w-3 h-3 rounded-full bg-indigo-600 border-4 border-white shadow-sm ring-4 ring-indigo-50 hidden md:block" />
              
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50">
                <div className="bg-gradient-to-r from-[#1A365D] to-[#2c5282] text-white px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <PieChartIcon size={20} className="text-indigo-200" />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-100">Langkah 5</h3>
                      <h2 className="text-lg font-black uppercase tracking-tight">PEMBAHAGIAN FARAID</h2>
                    </div>
                  </div>
                  <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-right">
                    <p className="text-[9px] font-black text-indigo-200 uppercase mb-0.5 tracking-widest">Harta Untuk Faraid</p>
                    <p className="text-2xl font-mono font-black text-emerald-400">RM {faraidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
                
                <div className="p-8 grid grid-cols-1 xl:grid-cols-12 gap-12">
                  <div className="xl:col-span-4 space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Users size={12} /> SENARAI AHLI WARIS
                      </h4>
                      <div className="grid grid-cols-1 gap-2.5">
                        <HeirToggle label="Ayah" checked={settings?.heirs?.hasFather} onChange={v => handleUpdateSettings({ heirs: { ...(settings?.heirs || { hasFather: false, hasMother: false, hasHusband: false, hasWife: false, sonCount: 0, daughterCount: 0, hasSiblings: false }), hasFather: v } })} />
                        <HeirToggle label="Ibu" checked={settings?.heirs?.hasMother} onChange={v => handleUpdateSettings({ heirs: { ...(settings?.heirs || { hasFather: false, hasMother: false, hasHusband: false, hasWife: false, sonCount: 0, daughterCount: 0, hasSiblings: false }), hasMother: v } })} />
                        <HeirToggle label="Suami" checked={settings?.heirs?.hasHusband} onChange={v => handleUpdateSettings({ heirs: { ...(settings?.heirs || { hasFather: false, hasMother: false, hasHusband: false, hasWife: false, sonCount: 0, daughterCount: 0, hasSiblings: false }), hasHusband: v } })} />
                        <HeirToggle label="Isteri" checked={settings?.heirs?.hasWife} onChange={v => handleUpdateSettings({ heirs: { ...(settings?.heirs || { hasFather: false, hasMother: false, hasHusband: false, hasWife: false, sonCount: 0, daughterCount: 0, hasSiblings: false }), hasWife: v } })} />
                        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bilangan Anak</label>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-slate-500 uppercase block ml-1 text-center">Lelaki</span>
                              <div className="flex items-center gap-3 justify-center">
                                <button onClick={() => handleUpdateSettings({ heirs: { ...(settings?.heirs || { hasFather: false, hasMother: false, hasHusband: false, hasWife: false, sonCount: 0, daughterCount: 0, hasSiblings: false }), sonCount: Math.max(0, (settings?.heirs?.sonCount || 0) - 1) } })} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-indigo-200 transition-colors shadow-sm">-</button>
                                <span className="text-sm font-mono font-black w-4 text-center">{settings?.heirs?.sonCount || 0}</span>
                                <button onClick={() => handleUpdateSettings({ heirs: { ...(settings?.heirs || { hasFather: false, hasMother: false, hasHusband: false, hasWife: false, sonCount: 0, daughterCount: 0, hasSiblings: false }), sonCount: (settings?.heirs?.sonCount || 0) + 1 } })} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-indigo-200 transition-colors shadow-sm">+</button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-slate-500 uppercase block ml-1 text-center">Puan</span>
                              <div className="flex items-center gap-3 justify-center">
                                <button onClick={() => handleUpdateSettings({ heirs: { ...(settings?.heirs || { hasFather: false, hasMother: false, hasHusband: false, hasWife: false, sonCount: 0, daughterCount: 0, hasSiblings: false }), daughterCount: Math.max(0, (settings?.heirs?.daughterCount || 0) - 1) } })} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-indigo-200 transition-colors shadow-sm">-</button>
                                <span className="text-sm font-mono font-black w-4 text-center">{settings?.heirs?.daughterCount || 0}</span>
                                <button onClick={() => handleUpdateSettings({ heirs: { ...(settings?.heirs || { hasFather: false, hasMother: false, hasHusband: false, hasWife: false, sonCount: 0, daughterCount: 0, hasSiblings: false }), daughterCount: (settings?.heirs?.daughterCount || 0) + 1 } })} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-indigo-200 transition-colors shadow-sm">+</button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <HeirToggle label="Adik-beradik" checked={settings?.heirs?.hasSiblings} onChange={v => handleUpdateSettings({ heirs: { ...(settings?.heirs || { hasFather: false, hasMother: false, hasHusband: false, hasWife: false, sonCount: 0, daughterCount: 0, hasSiblings: false }), hasSiblings: v } })} />
                      </div>
                    </div>
                  </div>

                  <div className="xl:col-span-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                          <ChevronRight size={12} /> HASIL PEMBAHAGIAN
                        </h4>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {faraidResults.length > 0 ? (
                            faraidResults.map((res, idx) => (
                              <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={res.name} 
                                className="group flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-white hover:shadow-lg hover:shadow-indigo-500/5 transition-all"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                  <div>
                                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{res.name}</p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase">{res.shareLabel}</span>
                                      <span className={`text-[8px] font-black px-1.5 rounded-full ${res.type === 'fixed' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {res.type.toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-mono font-black text-slate-700">RM {res.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                  <p className="text-[8px] font-bold text-slate-300 uppercase">Amaun</p>
                                </div>
                              </motion.div>
                            ))
                          ) : (
                            <div className="bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-3xl py-16 text-center">
                              <User size={32} className="mx-auto text-slate-200 mb-3" />
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sila pilih ahli waris untuk pengiraan</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="h-[300px] flex flex-col items-center justify-center">
                        {faraidResults.length > 0 ? (
                          <div className="w-full h-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={faraidResults}
                                  dataKey="amount"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={100}
                                  paddingAngle={5}
                                  animationDuration={1000}
                                  stroke="none"
                                >
                                  {faraidResults.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <RechartsTooltip 
                                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: '800' }}
                                  formatter={(value: number) => [`RM ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Harta']}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="w-48 h-48 rounded-full border-8 border-slate-50 flex items-center justify-center">
                            <PieChartIcon size={40} className="text-slate-100" />
                          </div>
                        )}
                      </div>
                    </div>

                    {faraidResults.length > 0 && (
                      <div className="mt-10 p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
                          <Info size={20} className="text-indigo-600" />
                        </div>
                        <div>
                          <h5 className="text-[10px] font-black text-indigo-900 uppercase mb-1.5 tracking-wider">Penting: Dasar Pengiraan Faraid</h5>
                          <p className="text-[11px] text-indigo-700/80 leading-relaxed font-medium italic">
                            "Pembahagian ini adalah mengikut hukum Syarak (Faraid) berdasarkan Mazhab Syafi'i. Pengiraan di atas hanyalah simulasi berdasarkan input waris utama. Untuk urusan rasmi, sila rujuk Mahkamah Syariah atau pakar perundangan Islam."
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-16 right-6 z-50 md:bottom-20 md:right-10 print:hidden">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-4 rounded-full font-black text-xs md:text-sm uppercase tracking-wider transition-all shadow-[0_10px_30px_rgba(16,185,129,0.4)] hover:shadow-[0_15px_35px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 ring-4 ring-emerald-500/20 ${
            saveSuccess 
              ? 'bg-emerald-600 text-white' 
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
          }`}
          title="Simpan Tetapan Pewarisan"
          id="btn-floating-save-inheritance"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
          <span>{saveSuccess ? 'Tetapan Disimpan' : 'Simpan Tetapan'}</span>
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, isNegative, isBold, highlight }: { label: string, value: number, isNegative?: boolean, isBold?: boolean, highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${isBold ? 'py-1' : ''}`}>
      <span className={`text-[11px] uppercase tracking-tight ${isBold ? 'font-black text-slate-800' : 'font-bold text-slate-500'}`}>{label}</span>
      <span className={`font-mono ${isBold ? 'text-sm font-black' : 'text-xs font-bold'} ${isNegative ? 'text-rose-500' : highlight ? 'text-emerald-600' : 'text-slate-700'}`}>
        RM {isNegative ? '(' : ''}{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{isNegative ? ')' : ''}
      </span>
    </div>
  );
}

function DistributionSection({ step, title, description, baki, children, icon }: { step: number, title: string, description?: string, baki: number, children: React.ReactNode, icon: React.ReactNode }) {
  return (
    <div className="relative pl-0 md:pl-12 group">
      {/* Circle Step indicator for desktop */}
      <div className="absolute left-[22px] top-6 w-3 h-3 rounded-full bg-slate-200 border-4 border-white shadow-sm ring-0 group-hover:ring-4 group-hover:ring-slate-100 transition-all hidden md:block" />
      
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm transition-transform group-hover:scale-110 duration-500">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Langkah {step}</span>
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800">
                {title}
              </h3>
            </div>
          </div>
          {description && (
            <p className="max-w-xs text-[9px] text-slate-400 font-bold uppercase leading-tight md:text-right italic">
              {description}
            </p>
          )}
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {children}
          </div>
          <div className="pt-6 border-t border-slate-100 flex justify-between items-center group/footer">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                Baki Harta <ArrowRight size={12} className="text-slate-300" />
              </span>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Anggaran Baki Semasa</p>
              <p className="text-xl font-mono font-black text-slate-800 group-hover/footer:text-emerald-600 transition-colors">RM {baki.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OutputRow({ label, value, sublabel }: { label: string, value: number, sublabel?: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 items-center pl-4 py-1 border-l-2 border-emerald-300 bg-emerald-50/20 rounded-r-xl">
      <div>
        <span className="text-[11px] font-black text-emerald-800 uppercase block">{label}</span>
        {sublabel && <p className="text-[8px] text-emerald-600 font-bold uppercase italic mt-0.5">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-emerald-400 font-bold">RM</span>
        <div className="w-full bg-white/50 border border-emerald-100 rounded px-3 py-1.5 text-xs font-mono font-black text-emerald-700">
          {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}

function InputRow({ label, value, onChange }: { label: string, value: any, onChange: (v: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 items-center pl-4 py-1 border-l-2 border-slate-100">
      <span className="text-[11px] font-bold text-slate-700 uppercase">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-slate-400">RM</span>
        <NumericInput
          value={value || 0}
          onChange={v => onChange(v)}
          className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-1 focus:ring-slate-400 transition-all"
          placeholder="0.00"
        />
      </div>
    </div>
  );
}

function HeirToggle({ label, checked, onChange }: { label: string, checked?: boolean, onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${checked ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' : 'bg-slate-50/50 border-slate-100 text-slate-500 hover:border-slate-200'}`}
    >
      <span className={`text-[11px] font-bold uppercase ${checked ? 'font-black' : ''}`}>{label}</span>
      {checked ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Circle size={18} className="text-slate-300" />}
    </button>
  );
}
