import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { 
  ShieldCheck, HeartPulse, ShieldAlert, Umbrella, Info, 
  ExternalLink, ChevronDown, ChevronUp, TrendingUp, 
  Save, Plus, Trash2, CheckCircle2, Heart,
  Skull, UserMinus, Ambulance, Activity, 
  Hospital, BedDouble, Wallet, Coins, Copy
} from 'lucide-react';
import { budgetService, protectionService, netWorthService } from '../services';
import { Protection, BudgetProfile, BudgetItem, NetWorthItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { useApp } from '../contexts/AppContext';
import NumericInput from './NumericInput';

export const parseNum = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export default function ProtectionModule() {
  const { viewingUserId } = useApp();
  const [budget, setBudget] = useState<BudgetProfile | null>(null);
  const [extraDetails, setExtraDetails] = useState<Protection[]>([]);
  const [netWorthItems, setNetWorthItems] = useState<NetWorthItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{[key: string]: boolean}>({});

  // Sub-tabs for Protection Module
  const [activeSubTab, setActiveSubTab] = useState<'sijil' | 'jurang' | 'hutang'>('sijil');
  const [yearsOfSupport, setYearsOfSupport] = useState<number>(10);
  const [expectedReturnRate, setExpectedReturnRate] = useState<number>(5.0);

  useEffect(() => {
    const userId = viewingUserId || auth.currentUser?.uid;
    if (!userId) return;

    const unsubBudget = budgetService.subscribe((profiles) => {
      if (profiles.length > 0) setBudget(profiles[0]);
    }, userId);
    const unsubExtra = protectionService.subscribe(setExtraDetails, userId);
    const unsubNetWorth = netWorthService.subscribe(setNetWorthItems, userId);
    
    return () => {
      unsubBudget();
      unsubExtra();
      unsubNetWorth();
    };
  }, [viewingUserId, auth.currentUser?.uid]);

  const takafulItems = (budget?.items.filter(i => i.subCategory === 'Protection') || []).sort((a, b) => {
    return (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base', numeric: true });
  });
  
  const getDetail = (itemId: string) => {
    return extraDetails.find(d => d.id === itemId);
  };

  const handleDetailChange = (itemId: string, updatedDetail: Protection) => {
    setExtraDetails(prev => {
      const idx = prev.findIndex(d => d.id === itemId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedDetail;
        return next;
      }
      return [...prev, updatedDetail];
    });
  };

  const handleItemChange = (itemId: string, updatedItem: BudgetItem) => {
    if (!budget) return;
    setBudget(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(i => i.id === itemId ? updatedItem : i)
      };
    });
  };

  const handleSaveAll = async (itemId: string, updatedItem: BudgetItem, updatedDetail: Protection): Promise<Protection | void> => {
    setSaveStatus(prev => ({ ...prev, [itemId]: true }));
    const targetUserId = viewingUserId || auth.currentUser?.uid || '';
    if (!targetUserId) return;

    try {
      // 1. Cleanly parse all numbers to guarantee numeric persistence across all sections
      const deathBenefit = parseNum(updatedDetail.deathBenefit);
      const disabilityBenefit = parseNum(updatedDetail.disabilityBenefit);
      const criticalIllness = parseNum(updatedDetail.criticalIllness);
      const medicalCardLimitAnnual = parseNum(updatedDetail.medicalCardLimitAnnual);
      const medicalCardLimitLifetime = parseNum(updatedDetail.medicalCardLimitLifetime);
      const roomAndBoard = parseNum(updatedDetail.roomAndBoard);
      const dailyAllowance = parseNum(updatedDetail.dailyAllowance);
      const medicalDeductibleAmount = parseNum(updatedDetail.medicalDeductibleAmount);
      const nominationNormalPercentage = parseNum(updatedDetail.nominationNormalPercentage);
      const nominationHibahPercentage = parseNum(updatedDetail.nominationHibahPercentage);
      const cashValueAmount = parseNum(updatedDetail.cashValueAmount);
      const premium = parseNum(updatedItem.monthly) || parseNum(updatedDetail.premium);

      const maxCoverage = Math.max(deathBenefit, disabilityBenefit, criticalIllness, parseNum(updatedDetail.coverageAmount));

      const detailToSave: Protection = {
        ...updatedDetail,
        id: itemId,
        userId: targetUserId,
        policyName: updatedDetail.policyName || updatedItem.label || 'Sijil Baru',
        premium,
        deathBenefit,
        disabilityBenefit,
        criticalIllness,
        disabilityType: updatedDetail.disabilityType || 'Additional',
        criticalIllnessType: updatedDetail.criticalIllnessType || 'Additional',
        coverageAmount: maxCoverage,
        medicalCardLimitAnnual,
        medicalCardLimitLifetime,
        roomAndBoard,
        dailyAllowance,
        medicalDeductibleAmount,
        nominationNormalPercentage,
        nominationHibahPercentage,
        cashValueAmount,
        hasCashValue: !!updatedDetail.hasCashValue,
        hasHospitalAllowance: !!updatedDetail.hasHospitalAllowance,
        hasWaiver: !!updatedDetail.hasWaiver,
      };

      // 2. Synchronously update local extraDetails state immediately for instant feedback
      setExtraDetails(prev => {
        const idx = prev.findIndex(d => d.id === itemId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = detailToSave;
          return next;
        }
        return [...prev, detailToSave];
      });

      const saves: Promise<any>[] = [];

      // 3. Update BudgetItem in budget profile
      if (budget && budget.id) {
        const updatedItems = budget.items.map(i => i.id === itemId ? updatedItem : i);
        saves.push(budgetService.set(budget.id, { 
          ...budget,
          items: updatedItems,
          lastUpdated: new Date().toISOString()
        }, targetUserId));
      }

      // 4. Persist to protectionService
      saves.push(protectionService.set(itemId, detailToSave, targetUserId));

      // 5. Sync with NetWorth Service (Aset Sijil Takaful Nilai Tunai)
      if (detailToSave.hasCashValue) {
        const netWorthId = `takaful-${itemId}`;
        const netWorthItemData = {
          id: netWorthId,
          userId: targetUserId,
          name: detailToSave.policyName || updatedItem.label || 'Sijil Takaful',
          type: 'Asset' as const,
          category: 'Sijil Takaful (Nilai Tunai)',
          value: cashValueAmount,
          isLiquid: false,
          hasCharge: true
        };
        saves.push(netWorthService.set(netWorthId, netWorthItemData, targetUserId));
      } else {
        saves.push(netWorthService.remove(`takaful-${itemId}`).catch(() => {}));
      }

      await Promise.all(saves);
      notifySave(itemId);
      return detailToSave;
    } catch (error) {
      console.error("Error saving protection record:", error);
      setSaveStatus(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleAddItem = async () => {
    if (!budget || !budget.id) return;
    const targetUserId = viewingUserId || auth.currentUser?.uid || '';
    if (!targetUserId) return;
    
    const id = Math.random().toString(36).substr(2, 9);
    const newItem: BudgetItem = {
      id,
      category: 'surplus',
      subCategory: 'Protection',
      label: 'Sijil Baru',
      monthly: 0,
      isCustom: true
    };

    const newProtection: Protection = {
      id,
      userId: targetUserId,
      policyName: 'Sijil Baru',
      premium: 0,
      premiumFrequency: 'Monthly',
      type: 'Life',
      coverageAmount: 0,
      deathBenefit: 0,
      disabilityBenefit: 0,
      criticalIllness: 0
    };

    // Update local state immediately
    setExtraDetails(prev => [...prev, newProtection]);

    // Save in Firestore atomically
    await Promise.all([
      protectionService.set(id, newProtection, targetUserId),
      budgetService.set(budget.id, {
        ...budget,
        items: [...budget.items, newItem],
        lastUpdated: new Date().toISOString()
      }, targetUserId)
    ]);
  };

  const handleDuplicateItem = async (sourceItem: BudgetItem, sourceDetail?: Protection) => {
    if (!budget || !budget.id) return;
    const targetUserId = viewingUserId || auth.currentUser?.uid || '';
    if (!targetUserId) return;

    const id = Math.random().toString(36).substr(2, 9);
    const newLabel = `${sourceItem.label} (Salinan)`;

    const newItem: BudgetItem = {
      ...sourceItem,
      id,
      label: newLabel,
      monthly: sourceItem.monthly || 0,
      isCustom: true
    };

    const newProtection: Protection = {
      ...(sourceDetail || {
        premium: sourceItem.monthly || 0,
        premiumFrequency: 'Monthly',
        type: 'Life',
        coverageAmount: 0,
        deathBenefit: 0,
        disabilityBenefit: 0,
        criticalIllness: 0
      }),
      id,
      userId: targetUserId,
      policyName: newLabel,
      otherBenefits: sourceDetail?.otherBenefits?.map(b => ({
        ...b,
        id: Math.random().toString(36).substr(2, 9)
      }))
    };

    // Update local state immediately
    setExtraDetails(prev => [...prev, newProtection]);
    setExpandedId(id);

    // Save in Firestore atomically
    await Promise.all([
      protectionService.set(id, newProtection, targetUserId),
      budgetService.set(budget.id, {
        ...budget,
        items: [...budget.items, newItem],
        lastUpdated: new Date().toISOString()
      }, targetUserId)
    ]);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!budget || !budget.id) return;
    const targetUserId = viewingUserId || auth.currentUser?.uid || '';
    if (!targetUserId) return;

    try {
      const updatedItems = budget.items.filter(i => i.id !== itemId);
      setExtraDetails(prev => prev.filter(i => i.id !== itemId));

      await Promise.all([
        budgetService.set(budget.id, {
          ...budget,
          items: updatedItems,
          lastUpdated: new Date().toISOString()
        }, targetUserId),
        protectionService.remove(itemId),
        netWorthService.remove(`takaful-${itemId}`).catch(() => {})
      ]);

      if (expandedId === itemId) setExpandedId(null);
    } catch (error) {
      console.error("Error deleting protection item:", error);
    }
  };

  const notifySave = (id: string) => {
    setSaveStatus(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, [id]: false }));
    }, 4000);
  };

  const totalDeathCoverage = extraDetails.reduce((acc, i) => acc + parseNum(i.deathBenefit), 0);
  const totalTPD = extraDetails.reduce((acc, i) => acc + parseNum(i.disabilityBenefit), 0);
  const totalCI = extraDetails.reduce((acc, i) => acc + parseNum(i.criticalIllness), 0);
  
  // Analysis calculations
  const incomeItems = budget?.items.filter(i => i.category === 'income') || [];
  const grossIncome = incomeItems.filter(i => i.subCategory !== 'deduction').reduce((acc, i) => acc + (i.monthly || 0), 0);
  const deductions = incomeItems.filter(i => i.subCategory === 'deduction').reduce((acc, i) => acc + (i.monthly || 0), 0);
  const monthlyIncome = grossIncome - deductions;
  
  const annualIncome = monthlyIncome * 12;
  const neededDeath = annualIncome * 10;
  const neededTPD = annualIncome * 10;
  const neededCI = annualIncome * 5;
  const totalPremiumAnnual = takafulItems.reduce((acc, item) => acc + (item.monthly || 0), 0) * 12;
  const neededPremiumAnnual = annualIncome * 0.1; // Standard 10% rule
  
  const allOtherBenefitLabels = Array.from(new Set(
    extraDetails.flatMap(d => (d.otherBenefits || []).map(b => b.label))
  )).filter(Boolean) as string[];

  // Income Protection Gap Analysis calculations
  const targetMonthlyIncome = monthlyIncome > 0 ? monthlyIncome : 0;
  const targetAnnualIncome = targetMonthlyIncome * 12;

  // Method 1: Capital Intact Method
  const pulanganDecimal = expectedReturnRate / 100;
  const requiredCapitalIntact = pulanganDecimal > 0 ? targetAnnualIncome / pulanganDecimal : 0;
  const shortfallCapitalIntact = Math.max(0, requiredCapitalIntact - totalDeathCoverage);

  // Method 2: Asset Liquidation Method - based on support years without taking into account reinvest aspect
  const requiredAssetLiquidation = targetAnnualIncome * yearsOfSupport;
  const shortfallAssetLiquidation = Math.max(0, requiredAssetLiquidation - totalDeathCoverage);

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Modul 4: PERLINDUNGAN</h1>
          <p className="text-xs text-slate-400 font-medium tracking-wider uppercase mt-1">Perlindungan takaful untuk income protection dan debt settlement</p>
        </div>
        {activeSubTab === 'sijil' && (
          <button 
            onClick={handleAddItem}
            className="flex items-center justify-center gap-2 bg-[#1A365D] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-tight hover:bg-slate-800 transition-all shadow-sm active:scale-95"
          >
            <Plus size={16} />
            Tambah Sijil
          </button>
        )}
      </header>

      {/* Sub-Tabs Selector */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveSubTab('sijil')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'sijil'
              ? 'border-[#1A365D] text-[#1A365D]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <ShieldCheck size={14} />
          Senarai Sijil
        </button>
        <button
          onClick={() => setActiveSubTab('jurang')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'jurang'
              ? 'border-[#1A365D] text-[#1A365D]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <TrendingUp size={14} />
          Income Protection
        </button>
        <button
          onClick={() => setActiveSubTab('hutang')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'hutang'
              ? 'border-[#1A365D] text-[#1A365D]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Wallet size={14} />
          Debt Settlement
        </button>
      </div>

      {activeSubTab === 'sijil' && (
        <>
          {/* Summary Card */}
          <div className="bg-[#1A365D] rounded-xl p-6 text-white grid grid-cols-1 md:grid-cols-2 gap-6 shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-1 text-center md:text-left">Manfaat Kematian (Terkumpul)</p>
              <div className="flex flex-col items-center md:items-start">
                <span className="text-2xl lg:text-3xl font-mono font-light tracking-tighter">RM {totalDeathCoverage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <p className="text-slate-400 text-[9px] mt-1 italic font-medium uppercase">Sasaran: 10x Pendapatan Tahunan (RM {neededDeath.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</p>
              </div>
            </div>
            <div className="relative z-10 border-slate-700 md:border-l md:pl-6">
              <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-1 text-center md:text-left">Status Caruman Tahunan</p>
              <div className="flex flex-col items-center md:items-start">
                <span className="text-2xl lg:text-3xl font-mono font-light tracking-tighter">RM {totalPremiumAnnual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <p className="text-slate-400 text-[9px] mt-1 italic font-medium uppercase">Total Premium Merentasi Semua Sijil</p>
              </div>
            </div>
            <ShieldCheck size={80} className="text-white/5 absolute -right-4 -bottom-4 opacity-20 hidden lg:block" />
          </div>

          {/* Policy List Linked to Cashflow */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Senarai Sijil (Tally dengan Aliran Tunai)</h2>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black border border-emerald-100">
                <Info size={10} /> SYNCED
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {takafulItems.length > 0 ? (
                takafulItems.map((item, idx) => (
                  <motion.div key={item.id} layout>
                    <PolicyAccordion 
                      index={idx + 1}
                      item={item} 
                      detail={getDetail(item.id)} 
                      isExpanded={expandedId === item.id}
                      onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      onSave={handleSaveAll}
                      onDetailChange={handleDetailChange}
                      onItemChange={handleItemChange}
                      onDelete={() => handleDeleteItem(item.id)}
                      onDuplicate={() => handleDuplicateItem(item, getDetail(item.id))}
                      isSaving={saveStatus[item.id]}
                    />
                  </motion.div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <p className="text-slate-400 text-xs italic">Tiada komitmen takaful dikesan.</p>
                  <p className="text-[9px] text-slate-300 font-black uppercase mt-1">Sila klik butang "Tambah Sijil" di atas untuk bermula</p>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Review Table (Image 3) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-[#1A365D] text-white px-5 py-3 flex items-center gap-2">
              <ShieldCheck size={16} />
              <h2 className="text-[10px] font-bold uppercase tracking-widest">Pemerhatian Sijil & Analisis Terperinci</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-black tracking-tighter uppercase whitespace-nowrap">
                  <tr className="z-30">
                    <th className="px-4 py-3 border-b border-t border-r border-slate-200 text-left w-[240px] min-w-[240px] bg-slate-100 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">PERKARA / MANFAAT</th>
                    <th className="px-4 py-3 border-b border-t border-r border-slate-200 text-center bg-emerald-100 text-emerald-900 w-[140px] min-w-[140px] sticky left-[240px] z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      JUMLAH<br/>
                      <span className="text-[8px] opacity-70 text-emerald-600">SELURUH</span>
                    </th>
                    {takafulItems.map((item, idx) => (
                      <th key={item.id} className="px-4 py-3 border-b border-t border-slate-200 text-center bg-yellow-50 text-yellow-900 min-w-[150px]">
                        SIJIL {idx + 1}<br/>
                        <span className="text-[8px] opacity-70">{extraDetails.find(d => d.id === item.id)?.policyName || item.label || 'TIDAK DINAMAKAN'}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <ReviewRow label="Jenis Sijil" field="type" items={takafulItems} details={extraDetails} />
                  <ReviewRow label="Syarikat Takaful" field="company" items={takafulItems} details={extraDetails} />
                  <ReviewRow label="Tahun Sijil" field="yearStarted" items={takafulItems} details={extraDetails} />
                  <ReviewRow label="Tempoh Matang" field="maturityPeriod" items={takafulItems} details={extraDetails} />
                  <ReviewRow 
                    label="Sumbangan Tahunan" 
                    icon={<Wallet size={10} className="text-slate-400" />}
                    isMoney 
                    valueFn={(item) => (item.monthly || 0) * 12} 
                    items={takafulItems} 
                    details={extraDetails} 
                    showTotal 
                  />
                  <ReviewRow 
                    label="Nilai Tunai" 
                    icon={<Coins size={10} className="text-amber-500" />}
                    isMoney 
                    valueFn={(item) => {
                      const d = extraDetails.find(det => det.id === item.id);
                      if (!d?.hasCashValue) return '-';
                      return d.cashValueAmount || 0;
                    }} 
                    items={takafulItems} 
                    details={extraDetails} 
                    showTotal 
                  />
                  
                  <tr className="bg-slate-50/50 group">
                    <td className="px-4 py-2 font-black text-slate-800 border-y border-slate-200 uppercase tracking-widest text-[9px] bg-slate-100 sticky left-0 z-10 w-[240px] min-w-[240px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center gap-2">
                        <Umbrella size={12} className="text-blue-500" />
                        Manfaat Penggantian Pendapatan (Income Protection)
                      </div>
                    </td>
                    <td className="bg-slate-100 border-y border-slate-200 sticky left-[240px] z-10 w-[140px] min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></td>
                    <td colSpan={takafulItems.length} className="px-4 py-2 font-black text-slate-800 border-y border-slate-200 uppercase tracking-widest text-[9px] bg-slate-50/50"></td>
                  </tr>
                  <ReviewRow 
                    label="Manfaat Kematian" 
                    icon={<Skull size={10} className="text-slate-400" />}
                    valueFn={(item) => {
                      const d = extraDetails.find(det => det.id === item.id);
                      const amount = parseNum(d?.deathBenefit);
                      return amount > 0 ? amount : '-';
                    }}
                    isMoney 
                    items={takafulItems} 
                    details={extraDetails} 
                    showTotal 
                  />
                  <ReviewRow 
                    label="Manfaat TPD (Accelerated)" 
                    icon={<UserMinus size={10} className="text-slate-400" />}
                    isMoney 
                    valueFn={(item) => {
                      const d = extraDetails.find(det => det.id === item.id);
                      const amount = parseNum(d?.disabilityBenefit);
                      if (!amount) return '-';
                      if (d?.disabilityType === 'Additional') return '-';
                      return amount;
                    }}
                    items={takafulItems} 
                    details={extraDetails} 
                    showTotal 
                  />
                  <ReviewRow 
                    label="Manfaat TPD (Additional)" 
                    icon={<UserMinus size={10} className="text-slate-400" />}
                    isMoney 
                    valueFn={(item) => {
                      const d = extraDetails.find(det => det.id === item.id);
                      const amount = parseNum(d?.disabilityBenefit);
                      if (!amount) return '-';
                      if (d?.disabilityType === 'Accelerated') return '-';
                      return amount;
                    }}
                    items={takafulItems} 
                    details={extraDetails} 
                    showTotal 
                  />
                  <ReviewRow 
                    label="Penyakit Kritikal (Accelerated)" 
                    icon={<Activity size={10} className="text-slate-400" />}
                    isMoney 
                    valueFn={(item) => {
                      const d = extraDetails.find(det => det.id === item.id);
                      const amount = parseNum(d?.criticalIllness);
                      if (!amount) return '-';
                      if (d?.criticalIllnessType === 'Additional') return '-';
                      return amount;
                    }}
                    items={takafulItems} 
                    details={extraDetails} 
                    showTotal 
                  />
                  <ReviewRow 
                    label="Penyakit Kritikal (Additional)" 
                    icon={<Activity size={10} className="text-slate-400" />}
                    isMoney 
                    valueFn={(item) => {
                      const d = extraDetails.find(det => det.id === item.id);
                      const amount = parseNum(d?.criticalIllness);
                      if (!amount) return '-';
                      if (d?.criticalIllnessType === 'Accelerated') return '-';
                      return amount;
                    }}
                    items={takafulItems} 
                    details={extraDetails} 
                    showTotal 
                  />

                  <tr className="bg-emerald-50/30 group">
                    <td className="px-4 py-2 font-black text-emerald-800 border-y border-emerald-100 uppercase tracking-widest text-[9px] bg-emerald-50 sticky left-0 z-10 w-[240px] min-w-[240px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        Penamaan & Hibah Takaful
                      </div>
                    </td>
                    <td className="bg-emerald-50 border-y border-emerald-100 sticky left-[240px] z-10 w-[140px] min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></td>
                    <td colSpan={takafulItems.length} className="px-4 py-2 font-black text-emerald-800 border-y border-emerald-100 uppercase tracking-widest text-[9px] bg-emerald-50/30"></td>
                  </tr>
                  <ReviewRow 
                    label="Penamaan Biasa (Wasiy) (%)" 
                    field="nominationNormalPercentage" 
                    items={takafulItems} 
                    details={extraDetails} 
                  />
                  <ReviewRow 
                    label="Amaun Wasiat (Wasiy)" 
                    icon={<Info size={10} className="text-slate-400" />}
                    valueFn={(item) => {
                      const d = extraDetails.find(det => det.id === item.id);
                      return parseNum(d?.deathBenefit) * parseNum(d?.nominationNormalPercentage) / 100;
                    }}
                    isMoney 
                    items={takafulItems} 
                    details={extraDetails} 
                    showTotal 
                  />
                  <ReviewRow 
                    label="Penamaan Hibah (%)" 
                    field="nominationHibahPercentage" 
                    items={takafulItems} 
                    details={extraDetails} 
                  />
                  <ReviewRow 
                    label="Amaun Hibah Takaful" 
                    icon={<Heart size={10} className="text-rose-400" />}
                    valueFn={(item) => {
                      const d = extraDetails.find(det => det.id === item.id);
                      return parseNum(d?.deathBenefit) * parseNum(d?.nominationHibahPercentage) / 100;
                    }}
                    isMoney 
                    items={takafulItems} 
                    details={extraDetails} 
                    showTotal 
                  />
                  
                  <tr className="bg-slate-50/50 group">
                    <td className="px-4 py-2 font-black text-slate-800 border-y border-slate-200 uppercase tracking-widest text-[9px] bg-slate-100 sticky left-0 z-10 w-[240px] min-w-[240px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center gap-2">
                        <HeartPulse size={12} className="text-emerald-500" />
                        Manfaat Perubatan & Hospital (Medical)
                      </div>
                    </td>
                    <td className="bg-slate-100 border-y border-slate-200 sticky left-[240px] z-10 w-[140px] min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></td>
                    <td colSpan={takafulItems.length} className="px-4 py-2 font-black text-slate-800 border-y border-slate-200 uppercase tracking-widest text-[9px] bg-slate-50/50"></td>
                  </tr>
                  <ReviewRow 
                    label="Had Tahunan Medical Card" 
                    icon={<Hospital size={10} className="text-slate-400" />}
                    field="medicalCardLimitAnnual" 
                    isMoney 
                    items={takafulItems} 
                    details={extraDetails} 
                    showTotal 
                  />
                  <ReviewRow 
                    label="Had Seumur Hidup" 
                    icon={<ShieldCheck size={10} className="text-slate-400" />}
                    field="medicalCardLimitLifetime" 
                    isMoney 
                    items={takafulItems} 
                    details={extraDetails} 
                    showTotal 
                  />
                  <ReviewRow 
                    label="Kadar Bilik & Makan" 
                    icon={<BedDouble size={10} className="text-slate-400" />}
                    field="roomAndBoard" 
                    isMoney 
                    items={takafulItems} 
                    details={extraDetails} 
                  />
                  <ReviewRow 
                    label="Elaun Tunai Hospital" 
                    icon={<Wallet size={10} className="text-slate-400" />}
                    valueFn={(item) => {
                      const d = extraDetails.find(det => det.id === item.id);
                      if (!d?.hasHospitalAllowance) return 'TIADA';
                      return `RM ${(d.dailyAllowance || 0).toLocaleString()}/hari`;
                    }}
                    items={takafulItems} 
                    details={extraDetails} 
                  />
                  <ReviewRow 
                    label="Deductible" 
                    icon={<Info size={10} className="text-slate-400" />}
                    valueFn={(item) => {
                      const d = extraDetails.find(det => det.id === item.id);
                      if (!d?.medicalDeductibleType || d.medicalDeductibleType === 'Non-Deductible') return 'NON-DEDUCTIBLE';
                      return `DEDUCTIBLE (RM ${(d.medicalDeductibleAmount || 0).toLocaleString()})`;
                    }}
                    items={takafulItems} 
                    details={extraDetails} 
                  />
                  <ReviewRow 
                    label="Waiver Caruman" 
                    icon={<ShieldCheck size={10} className="text-slate-400" />}
                    valueFn={(item) => {
                      const d = extraDetails.find(det => det.id === item.id);
                      return d?.hasWaiver ? 'ADA' : 'TIADA';
                    }}
                    items={takafulItems} 
                    details={extraDetails} 
                  />

                  {allOtherBenefitLabels.length > 0 && (
                    <>
                      <tr className="bg-slate-50/50 group">
                        <td className="px-4 py-2 font-black text-slate-800 border-y border-slate-200 uppercase tracking-widest text-[9px] bg-slate-100 sticky left-0 z-10 w-[240px] min-w-[240px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          <div className="flex items-center gap-2">
                            <Plus size={12} className="text-orange-500" />
                            Manfaat Tambahan / Lain-lain
                          </div>
                        </td>
                        <td className="bg-slate-100 border-y border-slate-200 sticky left-[240px] z-10 w-[140px] min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></td>
                        <td colSpan={takafulItems.length} className="px-4 py-2 font-black text-slate-800 border-y border-slate-200 uppercase tracking-widest text-[9px] bg-slate-100/50"></td>
                      </tr>
                      {allOtherBenefitLabels.map(label => (
                        <ReviewRow 
                          key={label}
                          label={label} 
                          icon={<Plus size={10} className="text-slate-400" />}
                          valueFn={(item) => {
                            const detail = getDetail(item.id);
                            return detail?.otherBenefits?.find(b => b.label === label)?.value || '-';
                          }}
                          items={takafulItems} 
                          details={extraDetails} 
                        />
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gap Analysis Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <TrendingUp size={12} className="text-blue-500" /> Analisa Jurang Perlindungan (Gap Analysis)
              </h2>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                Berdasarkan Pendapatan Bersih: RM {monthlyIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/bln
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Kategori Manfaat</th>
                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Total (Semasa)</th>
                    <th className="px-5 py-3 text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-slate-100 text-right bg-blue-50/30">Needed (Keperluan)</th>
                    <th className="px-5 py-3 text-[10px] font-black text-rose-600 uppercase tracking-widest border-b border-slate-100 text-right bg-rose-50/30">Shortfall (Lompang)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <AnalysisRow 
                    index={1}
                    label="Peruntukan Caruman (10%)" 
                    total={totalPremiumAnnual} 
                    needed={neededPremiumAnnual} 
                  />
                  <AnalysisRow 
                    index={2}
                    label="Manfaat Kematian (10 tahun)" 
                    total={totalDeathCoverage} 
                    needed={neededDeath} 
                  />
                  <AnalysisRow 
                    index={3}
                    label="Manfaat TPD / Lumpuh (10 tahun)" 
                    total={totalTPD} 
                    needed={neededTPD} 
                  />
                  <AnalysisRow 
                    index={4}
                    label="Penyakit Kritikal (5 tahun)" 
                    total={totalCI} 
                    needed={neededCI} 
                  />
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50/30 border-t border-slate-100 flex items-center gap-3">
              <Info size={14} className="text-blue-500 shrink-0" />
              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                Nota: Analisa ini adalah bantuan pengiraan kasar. Sebaiknya rujuk perunding takaful berkelayakan untuk pelan komprehensif.
              </p>
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'jurang' && (
        <div className="space-y-6">
          {/* Card: Income Protection Overview & Explanation */}
          <div className="bg-[#1A365D] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 opacity-10 text-white">
              <Umbrella size={140} />
            </div>
            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="flex items-center gap-2">
                <Umbrella className="text-emerald-400 shrink-0" size={24} />
                <h2 className="text-lg font-black uppercase tracking-tight">Pelan Penggantian Pendapatan (Income Protection Plan)</h2>
              </div>
            </div>
          </div>

          {/* Configuration Panel & Computed Target Incomes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Interactive Inputs (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
              <div>
                <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Info size={14} className="text-[#1A365D]" />
                  Tetapan Keperluan Saraan
                </h3>
                <p className="text-[8px] text-slate-400 mt-1 uppercase font-black tracking-widest">Sesuaikan parameter mengikut aspirasi kewangan waris</p>
              </div>

              {/* 1. Monthly income */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-[#1A365D] uppercase tracking-widest block font-sans">Pendapatan Bulanan untuk Dilindungi</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">RM</span>
                  <input 
                    readOnly
                    type="text"
                    value={monthlyIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-mono font-bold text-slate-600 outline-none cursor-not-allowed shadow-inner"
                  />
                </div>
                <div className="flex justify-between items-center text-[8px] uppercase tracking-wider font-black mt-1">
                  <span className="text-emerald-600 font-semibold">• Tally dengan Aliran Tunai</span>
                </div>
              </div>

              {/* 3. Support Period Yrs */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black text-[#1A365D] uppercase tracking-widest block font-sans">Tempoh Sokongan Waris (Tahun)</label>
                  <span className="text-xs font-mono font-black text-indigo-600">{yearsOfSupport} Tahun</span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="1" 
                    max="30" 
                    value={yearsOfSupport}
                    onChange={(e) => setYearsOfSupport(parseInt(e.target.value))}
                    className="flex-1 accent-[#1A365D] h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="relative w-14">
                    <NumericInput 
                      value={yearsOfSupport}
                      onChange={setYearsOfSupport}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg py-1 text-xs font-mono font-bold text-slate-800 text-center outline-none"
                    />
                  </div>
                </div>
                <p className="text-[8px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider font-sans">* Kebiasaan: 10 tahun (BMW Standard)</p>
              </div>

              {/* 4. Dividend Return rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center font-sans">
                  <label className="text-[9px] font-black text-[#1A365D] uppercase tracking-widest block font-sans">Anggaran Kadar Dividen Pelaburan (%)</label>
                  <span className="text-xs font-mono font-black text-indigo-600">{expectedReturnRate}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="0" 
                    max="15" 
                    step="0.5"
                    value={expectedReturnRate}
                    onChange={(e) => setExpectedReturnRate(parseFloat(e.target.value))}
                    className="flex-1 accent-[#1A365D] h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="relative w-14">
                    <NumericInput 
                      value={expectedReturnRate}
                      onChange={setExpectedReturnRate}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg py-1 text-xs font-mono font-bold text-slate-800 text-center outline-none"
                    />
                  </div>
                </div>
                <p className="text-[8px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider font-sans">* Untuk pelaburan dividen pampasan (ASB/TH dll)</p>
              </div>
            </div>

            {/* Right Column: Computed Target Incomes List & Legend (7 cols) */}
            <div className="lg:col-span-7 bg-[#1A365D]/5 rounded-2xl border border-indigo-100 p-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-wider border-b border-indigo-100 pb-2 flex items-center gap-2">
                    <TrendingUp size={14} className="text-indigo-600" />
                    Analisa Ringkasan Keperluan
                  </h3>
                  <p className="text-[8px] text-slate-400 mt-1 uppercase font-black tracking-widest">Rumusan saraan terhasil daripada profil semasa</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <p className="text-[9px] text-[#1A365D] font-black uppercase tracking-wide">Saraan Bulanan Sasaran Waris</p>
                    <p className="text-base font-mono font-black text-[#1A365D] mt-1">RM {targetMonthlyIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-[8px] text-slate-400 italic mt-0.5 uppercase">Berasaskan Aliran Tunai Balans</p>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <p className="text-[9px] text-[#1A365D] font-black uppercase tracking-wide">Keperluan Saraan Setahun</p>
                    <p className="text-base font-mono font-black text-[#1A365D] mt-1">RM {targetAnnualIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-[8px] text-slate-400 italic mt-0.5 uppercase">Kelangsungan hidup setahun</p>
                  </div>

                  <div className="bg-emerald-50 text-emerald-950 rounded-xl p-3 border border-emerald-205">
                    <p className="text-[9px] text-emerald-700 font-black uppercase tracking-wide">Perlindungan Hayat Sedia Ada</p>
                    <p className="text-base font-mono font-black mt-1">RM {totalDeathCoverage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-[8px] text-emerald-600 italic mt-0.5 uppercase">Jumlah Khairat/Sum Assured</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 p-3.5 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-100 flex items-start gap-2.5">
                <Info size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-yellow-900">Peraturan Standard Industri (10% Gaji)</p>
                  <p className="text-[9px] text-yellow-800 leading-normal font-semibold">
                    BMW Planner menyasarkan sumbangan caruman takaful maksimum <strong>10%</strong> dari pendapatan bersih, dengan sasaran liputan hayat minimum <strong>10 kali ganda</strong> gaji tahunan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* TWO GRAPHICAL / COMPUTATION METHODS SIDE BY SIDE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Kaedah 1: Capital Intact */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-emerald-400" size={16} />
                    <h3 className="text-[10px] font-black uppercase tracking-widest">Kaedah Pengekalan Modal (Capital Intact)</h3>
                  </div>
                  <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded uppercase">Utuh & Kekal</span>
                </div>
                
                <div className="p-5 space-y-4">
                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                    Dana pampasan disimpan dalam akaun pelaburan dividen. Waris menyara hidup dengan hanya membelanjakan hasil <strong className="text-slate-800">dividen tahunan sebanyak {expectedReturnRate}%</strong>, manakala modal asal RM pokok kekal utuh selamanya untuk legasi.
                  </p>

                  <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Perlindungan Diperlukan:</span>
                      <span className="text-base font-mono font-black text-slate-800">RM {requiredCapitalIntact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between items-baseline border-t border-slate-200/60 pt-3">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Perlindungan Sedia Ada:</span>
                      <span className="text-xs font-mono font-bold text-emerald-600">RM {totalDeathCoverage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="border-t border-slate-250 pt-3 flex justify-between items-baseline">
                      <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Lompang Perlindungan (Shortfall):</span>
                      <span className={`text-base font-mono font-black ${shortfallCapitalIntact > 0 ? 'text-rose-600' : 'text-emerald-600 bg-emerald-50 px-2 rounded'}`}>
                        {shortfallCapitalIntact > 0 
                          ? `RM ${shortfallCapitalIntact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                          : 'CUKUP / LENGKAP'}
                      </span>
                    </div>
                  </div>

                  {/* Progress visual */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-wider">
                      <span>Peratusan Liputan Sedia Ada</span>
                      <span>{requiredCapitalIntact > 0 ? Math.min(100, (totalDeathCoverage / requiredCapitalIntact) * 100).toFixed(1) : 100}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${shortfallCapitalIntact > 0 ? 'bg-indigo-600' : 'bg-emerald-500'}`}
                        style={{ width: `${requiredCapitalIntact > 0 ? Math.min(100, (totalDeathCoverage / requiredCapitalIntact) * 100) : 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100/80">
                <h4 className="text-[9px] font-black uppercase text-slate-700 tracking-wider mb-1 flex items-center gap-1">
                  <Info size={11} className="text-slate-400" /> Analisa Aliran Kaedah
                </h4>
                <p className="text-[9px] text-slate-500 leading-normal font-semibold">
                  Jika berlaku musibah, pampasan <strong>RM {requiredCapitalIntact.toLocaleString()}</strong> akan diletakkan dalam akaun dividen {expectedReturnRate}%. Waris mengeluarkan dividen tahunan RM {targetAnnualIncome.toLocaleString()} (RM {targetMonthlyIncome.toLocaleString()}/bln) tanpa mengusik modal asal yang kekal di dalam akaun pelaburan waris secara mutlak.
                </p>
              </div>
            </div>

            {/* Kaedah 2: Asset Liquidation */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-indigo-950 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="text-emerald-400" size={16} />
                    <h3 className="text-[10px] font-black uppercase tracking-widest">Kaedah Pengurangan Aset (Asset Liquidation)</h3>
                  </div>
                  <span className="text-[8px] font-black bg-blue-500/20 text-[#93C5FD] px-2 py-0.5 rounded uppercase">Pelunasan Pokok</span>
                </div>
                
                <div className="p-5 space-y-4">
                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                    Waris akan menggunakan pokok pampasan secara langsung untuk keperluan sara hidup tanpa sebarang aspek pelaburan semula (reinvest), sehingga tabung pampasan pokok habis sepenuhnya setelah tamat <strong className="text-slate-800">tahun ke-{yearsOfSupport}</strong>.
                  </p>

                  <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Perlindungan Diperlukan:</span>
                      <span className="text-base font-mono font-black text-slate-800">RM {requiredAssetLiquidation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between items-baseline border-t border-slate-200/60 pt-3">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Perlindungan Sedia Ada:</span>
                      <span className="text-xs font-mono font-bold text-emerald-600">RM {totalDeathCoverage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="border-t border-slate-250 pt-3 flex justify-between items-baseline">
                      <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Lompang Perlindungan (Shortfall):</span>
                      <span className={`text-base font-mono font-black ${shortfallAssetLiquidation > 0 ? 'text-rose-600' : 'text-emerald-600 bg-emerald-50 px-2 rounded'}`}>
                        {shortfallAssetLiquidation > 0 
                          ? `RM ${shortfallAssetLiquidation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                          : 'CUKUP / LENGKAP'}
                      </span>
                    </div>
                  </div>

                  {/* Progress visual */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-wider">
                      <span>Peratusan Liputan Sedia Ada</span>
                      <span>{requiredAssetLiquidation > 0 ? Math.min(100, (totalDeathCoverage / requiredAssetLiquidation) * 100).toFixed(1) : 100}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${shortfallAssetLiquidation > 0 ? 'bg-indigo-600' : 'bg-emerald-500'}`}
                        style={{ width: `${requiredAssetLiquidation > 0 ? Math.min(100, (totalDeathCoverage / requiredAssetLiquidation) * 100) : 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100/80">
                <h4 className="text-[9px] font-black uppercase text-slate-700 tracking-wider mb-1 flex items-center gap-1">
                  <Info size={11} className="text-slate-400" /> Analisa Aliran Kaedah
                </h4>
                <p className="text-[9px] text-slate-500 leading-normal font-semibold">
                  Sumbangan pampasan <strong>RM {requiredAssetLiquidation.toLocaleString()}</strong> akan dikeluarkan secara berperingkat oleh waris sebanyak RM {targetMonthlyIncome.toLocaleString()}/bulan untuk menyara keluarga, dan tabung pokok ini akan berkurang sehingga sifar tepat pada hujung tahun ke-{yearsOfSupport}.
                </p>
              </div>
            </div>
          </div>

          {/* RECOMMENDATION BLOCK AT BOTTOM */}
          <div className="bg-[#1A365D]/5 border border-[#1A365D]/15 rounded-2xl p-5 space-y-3.5">
            <h4 className="text-[10px] font-black text-[#1A365D] uppercase tracking-widest flex items-center gap-2">
              <Umbrella size={14} className="text-[#1A365D]" /> Syor Pemilihan Kaedah & Pelan Tindakan
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] leading-relaxed text-slate-650 font-semibold">
              <div className="space-y-1.5 p-3.5 bg-white rounded-xl border border-slate-150">
                <span className="text-indigo-700 font-extrabold block text-[9px] uppercase tracking-widest">Sifat & Kelebihan Pemilihan:</span>
                <p className="text-slate-500">
                  Kaedah <strong className="text-slate-800">Capital Intact (Pengekalan Modal)</strong> memerlukan pampasan yang jauh lebih tinggi namun memberikan perlindungan saraan yang mampan untuk jangka panjang tanpa tarikh tamat, di mana modal RM {requiredCapitalIntact.toLocaleString(undefined, { maximumFractionDigits: 0 })} kekal selamat dan menjadi harta warisan mutlak.
                </p>
              </div>
              <div className="space-y-1.5 p-3.5 bg-white rounded-xl border border-slate-150">
                <span className="text-emerald-700 font-extrabold block text-[9px] uppercase tracking-widest">Pelan Tindakan Mula Dahulu:</span>
                <p className="text-slate-500">
                  Sekiranya belanjawan caruman bulanan anda terhad di masa sekarang, mulakan dengan sasaran perlindungan <strong>Kaedah Asset Liquidation (RM {requiredAssetLiquidation.toLocaleString(undefined, { maximumFractionDigits: 0 })})</strong> dahulu. Ini kerana komitmen carumannya lebih rendah dan realistik, dan anda boleh menaik taraf komitmen anda dari semasa ke semasa mengikut peningkatan pendapatan.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'hutang' && (
        <div className="space-y-6">
          {/* Hero/Overview Card */}
          <div className="bg-[#1A365D] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 opacity-10 text-white">
              <Wallet size={140} />
            </div>
            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-400 shrink-0" size={24} />
                <h2 className="text-lg font-black uppercase tracking-tight">Pelan Penyelesaian Hutang (Debt Settlement Plan)</h2>
              </div>
              <p className="text-slate-305 text-xs text-slate-300 leading-relaxed max-w-2xl font-semibold">
                Memastikan semua liabiliti/hutang mempunyai perlindungan Takaful (seperti MRTT, MLTT atau pelan Takaful Hayat) supaya tidak membebankan waris sekiranya berlaku risiko kematian atau keilatan kekal.
              </p>
            </div>
          </div>

          {/* Three columns metrics cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Jumlah Hutang Kasar</span>
                <span className="text-xl font-mono font-bold text-slate-800">
                  RM {netWorthItems.filter(i => i.type === 'Liability').reduce((acc, i) => acc + (i.value || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-slate-400 block font-semibold uppercase">Keseluruhan liabiliti aktif</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-100 text-slate-600">
                <Wallet size={20} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest block">Sudah Dilindungi</span>
                <span className="text-xl font-mono font-bold text-emerald-600">
                  RM {netWorthItems.filter(i => i.type === 'Liability' && i.hasCoverage).reduce((acc, i) => acc + (i.value || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-emerald-500 block font-semibold uppercase">
                  {netWorthItems.filter(i => i.type === 'Liability' && i.hasCoverage).length} daripada {netWorthItems.filter(i => i.type === 'Liability').length} hutang dilindungi
                </span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck size={20} />
              </div>
            </div>

            <div className={`border rounded-xl p-5 shadow-sm flex items-center justify-between transition-all ${
              (netWorthItems.filter(i => i.type === 'Liability').reduce((acc, i) => acc + (i.value || 0), 0) - netWorthItems.filter(i => i.type === 'Liability' && i.hasCoverage).reduce((acc, i) => acc + (i.value || 0), 0)) > 0 
                ? 'bg-rose-50/30 border-rose-100' 
                : 'bg-emerald-50/20 border-emerald-100'
            }`}>
              <div className="space-y-1">
                <span className={`text-[10px] font-extrabold uppercase tracking-widest block ${
                  (netWorthItems.filter(i => i.type === 'Liability').reduce((acc, i) => acc + (i.value || 0), 0) - netWorthItems.filter(i => i.type === 'Liability' && i.hasCoverage).reduce((acc, i) => acc + (i.value || 0), 0)) > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}>
                  Baki Belum Dilindungi
                </span>
                <span className={`text-xl font-mono font-bold ${
                  (netWorthItems.filter(i => i.type === 'Liability').reduce((acc, i) => acc + (i.value || 0), 0) - netWorthItems.filter(i => i.type === 'Liability' && i.hasCoverage).reduce((acc, i) => acc + (i.value || 0), 0)) > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}>
                  RM {Math.max(0, netWorthItems.filter(i => i.type === 'Liability').reduce((acc, i) => acc + (i.value || 0), 0) - netWorthItems.filter(i => i.type === 'Liability' && i.hasCoverage).reduce((acc, i) => acc + (i.value || 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-[9px] block font-semibold uppercase ${
                  (netWorthItems.filter(i => i.type === 'Liability').reduce((acc, i) => acc + (i.value || 0), 0) - netWorthItems.filter(i => i.type === 'Liability' && i.hasCoverage).reduce((acc, i) => acc + (i.value || 0), 0)) > 0 ? 'text-rose-400' : 'text-emerald-650'
                }`}>
                  {(netWorthItems.filter(i => i.type === 'Liability').reduce((acc, i) => acc + (i.value || 0), 0) - netWorthItems.filter(i => i.type === 'Liability' && i.hasCoverage).reduce((acc, i) => acc + (i.value || 0), 0)) > 0 ? 'Pendedahan Risiko Waris' : 'Selamat / Tiada Risiko Hutang'}
                </span>
              </div>
              <div className={`p-3 rounded-lg ${
                (netWorthItems.filter(i => i.type === 'Liability').reduce((acc, i) => acc + (i.value || 0), 0) - netWorthItems.filter(i => i.type === 'Liability' && i.hasCoverage).reduce((acc, i) => acc + (i.value || 0), 0)) > 0 ? 'bg-rose-100/50 text-rose-600' : 'bg-emerald-100/50 text-emerald-600'
              }`}>
                <ShieldAlert size={20} />
              </div>
            </div>
          </div>

          {/* List and table of debts */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Wallet size={12} className="text-slate-400" /> Senarai Liabiliti & Status Perlindungan Takaful
              </h3>
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                *Klik butang status untuk menukar perlindungan bagi setiap hutang secara langsung
              </div>
            </div>

            <div className="overflow-x-auto">
              {netWorthItems.filter(i => i.type === 'Liability').length > 0 ? (
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-black tracking-tighter uppercase whitespace-nowrap border-b border-slate-100">
                      <th className="px-5 py-3 w-12 text-center">BIL</th>
                      <th className="px-5 py-3">NAMA HUTANG / LIABILITI</th>
                      <th className="px-5 py-3">KATEGORI HUTANG</th>
                      <th className="px-5 py-3 text-right">BAKI SEMASA (RM)</th>
                      <th className="px-5 py-3 text-center w-48">PERLINDUNGAN TAKAFUL</th>
                      <th className="px-5 py-3 text-center w-28">TINDAKAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {netWorthItems.filter(i => i.type === 'Liability').map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/40 transition-all group">
                        <td className="px-5 py-3 text-center text-slate-400 font-mono font-bold">
                          {idx + 1}
                        </td>
                        <td className="px-5 py-3 font-bold text-slate-800">
                          {item.name}
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight bg-slate-100 text-slate-500 border border-slate-200/50">
                            {item.category || "Hutang"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-slate-700">
                          RM {(item.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {item.hasCoverage ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-tight shadow-sm">
                              <ShieldCheck size={10} /> DILINDUNGI (MRTT/MLTT)
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-full text-[9px] font-black uppercase tracking-tight shadow-sm">
                              <ShieldAlert size={10} /> TIADA PERLINDUNGAN
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={async () => {
                              if (item.id) {
                                await netWorthService.update(item.id, { hasCoverage: !item.hasCoverage });
                              }
                            }}
                            className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-tight shadow-sm transition-all active:scale-95 border ${
                              item.hasCoverage
                                ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-750'
                            }`}
                          >
                            {item.hasCoverage ? 'Tukar Tiada' : 'Tukar Ada'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center bg-slate-50/50 space-y-2">
                  <p className="text-slate-400 text-xs italic">Tiada liabiliti/hutang aktif dikesan dalam profil anda.</p>
                  <p className="text-[9px] text-[#1A365D] font-black uppercase max-w-sm mx-auto leading-relaxed">
                    Sila tambah rekod liabiliti anda di dalam **Modul 2: Nilai Aset Bersih** terlebih dahulu untuk dipeta secara automatik di sini.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Recommendations Box */}
          <div className="bg-[#1A365D]/5 border border-[#1A365D]/15 rounded-2xl p-5 space-y-3.5">
            <h4 className="text-[10px] font-black text-[#1A365D] uppercase tracking-widest flex items-center gap-2">
              <Umbrella size={14} className="text-[#1A365D]" /> Syor Tindakan & Strategi Penyelesaian Hutang
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] leading-relaxed text-slate-700 font-semibold">
              <div className="space-y-1.5 p-4 bg-white rounded-xl border border-slate-150 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-indigo-700 font-extrabold block text-[9px] uppercase tracking-widest mb-1">Status Pendedahan Risiko</span>
                  {(() => {
                    const totalVal = netWorthItems.filter(i => i.type === 'Liability').reduce((acc, i) => acc + (i.value || 0), 0);
                    const totalCov = netWorthItems.filter(i => i.type === 'Liability' && i.hasCoverage).reduce((acc, i) => acc + (i.value || 0), 0);
                    const rem = Math.max(0, totalVal - totalCov);
                    const count = netWorthItems.filter(i => i.type === 'Liability').length;

                    if (rem > 0) {
                      return (
                        <p className="text-slate-600 leading-normal">
                          Anda mempunyai baki hutang yang terdedah tanpa perlindungan Takaful sebanyak <strong className="text-rose-600">RM {rem.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>. Sekiranya berlaku risiko musibah tidak dijangka, baki hutang ini akan membebankan waris untuk diselesaikan atau dicairkan melalui harta pusaka.
                        </p>
                      );
                    } else if (count > 0) {
                      return (
                        <p className="text-emerald-700 leading-normal">
                          Tahniah! Kesemua hutang aktif anda telah dilengkapi dengan perlindungan takaful (sama ada melalui MRTT/MLTT bersepadu atau polisi persendirian). Ini bermakna waris anda akan dilindungi sepenuhnya daripada beban liabiliti ini sekiranya berlaku kecemasan.
                        </p>
                      );
                    } else {
                      return (
                        <p className="text-slate-500 leading-normal">
                          Anda kini bebas daripada sebarang komitmen hutang dan liabiliti! Teruskan amalan pengurusan kewangan tanpa hutang ini untuk mengoptimumkan simpanan masa hadapan anda.
                        </p>
                      );
                    }
                  })()}
                </div>
              </div>

              <div className="space-y-1.5 p-4 bg-white rounded-xl border border-slate-150 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-emerald-700 font-extrabold block text-[9px] uppercase tracking-widest mb-1">Cadangan Tindakan Seterusnya</span>
                  {(() => {
                    const totalVal = netWorthItems.filter(i => i.type === 'Liability').reduce((acc, i) => acc + (i.value || 0), 0);
                    const totalCov = netWorthItems.filter(i => i.type === 'Liability' && i.hasCoverage).reduce((acc, i) => acc + (i.value || 0), 0);
                    const rem = Math.max(0, totalVal - totalCov);

                    if (rem > 0) {
                      return (
                        <p className="text-slate-600 leading-normal">
                          Sediakan satu draf pelan perlindungan bertempoh (<em className="text-indigo-600 font-black">Term Takaful/Takaful Hayat</em>) khusus dengan jumlah perlindungan bersamaan sekurang-kurangnya <strong className="text-slate-900">RM {rem.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>. Polisi ini berfungsi sebagai instrumen Debt Settlement yang murni bagi melepaskan waris daripada beban pelunasan hutang anda.
                        </p>
                      );
                    } else {
                      return (
                        <p className="text-slate-605 text-slate-500">
                          Kekalkan kualiti pengurusan risiko sedia ada. Sekiranya anda merancang untuk mengambil sebarang liabiliti komersial baru (seperti pembiayaan perumahan tambahan), pastikan ia didaftarkan sekali dengan polisi takaful berkaitan dari pihak penyedia dana.
                        </p>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisRow({ label, total, needed, index }: { label: string, total: number, needed: number, index: number }) {
  const shortfall = Math.max(0, needed - total);
  const isShortfall = shortfall > 0;
  
  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="px-5 py-3 text-[11px] font-bold text-slate-700">
        <span className="text-slate-300 mr-2 text-[9px] font-black">{index}.</span>
        {label}
      </td>
      <td className="px-5 py-3 text-right text-[11px] font-mono text-slate-600">
        RM {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="px-5 py-3 text-right text-[11px] font-mono text-blue-700 font-black bg-blue-50/20">
        RM {needed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className={`px-5 py-3 text-right text-[11px] font-mono font-black bg-rose-50/20 ${isShortfall ? 'text-rose-600' : 'text-emerald-600'}`}>
        {isShortfall ? `RM ${shortfall.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'CUKUP'}
      </td>
    </tr>
  );
}

function PolicyAccordion({ index, item, detail, isExpanded, onToggle, onSave, onDetailChange, onItemChange, onDelete, onDuplicate, isSaving }: { 
  index: number,
  item: BudgetItem, 
  detail: Protection | undefined, 
  isExpanded: boolean, 
  onToggle: () => void, 
  onSave: (itemId: string, itemData: BudgetItem, detailData: Protection) => Promise<Protection | void>,
  onDetailChange?: (itemId: string, updatedDetail: Protection) => void,
  onItemChange?: (itemId: string, updatedItem: BudgetItem) => void,
  onDelete: () => Promise<void>,
  onDuplicate: () => Promise<void> | void,
  isSaving: boolean
}) {
  const [draftItem, setDraftItem] = useState<BudgetItem>(item);
  const [draftDetail, setDraftDetail] = useState<Protection>(() => {
    const base: Protection = detail || { 
      id: item.id, 
      userId: auth.currentUser?.uid || '', 
      policyName: item.label || 'Sijil Baru', 
      premium: item.monthly, 
      type: 'Life', 
      otherBenefits: [],
      coverageAmount: 0
    };
    return {
      ...base,
      deathBenefit: base.deathBenefit !== undefined ? parseNum(base.deathBenefit) : 0,
      disabilityBenefit: base.disabilityBenefit !== undefined ? parseNum(base.disabilityBenefit) : 0,
      criticalIllness: base.criticalIllness !== undefined ? parseNum(base.criticalIllness) : 0,
      coverageAmount: base.coverageAmount ?? 0,
      policyName: base.policyName || item.label || 'Sijil Baru',
    };
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const lastSyncedDetailRef = useRef<Protection | undefined>(detail);
  const lastItemIdRef = useRef<string>(item.id);

  // Only sync draft states when switching to a different item (different ID)
  useEffect(() => {
    if (item.id !== lastItemIdRef.current) {
      lastItemIdRef.current = item.id;
      lastSyncedDetailRef.current = detail;
      setDraftItem(item);
      if (detail) {
        setDraftDetail({
          ...detail,
          deathBenefit: parseNum(detail.deathBenefit),
          disabilityBenefit: parseNum(detail.disabilityBenefit),
          criticalIllness: parseNum(detail.criticalIllness),
          coverageAmount: detail.coverageAmount ?? 0,
          policyName: detail.policyName || item.label || 'Sijil Baru',
        });
      } else {
        setDraftDetail({
          id: item.id,
          userId: auth.currentUser?.uid || '',
          policyName: item.label || 'Sijil Baru',
          premium: item.monthly,
          type: 'Life',
          otherBenefits: [],
          coverageAmount: 0,
          deathBenefit: 0,
          disabilityBenefit: 0,
          criticalIllness: 0,
          disabilityType: 'Additional',
          criticalIllnessType: 'Additional',
        });
      }
    }
  }, [item.id]);

  // Keep draftDetail synced from external props safely without wiping active user edits
  useEffect(() => {
    if (detail && detail !== lastSyncedDetailRef.current) {
      lastSyncedDetailRef.current = detail;
      setDraftDetail(prev => ({
        ...prev,
        ...detail,
        deathBenefit: parseNum(detail.deathBenefit !== undefined ? detail.deathBenefit : prev.deathBenefit),
        disabilityBenefit: parseNum(detail.disabilityBenefit !== undefined ? detail.disabilityBenefit : prev.disabilityBenefit),
        criticalIllness: parseNum(detail.criticalIllness !== undefined ? detail.criticalIllness : prev.criticalIllness),
        coverageAmount: parseNum(detail.coverageAmount !== undefined ? detail.coverageAmount : prev.coverageAmount),
        policyName: detail.policyName || prev.policyName || item.label || 'Sijil Baru',
      }));
    }
  }, [detail]);

  useEffect(() => {
    if (!isExpanded) {
      setShowDeleteConfirm(false);
    }
  }, [isExpanded]);

  const handlePerformSave = async () => {
    const deathBenefit = parseNum(draftDetail.deathBenefit);
    const disabilityBenefit = parseNum(draftDetail.disabilityBenefit);
    const criticalIllness = parseNum(draftDetail.criticalIllness);
    const medicalCardLimitAnnual = parseNum(draftDetail.medicalCardLimitAnnual);
    const medicalCardLimitLifetime = parseNum(draftDetail.medicalCardLimitLifetime);
    const roomAndBoard = parseNum(draftDetail.roomAndBoard);
    const dailyAllowance = parseNum(draftDetail.dailyAllowance);
    const medicalDeductibleAmount = parseNum(draftDetail.medicalDeductibleAmount);
    const nominationNormalPercentage = parseNum(draftDetail.nominationNormalPercentage);
    const nominationHibahPercentage = parseNum(draftDetail.nominationHibahPercentage);
    const cashValueAmount = parseNum(draftDetail.cashValueAmount);
    const maxCoverage = Math.max(deathBenefit, disabilityBenefit, criticalIllness, parseNum(draftDetail.coverageAmount));

    const detailToSave: Protection = {
      ...draftDetail,
      id: item.id,
      deathBenefit,
      disabilityBenefit,
      criticalIllness,
      medicalCardLimitAnnual,
      medicalCardLimitLifetime,
      roomAndBoard,
      dailyAllowance,
      medicalDeductibleAmount,
      nominationNormalPercentage,
      nominationHibahPercentage,
      cashValueAmount,
      disabilityType: draftDetail.disabilityType || 'Additional',
      criticalIllnessType: draftDetail.criticalIllnessType || 'Additional',
      coverageAmount: maxCoverage,
      policyName: draftDetail.policyName || draftItem.label || 'Sijil Baru'
    };

    const saved = await onSave(item.id, draftItem, detailToSave);
    if (saved) {
      setDraftDetail(saved);
      lastSyncedDetailRef.current = saved;
    }
  };

  const updateMultipleDetails = (updates: Partial<Protection>) => {
    setDraftDetail(prev => {
      const next = { ...prev, ...updates };
      if (onDetailChange) {
        setTimeout(() => onDetailChange(item.id, next), 0);
      }
      return next;
    });
  };

  const updateDetail = (field: keyof Protection, value: any) => {
    updateMultipleDetails({ [field]: value });
  };

  const updateItem = (field: 'label' | 'monthly', value: any) => {
    setDraftItem(prev => {
      const nextItem = { ...prev, [field]: value };
      if (onItemChange) {
        setTimeout(() => onItemChange(item.id, nextItem), 0);
      }
      return nextItem;
    });
    if (field === 'label') {
      updateDetail('policyName', value);
    }
  };

  const addOtherBenefit = () => {
    const others = draftDetail.otherBenefits || [];
    updateDetail('otherBenefits', [
      ...others,
      { id: Math.random().toString(36).substr(2, 9), label: '', value: '' }
    ]);
  };

  const updateOtherBenefit = (index: number, field: 'label' | 'value', val: string) => {
    const others = [...(draftDetail.otherBenefits || [])];
    others[index] = { ...others[index], [field]: val };
    updateDetail('otherBenefits', others);
  };

  const removeOtherBenefit = (index: number) => {
    const others = draftDetail.otherBenefits?.filter((_, i) => i !== index) || [];
    updateDetail('otherBenefits', others);
  };

  return (
    <div className={`overflow-hidden transition-all ${isExpanded ? 'bg-slate-50 shadow-inner' : 'bg-white'}`}>
      <div 
        onClick={onToggle}
        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
      >
      <div className="flex items-center gap-4">
        <div className="w-8 shrink-0 text-xs font-black text-slate-300">
          {index}.
        </div>
        <div className={`p-2 rounded-lg ${(draftDetail?.deathBenefit || detail?.deathBenefit || draftDetail?.disabilityBenefit || detail?.disabilityBenefit) ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
          <ShieldCheck size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800 leading-none mb-1">{draftDetail?.policyName || detail?.policyName || item.label || 'Sijil Takaful'}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
              {draftDetail?.type || detail?.type || 'Life'}
            </span>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              Caruman: RM {draftDetail?.premiumFrequency === 'Yearly' || detail?.premiumFrequency === 'Yearly' ? `${(draftDetail.premium || detail?.premium || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/thn` : `${item.monthly?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/bln`}
            </span>
            <span className="text-[10px] text-slate-300">•</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Syarikat: {draftDetail?.company || detail?.company || 'Sila isi'}</span>
            {(draftDetail?.hasCashValue || detail?.hasCashValue) && (
              <>
                <span className="text-[10px] text-slate-300">•</span>
                <span className="text-[10px] text-amber-600 font-bold uppercase flex items-center gap-0.5">
                  <Coins size={10} className="inline" /> Nilai Tunai: RM {(draftDetail.cashValueAmount || detail?.cashValueAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-mono font-bold text-slate-700">RM {parseNum(draftDetail?.deathBenefit ?? detail?.deathBenefit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Perlindungan Kematian</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Salin / Duplikasi Sijil Ini"
          >
            <Copy size={16} />
          </button>
          {isExpanded ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="px-5 pb-6 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Basic Info & Sync */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-[#1A365D] uppercase tracking-widest border-b border-slate-200 pb-1 flex items-center gap-2">
                       MAKLUMAT ASAS
                    </h4>
                    <div className="space-y-3">
                      <InputField label="Nama Sijil (Linked)" value={draftItem.label} onChange={(v) => updateItem('label', v)} placeholder="e.g. Takaful Ikhlas" />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                            Jenis Sijil
                          </label>
                          <select
                            value={draftDetail.type || 'Life'}
                            onChange={(e) => updateDetail('type', e.target.value)}
                            className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="Life">Life</option>
                            <option value="Medical">Medical</option>
                            <option value="Critical Illness">Critical Illness</option>
                            <option value="Accident">Accident</option>
                            <option value="General">General</option>
                          </select>
                        </div>
                        <InputField label="Syarikat Takaful" value={draftDetail.company} onChange={(v) => updateDetail('company', v)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <InputField 
                          label="Tahun Sijil" 
                          value={draftDetail.yearStarted} 
                          onChange={(v) => {
                            const startYear = parseInt(String(v).replace(/\D/g, ''));
                            const endYear = parseInt(String(draftDetail.policyExpiryYear || '').replace(/\D/g, ''));
                            const updates: Partial<Protection> = { yearStarted: v };
                            if (!isNaN(startYear) && !isNaN(endYear) && startYear >= 1900 && endYear >= startYear) {
                              updates.maturityPeriod = `${endYear - startYear} tahun`;
                            }
                            updateMultipleDetails(updates);
                          }} 
                          placeholder="e.g. 2018" 
                        />
                        <InputField 
                          label="Tahun Tamat Polisi" 
                          value={draftDetail.policyExpiryYear} 
                          onChange={(v) => {
                            const endYear = parseInt(String(v).replace(/\D/g, ''));
                            const startYear = parseInt(String(draftDetail.yearStarted || '').replace(/\D/g, ''));
                            const updates: Partial<Protection> = { policyExpiryYear: v };
                            if (!isNaN(startYear) && !isNaN(endYear) && startYear >= 1900 && endYear >= startYear) {
                              updates.maturityPeriod = `${endYear - startYear} tahun`;
                            }
                            updateMultipleDetails(updates);
                          }} 
                          placeholder="e.g. 2060" 
                        />
                      </div>
                      <InputField label="Tempoh Matang" value={draftDetail.maturityPeriod} onChange={(v) => updateDetail('maturityPeriod', v)} placeholder="e.g. 70 tahun" />

                      {/* Nilai Tunai Toggle & Input */}
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${draftDetail.hasCashValue ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Coins size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Mempunyai Nilai Tunai?</p>
                            <label className="flex items-center gap-2 mt-1 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={Boolean(draftDetail.hasCashValue)} 
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  updateMultipleDetails({
                                    hasCashValue: isChecked,
                                    ...(isChecked ? {} : { cashValueAmount: 0 })
                                  });
                                }}
                                className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                              />
                              <span className="text-[9px] text-slate-500 font-bold uppercase">Ada Nilai Tunai</span>
                            </label>
                          </div>
                        </div>
                        {draftDetail.hasCashValue && (
                          <div className="w-32">
                            <InputField 
                              label="Nilai Tunai (RM)" 
                              type="number" 
                              value={draftDetail.cashValueAmount || 0} 
                              onChange={(v) => updateDetail('cashValueAmount', v)} 
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Kekerapan Caruman</label>
                        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                          {(['Monthly', 'Yearly'] as const).map((freq) => (
                            <button
                              key={freq}
                              type="button"
                              onClick={() => {
                                const currentMonthly = draftItem.monthly || 0;
                                updateMultipleDetails({
                                  premiumFrequency: freq,
                                  premium: freq === 'Yearly' ? currentMonthly * 12 : currentMonthly
                                });
                              }}
                              className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all ${
                                (draftDetail.premiumFrequency === freq || (!draftDetail.premiumFrequency && freq === 'Monthly'))
                                ? 'bg-white text-[#1A365D] shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              {freq === 'Monthly' ? 'BULANAN' : 'TAHUNAN'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <InputField 
                        label={draftDetail.premiumFrequency === 'Yearly' ? "Caruman Tahunan (RM)" : "Caruman Bulanan (RM)"} 
                        type="number" 
                        value={draftDetail.premiumFrequency === 'Yearly' ? (draftDetail.premium ?? ((draftItem.monthly || 0) * 12)) : (draftItem.monthly || 0)} 
                        onChange={(v) => {
                          const num = Number(v) || 0;
                          if (draftDetail.premiumFrequency === 'Yearly') {
                            updateDetail('premium', num);
                            updateItem('monthly', num / 12);
                          } else {
                            updateItem('monthly', num);
                            updateDetail('premium', num);
                          }
                        }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Benefits Sections */}
                <div className="space-y-8">
                  {/* INCOME PROTECTION */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-100 pb-1 flex items-center gap-2">
                       <Umbrella size={12} /> INCOME PROTECTION (PENGGANTIAN PENDAPATAN)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <InputField label="Manfaat Kematian (RM)" type="number" value={draftDetail.deathBenefit} onChange={(v) => updateDetail('deathBenefit', v)} />
                        
                        <div className="space-y-2">
                          <InputField label="Manfaat Lumpuh Kekal (TPD) (RM)" type="number" value={draftDetail.disabilityBenefit} onChange={(v) => updateDetail('disabilityBenefit', v)} />
                          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                            {(['Additional', 'Accelerated'] as const).map((t) => (
                              <button
                                key={t}
                                onClick={() => updateDetail('disabilityType', t)}
                                className={`flex-1 py-1 text-[8px] font-bold rounded-md transition-all ${
                                  draftDetail.disabilityType === t || (!draftDetail.disabilityType && t === 'Additional')
                                  ? 'bg-white text-emerald-600 shadow-sm'
                                  : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                {t === 'Additional' ? 'ADDITIONAL' : 'ACCELERATED'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-2">
                          <InputField label="Manfaat Penyakit Kritikal (RM)" type="number" value={draftDetail.criticalIllness} onChange={(v) => updateDetail('criticalIllness', v)} />
                          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                            {(['Additional', 'Accelerated'] as const).map((t) => (
                              <button
                                key={t}
                                onClick={() => updateDetail('criticalIllnessType', t)}
                                className={`flex-1 py-1 text-[8px] font-bold rounded-md transition-all ${
                                  draftDetail.criticalIllnessType === t || (!draftDetail.criticalIllnessType && t === 'Additional')
                                  ? 'bg-white text-emerald-600 shadow-sm'
                                  : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                {t === 'Additional' ? 'ADDITIONAL' : 'ACCELERATED'}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-rose-500 uppercase tracking-tighter mb-1">Penamaan Biasa (Wasiy) (%)</label>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <NumericInput 
                                value={draftDetail.nominationNormalPercentage}
                                onChange={(v) => updateDetail('nominationNormalPercentage', v)}
                                className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-rose-500 shadow-sm"
                              />
                            </div>
                            <span className="text-[9px] font-bold text-rose-500 shrink-0">RM {((draftDetail.deathBenefit || 0) * (draftDetail.nominationNormalPercentage || 0) / 100).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-rose-500 uppercase tracking-tighter mb-1">Penamaan Hibah (%)</label>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <NumericInput 
                                value={draftDetail.nominationHibahPercentage}
                                onChange={(v) => updateDetail('nominationHibahPercentage', v)}
                                className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-rose-500 shadow-sm"
                              />
                            </div>
                            <span className="text-[9px] font-bold text-rose-500 shrink-0">RM {((draftDetail.deathBenefit || 0) * (draftDetail.nominationHibahPercentage || 0) / 100).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MEDICAL CARD */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-1 flex items-center gap-2">
                       <ShieldCheck size={12} /> MEDICAL CARD (KAD PERUBATAN)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <InputField label="Limit Tahunan (RM)" type="number" value={draftDetail.medicalCardLimitAnnual} onChange={(v) => updateDetail('medicalCardLimitAnnual', v)} />
                        <InputField label="Limit Seumur Hidup (RM)" type="number" value={draftDetail.medicalCardLimitLifetime} onChange={(v) => updateDetail('medicalCardLimitLifetime', v)} />
                      </div>
                      <div className="space-y-3">
                        <InputField label="Kelayakan Bilik (Room & Board)" type="number" value={draftDetail.roomAndBoard} onChange={(v) => updateDetail('roomAndBoard', v)} />
                        <div className="space-y-2">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter">Pilihan Deductible</label>
                          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                            {(['Non-Deductible', 'Deductible'] as const).map((t) => (
                              <button
                                key={t}
                                onClick={() => updateDetail('medicalDeductibleType', t)}
                                className={`flex-1 py-1 text-[8px] font-bold rounded-md transition-all ${
                                  draftDetail.medicalDeductibleType === t || (!draftDetail.medicalDeductibleType && t === 'Non-Deductible')
                                  ? 'bg-white text-blue-600 shadow-sm'
                                  : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                {t === 'Non-Deductible' ? 'NON-DEDUCTIBLE' : 'DEDUCTIBLE'}
                              </button>
                            ))}
                          </div>
                          {draftDetail.medicalDeductibleType === 'Deductible' && (
                            <InputField label="Nilai Deductible (RM)" type="number" value={draftDetail.medicalDeductibleAmount} onChange={(v) => updateDetail('medicalDeductibleAmount', v)} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* OTHER BENEFITS */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b border-orange-100 pb-1 flex items-center gap-2">
                       <Plus size={12} /> MANFAAT-MANFAAT LAIN
                    </h4>
                    
                    {/* Elaun Hospital & Waiver Caruman */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${draftDetail.hasHospitalAllowance ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Wallet size={16} />
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Elaun Hospital</span>
                            <input 
                              type="checkbox" 
                              checked={Boolean(draftDetail.hasHospitalAllowance)} 
                              onChange={(e) => updateDetail('hasHospitalAllowance', e.target.checked)}
                              className="w-3.5 h-3.5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                            />
                          </label>
                        </div>
                        {draftDetail.hasHospitalAllowance && (
                          <div className="w-24">
                            <NumericInput 
                              value={draftDetail.dailyAllowance ?? 0}
                              onChange={(v) => updateDetail('dailyAllowance', v)}
                              placeholder="Amaun"
                              className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs font-mono font-bold text-slate-700 text-right outline-none"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${draftDetail.hasWaiver ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                            <ShieldCheck size={16} />
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Waiver Caruman</span>
                            <input 
                              type="checkbox" 
                              checked={Boolean(draftDetail.hasWaiver)} 
                              onChange={(e) => updateDetail('hasWaiver', e.target.checked)}
                              className="w-3.5 h-3.5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Manfaat Tambahan (Di Bawah) */}
                    <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Manfaat Tambahan</span>
                        <button 
                          type="button"
                          onClick={addOtherBenefit}
                          className="text-[10px] font-black text-orange-600 uppercase hover:underline flex items-center gap-1"
                        >
                          + Tambah Manfaat
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(draftDetail.otherBenefits || []).map((benefit, bIdx) => (
                          <div key={benefit.id} className="flex items-center gap-2">
                            <input 
                              value={benefit.label ?? ''}
                              onChange={(e) => updateOtherBenefit(bIdx, 'label', e.target.value)}
                              placeholder="Nama Manfaat"
                              className="min-w-0 flex-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            <input 
                              value={benefit.value ?? ''}
                              onChange={(e) => updateOtherBenefit(bIdx, 'value', e.target.value)}
                              placeholder="Nilai/Status"
                              className="w-28 shrink-0 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            <button 
                              type="button"
                              onClick={() => removeOtherBenefit(bIdx)}
                              className="shrink-0 p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Padam Manfaat Ini"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                        {(draftDetail.otherBenefits || []).length === 0 && (
                          <div className="p-3 border border-dashed border-slate-200 rounded-xl text-center bg-white/60">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tiada Manfaat Tambahan</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="mt-8 flex justify-end gap-3 flex-wrap items-center">
                <AnimatePresence>
                  {isSaving && (
                    <motion.span 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] text-emerald-600 font-bold uppercase"
                    >
                      Berjaya disimpan!
                    </motion.span>
                  )}
                </AnimatePresence>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate();
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all shadow-sm flex items-center gap-1.5"
                    title="Salin / Duplikasi Sijil Ini"
                  >
                    <Copy size={16} />
                    <span className="text-[10px] font-black uppercase tracking-tight">Duplicate</span>
                  </button>

                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(!showDeleteConfirm);
                      }}
                      className={`p-2.5 rounded-xl border transition-all shadow-sm flex items-center gap-2 ${
                        showDeleteConfirm 
                        ? 'bg-rose-500 text-white border-rose-500' 
                        : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200'
                      }`}
                      title="Hapus Sijil"
                    >
                      <Trash2 size={18} />
                      {showDeleteConfirm && <span className="text-[10px] font-black uppercase tracking-tight">Padam Sijil?</span>}
                    </button>
                    
                    {showDeleteConfirm && (
                      <div className="absolute bottom-full right-0 mb-2 flex gap-2">
                         <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                          }}
                          className="bg-rose-600 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase shadow-lg hover:bg-rose-700 transition-all"
                        >
                          Ya, PADAM
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(false);
                          }}
                          className="bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-[9px] font-black uppercase shadow-lg hover:bg-slate-300 transition-all"
                        >
                          Batal
                        </button>
                      </div>
                    )}
                  </div>

                  {!showDeleteConfirm && (
                    <>
                      <button
                        onClick={handlePerformSave}
                        disabled={isSaving}
                        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_4px_18px_rgba(16,185,129,0.35)] ring-4 ring-emerald-500/20 active:scale-95 ${
                          isSaving 
                          ? 'bg-emerald-600 text-white scale-100' 
                          : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(16,185,129,0.45)]'
                        }`}
                      >
                        {isSaving ? <CheckCircle2 size={16} /> : <Save size={16} />}
                        {isSaving ? 'REKOD DISIMPAN' : 'SIMPAN REKOD'}
                      </button>

                      {/* Floating Save Button */}
                      <div className="fixed bottom-16 right-6 z-50 md:bottom-20 md:right-10">
                        <button
                          onClick={handlePerformSave}
                          disabled={isSaving}
                          className={`flex items-center gap-2 px-6 py-4 rounded-full font-black text-xs md:text-sm uppercase tracking-wider transition-all shadow-[0_10px_30px_rgba(16,185,129,0.4)] hover:shadow-[0_15px_35px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 ring-4 ring-emerald-500/20 ${
                            isSaving 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                          }`}
                          title="Simpan Rekod"
                        >
                          {isSaving ? <CheckCircle2 size={18} /> : <Save size={18} />}
                          <span>{isSaving ? 'Rekod Disimpan' : 'Simpan Rekod'}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder }: { label: string, value: any, onChange: (v: any) => void, type?: string, placeholder?: string }) {
  return (
    <div>
      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">{label}</label>
      {type === 'number' ? (
        <NumericInput 
          value={value ?? 0}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
        />
      ) : (
        <input 
          type={type}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
        />
      )}
    </div>
  );
}

interface ReviewRowProps {
  label: string;
  icon?: ReactNode;
  field?: keyof Protection;
  isMoney?: boolean;
  isHeader?: boolean;
  valueFn?: (item: BudgetItem) => any;
  items: BudgetItem[];
  details: Protection[];
  showTotal?: boolean;
  key?: React.Key;
}

function ReviewRow({ label, icon, field, isMoney, isHeader, valueFn, items, details, showTotal }: ReviewRowProps) {
  const values = items.map(item => {
    const detail = details.find(d => d.id === item.id);
    return field ? detail?.[field] : valueFn ? valueFn(item) : undefined;
  });

  const total = values.reduce((acc, v) => {
    return acc + parseNum(v);
  }, 0);

  return (
    <tr className="group hover:bg-slate-50/30 transition-colors">
      <td className={`px-4 py-2 border-r border-slate-100 w-[240px] min-w-[240px] sticky left-0 z-10 bg-white group-hover:bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${isHeader ? 'font-bold text-slate-700' : 'text-slate-500'}`}>
        <div className="flex items-center gap-2">
          {icon}
          {label}
        </div>
      </td>
      <td className={`px-4 py-2 border-r border-slate-100 text-center font-mono text-[10px] w-[140px] min-w-[140px] sticky left-[240px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${showTotal ? 'bg-emerald-50 text-emerald-700 font-bold group-hover:bg-emerald-100/50' : 'bg-slate-50 text-slate-300 group-hover:bg-slate-100/50'}`}>
        {showTotal ? `RM ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : (isHeader ? '' : '-')}
      </td>
      {values.map((val, idx) => {
        const numVal = parseNum(val);
        const hasVal = val !== undefined && val !== null && val !== '' && val !== '-';
        const displayVal = (!hasVal || (typeof val === 'number' && val === 0)) ? '-' : val;
        const finalVal = (isMoney && numVal > 0) ? `RM ${numVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : displayVal;

        return (
          <td key={items[idx].id} className="px-4 py-2 text-center text-slate-800 font-mono text-[10px]">
            {finalVal}
          </td>
        );
      })}
    </tr>
  );
}

