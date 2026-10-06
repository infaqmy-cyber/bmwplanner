import React, { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useApp } from '../contexts/AppContext';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  ReceiptText, 
  Calculator, 
  Landmark, 
  ShieldCheck, 
  Info, 
  Save, 
  Loader2, 
  Wallet, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Calendar,
  Layers,
  RefreshCw,
  HelpCircle,
  Coins,
  Check,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { 
  zakatService, 
  netWorthService, 
  zakatSettingsService, 
  profileService, 
  budgetService, 
  protectionService 
} from '../services';
import { ZakatRecord, NetWorthItem, ZakatSettings, UserProfile, BudgetProfile, Protection } from '../types';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import NumericInput from './NumericInput';

export default function ZakatModule() {
  const { viewingUserId } = useApp();
  const [items, setItems] = useState<ZakatRecord[]>([]);
  const [netWorthItems, setNetWorthItems] = useState<NetWorthItem[]>([]);
  const [zakatSettings, setZakatSettings] = useState<ZakatSettings | null>(null);
  
  // Extra subscriptions for Income Zakat dynamic sync
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [budgetProfiles, setBudgetProfiles] = useState<BudgetProfile[]>([]);
  const [protections, setProtections] = useState<Protection[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<'harta' | 'pendapatan'>('harta');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasAutoloaded, setHasAutoloaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Form states for adding manual paid zakat
  const [formData, setFormData] = useState<Partial<ZakatRecord>>({
    year: new Date().getFullYear(),
    amount: 0,
    type: 'Pendapatan',
    datePaid: new Date().toISOString().split('T')[0]
  });

  // Kalkulator Zakat Pendapatan Inputs (PPZ)
  const [gajiSetahun, setGajiSetahun] = useState<number>(0);
  const [bonusSetahun, setBonusSetahun] = useState<number>(0);
  const [sewaSetahun, setSewaSetahun] = useState<number>(0);
  const [lainSetahun, setLainSetahun] = useState<number>(0);

  // Pelepasan Tolakan (PPZ Standard limits)
  const [diriSendiri, setDiriSendiri] = useState<number>(12000); // Standard PPZ WP RM12,000
  const [bilSpouse, setBilSpouse] = useState<number>(0);         // RM5,000 per spouse
  const [bilAnakBawah18, setBilAnakBawah18] = useState<number>(0); // RM2,000 per child
  const [bilAnakIPT, setBilAnakIPT] = useState<number>(0);         // RM8,000 per student (college/IPT)
  const [kwsp, setKwsp] = useState<number>(0);                 // Capped at RM4,000 under PPZ
  const [takaful, setTakaful] = useState<number>(0);             // Capped at RM3,000 under PPZ
  const [ibuBapa, setIbuBapa] = useState<number>(0);             // Actual contribution
  const [lainLainPelepasan, setLainLainPelepasan] = useState<number>(0);

  // Subscriptions Setup with multi-user support
  useEffect(() => {
    const targetUserId = viewingUserId || auth.currentUser?.uid;
    if (!targetUserId) return;

    const unsubZakat = zakatService.subscribe(setItems, targetUserId);
    const unsubNetWorth = netWorthService.subscribe(setNetWorthItems, targetUserId);
    const unsubSettings = zakatSettingsService.subscribe((settings) => {
      if (settings.length > 0) {
        setZakatSettings(settings[0]);
      } else {
        setZakatSettings({
          userId: targetUserId,
          excludedAssetIds: [],
          nisab: 25000, // Reasonable default Nisab (approx RM25k - RM26k)
          updatedAt: new Date().toISOString()
        });
      }
    }, targetUserId);

    const unsubProfile = profileService.subscribe(setProfiles, targetUserId);
    const unsubBudget = budgetService.subscribe(setBudgetProfiles, targetUserId);
    const unsubProtection = protectionService.subscribe(setProtections, targetUserId);

    return () => {
      unsubZakat();
      unsubNetWorth();
      unsubSettings();
      unsubProfile();
      unsubBudget();
      unsubProtection();
    };
  }, [viewingUserId]);

  // Function to extract and sync data from Profiles, Budget, and Protection
  const syncDataFromSources = () => {
    const activeProfile = profiles[0];
    const activeBudget = budgetProfiles[0];

    // A) Income calculation
    let extractedGaji = 0;
    let extractedSewa = 0;
    if (activeBudget?.items) {
      const monthlyNormalIncomes = activeBudget.items
        .filter(i => i.category === 'income' && i.subCategory !== 'deduction' && i.subCategory !== 'rental')
        .reduce((acc, i) => acc + (i.monthly || 0), 0);
      extractedGaji = monthlyNormalIncomes * 12;

      const monthlyRentalIncomes = activeBudget.items
        .filter(i => i.category === 'income' && i.subCategory === 'rental')
        .reduce((acc, i) => acc + Math.max(0, i.monthly || 0), 0);
      extractedSewa = monthlyRentalIncomes * 12;
    } else if (activeProfile?.income) {
      extractedGaji = activeProfile.income * 12;
    }
    setGajiSetahun(extractedGaji);
    setSewaSetahun(extractedSewa);

    // B) Dependent checks (spouse & kids)
    let spCount = 0;
    let childCountUnder18 = 0;
    let childCountIPT = 0;

    if (activeProfile?.dependents) {
      activeProfile.dependents.forEach(dep => {
        const relationship = (dep.relationship || '').toLowerCase();
        if (relationship.includes('spouse') || relationship.includes('isteri') || relationship.includes('suami') || relationship.includes('partner')) {
          spCount++;
        } else if (relationship.includes('anak') || relationship.includes('child') || relationship.includes('daughter') || relationship.includes('son')) {
          if (relationship.includes('ipt') || relationship.includes('belajar') || relationship.includes('uni') || dep.name.toLowerCase().includes('ipt') || dep.name.toLowerCase().includes('uni')) {
            childCountIPT++;
          } else {
            childCountUnder18++;
          }
        }
      });
    }
    setBilSpouse(spCount);
    setBilAnakBawah18(childCountUnder18);
    setBilAnakIPT(childCountIPT);

    // C) KWSP (monthly budget deduction with KWSP label)
    let extractedEPF = 0;
    if (activeBudget?.items) {
      const epfItems = activeBudget.items
        .filter(i => i.category === 'income' && i.subCategory === 'deduction' && (i.label.toLowerCase().includes('kwsp') || i.label.toLowerCase().includes('epf')));
      extractedEPF = epfItems.reduce((acc, i) => acc + (i.monthly || 0), 0) * 12;
    }
    setKwsp(extractedEPF);

    // D) Takaful premiums
    const extractedTakaful = protections.reduce((acc, p) => {
      const premiumAnnual = p.premiumFrequency === 'Monthly' ? (p.premium || 0) * 12 : (p.premium || 0);
      return acc + premiumAnnual;
    }, 0);
    setTakaful(extractedTakaful);

    // E) Nafkah Ibu Bapa (from Budget expense items)
    let extractedIbuBapa = 0;
    if (activeBudget?.items) {
      const parentExpenseItems = activeBudget.items
        .filter(i => i.category === 'expense' && (
          i.id === 'e29' ||
          i.label.toLowerCase().includes('ibubapa') ||
          i.label.toLowerCase().includes('ibu bapa') ||
          i.label.toLowerCase().includes('ibu / bapa') ||
          i.label.toLowerCase().includes('mak ayah') ||
          i.label.toLowerCase().includes('ibu') ||
          i.label.toLowerCase().includes('bapa') ||
          i.label.toLowerCase().includes('parent') ||
          (i.subCategory === 'Gift' && i.label.toLowerCase().includes('nafkah'))
        ));
      extractedIbuBapa = parentExpenseItems.reduce((acc, i) => acc + (i.monthly || 0), 0) * 12;
    }
    setIbuBapa(extractedIbuBapa);
  };

  // Handle Autoload triggers when subscriptions update
  useEffect(() => {
    if (hasAutoloaded) return;

    const hasProfile = profiles.length > 0;
    const hasBudget = budgetProfiles.length > 0;

    if (hasProfile || hasBudget) {
      syncDataFromSources();
      setHasAutoloaded(true);
    }
  }, [profiles, budgetProfiles, protections, hasAutoloaded]);

  const forceReloadIncomeZakatData = () => {
    setIsSyncing(true);
    syncDataFromSources();
    setHasAutoloaded(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => {
        setSyncSuccess(false);
      }, 3500);
    }, 350);
  };

  // Helper values for assets mapping
  const assetTypes = useMemo(() => [
    'Tunai & Setara Tunai',
    'Bank dan Akaun Simpanan',
    'Saham, saham amanah, koperasi',
    'Hartanah',
    'Emas, Perak & Logam Berharga',
    'AKAUN KWSP',
    'Sijil Takaful (Nilai Tunai)'
  ], []);

  const categoriesFound = useMemo(() => {
    const cats = new Set<string>(netWorthItems.filter(i => i.type === 'Asset').map(i => i.category || ''));
    const sorted = assetTypes.filter(cat => cats.has(cat));
    const others = Array.from(cats).filter(cat => !assetTypes.includes(cat)).sort();
    return [...sorted, ...others];
  }, [netWorthItems, assetTypes]);

  const totalZakat = items.reduce((acc, i) => acc + i.amount, 0);

  const zSettings = useMemo(() => zakatSettings || {
    userId: '',
    excludedAssetIds: [],
    nisab: 25000,
    updatedAt: new Date().toISOString()
  }, [zakatSettings]);

  const assets = netWorthItems.filter(i => i.type === 'Asset');
  
  // Zakat Assets mapper (Ticked = Zakatable, Unticked = Excluded)
  const zakatAssets = useMemo(() => assets.map(asset => {
    const isExcluded = (zSettings.excludedAssetIds || []).includes(asset.id!);
    const zakatAmount = (asset.value || 0) * 0.025;
    return { ...asset, isExcluded, zakatAmount };
  }), [assets, zSettings.excludedAssetIds]);

  // Calculate sum of zakatable (i.e. not excluded) assets
  const totalZakatAbleAssets = useMemo(() => zakatAssets
    .filter(a => !a.isExcluded)
    .reduce((acc, a) => acc + (a.value || 0), 0), [zakatAssets]);

  const isAboveNisab = totalZakatAbleAssets >= zSettings.nisab && zSettings.nisab > 0;
  
  // Zakat Harta is 2.5% of total wealth if it hits Nisab (historically) or exact 2.5% of ticked assets
  const recommendedZakat = totalZakatAbleAssets * 0.025;

  // Tab 2 (Zakat Pendapatan PPZ) calculations
  const jumlahPendapatanKasarSetahun = useMemo(() => {
    return gajiSetahun + bonusSetahun + sewaSetahun + lainSetahun;
  }, [gajiSetahun, bonusSetahun, sewaSetahun, lainSetahun]);

  const valuePasangan = bilSpouse * 5000;
  const valueAnakBawah18 = bilAnakBawah18 * 2000;
  const valueAnakIPT = bilAnakIPT * 8000;
  const valueKwspSecured = Math.min(4000, kwsp);
  const valueTakafulSecured = Math.min(3000, takaful);

  const jumlahTolakanPelepasanSetahun = useMemo(() => {
    return diriSendiri + valuePasangan + valueAnakBawah18 + valueAnakIPT + valueKwspSecured + valueTakafulSecured + ibuBapa + lainLainPelepasan;
  }, [diriSendiri, valuePasangan, valueAnakBawah18, valueAnakIPT, valueKwspSecured, valueTakafulSecured, ibuBapa, lainLainPelepasan]);

  const pendapatanBersihLayakZakat = useMemo(() => {
    return Math.max(0, jumlahPendapatanKasarSetahun - jumlahTolakanPelepasanSetahun);
  }, [jumlahPendapatanKasarSetahun, jumlahTolakanPelepasanSetahun]);

  const isMencapaiNisabZakatPendapatan = useMemo(() => {
    return pendapatanBersihLayakZakat >= zSettings.nisab && zSettings.nisab > 0;
  }, [pendapatanBersihLayakZakat, zSettings.nisab]);

  const recommendedZakatPendapatanTahunan = useMemo(() => {
    return isMencapaiNisabZakatPendapatan ? pendapatanBersihLayakZakat * 0.025 : 0;
  }, [pendapatanBersihLayakZakat, isMencapaiNisabZakatPendapatan]);

  const recommendedZakatPendapatanBulanan = useMemo(() => {
    return recommendedZakatPendapatanTahunan / 12;
  }, [recommendedZakatPendapatanTahunan]);

  // Actions
  const handleSubmitPaidZakat = async (e: FormEvent) => {
    e.preventDefault();
    if ((formData.amount || 0) <= 0) return;
    const targetUserId = viewingUserId || auth.currentUser?.uid;
    await zakatService.add({
      ...formData,
      userId: targetUserId || ''
    } as any, targetUserId);
    setFormData({ year: new Date().getFullYear(), amount: 0, type: 'Pendapatan', datePaid: new Date().toISOString().split('T')[0] });
    setIsAdding(false);
  };

  const handleQuickAddZakatRecord = async (amount: number, type: 'Pendapatan' | 'Simpanan' | 'Emas' | 'Saham' | 'EPF', year: number) => {
    if (amount <= 0) return;
    const targetUserId = viewingUserId || auth.currentUser?.uid;
    setIsSaving(true);
    try {
      await zakatService.add({
        userId: targetUserId || '',
        year,
        amount: parseFloat(amount.toFixed(2)),
        type,
        datePaid: new Date().toISOString().split('T')[0]
      } as any, targetUserId);
    } catch (err) {
      console.error('Failed to quick add zakat record:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAssetExclusion = (assetId: string) => {
    const currentExcluded = zSettings.excludedAssetIds || [];
    const newExcluded = currentExcluded.includes(assetId)
      ? currentExcluded.filter(id => id !== assetId)
      : [...currentExcluded, assetId];
    handleUpdateSettings({ excludedAssetIds: newExcluded });
  };

  const handleUpdateSettings = (updates: Partial<ZakatSettings>) => {
    setZakatSettings(prev => {
      const base = prev || {
        userId: auth.currentUser?.uid || '',
        excludedAssetIds: [],
        nisab: 25000,
        updatedAt: new Date().toISOString()
      };
      return { ...base, ...updates };
    });
  };

  const saveSettings = async () => {
    if (!zakatSettings) return;
    setIsSaving(true);
    try {
      const targetUserId = viewingUserId || auth.currentUser?.uid;
      if (zakatSettings.id) {
        await zakatSettingsService.update(zakatSettings.id, { ...zakatSettings, updatedAt: new Date().toISOString() });
      } else {
        await zakatSettingsService.add({ ...zakatSettings, userId: targetUserId || '', updatedAt: new Date().toISOString() }, targetUserId);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save zakat settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const groupedAssets = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    categoriesFound.forEach(cat => groups[cat] = []);

    zakatAssets.forEach(asset => {
      const cat = categoriesFound.find(c => c.toLowerCase() === (asset.category || '').toLowerCase()) || 'LAIN-LAIN';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(asset);
    });

    return groups;
  }, [zakatAssets, categoriesFound]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Modul 6: PENYUCIAN</h1>
          <p className="text-xs text-slate-400 font-medium tracking-wider uppercase mt-1">Penyucian harta & zakat</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              year: new Date().getFullYear(),
              amount: 0,
              type: activeTab === 'harta' ? 'Simpanan' : 'Pendapatan',
              datePaid: new Date().toISOString().split('T')[0]
            });
            setIsAdding(true);
          }}
          className="flex items-center justify-center gap-2 bg-[#1A365D] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all shadow-sm active:scale-95"
          id="btn-tambah-rekod-zakat"
        >
          <Plus size={16} />
          Rekod Bayaran Zakat
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-slate-800">
        
        {/* LEFT COLUMN: GLOBAL STATS & SETTINGS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card 1: Ringkasan Pengiraan Zakat Semasa */}
          <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-indigo-800">
            <div className="absolute -right-8 -bottom-8 opacity-5">
              <Sparkles size={140} />
            </div>
            
            <div className="relative z-10 space-y-5">
              <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Rumusan Kewajipan Zakat</p>
              
              <div className="space-y-3.5 border-b border-indigo-800/60 pb-4">
                <div className="flex justify-between items-center text-xs text-indigo-200/90 font-bold uppercase tracking-wider">
                  <span>Zakat Harta:</span>
                  <span className="font-mono text-white text-sm">
                    RM {recommendedZakat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-xs text-indigo-200/90 font-bold uppercase tracking-wider">
                  <span>Zakat Pendapatan:</span>
                  <span className="font-mono text-white text-sm">
                    RM {recommendedZakatPendapatanTahunan.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <p className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-widest block mb-1">Jumlah Zakat Perlu Dibayar</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-indigo-300">RM</span>
                  <span className="text-4xl font-mono font-black tracking-tighter">
                    {(recommendedZakat + recommendedZakatPendapatanTahunan).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-indigo-800/40 text-[10px] text-indigo-200/60 font-semibold uppercase leading-relaxed">
                * Anggaran tahunan semasa berdasarkan aset bersih & kalkulator pendapatan PPZ.
              </div>
            </div>
          </div>

          {/* Card 2: Nisbah/Nisab Configuration */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Coins className="text-emerald-600" size={18} />
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Tetapan Haul & Nisab</h3>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Nilai Nisab Setahun Semasa
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-black text-xs">RM</span>
                <NumericInput 
                  value={zSettings.nisab}
                  onChange={(val) => handleUpdateSettings({ nisab: val })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-xs font-mono font-black text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                  placeholder="25000"
                />
              </div>
              <p className="text-[9px] text-slate-400 leading-relaxed uppercase pt-0.5">
                * Dirujuk daripada Lembaga Zakat tempatan setahun (Contoh: Wilayah Persekutuan 2026: ~RM 25,000 - RM 26,000).
              </p>
            </div>

            <button
              onClick={saveSettings}
              disabled={isSaving}
              className={`w-full flex items-center justify-center gap-2 py-3.5 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-[0_4px_18px_rgba(16,185,129,0.35)] ring-4 ring-emerald-500/20 disabled:opacity-50 ${
                isSaving
                  ? 'bg-emerald-600 scale-100'
                  : saveSuccess
                    ? 'bg-emerald-600'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(16,185,129,0.45)]'
              }`}
              id="btn-save-nisab-settings"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={14} /> : <Save size={14} />}
              {saveSuccess ? 'Tetapan Disimpan' : 'Simpan Tetapan Nisab'}
            </button>
          </div>

          {/* Card 3: Quick Guide */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Layers size={14} className="text-indigo-600" />
                Formula & Rujukan PPZ
              </h3>
            </div>
            <div className="p-6 space-y-4 text-slate-600">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-indigo-600 uppercase font-black tracking-widest mb-1">1. Zakat Harta (Wealth)</p>
                <p className="text-[11px] leading-relaxed uppercase font-medium">
                  2.5% daripada keseluruhan baki aset cair / layak zakat (Zakatable) sekiranya nilai baki akhir melepasi paras nisab semasa.
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-indigo-600 uppercase font-black tracking-widest mb-1">2. Zakat Pendapatan (Income)</p>
                <p className="text-[11px] leading-relaxed uppercase font-medium">
                  Menggunakan <strong>Muzakarah Jawatankuasa Fatwa PPZ</strong>:
                  <br />
                  <span className="text-slate-800 font-bold block mt-1">Pendapatan Bersih (Kasar - Pelepasan) × 2.5%</span>
                  Sifatnya membenarkan tolakan diri, isteri, anak, KWSP, takaful, dan pemberian nafkah ibu bapa.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MAIN TABS & CALCULATORS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Tabs Selector Navigation */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1.5 border border-slate-200">
            <button
              onClick={() => setActiveTab('harta')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all ${activeTab === 'harta' ? 'bg-white text-indigo-900 shadow-md border border-slate-200/50' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40'}`}
              id="tab-zakat-harta"
            >
              <Landmark size={15} />
              Zakat Harta
            </button>
            <button
              onClick={() => setActiveTab('pendapatan')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all ${activeTab === 'pendapatan' ? 'bg-white text-indigo-900 shadow-md border border-slate-200/50' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40'}`}
              id="tab-zakat-pendapatan"
            >
              <ReceiptText size={15} />
              Zakat Pendapatan
            </button>
          </div>

          {/* TAB 1: ZAKAT HARTA CONTENT */}
          <AnimatePresence mode="wait">
            {activeTab === 'harta' && (
              <motion.div
                key="tab-harta"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Wealth Zakat Summary Block */}
                <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-2">
                    <p className="text-[10px] text-emerald-800 uppercase font-black tracking-widest">Kandungan Aset Zakatable</p>
                    <div className="flex items-baseline gap-1.5 text-emerald-950">
                      <span className="text-xl font-bold">RM</span>
                      <span className="text-4xl font-mono font-black tracking-tight">
                        {totalZakatAbleAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${isAboveNisab ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-amber-100 border-amber-300 text-amber-800'}`}>
                        {isAboveNisab ? 'Mengatasi Nisab' : 'Di Bawah Paras Nisab'}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Nisab: RM {zSettings.nisab.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between h-full space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider leading-none">Anggaran Zakat Harta (2.5%)</p>
                        <p className="text-2xl font-mono font-black text-slate-800 tracking-tight mt-1">
                          RM {recommendedZakat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <span className="p-1 px-2 text-[9px] font-black bg-emerald-100 border border-emerald-200 rounded text-emerald-700 select-none">
                        2.5%
                      </span>
                    </div>
                    
                    {recommendedZakat > 0 && (
                      <button
                        onClick={() => handleQuickAddZakatRecord(recommendedZakat, 'Simpanan', new Date().getFullYear())}
                        disabled={isSaving}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                        id="btn-quick-add-zakat-harta"
                      >
                        {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        Rekod ke Sejarah Bayaran
                      </button>
                    )}
                  </div>
                </div>

                {/* Assets Checklist Panel */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-widest flex items-center gap-2">
                      <UserCheck size={14} className="text-slate-400" />
                      Senarai Pemilihan Aset (Pilihan Zakatable)
                    </h4>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">
                      Tandakan aset yang mahu disucikan
                    </span>
                  </div>

                  <div className="space-y-6 pt-2">
                    {categoriesFound.map((category, catIdx) => {
                      const itemsInCat = groupedAssets[category];
                      if (!itemsInCat || itemsInCat.length === 0) return null;
                      return (
                        <div key={category} className="space-y-2.5">
                          <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-lg">
                            {category}
                          </span>
                          
                          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden shadow-inner">
                            {itemsInCat.map((asset) => (
                              <div key={asset.id} className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${asset.isExcluded ? 'bg-slate-50/20 opacity-60' : 'hover:bg-indigo-50/20 bg-white'}`}>
                                <div className="flex items-center gap-3">
                                  <input 
                                    type="checkbox"
                                    checked={!asset.isExcluded}
                                    onChange={() => toggleAssetExclusion(asset.id!)}
                                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                                    id={`check-asset-zakatable-${asset.id}`}
                                  />
                                  <div>
                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-tight leading-tight">{asset.name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{asset.category}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-8 justify-between md:justify-end">
                                  <div className="text-right">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Jumlah Nilai</p>
                                    <p className="text-xs font-mono font-bold text-slate-700">RM {asset.value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                  </div>
                                  <div className="text-right border-l border-slate-200/60 pl-8">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Zakat (2.5%)</p>
                                    <p className={`text-xs font-mono font-extrabold ${asset.isExcluded ? 'text-slate-300' : 'text-emerald-600'}`}>
                                      RM {asset.zakatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {zakatAssets.length === 0 && (
                      <div className="p-12 text-center bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center">
                        <AlertCircle className="text-slate-300 mb-2" size={32} />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tiada rekod aset dijumpai dalam Net Worth.</p>
                        <p className="text-[10px] text-slate-400 uppercase mt-1 text-center">Sila reka aset terlebih dahulu di halaman Nilai Aset Bersih.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: ZAKAT PENDAPATAN CONTENT */}
            {activeTab === 'pendapatan' && (
              <motion.div
                key="tab-pendapatan"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Top Notification Sync Status */}
                <div className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner transition-all duration-300 ${
                  syncSuccess 
                    ? 'bg-emerald-50 border border-emerald-200' 
                    : 'bg-indigo-50 border border-indigo-100'
                }`}>
                  <div className="flex items-center gap-3">
                    {syncSuccess ? (
                      <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
                    ) : (
                      <RefreshCw className={`text-indigo-600 shrink-0 ${isSyncing ? 'animate-spin' : 'animate-pulse'}`} size={18} />
                    )}
                    <div>
                      <h4 className={`text-[11px] font-black uppercase tracking-tight ${syncSuccess ? 'text-emerald-900' : 'text-indigo-900'}`}>
                        {syncSuccess ? 'Sinkronisasi Aliran Tunai Selesai' : 'Sinkronisasi Aliran Tunai Aktif'}
                      </h4>
                      <p className={`text-[9px] uppercase font-semibold leading-relaxed mt-0.5 leading-tight ${syncSuccess ? 'text-emerald-700' : 'text-indigo-600'}`}>
                        {syncSuccess 
                          ? 'Data gaji, bonus, takaful, KWSP & nafkah ibu bapa telah berjaya diselaraskan daripada Profil, Bajet & Perlindungan.' 
                          : 'Amaun gaji, bonus, takaful, KWSP & nafkah ibu bapa dicari secara pintar daripada Profil, Bajet & Perlindungan.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={forceReloadIncomeZakatData}
                    disabled={isSyncing}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0 flex items-center justify-center gap-1.5 ${
                      syncSuccess
                        ? 'bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700'
                        : isSyncing
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-wait'
                        : 'bg-white hover:bg-slate-50 text-indigo-900 border border-indigo-200'
                    }`}
                    id="btn-re-sync-zakat"
                  >
                    {syncSuccess ? (
                      <>
                        <Check size={13} className="shrink-0" />
                        <span>Telah Disinkron!</span>
                      </>
                    ) : isSyncing ? (
                      <>
                        <RefreshCw size={12} className="animate-spin shrink-0 text-indigo-600" />
                        <span>Menyelaras...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={12} className="shrink-0 text-indigo-500" />
                        <span>Muat Semula / Sync</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Main Calculator Stack (Atas & Bawah) */}
                <div className="space-y-6">
                  
                  {/* Bahagian Borang: Input Pendapatan & Pelepasan */}
                  <div className="space-y-6">
                    
                    {/* Section 1: Pendapatan Setahun */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                      <div className="flex items-center gap-2 border-b border-indigo-50 pb-2">
                        <Coins className="text-indigo-600 shrink-0" size={15} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Pendapatan Setahun (Annual Gross)</h4>
                      </div>

                      <div className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Gaji Setahun (Gaji Pokok & Allowances)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">RM</span>
                              <NumericInput 
                                value={gajiSetahun}
                                onChange={setGajiSetahun}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-mono font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Bonus Setahun</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">RM</span>
                              <NumericInput 
                                value={bonusSetahun}
                                onChange={setBonusSetahun}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-mono font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block font-semibold">Pendapatan Sewaan Setahun (Bersih)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">RM</span>
                              <NumericInput 
                                value={sewaSetahun}
                                onChange={setSewaSetahun}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-mono font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                              />
                            </div>
                            <span className="text-[8px] text-indigo-600 font-black tracking-widest uppercase block mt-1">* Auto-sync dari Modul 1 Aliran Tunai</span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block font-semibold">Pendapatan Lain Setahun (Dividen, Niaga dll)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">RM</span>
                              <NumericInput 
                                value={lainSetahun}
                                onChange={setLainSetahun}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-mono font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Tolakan Pelepasan Semasa */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                      <div className="flex items-center gap-2 border-b border-indigo-50 pb-2">
                        <Calculator className="text-emerald-600 shrink-0" size={15} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Had Pelepasan Tolakan Setahun</h4>
                      </div>

                      <div className="space-y-4">
                        {/* Pelepasan Diri (RM 12,000 Flat) */}
                        <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-xs font-bold text-slate-700 uppercase">Diri Sendiri (Tetap)</span>
                            <p className="text-[9px] text-slate-400 uppercase font-semibold leading-none mt-0.5">Had siling standard mengikut PPZ</p>
                          </div>
                          <span className="font-mono font-bold text-xs text-slate-800">RM 12,000.00</span>
                        </div>

                        {/* Pasangan */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center border-t border-slate-100 pt-3">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-700 uppercase">Isteri & Suami</span>
                            <p className="text-[9px] text-slate-400 uppercase font-semibold leading-tight">RM 5,000 setiap pasangan yang ditanggung</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setBilSpouse(prev => Math.max(0, prev - 1))}
                              className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200 active:scale-95"
                            >
                              -
                            </button>
                            <div className="flex-1 text-center font-mono font-black text-xs text-slate-800 bg-slate-50 border border-slate-200 py-1.5 rounded-lg select-none">
                              {bilSpouse} ({ (bilSpouse * 5000).toLocaleString(undefined, { minimumFractionDigits: 0 }) } RM)
                            </div>
                            <button 
                              onClick={() => setBilSpouse(prev => prev + 1)}
                              className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200 active:scale-95"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Anak di bawah 18 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center border-t border-slate-100 pt-3">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-700 uppercase">Anak &lt; 18 Tahun</span>
                            <p className="text-[9px] text-slate-400 uppercase font-semibold leading-tight">RM 2,000 setiap anak sekolah/bawah umur</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setBilAnakBawah18(prev => Math.max(0, prev - 1))}
                              className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200 active:scale-95 animate-none"
                            >
                              -
                            </button>
                            <div className="flex-1 text-center font-mono font-black text-xs text-slate-800 bg-slate-50 border border-slate-200 py-1.5 rounded-lg select-none">
                              {bilAnakBawah18} ({ (bilAnakBawah18 * 2000).toLocaleString(undefined, { minimumFractionDigits: 0 }) } RM)
                            </div>
                            <button 
                              onClick={() => setBilAnakBawah18(prev => prev + 1)}
                              className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200 active:scale-95 animate-none"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Anak IPT */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center border-t border-slate-100 pt-3">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-700 uppercase">Anak Belajar IPT</span>
                            <p className="text-[9px] text-slate-400 uppercase font-semibold leading-tight">RM 8,000 setiap anak universiti/kolej</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setBilAnakIPT(prev => Math.max(0, prev - 1))}
                              className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200 active:scale-95"
                            >
                              -
                            </button>
                            <div className="flex-1 text-center font-mono font-black text-xs text-slate-800 bg-slate-50 border border-slate-200 py-1.5 rounded-lg select-none">
                              {bilAnakIPT} ({ (bilAnakIPT * 8000).toLocaleString(undefined, { minimumFractionDigits: 0 }) } RM)
                            </div>
                            <button 
                              onClick={() => setBilAnakIPT(prev => prev + 1)}
                              className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-200 active:scale-95"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* KWSP / EPF (Max RM4,000) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center border-t border-slate-100 pt-3">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-700 uppercase">Caruman KWSP Setahun</span>
                            <p className="text-[9px] text-slate-400 uppercase font-semibold leading-tight">Maksimum tolakan PPZ: RM 4,000</p>
                          </div>
                          <div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-black">RM</span>
                              <NumericInput 
                                value={kwsp}
                                onChange={setKwsp}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-mono font-bold text-slate-700 outline-none font-semibold text-right"
                              />
                            </div>
                            {kwsp > 4000 && (
                              <p className="text-[8px] font-semibold text-amber-600 uppercase text-right mt-1">* Melimpasi had! Tolakan terhad kepada RM 4,000</p>
                            )}
                          </div>
                        </div>

                        {/* Takaful premium (Max RM3,000) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center border-t border-slate-100 pt-3">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-700 uppercase">Premium Takaful Setahun</span>
                            <p className="text-[9px] text-slate-400 uppercase font-semibold leading-tight">Maksimum tolakan PPZ: RM 3,000</p>
                          </div>
                          <div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-black">RM</span>
                              <NumericInput 
                                value={takaful}
                                onChange={setTakaful}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-mono font-bold text-slate-700 outline-none font-semibold text-right"
                              />
                            </div>
                            {takaful > 3000 && (
                              <p className="text-[8px] font-semibold text-amber-600 uppercase text-right mt-1">* Melimpasi had! Tolakan terhad kepada RM 3,000</p>
                            )}
                          </div>
                        </div>

                        {/* Pemberian Ibu bapa */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center border-t border-slate-100 pt-3">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-700 uppercase">Nafkah Ibu bapa</span>
                            <p className="text-[9px] text-slate-400 uppercase font-semibold leading-tight">Jumlah sumbangan nafkah setahun kepada ibu bapa</p>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-black">RM</span>
                            <NumericInput 
                              value={ibuBapa}
                              onChange={setIbuBapa}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-mono font-bold text-slate-700 outline-none font-semibold text-right"
                            />
                          </div>
                        </div>

                        {/* Lain-lain Pelepasan */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center border-t border-slate-100 pt-3">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-700 uppercase">Lain-lain pelepasan</span>
                            <p className="text-[9px] text-slate-400 uppercase font-semibold leading-tight">Termasuk pelaburan Tabung Haji tahunan, zakat lain dll</p>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-black">RM</span>
                            <NumericInput 
                              value={lainLainPelepasan}
                              onChange={setLainLainPelepasan}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-mono font-bold text-slate-700 outline-none font-semibold text-right"
                            />
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>

                  {/* Bahagian Bawah: Petak Rumusan Zakat Pendapatan */}
                  <div>
                    
                    <div className="bg-white border-2 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                      <div className="bg-slate-800 text-white px-5 py-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                          <Calculator size={14} className="text-emerald-400" />
                          Petak Rumusan Zakat Pendapatan
                        </h4>
                      </div>

                      <div className="p-5 space-y-4 text-xs font-bold text-slate-600 uppercase">
                        
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="text-[10px] font-black text-slate-400">Total Kasar (Setahun)</span>
                          <span className="font-mono text-slate-800">RM {jumlahPendapatanKasarSetahun.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="text-[10px] font-black text-slate-400">Total Pelepasan</span>
                          <span className="font-mono text-slate-800 text-rose-500">- RM {jumlahTolakanPelepasanSetahun.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between items-center border-b border-indigo-50 pb-2 text-indigo-900 bg-indigo-50/50 p-2 rounded-lg">
                          <span className="text-[10px] font-black">Pendapatan Layak Zakat</span>
                          <span className="font-mono text-base">RM {pendapatanBersihLayakZakat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="text-[10px] font-black text-slate-400">Nilai Nisab</span>
                          <span className="font-mono text-slate-800">RM {zSettings.nisab.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="text-[10px] font-black text-slate-400">Status Nisab</span>
                          {isMencapaiNisabZakatPendapatan ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">Wajib Zakat</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-200">Bawah Nisab (Bebas)</span>
                          )}
                        </div>

                        <div className="pt-3 mt-3 border-t-2 border-dashed border-slate-200">
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-800 space-y-3 normal-case font-normal text-xs">
                            <div className="flex justify-between items-baseline">
                              <span className="text-[10px] font-black text-slate-400 uppercase">Kewajipan Zakat Setahun (2.5%)</span>
                              <span className="font-mono text-xl font-black text-indigo-900 tracking-tight">
                                RM {recommendedZakatPendapatanTahunan.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-baseline pt-1 border-t border-slate-200/60 font-semibold">
                              <span className="text-[10px] font-black text-slate-400 uppercase">Potongan Zakat Bulanan (PGB/Skim)</span>
                              <span className="font-mono text-sm font-bold text-slate-800">
                                RM {recommendedZakatPendapatanBulanan.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {recommendedZakatPendapatanTahunan > 0 && (
                          <div className="space-y-2 pt-2">
                            <button
                              onClick={() => handleQuickAddZakatRecord(recommendedZakatPendapatanTahunan, 'Pendapatan', new Date().getFullYear())}
                              disabled={isSaving}
                              className="w-full py-3 bg-indigo-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50"
                              id="btn-quick-add-zakat-pendapatan-tahunan"
                            >
                              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                              Rekod Zakat Setahun (RM {recommendedZakatPendapatanTahunan.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                            </button>
                            
                            <button
                              onClick={() => handleQuickAddZakatRecord(recommendedZakatPendapatanBulanan, 'Pendapatan', new Date().getFullYear())}
                              disabled={isSaving}
                              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-indigo-900 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border border-indigo-100 active:scale-95 disabled:opacity-50"
                              id="btn-quick-add-zakat-pendapatan-bulanan"
                            >
                              Rekod Potongan Sebulan (RM {recommendedZakatPendapatanBulanan.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                            </button>
                          </div>
                        )}

                      </div>
                    </div>

                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* HISTORIC PAYMENT SUMMARY & HISTORY TABLE */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest flex items-center gap-2">
                <ReceiptText size={16} className="text-indigo-600" />
                Sejarah Pembayaran Zakat Terkumpul
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/20 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-4">Tahun</th>
                    <th className="px-6 py-4">Jenis Zakat</th>
                    <th className="px-6 py-4">Tarikh Bayaran</th>
                    <th className="px-6 py-4 text-right">Amaun Bayar</th>
                    <th className="px-6 py-4 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {items.length > 0 ? (
                    items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 font-mono font-bold text-slate-800">{item.year}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${item.type === 'Pendapatan' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                            {item.type === 'Pendapatan' ? 'Zakat Pendapatan' : `Zakat ${item.type}`}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide">
                          {item.datePaid || '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-black text-slate-800 text-sm">
                          RM {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => item.id && zakatService.remove(item.id)} 
                            className="text-slate-300 hover:text-rose-600 transition-colors p-2 bg-slate-50 rounded-lg hover:bg-rose-50"
                            id={`btn-delete-zakat-record-${item.id}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-slate-400 italic text-[10px] uppercase font-bold tracking-widest">
                        Tiada sejarah rekod pembayaran zakat dijumpai. Sila rekodkan di atas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* POPUP: ADD NEW MANUAL TRANSACTION OR DETAILS */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-8 rounded-3xl max-w-sm w-full shadow-2xl relative border border-slate-100 text-slate-800"
            >
              <button 
                onClick={() => setIsAdding(false)}
                className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-900 transition-colors hover:bg-slate-100 rounded-full"
                id="btn-close-zakat-modal"
              >
                <Plus size={20} className="rotate-45" />
              </button>

              <div className="mb-6">
                <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <CheckCircleBadge className="text-emerald-500" size={20} />
                  Rekod Zakat Dibayar baru
                </h2>
                <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">Simpan bayaran ke dalam sejarah</p>
              </div>

              <form onSubmit={handleSubmitPaidZakat} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tahun</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                      value={formData.year}
                      onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempat Amaun (RM)</label>
                    <NumericInput
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold text-emerald-600 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                      value={formData.amount || 0}
                      onChange={val => setFormData({ ...formData, amount: val })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Pembayaran Zakat</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-slate-700 uppercase"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    <option value="Pendapatan">Zakat Pendapatan</option>
                    <option value="Simpanan">Zakat Simpanan (Harta)</option>
                    <option value="Emas">Zakat Emas</option>
                    <option value="Saham">Zakat Saham</option>
                    <option value="EPF">Zakat EPF</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarikh Bayaran</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 pl-11 pr-4 py-2.5 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-slate-700 font-mono"
                      value={formData.datePaid}
                      onChange={e => setFormData({ ...formData, datePaid: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest mt-2 hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(16,185,129,0.45)] active:scale-95 transition-all shadow-[0_4px_18px_rgba(16,185,129,0.35)] ring-4 ring-emerald-500/20"
                  id="btn-save-manual-zakat"
                >
                  Simpan Rekod Pembayaran
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Save Button */}
      <div className="fixed bottom-16 right-6 z-50 md:bottom-20 md:right-10">
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-4 rounded-full font-black text-xs md:text-sm uppercase tracking-wider transition-all shadow-[0_10px_30px_rgba(16,185,129,0.4)] hover:shadow-[0_15px_35px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 ring-4 ring-emerald-500/20 ${
            saveSuccess 
              ? 'bg-emerald-600 text-white' 
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
          }`}
          title="Simpan Tetapan Nisab"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
          <span>{saveSuccess ? 'Tetapan Disimpan' : 'Simpan Tetapan'}</span>
        </button>
      </div>
    </div>
  );
}

function CheckCircleBadge({ className, size }: { className?: string; size?: number }) {
  return (
    <div className={`rounded-full bg-emerald-100 text-emerald-600 p-1 flex items-center justify-center ${className}`}>
      <Check size={size ? size - 4 : 12} strokeWidth={3} />
    </div>
  );
}
