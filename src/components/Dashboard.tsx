import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { 
  Wallet, 
  ShieldCheck, 
  Vault, 
  TrendingUp, 
  Sparkles, 
  ScrollText,
  ChevronRight,
  Info,
  Building2,
  PlayCircle,
  AlertTriangle,
  TrendingDown,
  Target,
  ArrowUpRight,
  Shield,
  HelpCircle,
  FileDown,
  ExternalLink,
  Award,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  cashflowService, 
  protectionService, 
  savingsService, 
  investmentService,
  zakatService,
  netWorthService,
  budgetService,
  profileService,
  retirementService
} from '../services';
import { Transaction, Protection, Savings, Investment, ZakatRecord, NetWorthItem, BudgetProfile, UserProfile, RetirementSettings } from '../types';
import { auth } from '../firebase';

const COLORS = {
  household: '#FBBF24', // Yellow
  debt: '#2DD4BF',      // Teal
  surplus: '#10B981',   // Green
  gift: '#FB923C',      // Orange
  others: '#94A3B8'     // Slate/Grey
};

// Mini Colored Speedometer Gauge Component for Module Cards
function MiniMeterGauge({ score }: { score: number }) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const angle = (clampedScore / 100) * 180 - 90;

  let activeColor = '#F43F5E';
  if (clampedScore >= 80) activeColor = '#10B981';
  else if (clampedScore >= 60) activeColor = '#06B6D4';
  else if (clampedScore >= 40) activeColor = '#F59E0B';

  return (
    <div className="w-full flex flex-col items-center pt-1">
      <div className="relative w-28 h-14">
        <svg viewBox="0 0 100 58" className="w-full h-full overflow-visible">
          {/* 4 Colored Arc Segments */}
          <path d="M 12 52 A 38 38 0 0 1 28 24" fill="none" stroke="#F43F5E" strokeWidth="7" strokeLinecap="round" opacity={clampedScore < 40 ? 1 : 0.35} />
          <path d="M 31 21 A 38 38 0 0 1 48 14" fill="none" stroke="#F59E0B" strokeWidth="7" opacity={clampedScore >= 40 && clampedScore < 60 ? 1 : 0.35} />
          <path d="M 52 14 A 38 38 0 0 1 69 21" fill="none" stroke="#06B6D4" strokeWidth="7" opacity={clampedScore >= 60 && clampedScore < 80 ? 1 : 0.35} />
          <path d="M 72 24 A 38 38 0 0 1 88 52" fill="none" stroke="#10B981" strokeWidth="7" strokeLinecap="round" opacity={clampedScore >= 80 ? 1 : 0.35} />

          {/* Needle Pointer */}
          <g transform={`rotate(${angle} 50 52)`} className="transition-transform duration-700 ease-out">
            <polygon points="48.5,52 50,18 51.5,52" fill="#1E293B" />
            <circle cx="50" cy="52" r="4.5" fill="#1E293B" />
            <circle cx="50" cy="52" r="2" fill="#FFFFFF" />
          </g>
        </svg>
      </div>
      <div className="flex items-center justify-between w-full px-1 text-[8px] font-mono text-slate-400 -mt-1">
        <span>0</span>
        <span className="font-black text-xs font-sans" style={{ color: activeColor }}>{clampedScore} <span className="text-[9px] font-normal text-slate-400">/ 100</span></span>
        <span>100</span>
      </div>
    </div>
  );
}

// Hero Speedometer Meter Gauge Component for Total Score
function HeroSpeedometerGauge({ score }: { score: number }) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const angle = (clampedScore / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-48 sm:w-56 h-28 sm:h-32">
        <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
          <defs>
            <filter id="heroGaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.4"/>
            </filter>
          </defs>

          {/* Track Background */}
          <path
            d="M 20 105 A 80 80 0 0 1 180 105"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* 4 Colored Segments of the Speedometer Meter */}
          {/* 1. Merah / Red (0 - 39): Kritikal */}
          <path
            d="M 20 105 A 80 80 0 0 1 54.3 43.8"
            fill="none"
            stroke="#F43F5E"
            strokeWidth="16"
            strokeLinecap="round"
            opacity={clampedScore < 40 ? 1 : 0.45}
          />
          {/* 2. Kuning / Amber (40 - 59): Sederhana */}
          <path
            d="M 58 39.5 A 80 80 0 0 1 97.2 25"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="16"
            opacity={clampedScore >= 40 && clampedScore < 60 ? 1 : 0.45}
          />
          {/* 3. Biru / Teal (60 - 79): Baik */}
          <path
            d="M 102.8 25 A 80 80 0 0 1 142 39.5"
            fill="none"
            stroke="#06B6D4"
            strokeWidth="16"
            opacity={clampedScore >= 60 && clampedScore < 80 ? 1 : 0.45}
          />
          {/* 4. Hijau / Emerald (80 - 100): Cemerlang */}
          <path
            d="M 145.7 43.8 A 80 80 0 0 1 180 105"
            fill="none"
            stroke="#10B981"
            strokeWidth="16"
            strokeLinecap="round"
            opacity={clampedScore >= 80 ? 1 : 0.45}
          />

          {/* Tick Markers */}
          <line x1="20" y1="105" x2="28" y2="105" stroke="white" strokeWidth="2" opacity="0.7" />
          <line x1="100" y1="25" x2="100" y2="33" stroke="white" strokeWidth="2" opacity="0.7" />
          <line x1="180" y1="105" x2="172" y2="105" stroke="white" strokeWidth="2" opacity="0.7" />

          {/* Needle Pointer */}
          <g transform={`rotate(${angle} 100 105)`} className="transition-transform duration-1000 ease-out">
            <polygon points="97,105 100,32 103,105" fill="#FFFFFF" filter="url(#heroGaugeShadow)" />
            <circle cx="100" cy="105" r="9" fill="#FFFFFF" />
            <circle cx="100" cy="105" r="4.5" fill="#0F172A" />
          </g>
        </svg>

        {/* Min / Max Labels */}
        <div className="absolute left-1 bottom-0 text-[10px] font-mono font-bold text-white/80">0</div>
        <div className="absolute right-1 bottom-0 text-[10px] font-mono font-bold text-white/80">100</div>
      </div>

      <div className="mt-1 flex flex-col items-center">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">{clampedScore}</span>
          <span className="text-[10px] font-bold text-white/70 uppercase">/ 100</span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/80 mt-0.5">Meter Kesihatan Kewangan</p>
      </div>
    </div>
  );
}

export default function Dashboard({ switchTab }: { switchTab: (tab: any) => void }) {
  const { viewingUserId, viewingUserName } = useApp();
  const [showPrintModal, setShowPrintModal] = useState(false);

  const handlePdfExport = () => {
    let inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch (e) {
      inIframe = true;
    }

    const clientName = profiles[0]?.name || viewingUserName || 'Pelanggan';
    document.title = `BMW Planner Report - ${clientName}`;

    if (inIframe) {
      setShowPrintModal(true);
    } else {
      window.print();
    }
  };

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [protections, setProtections] = useState<Protection[]>([]);
  const [savings, setSavings] = useState<Savings[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [zakatRecords, setZakatRecords] = useState<ZakatRecord[]>([]);
  const [netWorthItems, setNetWorthItems] = useState<NetWorthItem[]>([]);
  const [budgetProfiles, setBudgetProfiles] = useState<BudgetProfile[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [retirementSettings, setRetirementSettings] = useState<RetirementSettings[]>([]);

  useEffect(() => {
    const targetUserId = viewingUserId || auth.currentUser?.uid;
    if (!targetUserId) return;

    const unsubCash = cashflowService.subscribe(setTransactions, targetUserId);
    const unsubProt = protectionService.subscribe(setProtections, targetUserId);
    const unsubSav = savingsService.subscribe(setSavings, targetUserId);
    const unsubInv = investmentService.subscribe(setInvestments, targetUserId);
    const unsubZak = zakatService.subscribe(setZakatRecords, targetUserId);
    const unsubNW = netWorthService.subscribe(setNetWorthItems, targetUserId);
    const unsubBudget = budgetService.subscribe(setBudgetProfiles, targetUserId);
    const unsubProfile = profileService.subscribe(setProfiles, targetUserId);
    const unsubRet = retirementService.subscribe(setRetirementSettings, targetUserId);

    return () => {
      unsubCash();
      unsubProt();
      unsubSav();
      unsubInv();
      unsubZak();
      unsubNW();
      unsubBudget();
      unsubProfile();
      unsubRet();
    };
  }, [viewingUserId]);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const netCashflow = totalIncome - totalExpense;

  const totalProtection = protections.reduce((acc, p) => acc + p.coverageAmount, 0);
  const totalSavings = savings.reduce((acc, s) => acc + s.currentAmount, 0);
  const totalInvestment = investments.reduce((acc, i) => acc + i.currentValue, 0);
  
  const totalAssets = netWorthItems.filter(i => i.type === 'Asset').reduce((acc, i) => acc + i.value, 0);
  const totalLiabilities = netWorthItems.filter(i => i.type === 'Liability').reduce((acc, i) => acc + i.value, 0);
  const calculatedNetWorth = totalAssets - totalLiabilities;

  // INFAQ Model Categorization
  const getInfaqData = () => {
    const profile = budgetProfiles[0];
    if (profile && profile.items.length > 0) {
      const getSubTotal = (cat: string | null, sub?: string) => 
        profile.items
          .filter(i => (cat ? i.category === cat : true) && (sub ? i.subCategory === sub : true))
          .reduce((acc, i) => acc + (i.monthly || 0), 0);

      const incomeItems = profile.items.filter(i => i.category === 'income');
      const activeIncome = incomeItems.filter(i => i.subCategory === 'active').reduce((acc, i) => acc + (i.monthly || 0), 0);
      const additionalIncome = incomeItems.filter(i => i.subCategory === 'additional').reduce((acc, i) => acc + (i.monthly || 0), 0);
      const deductions = incomeItems.filter(i => i.subCategory === 'deduction').reduce((acc, i) => acc + (i.monthly || 0), 0);
      const netIncome = (activeIncome + additionalIncome) - deductions;

      const debt = getSubTotal('expense', 'Debt');
      const gift = getSubTotal('expense', 'Gift');
      // Household is all expenses except Debt and Gift
      const totalExpense = getSubTotal('expense');
      const household = totalExpense - debt - gift;
      const surplus = Math.max(0, netIncome - totalExpense);
      
      const denominator = Math.max(netIncome, totalExpense, 1);

      return [
        { name: 'ISI RUMAH', value: household, color: COLORS.household, target: 30, percentage: (household / denominator) * 100 },
        { name: 'HUTANG', value: debt, color: COLORS.debt, target: 30, percentage: (debt / denominator) * 100 },
        { name: 'LEBIHAN', value: surplus, color: COLORS.surplus, target: 30, percentage: (surplus / denominator) * 100 },
        { name: 'PEMBERIAN', value: gift, color: COLORS.gift, target: 5, percentage: (gift / denominator) * 100 },
        { name: 'LAIN-LAIN', value: 0, color: COLORS.others, target: 5, percentage: 0 },
      ];
    }

    // Fallback to transaction estimation
    const expenses = transactions.filter(t => t.type === 'expense');
    
    let household = 0;
    let debt = 0;
    let gift = 0;
    let others = 0;

    expenses.forEach(t => {
      const cat = (t.category || '').toLowerCase();
      if (cat.includes('rumah') || cat.includes('kereta') || cat.includes('pinjaman') || cat.includes('hutang')) {
        debt += t.amount;
      } else if (cat.includes('zakat') || cat.includes('sedekah') || cat.includes('ibubapa') || cat.includes('infaq') || cat.includes('pemberian') || cat.includes('gift')) {
        gift += t.amount;
      } else if (cat.includes('makan') || cat.includes('minyak') || cat.includes('utiliti') || cat.includes('belanja')) {
        household += t.amount;
      } else {
        others += t.amount;
      }
    });

    const incomeVal = Math.max(totalIncome, 1);
    const totalExp = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const surplus = Math.max(0, totalIncome - totalExp);

    return [
      { name: 'ISI RUMAH', value: household, color: COLORS.household, target: 30, percentage: (household / incomeVal) * 100 },
      { name: 'HUTANG', value: debt, color: COLORS.debt, target: 30, percentage: (debt / incomeVal) * 100 },
      { name: 'LEBIHAN', value: surplus, color: COLORS.surplus, target: 30, percentage: (surplus / incomeVal) * 100 },
      { name: 'PEMBERIAN', value: gift, color: COLORS.gift, target: 5, percentage: (gift / incomeVal) * 100 },
      { name: 'LAIN-LAIN', value: others, color: COLORS.others, target: 5, percentage: (others / incomeVal) * 100 },
    ];
  };

  const infaqData = getInfaqData();
  const totalVal = infaqData.reduce((acc, item) => acc + item.value, 0);

  const modules = [
    { 
      id: 'cashflow', 
      label: 'Modul 1: Aliran Tunai', 
      icon: Wallet, 
      value: `RM ${netCashflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      color: 'bg-emerald-500', 
      desc: 'Aliran tunai positif adalah kunci.' 
    },
    { 
      id: 'networth', 
      label: 'Modul 2: Nilai Aset Bersih', 
      icon: Building2, 
      value: `RM ${calculatedNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      color: 'bg-slate-600', 
      desc: 'Aset tolak liabiliti (Harta Sebenar).' 
    },
    { 
      id: 'savings', 
      label: 'Modul 3: Simpanan', 
      icon: Vault, 
      value: `RM ${totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      color: 'bg-amber-500', 
      desc: 'Dana kecemasan (3-6 bulan).' 
    },
    { 
      id: 'protection', 
      label: 'Modul 4: Perlindungan', 
      icon: ShieldCheck, 
      value: `RM ${totalProtection.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      color: 'bg-indigo-500', 
      desc: 'Takaful adalah payung kewangan.' 
    },
    { 
      id: 'investment', 
      label: 'Modul 5: Pelaburan', 
      icon: TrendingUp, 
      value: `RM ${totalInvestment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      color: 'bg-blue-500', 
      desc: 'Gandaan kekayaan masa hadapan.' 
    },
    { 
      id: 'zakat', 
      label: 'Modul 6: Penyucian', 
      icon: Sparkles, 
      value: `${zakatRecords.length} Rekod`, 
      color: 'bg-purple-500', 
      desc: 'Keberkatan dalam harta.' 
    },
    { 
      id: 'inheritance', 
      label: 'Modul 7: Pewarisan', 
      icon: ScrollText, 
      value: `Pusaka & Wasiat`, 
      color: 'bg-rose-500', 
      desc: 'Perancangan pewarisan.' 
    },
  ];

  // --- ADDITIONAL ANALYTICAL CALCULATIONS ---
  // A) Profile, Income, Baseline
  const profile = profiles[0];
  const rSettings = retirementSettings[0] || {
    targetAge: 60,
    inflationRate: 5,
    postRetirementSpendingRatio: 70,
    expectedRoi: 6,
    assetRois: {} as { [assetId: string]: number },
    excludedAssetIds: [] as string[],
    isRenting: false,
    monthlyRent: 0,
  };

  // Get net income from budget items or fallback to total Income
  const netMonthlyIncome = budgetProfiles[0]?.items?.filter(i => i.category === 'income')
    .reduce((acc, i) => acc + (i.monthly || 0) * (i.subCategory === 'deduction' ? -1 : 1), 0) || totalIncome || 1;
  const incomeForCalculations = Math.max(1, netMonthlyIncome);

  // B) Cashflow metrics inside the INFAQ model are extracted from infaqData
  const dsrItem = infaqData.find(d => d.name === 'HUTANG');
  const dsrPercent = dsrItem ? dsrItem.percentage : 0;

  const surplusItem = infaqData.find(d => d.name === 'LEBIHAN');
  const surplusPercent = surplusItem ? surplusItem.percentage : 0;

  // DSR Status
  const dsrStatus = (() => {
    if (dsrPercent === 0) return { label: 'AMAT KUAT (Tiada Hutang)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (dsrPercent <= 30) return { label: 'SIHAT (≤ 30%)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (dsrPercent <= 40) return { label: 'AMARAN (30% - 40%)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'KRITIKAL (> 40%)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  })();

  // Surplus Status
  const surplusStatus = (() => {
    if (surplusPercent >= 30) return { label: 'AMAT SIHAT (Cemerlang ≥ 30%)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (surplusPercent >= 10) return { label: 'SIHAT (Stabil 10% - 29%)', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (surplusPercent > 0) return { label: 'AMARAN (< 10%)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'KRITIKAL (Tiada Lebihan)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  })();

  // C) Net Worth indicators
  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const debtToAssetStatus = (() => {
    if (totalAssets === 0 && totalLiabilities === 0) return { label: 'TIADA REKOD', color: 'text-slate-500 bg-slate-50 border-slate-200' };
    if (debtToAssetRatio <= 35) return { label: 'AMAT SIHAT (Liabiliti Rendah ≤ 35%)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (debtToAssetRatio <= 50) return { label: 'SIHAT (Kukuh 35% - 50%)', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    return { label: 'BAHAYA (Leveraj Tinggi > 50%)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  })();

  // Liquid assets to Liabilities
  const liquidAssetsSum = netWorthItems.filter(i => i.type === 'Asset' && i.isLiquid).reduce((acc, i) => acc + i.value, 0);
  const liquidToDebtRatio = totalLiabilities > 0 ? (liquidAssetsSum / totalLiabilities) * 100 : 0;
  const liquidToDebtStatus = (() => {
    if (totalLiabilities === 0) return { label: 'AMAT KUKUH (Tiada Hutang)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (liquidToDebtRatio >= 100) return { label: 'SIHAT (Aset Cair Cukup Untuk Tutup Liabiliti)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (liquidToDebtRatio >= 50) return { label: 'SEDERHANA (Perlindungan SEPARA 50% - 99%)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'KRITIKAL (Aset Cair Sangat Rendah < 50%)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  })();

  // D) SASARAN DAN SHORTFALL KEWANGAN
  // 1. Simpanan (Emergency Fund)
  const savingsSediaAda = netWorthItems
    .filter(i => i.type === 'Asset' && i.isLiquid && !i.hasCharge)
    .reduce((acc, i) => acc + (i.value || 0), 0);
  const savingsTargetMin = incomeForCalculations * 3;
  const savingsTargetSelesa = incomeForCalculations * 6;
  const savingsShortfallMin = Math.max(0, savingsTargetMin - savingsSediaAda);
  const savingsShortfallSelesa = Math.max(0, savingsTargetSelesa - savingsSediaAda);

  // 2. Perlindungan (Takaful)
  const protectionSediaAda = Math.max(
    protections.reduce((acc, p) => acc + (p.deathBenefit || 0), 0),
    protections.reduce((acc, p) => acc + (p.coverageAmount || 0), 0)
  );
  const annualIncomeSetting = (profile?.income || 0) || (incomeForCalculations * 12);
  const protectionTarget = annualIncomeSetting * 10;
  const protectionShortfall = Math.max(0, protectionTarget - protectionSediaAda);

  // 3. Persaraan
  const currentAge = (() => {
    if (!profile?.dob) return 35;
    const birthDate = new Date(profile.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  })();

  const yearsToRetirement = Math.max(0, rSettings.targetAge - currentAge);
  const monthlyExpenses = budgetProfiles[0]?.items?.filter(i => i.category === 'expense')
    .reduce((acc, i) => acc + (i.monthly || 0), 0) || 0;
  const baselineAnnual = (profile?.income || 0) > 0 ? (profile.income) : (monthlyExpenses * 12 || 36000);
  const futureAnnualBaseline = baselineAnnual * Math.pow(1 + (rSettings.inflationRate / 100), yearsToRetirement);
  const futureMonthlyRent = rSettings.isRenting 
    ? rSettings.monthlyRent * Math.pow(1 + (rSettings.inflationRate / 100), yearsToRetirement)
    : 0;
  const postRetirementAnnualNeeds = (futureAnnualBaseline * (rSettings.postRetirementSpendingRatio / 100)) + (futureMonthlyRent * 12);
  const requiredRetirementFund = postRetirementAnnualNeeds / (Math.max(1, rSettings.expectedRoi) / 100);

  // Projected retirement assets
  const investmentNetWorthAssets = netWorthItems.filter(i => i.type === 'Asset');
  const assetProjections = investmentNetWorthAssets.map(item => {
    const roi = rSettings.assetRois[item.id!] || 0;
    const isHome = item.name?.toLowerCase().includes("rumah kediaman");
    const isAutoExcluded = !rSettings.isRenting && isHome;
    const isExcluded = isAutoExcluded || (rSettings.excludedAssetIds || []).includes(item.id!);
    const futureValue = (item.value || 0) * Math.pow(1 + (roi / 100), yearsToRetirement);
    return { ...item, futureValue, isExcluded };
  });
  const retirementSediaAda = assetProjections
    .filter(i => !i.isExcluded)
    .reduce((acc, i) => acc + i.futureValue, 0);
  const retirementShortfall = Math.max(0, requiredRetirementFund - retirementSediaAda);

  // --- SCOREBOARD KESIHATAN KEWANGAN (MODUL 1 - 5 & TOTAL SCORE) ---
  const scoreboard = useMemo(() => {
    // 1. Modul 1: Aliran Tunai (Max 100)
    let m1DsrScore = 50;
    if (dsrPercent === 0) m1DsrScore = 50;
    else if (dsrPercent <= 30) m1DsrScore = 50;
    else if (dsrPercent <= 40) m1DsrScore = 35;
    else if (dsrPercent <= 50) m1DsrScore = 20;
    else m1DsrScore = Math.max(5, Math.round(50 - (dsrPercent - 30)));

    let m1SurplusScore = 0;
    if (surplusPercent >= 30) m1SurplusScore = 50;
    else if (surplusPercent >= 20) m1SurplusScore = 40;
    else if (surplusPercent >= 10) m1SurplusScore = 30;
    else if (surplusPercent > 0) m1SurplusScore = 15;
    else m1SurplusScore = 0;

    const scoreM1 = Math.min(100, Math.max(1, Math.round(m1DsrScore + m1SurplusScore)));

    // 2. Modul 2: Nilai Aset Bersih (Max 100)
    let m2NwScore = calculatedNetWorth > 0 ? 30 : calculatedNetWorth === 0 ? 15 : 0;
    let m2DtaScore = 40;
    if (totalAssets > 0) {
      if (debtToAssetRatio <= 35) m2DtaScore = 40;
      else if (debtToAssetRatio <= 50) m2DtaScore = 30;
      else if (debtToAssetRatio <= 70) m2DtaScore = 15;
      else m2DtaScore = 5;
    } else {
      m2DtaScore = totalLiabilities === 0 ? 30 : 5;
    }
    let m2LiquidScore = 30;
    if (totalLiabilities > 0) {
      if (liquidToDebtRatio >= 100) m2LiquidScore = 30;
      else if (liquidToDebtRatio >= 50) m2LiquidScore = 20;
      else if (liquidToDebtRatio > 0) m2LiquidScore = 10;
      else m2LiquidScore = 0;
    } else {
      m2LiquidScore = liquidAssetsSum > 0 ? 30 : 20;
    }
    const scoreM2 = Math.min(100, Math.max(1, Math.round(m2NwScore + m2DtaScore + m2LiquidScore)));

    // 3. Modul 3: Simpanan / Dana Kecemasan (Max 100)
    const savingsRatio = savingsTargetSelesa > 0 ? (savingsSediaAda / savingsTargetSelesa) * 100 : (totalSavings > 0 ? 50 : 0);
    const scoreM3 = Math.min(100, Math.max(1, Math.round(savingsRatio)));

    // 4. Modul 4: Perlindungan / Takaful (Max 100)
    const protectionRatio = protectionTarget > 0 ? (protectionSediaAda / protectionTarget) * 100 : (totalProtection > 0 ? 50 : 0);
    const scoreM4 = Math.min(100, Math.max(1, Math.round(protectionRatio)));

    // 5. Modul 5: Pelaburan & Persaraan (Max 100)
    const retirementRatio = requiredRetirementFund > 0 ? (retirementSediaAda / requiredRetirementFund) * 100 : (totalInvestment > 0 ? 50 : 0);
    const scoreM5 = Math.min(100, Math.max(1, Math.round(retirementRatio)));

    // Total Score: Purata 5 modul (1 hingga 100)
    const totalScore = Math.min(100, Math.max(1, Math.round((scoreM1 + scoreM2 + scoreM3 + scoreM4 + scoreM5) / 5)));

    const getGrade = (s: number) => {
      if (s >= 80) return { label: 'Cemerlang', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500', text: 'text-emerald-600' };
      if (s >= 60) return { label: 'Baik', badge: 'bg-teal-50 text-teal-700 border-teal-200', bar: 'bg-teal-500', text: 'text-teal-600' };
      if (s >= 40) return { label: 'Sederhana', badge: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-500', text: 'text-amber-600' };
      return { label: 'Perlu Tindakan', badge: 'bg-rose-50 text-rose-700 border-rose-200', bar: 'bg-rose-500', text: 'text-rose-600' };
    };

    const overallStatus = (() => {
      if (totalScore >= 80) {
        return {
          title: 'KUKUH & BEBAS KEWANGAN',
          desc: 'Kedudukan kewangan anda berada di tahap amat cemerlang dari segi aliran tunai, nilai aset, tabung kecemasan, perlindungan takaful dan pelaburan persaraan.',
          gradient: 'from-emerald-600 via-teal-600 to-emerald-700',
          textColor: 'text-emerald-600',
          badgeColor: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30',
          ringColor: 'stroke-emerald-400'
        };
      }
      if (totalScore >= 60) {
        return {
          title: 'STABIL & TERKAWAL',
          desc: 'Kedudukan kewangan anda sihat dan terkawal. Teruskan pengukuhan dana kecemasan serta konsistensi pelaburan masa hadapan.',
          gradient: 'from-teal-700 via-cyan-800 to-slate-800',
          textColor: 'text-teal-500',
          badgeColor: 'bg-teal-500/20 text-teal-100 border-teal-400/30',
          ringColor: 'stroke-teal-400'
        };
      }
      if (totalScore >= 40) {
        return {
          title: 'SEDERHANA (PERLU PENAMBAHBAIKAN)',
          desc: 'Terdapat jurang kewangan yang perlu diperkemas seperti penstrukturan hutang, pembinaan tabung kecemasan, atau peningkatan perlindungan keluarga.',
          gradient: 'from-amber-700 via-orange-800 to-slate-900',
          textColor: 'text-amber-500',
          badgeColor: 'bg-amber-500/20 text-amber-100 border-amber-400/30',
          ringColor: 'stroke-amber-400'
        };
      }
      return {
        title: 'KRITIKAL (TINDAKAN SEGERA DIPERLUKAN)',
        desc: 'Kedudukan kewangan memerlukan tindakan pemulihan segera terutamanya mengatasi defisit aliran tunai, bebanan liabiliti, dan ketiadaan perlindungan.',
        gradient: 'from-rose-700 via-red-800 to-slate-900',
        textColor: 'text-rose-500',
        badgeColor: 'bg-rose-500/20 text-rose-100 border-rose-400/30',
        ringColor: 'stroke-rose-400'
      };
    })();

    return {
      scoreM1,
      scoreM2,
      scoreM3,
      scoreM4,
      scoreM5,
      totalScore,
      gradeM1: getGrade(scoreM1),
      gradeM2: getGrade(scoreM2),
      gradeM3: getGrade(scoreM3),
      gradeM4: getGrade(scoreM4),
      gradeM5: getGrade(scoreM5),
      overallStatus
    };
  }, [dsrPercent, surplusPercent, calculatedNetWorth, totalAssets, totalLiabilities, debtToAssetRatio, liquidToDebtRatio, liquidAssetsSum, savingsTargetSelesa, savingsSediaAda, totalSavings, protectionTarget, protectionSediaAda, totalProtection, requiredRetirementFund, retirementSediaAda, totalInvestment]);

  return (
    <div className="space-y-6 pb-20">
      {/* Printable Report Header - Only visible during print */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Laporan Kewangan Peribadi</h1>
            <p className="text-xs text-slate-500 font-bold tracking-wider uppercase mt-1">BMW Planner • by INFAQ Consultancy</p>
            <p className="text-xs text-slate-700 font-medium mt-1">Nama Pelanggan: <strong className="text-slate-900">{profile?.name || auth.currentUser?.displayName || viewingUserName || 'Pelanggan'}</strong></p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-950 uppercase">Tarikh Cetakan</p>
            <p className="text-xs font-mono text-slate-700">{new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      <header className="mb-6 flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard Belanjawan</h1>
          <p className="text-xs text-slate-400 font-medium tracking-wider uppercase mt-1">BMW Planner Dashboard</p>
        </div>
        <button
          onClick={handlePdfExport}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(16,185,129,0.35)] active:scale-95 shadow-[0_4px_18px_rgba(16,185,129,0.2)] ring-4 ring-emerald-500/10 cursor-pointer"
          title="Eksport Laporan ini sebagai fail PDF"
        >
          <FileDown size={14} />
          Eksport Laporan (PDF)
        </button>
      </header>

      {/* ================= USER REQUESTED: FINANCIAL HEALTH SCOREBOARD (MODUL 1 - 5 & TOTAL) ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-800 text-xs md:text-sm uppercase tracking-wider flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              Scoreboard Kesihatan Kewangan (Modul 1 – 5)
            </h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Rumusan Indeks Prestasi Kewangan Menyeluruh (Skor 1 hingga 100)</p>
          </div>
          <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 w-fit">
            BMW Holistic Evaluation
          </span>
        </div>

        {/* Total Scoreboard Hero Card with Colored Speedometer Meter */}
        <div className={`rounded-2xl p-6 text-white bg-gradient-to-br ${scoreboard.overallStatus.gradient} shadow-lg relative overflow-hidden`}>
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
            
            {/* Speedometer Meter Display */}
            <div className="md:col-span-5 flex flex-col items-center justify-center text-center">
              <HeroSpeedometerGauge score={scoreboard.totalScore} />
              
              {/* Zone Color Indicator Pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 pt-2 border-t border-white/10 w-full">
                <span className="flex items-center gap-1 text-[8px] font-bold text-white/80">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> &lt;40 Kritikal
                </span>
                <span className="flex items-center gap-1 text-[8px] font-bold text-white/80">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 40-59 Sederhana
                </span>
                <span className="flex items-center gap-1 text-[8px] font-bold text-white/80">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> 60-79 Baik
                </span>
                <span className="flex items-center gap-1 text-[8px] font-bold text-white/80">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> 80-100 Cemerlang
                </span>
              </div>
            </div>

            {/* Assessment & Status Details */}
            <div className="md:col-span-7 space-y-3 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${scoreboard.overallStatus.badgeColor}`}>
                  {scoreboard.overallStatus.title}
                </span>
                <span className="text-[10px] font-bold text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full">
                  Indeks: {scoreboard.totalScore >= 80 ? 'Gred A (Cemerlang)' : scoreboard.totalScore >= 60 ? 'Gred B (Baik)' : scoreboard.totalScore >= 40 ? 'Gred C (Sederhana)' : 'Gred D (Kritikal)'}
                </span>
              </div>
              <h4 className="text-base md:text-lg font-black tracking-tight text-white">
                Tahap Kesihatan Kewangan Anda: {scoreboard.totalScore} / 100
              </h4>
              <p className="text-xs text-white/90 leading-relaxed">
                {scoreboard.overallStatus.desc}
              </p>
            </div>
          </div>
        </div>

        {/* 5 Modules Score Breakdown with Mini Colored Meters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
          
          {/* Modul 1: Aliran Tunai */}
          <div 
            onClick={() => switchTab('cashflow')}
            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-white flex flex-col justify-between group space-y-2.5"
          >
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Wallet size={16} />
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${scoreboard.gradeM1.badge}`}>
                {scoreboard.gradeM1.label}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Modul 1</p>
              <h5 className="text-xs font-black text-slate-800 uppercase leading-tight">Aliran Tunai</h5>
            </div>
            <MiniMeterGauge score={scoreboard.scoreM1} />
            <p className="text-[9px] text-slate-500 font-medium text-center border-t border-slate-100 pt-1.5">DSR {dsrPercent.toFixed(0)}% • Lebihan {surplusPercent.toFixed(0)}%</p>
          </div>

          {/* Modul 2: Nilai Aset Bersih */}
          <div 
            onClick={() => switchTab('networth')}
            className="p-4 rounded-xl border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-white flex flex-col justify-between group space-y-2.5"
          >
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Building2 size={16} />
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${scoreboard.gradeM2.badge}`}>
                {scoreboard.gradeM2.label}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Modul 2</p>
              <h5 className="text-xs font-black text-slate-800 uppercase leading-tight">Nilai Aset Bersih</h5>
            </div>
            <MiniMeterGauge score={scoreboard.scoreM2} />
            <p className="text-[9px] text-slate-500 font-medium text-center border-t border-slate-100 pt-1.5">Leveraj {debtToAssetRatio.toFixed(0)}% • Cair {liquidToDebtRatio.toFixed(0)}%</p>
          </div>

          {/* Modul 3: Simpanan */}
          <div 
            onClick={() => switchTab('savings')}
            className="p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-white flex flex-col justify-between group space-y-2.5"
          >
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Vault size={16} />
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${scoreboard.gradeM3.badge}`}>
                {scoreboard.gradeM3.label}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Modul 3</p>
              <h5 className="text-xs font-black text-slate-800 uppercase leading-tight">Simpanan Kecemasan</h5>
            </div>
            <MiniMeterGauge score={scoreboard.scoreM3} />
            <p className="text-[9px] text-slate-500 font-medium text-center border-t border-slate-100 pt-1.5">Capai {(Math.min(100, (savingsSediaAda / (savingsTargetSelesa || 1)) * 100)).toFixed(0)}% Tabung 6 Bln</p>
          </div>

          {/* Modul 4: Perlindungan */}
          <div 
            onClick={() => switchTab('protection')}
            className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-white flex flex-col justify-between group space-y-2.5"
          >
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${scoreboard.gradeM4.badge}`}>
                {scoreboard.gradeM4.label}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Modul 4</p>
              <h5 className="text-xs font-black text-slate-800 uppercase leading-tight">Perlindungan Takaful</h5>
            </div>
            <MiniMeterGauge score={scoreboard.scoreM4} />
            <p className="text-[9px] text-slate-500 font-medium text-center border-t border-slate-100 pt-1.5">Capai {(Math.min(100, (protectionSediaAda / (protectionTarget || 1)) * 100)).toFixed(0)}% Had 10x Gaji</p>
          </div>

          {/* Modul 5: Pelaburan */}
          <div 
            onClick={() => switchTab('investment')}
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-white flex flex-col justify-between group space-y-2.5"
          >
            <div className="flex justify-between items-start">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${scoreboard.gradeM5.badge}`}>
                {scoreboard.gradeM5.label}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Modul 5</p>
              <h5 className="text-xs font-black text-slate-800 uppercase leading-tight">Pelaburan Persaraan</h5>
            </div>
            <MiniMeterGauge score={scoreboard.scoreM5} />
            <p className="text-[9px] text-slate-500 font-medium text-center border-t border-slate-100 pt-1.5">Capai {(Math.min(100, (retirementSediaAda / (requiredRetirementFund || 1)) * 100)).toFixed(0)}% Dana Sasaran</p>
          </div>

        </div>
      </div>

      {/* INFAQ Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Komposisi Perbelanjaan</h3>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
              <Sparkles size={10} />
              MODEL INFAQ
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={infaqData.length > 0 ? infaqData : [{ name: 'Sila Masukkan Data', value: 1, color: '#F1F5F9' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {infaqData.length > 0 ? (
                    infaqData.filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))
                  ) : (
                    <Cell fill="#F1F5F9" />
                  )}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-4">
            {infaqData.map(model => (
              <div key={model.name} className="flex flex-col items-center text-center">
                <div className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: model.color }}></div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{model.name}</p>
                <p className="text-xs font-mono font-bold text-slate-800">{(model.percentage || 0).toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Modules Shortcut */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {modules.map((item, index) => (
          <button
            key={item.id}
            onClick={() => switchTab(item.id)}
            className="bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-200 transition-all text-center group active:scale-95 shadow-sm"
          >
            <div className={`w-8 h-8 mx-auto rounded-lg ${item.color} text-white flex items-center justify-center mb-2 shadow-sm`}>
              <item.icon size={16} />
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter group-hover:text-slate-800">{item.label}</p>
          </button>
        ))}
      </div>

      {/* ================= USER REQUESTED: KEY ANALYTICS SECTIONS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SECTION 1: INDICATOR KESIHATAN ALIRAN TUNAI & NILAI ASET BERSIH */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-600" />
              Indikator Aliran Tunai & Nilai Aset Bersih
            </h3>
            <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              Analisis Formula
            </span>
          </div>

          <div className="space-y-4">
            {/* Indicator 1: Nisbah Kos Hutang (DSR) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Nisbah Khidmat Hutang (DSR)</span>
                <span className="font-mono font-bold text-slate-800">{dsrPercent.toFixed(1)}% <span className="text-[9px] font-normal text-slate-400">(Sasaran ≤ 30%)</span></span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${dsrPercent <= 30 ? 'bg-emerald-500' : dsrPercent <= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(100, dsrPercent)}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-400 leading-tight">Formula: Hutang Bulanan ÷ Pendapatan Bersih</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${dsrStatus.color}`}>
                  {dsrStatus.label}
                </span>
              </div>
            </div>

            {/* Indicator 2: Kadar Simpanan / Lebihan */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Kadar Lebihan Aliran Tunai</span>
                <span className="font-mono font-bold text-slate-800">{surplusPercent.toFixed(1)}% <span className="text-[9px] font-normal text-slate-400">(Sasaran Model ≥ 30%)</span></span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${surplusPercent >= 30 ? 'bg-emerald-500' : surplusPercent >= 10 ? 'bg-blue-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(100, surplusPercent)}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-400 leading-tight">Formula: Lebihan Surplus ÷ Pendapatan Bersih</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${surplusStatus.color}`}>
                  {surplusStatus.label}
                </span>
              </div>
            </div>

            {/* Indicator 3: Debt to Asset Ratio */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Nisbah Hutang-kepada-Aset</span>
                <span className="font-mono font-bold text-slate-800">{debtToAssetRatio.toFixed(1)}% <span className="text-[9px] font-normal text-slate-400">(Sasaran Selesa ≤ 50%)</span></span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${debtToAssetRatio <= 35 ? 'bg-emerald-500' : debtToAssetRatio <= 50 ? 'bg-blue-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(100, debtToAssetRatio)}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-400 leading-tight">Formula: Jumlah Liabiliti ÷ Jumlah Aset</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${debtToAssetStatus.color}`}>
                  {debtToAssetStatus.label}
                </span>
              </div>
            </div>

            {/* Indicator 4: Liquid Assets to Liabilities */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Reserv Cair (Liquid to Debt)</span>
                <span className="font-mono font-bold text-slate-800">{liquidToDebtRatio.toFixed(1)}% <span className="text-[9px] font-normal text-slate-400">(Saranan ≥ 100%)</span></span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${liquidToDebtRatio >= 100 ? 'bg-emerald-500' : liquidToDebtRatio >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(100, liquidToDebtRatio)}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-400 leading-tight">Formula: Jumlah Aset Cair ÷ Jumlah Liabiliti</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${liquidToDebtStatus.color}`}>
                  {liquidToDebtStatus.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: ANALISIS SASARAN DAN SHORTFALL KEWANGAN */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              Analisis Sasaran & Shortfall (Kekurangan)
            </h3>
            <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              Sedia Ada vs Sasaran
            </span>
          </div>

          <div className="space-y-3">
            {/* item 1: Simpanan Kecemasan */}
            <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Vault size={14} />
                  </div>
                  <span className="text-xs font-extrabold text-slate-700">Tabung Kecemasan (Dana 6 Bulan)</span>
                </div>
                {savingsShortfallSelesa > 0 ? (
                  <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase">
                    Kekurangan Dana
                  </span>
                ) : (
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">
                    SIHAT
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-slate-100">
                <div>
                  <p className="text-[9px] text-slate-400 font-medium uppercase">Sedia Ada</p>
                  <p className="font-mono font-bold text-slate-700">RM {savingsSediaAda.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-medium uppercase">Sasaran</p>
                  <p className="font-mono font-bold text-slate-700">RM {savingsTargetSelesa.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-medium uppercase">Shortfall</p>
                  <p className={`font-mono font-bold ${savingsShortfallSelesa > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    RM {savingsShortfallSelesa.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>

            {/* item 2: Perlindungan Takaful */}
            <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <ShieldCheck size={14} />
                  </div>
                  <span className="text-xs font-extrabold text-slate-700">Perlindungan Kematian (10x Pendapatan)</span>
                </div>
                {protectionShortfall > 0 ? (
                  <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase">
                    Kekurangan Dana
                  </span>
                ) : (
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">
                    SIHAT
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-slate-100">
                <div>
                  <p className="text-[9px] text-slate-400 font-medium uppercase">Sedia Ada</p>
                  <p className="font-mono font-bold text-slate-700">RM {protectionSediaAda.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-medium uppercase">Sasaran</p>
                  <p className="font-mono font-bold text-slate-700">RM {protectionTarget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-medium uppercase">Shortfall</p>
                  <p className={`font-mono font-bold ${protectionShortfall > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    RM {protectionShortfall.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>

            {/* item 3: Tabung Persaraan */}
            <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center">
                    <TrendingUp size={14} />
                  </div>
                  <span className="text-xs font-extrabold text-slate-700">Tabung Persaraan (Unjuran Umur {rSettings.targetAge})</span>
                </div>
                {retirementShortfall > 0 ? (
                  <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase">
                    Kekurangan Dana
                  </span>
                ) : (
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">
                    SIHAT
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-slate-100">
                <div>
                  <p className="text-[9px] text-slate-400 font-medium uppercase">Sedia Ada (Unjuran)</p>
                  <p className="font-mono font-bold text-slate-700">RM {retirementSediaAda.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-medium uppercase">Sasaran</p>
                  <p className="font-mono font-bold text-slate-700">RM {requiredRetirementFund.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-medium uppercase">Shortfall</p>
                  <p className={`font-mono font-bold ${retirementShortfall > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    RM {retirementShortfall.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-[10px] uppercase tracking-widest flex items-center gap-2">
              <Wallet size={12} /> Aktiviti Terkini
            </h3>
            <button onClick={() => switchTab('cashflow')} className="text-[9px] font-bold text-emerald-600 hover:underline uppercase">Detail</button>
          </div>
          <div className="divide-y divide-slate-50">
            {transactions.slice(0, 3).map(t => (
              <div key={t.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <Wallet size={12} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-800">{t.category}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{t.date}</p>
                  </div>
                </div>
                <p className={`text-[11px] font-mono font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.type === 'income' ? '+' : '-'}RM {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            ))}
            {transactions.length === 0 && <p className="p-8 text-center text-[10px] text-slate-400 italic">Tiada data.</p>}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Sparkles size={12} /> Status Checklist
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Aliran Tunai Positif', done: netCashflow > 0 },
              { label: 'Takaful Aktif', done: totalProtection > 0 },
              { label: 'Dana Kecemasan Matlamat', done: totalSavings >= 1000 },
              { label: 'Pelaburan Bermula', done: totalInvestment > 0 },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${step.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
                  <small className="text-[7px]">✓</small>
                </div>
                <span className={`text-[11px] ${step.done ? 'text-slate-800 font-bold' : 'text-slate-400'}`}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Iframe Print/Export Helper Modal */}
      <AnimatePresence>
        {showPrintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <FileDown size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sila Buka di Tab Baru untuk Eksport PDF</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Pelayar web menyekat fungsi cetakan dan simpanan PDF secara terus di dalam "AI Studio Preview" (iframe) atas sebab-sebab keselamatan peranti anda.
                </p>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Sila buka aplikasi ini dalam tab penuh browser anda terlebih dahulu untuk melengkapkan eksport PDF dengan lancar.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="w-full sm:order-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Kembali
                </button>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowPrintModal(false)}
                  className="w-full sm:order-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                >
                  <ExternalLink size={14} />
                  Buka di Tab Baru
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
