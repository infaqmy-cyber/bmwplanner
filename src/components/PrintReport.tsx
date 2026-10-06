import { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useApp } from '../contexts/AppContext';
import { auth } from '../firebase';
import { 
  cashflowService, 
  protectionService, 
  savingsService, 
  investmentService,
  zakatService,
  netWorthService,
  budgetService,
  profileService,
  retirementService,
  zakatSettingsService,
  inheritanceSettingsService
} from '../services';
import { 
  Transaction, 
  Protection, 
  Savings, 
  Investment, 
  ZakatRecord, 
  NetWorthItem, 
  BudgetProfile, 
  UserProfile, 
  RetirementSettings,
  ZakatSettings,
  InheritanceSettings
} from '../types';

function PageHeader({ moduleTitle, leftTitle = "BMW Planner Report by INFAQ Consultancy" }: { moduleTitle: string; leftTitle?: string }) {
  return (
    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 mb-2 print-card">
      <div className="text-[10px] font-black tracking-tight text-slate-600 uppercase flex items-center gap-1.5">
        <span className="text-[#1A365D]">✓</span> {leftTitle}
      </div>
      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
        {moduleTitle}
      </div>
    </div>
  );
}

function PageFooter({ pageNum, totalPages, company = "BMW Planner Report by INFAQ Consultancy" }: { pageNum?: number; totalPages?: number; company?: string }) {
  return (
    <div className="border-t border-slate-200 pt-1.5 mt-auto flex justify-between items-center text-[8px] text-slate-400 font-medium print-card print-page-footer">
      <div className="uppercase tracking-wider">
        {company}
      </div>
      <div>
        {pageNum ? `Halaman ${pageNum}` : ''}
      </div>
    </div>
  );
}

// Mini Colored Speedometer Gauge Component for Module Cards in PDF Report (Light Theme)
function MiniMeterGauge({ score }: { score: number }) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const angle = (clampedScore / 100) * 180 - 90;

  let activeColor = '#F43F5E';
  if (clampedScore >= 80) activeColor = '#10B981';
  else if (clampedScore >= 60) activeColor = '#06B6D4';
  else if (clampedScore >= 40) activeColor = '#F59E0B';

  return (
    <div className="w-full flex flex-col items-center pt-0.5">
      <div className="relative w-20 h-10">
        <svg viewBox="0 0 100 58" className="w-full h-full overflow-visible">
          {/* Base track */}
          <path d="M 12 52 A 38 38 0 0 1 88 52" fill="none" stroke="#E2E8F0" strokeWidth="7" strokeLinecap="round" />
          {/* 4 Colored Arc Segments */}
          <path d="M 12 52 A 38 38 0 0 1 28 24" fill="none" stroke="#F43F5E" strokeWidth="7" strokeLinecap="round" opacity={clampedScore < 40 ? 1 : 0.35} />
          <path d="M 31 21 A 38 38 0 0 1 48 14" fill="none" stroke="#F59E0B" strokeWidth="7" opacity={clampedScore >= 40 && clampedScore < 60 ? 1 : 0.35} />
          <path d="M 52 14 A 38 38 0 0 1 69 21" fill="none" stroke="#06B6D4" strokeWidth="7" opacity={clampedScore >= 60 && clampedScore < 80 ? 1 : 0.35} />
          <path d="M 72 24 A 38 38 0 0 1 88 52" fill="none" stroke="#10B981" strokeWidth="7" strokeLinecap="round" opacity={clampedScore >= 80 ? 1 : 0.35} />

          {/* Needle Pointer */}
          <g transform={`rotate(${angle} 50 52)`}>
            <polygon points="48.5,52 50,18 51.5,52" fill="#1E293B" />
            <circle cx="50" cy="52" r="4" fill="#1E293B" />
            <circle cx="50" cy="52" r="1.5" fill="#FFFFFF" />
          </g>
        </svg>
      </div>
      <div className="flex items-center justify-between w-full px-1 text-[7px] font-mono text-slate-400 -mt-0.5">
        <span>0</span>
        <span className="font-black text-[10px] font-sans" style={{ color: activeColor }}>{clampedScore} <span className="text-[7px] font-normal text-slate-400">/ 100</span></span>
        <span>100</span>
      </div>
    </div>
  );
}

// Hero Speedometer Meter Gauge Component for Total Score in PDF Report (Light Background)
function HeroSpeedometerGauge({ score }: { score: number }) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const angle = (clampedScore / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-40 h-20">
        <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
          <defs>
            <filter id="reportHeroGaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodOpacity="0.2"/>
            </filter>
          </defs>

          {/* Track Background */}
          <path
            d="M 20 105 A 80 80 0 0 1 180 105"
            fill="none"
            stroke="#E2E8F0"
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
            opacity={clampedScore < 40 ? 1 : 0.35}
          />
          {/* 2. Kuning / Amber (40 - 59): Sederhana */}
          <path
            d="M 58 39.5 A 80 80 0 0 1 97.2 25"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="16"
            opacity={clampedScore >= 40 && clampedScore < 60 ? 1 : 0.35}
          />
          {/* 3. Biru / Teal (60 - 79): Baik */}
          <path
            d="M 102.8 25 A 80 80 0 0 1 142 39.5"
            fill="none"
            stroke="#06B6D4"
            strokeWidth="16"
            opacity={clampedScore >= 60 && clampedScore < 80 ? 1 : 0.35}
          />
          {/* 4. Hijau / Emerald (80 - 100): Cemerlang */}
          <path
            d="M 145.7 43.8 A 80 80 0 0 1 180 105"
            fill="none"
            stroke="#10B981"
            strokeWidth="16"
            strokeLinecap="round"
            opacity={clampedScore >= 80 ? 1 : 0.35}
          />

          {/* Tick Markers */}
          <line x1="20" y1="105" x2="28" y2="105" stroke="#94A3B8" strokeWidth="2" opacity="0.8" />
          <line x1="100" y1="25" x2="100" y2="33" stroke="#94A3B8" strokeWidth="2" opacity="0.8" />
          <line x1="180" y1="105" x2="172" y2="105" stroke="#94A3B8" strokeWidth="2" opacity="0.8" />

          {/* Needle Pointer */}
          <g transform={`rotate(${angle} 100 105)`}>
            <polygon points="97,105 100,32 103,105" fill="#1E293B" filter="url(#reportHeroGaugeShadow)" />
            <circle cx="100" cy="105" r="9" fill="#1E293B" />
            <circle cx="100" cy="105" r="4.5" fill="#FFFFFF" />
          </g>
        </svg>

        {/* Min / Max Labels */}
        <div className="absolute left-1 bottom-0 text-[8px] font-mono font-bold text-slate-500">0</div>
        <div className="absolute right-1 bottom-0 text-[8px] font-mono font-bold text-slate-500">100</div>
      </div>

      <div className="mt-0.5 flex flex-col items-center">
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black tracking-tight text-slate-900">{clampedScore}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase">/ 100</span>
        </div>
        <p className="text-[7px] font-black uppercase tracking-widest text-slate-600">Meter Kesihatan Kewangan</p>
      </div>
    </div>
  );
}

export default function PrintReport() {
  const { viewingUserId, viewingUserName } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [protections, setProtections] = useState<Protection[]>([]);
  const [savings, setSavings] = useState<Savings[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [zakatRecords, setZakatRecords] = useState<ZakatRecord[]>([]);
  const [netWorthItems, setNetWorthItems] = useState<NetWorthItem[]>([]);
  const [budgetProfiles, setBudgetProfiles] = useState<BudgetProfile[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [retirementSettings, setRetirementSettings] = useState<RetirementSettings[]>([]);
  const [zakatSettings, setZakatSettings] = useState<ZakatSettings[]>([]);
  const [inheritanceSettings, setInheritanceSettings] = useState<InheritanceSettings[]>([]);

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
    const unsubZSettings = zakatSettingsService.subscribe(setZakatSettings, targetUserId);
    const unsubInherit = inheritanceSettingsService.subscribe(setInheritanceSettings, targetUserId);

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
      unsubZSettings();
      unsubInherit();
    };
  }, [viewingUserId]);

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
  const iSettings = inheritanceSettings[0] || {
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
  };
  const zSettings = zakatSettings[0] || {
    userId: '',
    excludedAssetIds: [] as string[],
    nisab: 25000,
    updatedAt: new Date().toISOString()
  };

  // --- Profile Calculation ---
  const currentAge = useMemo(() => {
    if (!profile?.dob) return 30;
    const birthDate = new Date(profile.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }, [profile]);

  const profileAnalysisText = useMemo(() => {
    if (currentAge < 40) {
      return "Anda berada di FASA PEMBINAAN KERJAYA & PENGUMPULAN ASET (Wealth Accumulation). Fokus utama yang sangat kritikal dalam fasa umur ini adalah membina tabung kecemasan yang kalis inflasi, melupuskan hutang kad kredit/peribadi (jika ada), serta mula melabur secara konsisten ke dalam instrumen shariah berimpak tinggi. Sila pastikan anda mempunyai Polisi Takaful perlindungan pendapatan untuk melindungi keupayaan anda bekerja.";
    } else if (currentAge >= 40 && currentAge < 50) {
      return "Anda berada di FASA MATANG & KONSOLIDASI KEWANGAN (Wealth Consolidation). Fasa umur ini menuntut ketepatan dalam pengurusan liabiliti sedia ada agar diselesaikan sepenuhnya sebelum bersara. Portfolio pelaburan hendaklah disemak secara berkala agar seimbang antara pertumbuhan modal dan perlindungan modal. Sangat disyorkan untuk memastikan perlindungan takaful perubatan dan penyakit kritikal anda mencukupi bagi menghalang kebocoran simpanan.";
    } else {
      return "Anda berada di FASA PRA-PERSARAAN & PEMELIHARAAN MODAL (Wealth Preservation). Fokus pelaburan utama hendaklah beralih kepada instrumen pendapatan tetap berisiko rendah dan dividen konsisten bagi mengekalkan kuasa beli selepas pencen. Struktur keluarga, wasiat syariah, serta instrumen hibah harta hendaklah didokumentasikan dengan segera untuk memastikan kelancaran transisi kekayaan kepada ahli keluarga tersayang.";
    }
  }, [currentAge]);

  // --- Cashflow & Budget Calculations ---
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  const budgetIncomeList = useMemo(() => {
    return budgetProfiles[0]?.items?.filter(i => i.category === 'income') || [];
  }, [budgetProfiles]);

  const budgetExpenseList = useMemo(() => {
    return budgetProfiles[0]?.items?.filter(i => i.category === 'expense') || [];
  }, [budgetProfiles]);

  const grossMonthlyIncome = useMemo(() => {
    return budgetIncomeList.filter(i => i.subCategory !== 'deduction').reduce((acc, i) => acc + (i.monthly || 0), 0);
  }, [budgetIncomeList]);

  const totalDeductions = useMemo(() => {
    return budgetIncomeList.filter(i => i.subCategory === 'deduction').reduce((acc, i) => acc + (i.monthly || 0), 0);
  }, [budgetIncomeList]);

  const totalMonthlyIncomeBudget = grossMonthlyIncome - totalDeductions;
  const netMonthlyIncome = totalMonthlyIncomeBudget > 0 ? totalMonthlyIncomeBudget : (totalIncome || 1);
  const incomeForCalculations = Math.max(1, netMonthlyIncome);

  const totalMonthlyExpenseBudget = useMemo(() => {
    return budgetExpenseList.reduce((acc, i) => acc + (i.monthly || 0), 0);
  }, [budgetExpenseList]);

  const monthlyDebtPayments = useMemo(() => {
    return budgetExpenseList.filter(i => i.subCategory === 'Debt' || i.label.toLowerCase().includes('hutang') || i.label.toLowerCase().includes('pinjaman') || i.label.toLowerCase().includes('ansuran')).reduce((acc, i) => acc + (i.monthly || 0), 0);
  }, [budgetExpenseList]);

  const surplusBudget = totalMonthlyIncomeBudget - totalMonthlyExpenseBudget;
  const savingsRate = totalMonthlyIncomeBudget > 0 ? (surplusBudget / totalMonthlyIncomeBudget) * 100 : 0;
  const debtServiceRatio = totalMonthlyIncomeBudget > 0 ? (monthlyDebtPayments / totalMonthlyIncomeBudget) * 100 : 0;

  const cashflowAnalysisText = useMemo(() => {
    if (surplusBudget < 0) {
      return `ALIRAN TUNAI DEFISIT (KRITIKAL): Aliran tunai bulanan anda berada dalam zon bahaya dengan defisit sebanyak RM ${Math.abs(surplusBudget).toLocaleString('en-US', { minimumFractionDigits: 2 })} sebulan. Nisbah Perkhidmatan Hutang (DSR) anda adalah ${debtServiceRatio.toFixed(1)}%. Anda disyorkan untuk menghentikan serta-merta perbelanjaan kehendak, merundingkan semula ansuran hutang melalui AKPK (jika perlu), serta menambah punca pendapatan kedua. Elakkan berhutang bagi menampung perbelanjaan harian.`;
    } else if (savingsRate < 10) {
      return `ALIRAN TUNAI KURANG MEMUASKAN: Aliran tunai anda positif sebanyak RM ${surplusBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })} namun Kadar Surplus / Lebihan anda (${savingsRate.toFixed(1)}%) berada di bawah sasaran ideal (10% - 20%). Nisbah DSR anda adalah ${debtServiceRatio.toFixed(1)}% (maksimum saranan 35%-40%). Anda terdedah kepada kejutan kewangan. Cari ketirisan perbelanjaan tersembunyi.`;
    } else if (savingsRate >= 10 && savingsRate < 25) {
      return `ALIRAN TUNAI SIHAT & STABIL: Tahniah, Kadar Surplus / Lebihan bulanan anda sebanyak ${savingsRate.toFixed(1)}% memenuhi piawaian perancangan kewangan profesional (Nisbah DSR ${debtServiceRatio.toFixed(1)}%). Lebihan bulanan sebanyak RM ${surplusBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })} ini hendaklah disalurkan secara sistematik ke dalam simpanan kecemasan dan pelaburan bersara secara konsisten.`;
    } else {
      return `ALIRAN TUNAI SANGAT CEMERLANG: Kadar Surplus / Lebihan luar biasa sebanyak ${savingsRate.toFixed(1)}% membuktikan disiplin kewangan yang sangat tinggi (DSR ${debtServiceRatio.toFixed(1)}%). Kedudukan solven bulanan anda sangat kukuh. Anda berada dalam kedudukan terbaik untuk mempercepatkan kebebasan kewangan.`;
    }
  }, [surplusBudget, savingsRate, debtServiceRatio]);

  // --- Net Worth & Savings Calculations ---
  const totalAssets = netWorthItems.filter(i => i.type === 'Asset').reduce((acc, i) => acc + (i.value || 0), 0);
  const totalLiabilities = netWorthItems.filter(i => i.type === 'Liability').reduce((acc, i) => acc + (i.value || 0), 0);
  const calculatedNetWorth = totalAssets - totalLiabilities;

  const assetsList = netWorthItems.filter(i => i.type === 'Asset');
  const liabilitiesList = netWorthItems.filter(i => i.type === 'Liability');

  const liquidAssets = netWorthItems.filter(i => i.type === 'Asset' && i.isLiquid);
  const totalLiquidAssets = liquidAssets.reduce((acc, i) => acc + (i.value || 0), 0);
  const liquidAssetsNoCharge = netWorthItems.filter(i => i.type === 'Asset' && i.isLiquid && !i.hasCharge);
  const savingsSediaAda = liquidAssetsNoCharge.reduce((acc, i) => acc + (i.value || 0), 0);

  const savingsTargetSelesa = incomeForCalculations * 6;
  const savingsTargetAsas = incomeForCalculations * 3;
  const savingsShortfallSelesa = Math.max(0, savingsTargetSelesa - savingsSediaAda);

  const sinkingFundTotal = savings.filter(s => s.type !== 'Emergency').reduce((acc, s) => acc + (s.targetAmount || 0), 0);
  const sinkingFundCurrent = savings.filter(s => s.type !== 'Emergency').reduce((acc, s) => acc + (s.currentAmount || 0), 0);
  const sinkingFundShortfall = Math.max(0, sinkingFundTotal - sinkingFundCurrent);

  const solvencyRatio = totalLiabilities > 0 ? (totalAssets / totalLiabilities) : totalAssets > 0 ? 999 : 0;
  const liquidityRatioMonths = incomeForCalculations > 0 ? (totalLiquidAssets / incomeForCalculations) : 0;
  const debtHealthYears = (totalMonthlyIncomeBudget * 12) > 0 ? (totalLiabilities / (totalMonthlyIncomeBudget * 12)) : 0;

  const activeBudgetIncomeList = useMemo(() => {
    return budgetIncomeList.filter(i => (i.monthly || 0) > 0);
  }, [budgetIncomeList]);

  const activeBudgetExpenseList = useMemo(() => {
    return budgetExpenseList.filter(i => (i.monthly || 0) > 0);
  }, [budgetExpenseList]);

  const activeAssetsList = useMemo(() => {
    return assetsList.filter(i => (i.value || 0) > 0);
  }, [assetsList]);

  const activeLiabilitiesList = useMemo(() => {
    return liabilitiesList.filter(i => (i.value || 0) > 0);
  }, [liabilitiesList]);

  const activeSinkingFunds = useMemo(() => {
    return savings.filter(s => s.type !== 'Emergency' && ((s.targetAmount || 0) > 0 || (s.currentAmount || 0) > 0));
  }, [savings]);

  const netWorthAnalysisText = useMemo(() => {
    let text = "";
    if (calculatedNetWorth < 0) {
      text += `ANALISIS 1 (NILAI ASET BERSIH): NEGATIF / TIDAK BAGUS (Insolvensi). Liabiliti anda (RM ${totalLiabilities.toLocaleString()}) melebihi aset (RM ${totalAssets.toLocaleString()}). `;
    } else {
      text += `ANALISIS 1 (NILAI ASET BERSIH): BAGUS. Nilai aset bersih anda berada dalam zon positif pada paras RM ${calculatedNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}. `;
    }

    if (liquidityRatioMonths < 3) {
      text += `ANALISIS 2 (LIQUIDITY RATIO / TAHAP KECAIRAN ASET): BAHAYA (${liquidityRatioMonths.toFixed(1)} bulan). Aset cair anda (RM ${totalLiquidAssets.toLocaleString()}) adalah di bawah paras minimum 3 bulan pendapatan. `;
    } else if (liquidityRatioMonths >= 6) {
      text += `ANALISIS 2 (LIQUIDITY RATIO / TAHAP KECAIRAN ASET): PALING BAGUS (${liquidityRatioMonths.toFixed(1)} bulan). Ketahanan modal cair anda sangat kukuh melebihi 6 bulan pendapatan bulanan. `;
    } else {
      text += `ANALISIS 2 (LIQUIDITY RATIO / TAHAP KECAIRAN ASET): BAGUS (${liquidityRatioMonths.toFixed(1)} bulan). Aset cair anda mencukupi di antara 3 hingga 6 bulan perbelanjaan bulanan. `;
    }

    if (debtHealthYears < 3.5) {
      text += `ANALISIS 3 (KESIHATAN HUTANG): SIHAT (${debtHealthYears.toFixed(1)} tahun pendapatan). Nisbah liabiliti berbanding pendapatan tahunan bersih terkawal dengan baik.`;
    } else if (debtHealthYears >= 7) {
      text += `ANALISIS 3 (KESIHATAN HUTANG): KRITIKAL (${debtHealthYears.toFixed(1)} tahun pendapatan). Jumlah hutang anda memerlukan lebih 7 tahun pendapatan bersih untuk dilupuskan.`;
    } else {
      text += `ANALISIS 3 (KESIHATAN HUTANG): SEDERHANA (${debtHealthYears.toFixed(1)} tahun pendapatan). Teruskan kawalan bayaran ansuran bulanan secara konsisten.`;
    }
    return text;
  }, [calculatedNetWorth, totalLiabilities, totalAssets, liquidityRatioMonths, totalLiquidAssets, debtHealthYears]);

  const savingsAnalysisText = useMemo(() => {
    let text = "";
    if (savingsShortfallSelesa > 0) {
      text += `ANALISIS TABUNG KECEMASAN (JURANG): Terdapat jurang kekurangan sebanyak RM ${savingsShortfallSelesa.toLocaleString('en-US', { minimumFractionDigits: 2 })} berbanding sasaran 6 bulan perbelanjaan/pendapatan (RM ${savingsTargetSelesa.toLocaleString('en-US', { minimumFractionDigits: 2 })}). Disyorkan menyalurkan surplus bulanan ke akaun simpanan cair (Tabung Haji/ASB). `;
    } else {
      text += `ANALISIS TABUNG KECEMASAN (MENCUKUPI): Simpanan cair anda (RM ${savingsSediaAda.toLocaleString('en-US', { minimumFractionDigits: 2 })}) telah mencukupi sasaran 6 bulan perbelanjaan. `;
    }

    if (sinkingFundShortfall > 0) {
      text += `Bagi Tabung Matlamat (Sinking Funds), anda mempunyai kekurangan sebanyak RM ${sinkingFundShortfall.toLocaleString('en-US', { minimumFractionDigits: 2 })} untuk sasaran RM ${sinkingFundTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`;
    } else if (sinkingFundTotal > 0) {
      text += `Tabung Matlamat (Sinking Funds) bernilai RM ${sinkingFundCurrent.toLocaleString('en-US', { minimumFractionDigits: 2 })} telah mencapai sasarankeseluruhan.`;
    }
    return text;
  }, [savingsShortfallSelesa, savingsSediaAda, savingsTargetSelesa, sinkingFundShortfall, sinkingFundTotal, sinkingFundCurrent]);

  // --- Investment & Retirement Calculations ---
  const totalInvestment = investments.reduce((acc, i) => acc + (i.currentValue || 0), 0);
  
  const yearsToRetirement = Math.max(0, rSettings.targetAge - currentAge);
  const monthlyExpenses = budgetExpenseList.reduce((acc, i) => acc + (i.monthly || 0), 0);
  const baselineAnnual = (profile?.income || 0) > 0 ? (profile.income) : (monthlyExpenses * 12 || 36000);
  const futureAnnualBaseline = baselineAnnual * Math.pow(1 + (rSettings.inflationRate / 100), yearsToRetirement);
  const futureMonthlyRent = rSettings.isRenting 
    ? rSettings.monthlyRent * Math.pow(1 + (rSettings.inflationRate / 100), yearsToRetirement)
    : 0;
  const postRetirementAnnualNeeds = (futureAnnualBaseline * (rSettings.postRetirementSpendingRatio / 100)) + (futureMonthlyRent * 12);
  const requiredRetirementFund = postRetirementAnnualNeeds / (Math.max(1, rSettings.expectedRoi) / 100);

  const investmentNetWorthAssets = netWorthItems.filter(i => i.type === 'Asset');
  const assetProjections = investmentNetWorthAssets.map(item => {
    const roi = rSettings.assetRois[item.id!] || 0;
    const isHome = item.name?.toLowerCase().includes("rumah kediaman");
    const isAutoExcluded = !rSettings.isRenting && isHome;
    const isExcluded = isAutoExcluded || (rSettings.excludedAssetIds || []).includes(item.id!);
    const futureValue = (item.value || 0) * Math.pow(1 + (roi / 100), yearsToRetirement);
    return { ...item, roi, futureValue, isExcluded };
  });
  
  const retirementSediaAda = assetProjections
    .filter(i => !i.isExcluded)
    .reduce((acc, i) => acc + i.futureValue, 0);
  const retirementShortfall = Math.max(0, requiredRetirementFund - retirementSediaAda);

  const retirementAnalysisText = useMemo(() => {
    if (retirementShortfall > 0) {
      return `SITUASI JURANG DANA PERSARAAN: Unjuran dana pencen menunjukkan kekurangan sebanyak RM ${retirementShortfall.toLocaleString('en-US', { minimumFractionDigits: 2 })} pada umur sasaran ${rSettings.targetAge} tahun. Hal ini disebabkan kesan inflasi (${rSettings.inflationRate}%) yang meningkatkan keperluan tahunan masa depan kepada RM ${postRetirementAnnualNeeds.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Anda disyorkan meningkatkan pelaburan berkala (ASB, PRS, Unit Amanah) dengan ROI melebihi inflasi.`;
    } else {
      return `TAHNIAH, DANA PERSARAAN MENCUKUPI: Unjuran pertumbuhan aset-aset boleh guna anda (RM ${retirementSediaAda.toLocaleString('en-US', { minimumFractionDigits: 2 })}) mencukupi untuk memenuhi modal sara hidup yang disasarkan (RM ${requiredRetirementFund.toLocaleString('en-US', { minimumFractionDigits: 2 })}). Kekalkan kepelbagaian aset pelaburan (Asset Allocation).`;
    }
  }, [retirementShortfall, rSettings, postRetirementAnnualNeeds, requiredRetirementFund, retirementSediaAda]);

  // --- Protection / Takaful Calculations ---
  const totalDeathCoverage = protections.reduce((acc, p) => acc + (p.deathBenefit || 0), 0);
  const totalTPDCoverage = protections.reduce((acc, p) => acc + (p.disabilityBenefit || 0), 0);
  const totalCICoverage = protections.reduce((acc, p) => acc + (p.criticalIllness || 0), 0);

  const protectionSediaAda = Math.max(
    totalDeathCoverage,
    protections.reduce((acc, p) => acc + (p.coverageAmount || 0), 0)
  );
  const annualIncomeSetting = totalMonthlyIncomeBudget > 0
    ? (totalMonthlyIncomeBudget * 12)
    : ((profile?.income || 0) || (incomeForCalculations * 12));
  const protectionTargetDeath = annualIncomeSetting * 10;
  const protectionTargetTPD = annualIncomeSetting * 10;
  const protectionTargetCI = annualIncomeSetting * 5;
  const protectionShortfall = Math.max(0, protectionTargetDeath - protectionSediaAda);
  
  const totalTakafulPremiumMonthly = protections.reduce((acc, p) => {
    const monthlyPremium = p.premiumFrequency === 'Yearly' ? ((p.premium || 0) / 12) : (p.premium || 0);
    return acc + monthlyPremium;
  }, 0);
  const premiumToIncomeRatio = incomeForCalculations > 1 ? (totalTakafulPremiumMonthly / incomeForCalculations) * 100 : 0;

  // Income Protection Gap Analysis (Capital Intact vs Asset Liquidation)
  const pulanganDecimal = 0.05; // 5% default return
  const requiredCapitalIntact = pulanganDecimal > 0 ? annualIncomeSetting / pulanganDecimal : 0;
  const shortfallCapitalIntact = Math.max(0, requiredCapitalIntact - totalDeathCoverage);
  const yearsOfSupport = 10;
  const requiredAssetLiquidation = annualIncomeSetting * yearsOfSupport;
  const shortfallAssetLiquidation = Math.max(0, requiredAssetLiquidation - totalDeathCoverage);

  const protectionAnalysisText = useMemo(() => {
    let text = "";
    if (protectionShortfall > 0) {
      text += `JURANG PERLINDUNGAN PENDAPATAN DETECTED: Terdapat jurang perlindungan sebanyak RM ${protectionShortfall.toLocaleString('en-US', { minimumFractionDigits: 2 })} berbanding sasaran 10x pendapatan tahunan (RM ${protectionTargetDeath.toLocaleString('en-US', { minimumFractionDigits: 2 })}). Mengikut Kaedah Capital Intact (pulangan 5%), jurang modal yang diperlukan ialah RM ${shortfallCapitalIntact.toLocaleString('en-US', { minimumFractionDigits: 2 })}. `;
    } else {
      text += `TAHNIAH, TAHAP PERLINDUNGAN MENYELURUH: Perlindungan takaful pendapatan sedia ada (RM ${protectionSediaAda.toLocaleString('en-US', { minimumFractionDigits: 2 })}) telah memenuhi piawaian keselamatan. `;
    }

    if (premiumToIncomeRatio > 10) {
      text += `PERINGATAN BAJET: Caruman bulanan takaful anda adalah ${premiumToIncomeRatio.toFixed(1)}% daripada pendapatan bulanan (melebihi had siling optimum 10%). Pertimbangkan term takaful tulen jika COI terlalu tinggi.`;
    } else {
      text += `Peruntukan caruman takaful bulanan anda berada pada kadar sihat (${premiumToIncomeRatio.toFixed(1)}% di bawah siling saranan 10%).`;
    }
    return text;
  }, [protectionShortfall, protectionTargetDeath, shortfallCapitalIntact, protectionSediaAda, premiumToIncomeRatio]);

  // --- Zakat Calculations ---
  const assetsZakat = netWorthItems.filter(i => i.type === 'Asset');
  const zakatAssets = assetsZakat.map(asset => {
    const isExcluded = (zSettings.excludedAssetIds || []).includes(asset.id!);
    const zakatAmount = (asset.value || 0) * 0.025;
    return { ...asset, isExcluded, zakatAmount };
  });

  const totalZakatAbleAssets = zakatAssets
    .filter(a => !a.isExcluded)
    .reduce((acc, a) => acc + (a.value || 0), 0);

  const recommendedZakatHarta = totalZakatAbleAssets * 0.025;
  const isAboveNisab = totalZakatAbleAssets >= zSettings.nisab && zSettings.nisab > 0;

  const gajiSetahun = (budgetProfiles[0]?.items
    ?.filter(i => i.category === 'income' && i.subCategory !== 'deduction' && i.subCategory !== 'rental')
    .reduce((acc, i) => acc + (i.monthly || 0), 0) || profile?.income || 0) * 12;

  const sewaSetahun = (budgetProfiles[0]?.items
    ?.filter(i => i.category === 'income' && i.subCategory === 'rental')
    .reduce((acc, i) => acc + Math.max(0, i.monthly || 0), 0) || 0) * 12;

  const bonusSetahun = 0;
  const lainSetahun = 0;
  const jumlahPendapatanKasarSetahun = gajiSetahun + bonusSetahun + sewaSetahun + lainSetahun;

  let spouseCount = 0;
  let childCountUnder18 = 0;
  let childCountIPT = 0;

  if (profile?.dependents) {
    profile.dependents.forEach(dep => {
      const relationship = (dep.relationship || '').toLowerCase();
      if (relationship.includes('spouse') || relationship.includes('isteri') || relationship.includes('suami') || relationship.includes('partner')) {
        spouseCount++;
      } else if (relationship.includes('anak') || relationship.includes('child') || relationship.includes('daughter') || relationship.includes('son')) {
        if (relationship.includes('ipt') || relationship.includes('belajar') || relationship.includes('uni') || dep.name.toLowerCase().includes('ipt') || dep.name.toLowerCase().includes('uni')) {
          childCountIPT++;
        } else {
          childCountUnder18++;
        }
      }
    });
  }

  const diriSendiri = 12000;
  const valuePasangan = spouseCount * 5000;
  const valueAnakBawah18 = childCountUnder18 * 2000;
  const valueAnakIPT = childCountIPT * 8000;

  const epfItems = budgetProfiles[0]?.items
    ?.filter(i => i.category === 'income' && i.subCategory === 'deduction' && (i.label.toLowerCase().includes('kwsp') || i.label.toLowerCase().includes('epf')));
  const kwspSetahun = (epfItems?.reduce((acc, i) => acc + (i.monthly || 0), 0) || 0) * 12;
  const valueKwspSecured = Math.min(4000, kwspSetahun);

  const takafulSetahun = protections.reduce((acc, p) => {
    const premiumAnnual = p.premiumFrequency === 'Monthly' ? (p.premium || 0) * 12 : (p.premium || 0);
    return acc + premiumAnnual;
  }, 0);
  const valueTakafulSecured = Math.min(3000, takafulSetahun);

  const jumlahTolakanPelepasanSetahun = diriSendiri + valuePasangan + valueAnakBawah18 + valueAnakIPT + valueKwspSecured + valueTakafulSecured;
  const pendapatanBersihLayakZakat = Math.max(0, jumlahPendapatanKasarSetahun - jumlahTolakanPelepasanSetahun);
  const isMencapaiNisabZakatPendapatan = pendapatanBersihLayakZakat >= zSettings.nisab && zSettings.nisab > 0;
  const recommendedZakatPendapatanTahunan = isMencapaiNisabZakatPendapatan ? pendapatanBersihLayakZakat * 0.025 : 0;
  const recommendedZakatPendapatanBulanan = recommendedZakatPendapatanTahunan / 12;

  const zakatAnalysisText = useMemo(() => {
    let text = "";
    if (isAboveNisab) {
      text += `ZAKAT HARTA WAJIB DIBAYAR: Jumlah aset layak zakat anda (RM ${totalZakatAbleAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}) adalah MELEBIHI nilai Nisab semasa (RM ${zSettings.nisab.toLocaleString()}). Syor Zakat Harta (2.5%) adalah RM ${recommendedZakatHarta.toLocaleString('en-US', { minimumFractionDigits: 2 })}. `;
    } else {
      text += `ZAKAT HARTA DI BAWAH NISAB: Jumlah aset layak zakat semasa (RM ${totalZakatAbleAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}) belum mencapai Nisab (RM ${zSettings.nisab.toLocaleString()}). `;
    }

    if (isMencapaiNisabZakatPendapatan) {
      text += `Bagi Zakat Pendapatan (kaedah PPZ), pendapatan bersih layak zakat selepas tolakan pelepasan (RM ${pendapatanBersihLayakZakat.toLocaleString('en-US', { minimumFractionDigits: 2 })}) melebihi Nisab. Syor bayaran zakat pendapatan ialah RM ${recommendedZakatPendapatanBulanan.toLocaleString('en-US', { minimumFractionDigits: 2 })} sebulan (RM ${recommendedZakatPendapatanTahunan.toLocaleString('en-US', { minimumFractionDigits: 2 })} setahun).`;
    } else {
      text += `Pendapatan bersih layak zakat selepas pelepasan PPZ berada di bawah Nisab, tiada kewajipan zakat pendapatan semasa.`;
    }
    return text;
  }, [isAboveNisab, totalZakatAbleAssets, zSettings, recommendedZakatHarta, isMencapaiNisabZakatPendapatan, pendapatanBersihLayakZakat, recommendedZakatPendapatanTahunan, recommendedZakatPendapatanBulanan]);

  // --- Inheritance & Faraid Calculations ---
  const totalDeathBenefit = protections.reduce((acc, i) => acc + (i.deathBenefit || 0), 0);
  const estateGrossValue = totalAssets + totalDeathBenefit;
  const autoHibahTakaful = protections.reduce((acc, i) => {
    return acc + ((i.deathBenefit || 0) * (i.nominationHibahPercentage || 0) / 100);
  }, 0);
  const hibahAssetsValue = netWorthItems
    .filter(i => i.type === 'Asset' && i.id && iSettings?.hibahAssetIds?.includes(i.id))
    .reduce((acc, i) => acc + (i.value || 0), 0);
  const totalHibah = autoHibahTakaful + hibahAssetsValue;
  const estateResidual = estateGrossValue - totalHibah;

  const funeralCustomTotal = iSettings?.funeralCosts?.customItems?.reduce((acc, i) => acc + (i.value || 0), 0) || 0;
  const funeralTotal = (iSettings?.funeralCosts?.van || 0) + (iSettings?.funeralCosts?.grave || 0) + (iSettings?.funeralCosts?.others || 0) + funeralCustomTotal;
  const balanceAfterFuneral = estateResidual - funeralTotal;

  const liabilityCovered = netWorthItems.filter(i => i.type === 'Liability' && i.hasCoverage).reduce((acc, i) => acc + (i.value || 0), 0);
  const netLiabilities = totalLiabilities - liabilityCovered;
  const allahCustomDebtsTotal = iSettings?.debts?.customAllahDebts?.reduce((acc, i) => acc + (i.value || 0), 0) || 0;
  const allahDebtTotal = (iSettings?.debts?.zakat || 0) + (iSettings?.debts?.fidyah || 0) + (iSettings?.debts?.badalHaji || 0) + allahCustomDebtsTotal;
  const debtTotal = netLiabilities + allahDebtTotal;
  const balanceAfterDebts = balanceAfterFuneral - debtTotal;

  const maritalAmount = (balanceAfterDebts * (iSettings?.maritalPropertyPercentage || 0)) / 100;
  const balanceAfterMarital = balanceAfterDebts - maritalAmount;

  const wasiatWaqafTotal = (iSettings?.wasiatWaqaf?.wasiat || 0) + (iSettings?.wasiatWaqaf?.waqaf || 0) + (iSettings?.wasiatWaqaf?.others || 0);
  const allowedWasiat = Math.min(wasiatWaqafTotal, balanceAfterMarital / 3);
  const balanceAfterWasiat = balanceAfterMarital - allowedWasiat;
  const faraidAmount = Math.max(0, balanceAfterWasiat);

  const faraidResults = useMemo(() => {
    if (!iSettings || faraidAmount <= 0) return [];
    const { heirs } = iSettings;
    const { hasFather, hasMother, hasHusband, hasWife, sonCount, daughterCount, hasSiblings } = heirs;
    
    const hasDescendants = sonCount > 0 || daughterCount > 0;
    let totalFixedShare = 0;
    const distributions: { name: string; shareLabel: string; amount: number; type: 'fixed' | 'asabah' }[] = [];

    if (hasHusband) {
      const share = hasDescendants ? 1/4 : 1/2;
      distributions.push({ name: 'Suami', shareLabel: hasDescendants ? '1/4' : '1/2', amount: faraidAmount * share, type: 'fixed' });
      totalFixedShare += share;
    } else if (hasWife) {
      const share = hasDescendants ? 1/8 : 1/4;
      distributions.push({ name: 'Isteri', shareLabel: hasDescendants ? '1/8' : '1/4', amount: faraidAmount * share, type: 'fixed' });
      totalFixedShare += share;
    }

    if (hasMother) {
      const share = (hasDescendants || hasSiblings) ? 1/6 : 1/3;
      distributions.push({ name: 'Ibu', shareLabel: (hasDescendants || hasSiblings) ? '1/6' : '1/3', amount: faraidAmount * share, type: 'fixed' });
      totalFixedShare += share;
    }

    let fatherFixedShare = 0;
    if (hasFather) {
      if (sonCount > 0) {
        fatherFixedShare = 1/6;
        distributions.push({ name: 'Ayah', shareLabel: '1/6', amount: faraidAmount * fatherFixedShare, type: 'fixed' });
        totalFixedShare += fatherFixedShare;
      } else if (daughterCount > 0) {
        fatherFixedShare = 1/6;
        totalFixedShare += fatherFixedShare;
      }
    }

    if (sonCount === 0 && daughterCount > 0) {
      const share = daughterCount === 1 ? 1/2 : 2/3;
      distributions.push({ name: `${daughterCount} Anak Perempuan`, shareLabel: daughterCount === 1 ? '1/2' : '2/3', amount: faraidAmount * share, type: 'fixed' });
      totalFixedShare += share;
    }

    const remainderPercentage = Math.max(0, 1 - totalFixedShare);
    
    if (remainderPercentage > 0) {
      if (sonCount > 0) {
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
        const totalFatherAmount = (faraidAmount * fatherFixedShare) + (faraidAmount * remainderPercentage);
        const label = daughterCount > 0 ? '1/6 + Asabah' : 'Asabah';
        distributions.push({ name: 'Ayah', shareLabel: label, amount: totalFatherAmount, type: 'asabah' });
      } else if (hasSiblings) {
        distributions.push({ name: 'Adik-beradik', shareLabel: 'Asabah', amount: faraidAmount * remainderPercentage, type: 'asabah' });
      }
    }

    return distributions;
  }, [iSettings, faraidAmount]);

  const inheritanceAnalysisText = useMemo(() => {
    let text = `ANALISIS ALIRAN PUSAKA: Nilai kasar harta pusaka (termasuk manfaat kematian) ialah RM ${estateGrossValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}. `;
    if (totalHibah > 0) {
      text += `Instrumen Hibah bernilai RM ${totalHibah.toLocaleString('en-US', { minimumFractionDigits: 2 })} dipindahkan terus kepada penama tanpa pembekuan. `;
    } else {
      text += `PERINGATAN: Tiada Hibah didaftarkan. Kesemua RM ${estateGrossValue.toLocaleString()} harta kasar terdedah kepada pembekuan pusaka automatik. `;
    }
    
    text += `Selepas perbelanjaan jenazah (RM ${funeralTotal.toLocaleString()}), hutang Allah/manusia (RM ${debtTotal.toLocaleString()}), harta sepencarian, dan wasiat, baki Faraid bersih ialah RM ${faraidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Disyorkan mendaftar Wasiat untuk melantik pentadbir harta.`;
    return text;
  }, [estateGrossValue, totalHibah, funeralTotal, debtTotal, faraidAmount]);

  const activeProtections = useMemo(() => {
    return protections.filter(p => (p.premium || 0) > 0 || (p.deathBenefit || 0) > 0 || (p.coverageAmount || 0) > 0);
  }, [protections]);

  const activeInvestments = useMemo(() => {
    return investments.filter(i => (i.currentValue || 0) > 0);
  }, [investments]);

  const activeZakatRecords = useMemo(() => {
    return zakatRecords.filter(z => (z.amount || 0) > 0);
  }, [zakatRecords]);

  // INFAQ Model Categorization
  const infaqData = useMemo(() => {
    const profile = budgetProfiles[0];
    if (profile && profile.items && profile.items.length > 0) {
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
      const totalExpense = getSubTotal('expense');
      const household = totalExpense - debt - gift;
      const surplus = Math.max(0, netIncome - totalExpense);
      
      const denominator = Math.max(netIncome, totalExpense, 1);

      return [
        { name: 'ISI RUMAH', value: household, color: '#FBBF24', target: 30, percentage: (household / denominator) * 100 },
        { name: 'HUTANG', value: debt, color: '#2DD4BF', target: 30, percentage: (debt / denominator) * 100 },
        { name: 'LEBIHAN', value: surplus, color: '#10B981', target: 30, percentage: (surplus / denominator) * 100 },
        { name: 'PEMBERIAN', value: gift, color: '#FB923C', target: 5, percentage: (gift / denominator) * 100 },
        { name: 'LAIN-LAIN', value: 0, color: '#94A3B8', target: 5, percentage: 0 },
      ];
    }

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
      { name: 'ISI RUMAH', value: household, color: '#FBBF24', target: 30, percentage: (household / incomeVal) * 100 },
      { name: 'HUTANG', value: debt, color: '#2DD4BF', target: 30, percentage: (debt / incomeVal) * 100 },
      { name: 'LEBIHAN', value: surplus, color: '#10B981', target: 30, percentage: (surplus / incomeVal) * 100 },
      { name: 'PEMBERIAN', value: gift, color: '#FB923C', target: 5, percentage: (gift / incomeVal) * 100 },
      { name: 'LAIN-LAIN', value: others, color: '#94A3B8', target: 5, percentage: 0 },
    ];
  }, [budgetProfiles, transactions, totalIncome]);

  const dsrPercent = useMemo(() => {
    const item = infaqData.find(d => d.name === 'HUTANG');
    return item ? item.percentage : debtServiceRatio;
  }, [infaqData, debtServiceRatio]);

  const surplusPercent = useMemo(() => {
    const item = infaqData.find(d => d.name === 'LEBIHAN');
    return item ? item.percentage : savingsRate;
  }, [infaqData, savingsRate]);

  const dsrStatus = useMemo(() => {
    if (dsrPercent === 0) return { label: 'AMAT KUAT (Tiada Hutang)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (dsrPercent <= 30) return { label: 'SIHAT (≤ 30%)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (dsrPercent <= 40) return { label: 'AMARAN (30% - 40%)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'KRITIKAL (> 40%)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  }, [dsrPercent]);

  const surplusStatus = useMemo(() => {
    if (surplusPercent >= 30) return { label: 'AMAT SIHAT (Cemerlang ≥ 30%)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (surplusPercent >= 10) return { label: 'SIHAT (Stabil 10% - 29%)', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (surplusPercent > 0) return { label: 'AMARAN (< 10%)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'KRITIKAL (Tiada Lebihan)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  }, [surplusPercent]);

  const debtToAssetRatio = useMemo(() => {
    return totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  }, [totalAssets, totalLiabilities]);

  const debtToAssetStatus = useMemo(() => {
    if (totalAssets === 0 && totalLiabilities === 0) return { label: 'TIADA REKOD', color: 'text-slate-500 bg-slate-50 border-slate-200' };
    if (debtToAssetRatio <= 35) return { label: 'AMAT SIHAT (Liabiliti Rendah ≤ 35%)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (debtToAssetRatio <= 50) return { label: 'SIHAT (Kukuh 35% - 50%)', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    return { label: 'BAHAYA (Leveraj Tinggi > 50%)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  }, [totalAssets, totalLiabilities, debtToAssetRatio]);

  const liquidToDebtRatio = useMemo(() => {
    return totalLiabilities > 0 ? (totalLiquidAssets / totalLiabilities) * 100 : 0;
  }, [totalLiquidAssets, totalLiabilities]);

  const liquidToDebtStatus = useMemo(() => {
    if (totalLiabilities === 0) return { label: 'AMAT KUKUH (Tiada Hutang)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (liquidToDebtRatio >= 100) return { label: 'SIHAT (Aset Cair Cukup Untuk Tutup Liabiliti)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (liquidToDebtRatio >= 50) return { label: 'SEDERHANA (Perlindungan SEPARA 50% - 99%)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'KRITIKAL (Aset Cair Sangat Rendah < 50%)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  }, [totalLiabilities, liquidToDebtRatio]);

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
      m2LiquidScore = totalLiquidAssets > 0 ? 30 : 20;
    }
    const scoreM2 = Math.min(100, Math.max(1, Math.round(m2NwScore + m2DtaScore + m2LiquidScore)));

    // 3. Modul 3: Simpanan / Dana Kecemasan (Max 100)
    const savingsRatio = savingsTargetSelesa > 0 ? (savingsSediaAda / savingsTargetSelesa) * 100 : (savingsSediaAda > 0 ? 50 : 0);
    const scoreM3 = Math.min(100, Math.max(1, Math.round(savingsRatio)));

    // 4. Modul 4: Perlindungan / Takaful (Max 100)
    const protectionRatio = protectionTargetDeath > 0 ? (protectionSediaAda / protectionTargetDeath) * 100 : (totalDeathCoverage > 0 ? 50 : 0);
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
          badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        };
      }
      if (totalScore >= 60) {
        return {
          title: 'STABIL & TERKAWAL',
          desc: 'Kedudukan kewangan anda sihat dan terkawal. Teruskan pengukuhan dana kecemasan serta konsistensi pelaburan masa hadapan.',
          badgeColor: 'bg-teal-50 text-teal-800 border-teal-300',
        };
      }
      if (totalScore >= 40) {
        return {
          title: 'SEDERHANA (PERLU PENAMBAHBAIKAN)',
          desc: 'Terdapat jurang kewangan yang perlu diperkemas seperti penstrukturan hutang, pembinaan tabung kecemasan, atau peningkatan perlindungan keluarga.',
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
        };
      }
      return {
        title: 'KRITIKAL (TINDAKAN SEGERA DIPERLUKAN)',
        desc: 'Kedudukan kewangan memerlukan tindakan pemulihan segera terutamanya mengatasi defisit aliran tunai, bebanan liabiliti, dan ketiadaan perlindungan.',
        badgeColor: 'bg-rose-50 text-rose-800 border-rose-300',
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
  }, [dsrPercent, surplusPercent, calculatedNetWorth, totalAssets, totalLiabilities, debtToAssetRatio, liquidToDebtRatio, totalLiquidAssets, savingsTargetSelesa, savingsSediaAda, protectionTargetDeath, protectionSediaAda, totalDeathCoverage, requiredRetirementFund, retirementSediaAda, totalInvestment]);

  const clientName = useMemo(() => {
    return profile?.name || viewingUserName || auth.currentUser?.displayName || 'Pelanggan';
  }, [profile?.name, viewingUserName]);

  useEffect(() => {
    if (clientName) {
      document.title = `BMW Planner Report - ${clientName}`;
    }

    const handleBeforePrint = () => {
      if (clientName) {
        document.title = `BMW Planner Report - ${clientName}`;
      }
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [clientName]);

  const formattedDate = new Date().toLocaleDateString('ms-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="hidden print:block bg-white text-slate-900 w-full font-sans leading-normal" style={{ pageBreakBefore: 'avoid', breakBefore: 'avoid' }}>
      
      {/* ================= PAGE 1 ================= */}
      <div className="w-full bg-white print-page print-page-first flex flex-col justify-between">
        <div className="print-page-content">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1A365D] flex items-center justify-center text-white font-black text-base">
                ✓
              </div>
              <div>
                <div className="text-[13px] font-black tracking-tight text-slate-900 uppercase">
                  BMW Planner Report <span className="text-[10px] font-normal lowercase text-slate-400 italic">by</span> <span className="text-[#1A365D]">INFAQ Consultancy</span>
                </div>
                <div className="text-[8px] font-bold text-slate-400 tracking-widest uppercase">
                  SISTEM PERANCANGAN KEWANGAN (BMW PLANNER)
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-black text-emerald-600 tracking-widest uppercase">
                LAPORAN RASMI PENUH
              </div>
              <div className="text-[9px] font-medium text-slate-500 mt-0.5">
                Tarikh Cetakan: {formattedDate}
              </div>
            </div>
          </div>

          {/* Main Title */}
          <div className="mt-2.5">
            <h1 className="text-xl font-black text-[#1A365D] tracking-tight uppercase leading-none">
              BMW Planner Report
            </h1>
            <div className="text-sm font-bold text-slate-600 mt-0.5 uppercase">
              by INFAQ Consultancy
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed max-w-3xl">
              Laporan Analisis Menyeluruh merangkumi semua modul di dalam sistem **BMW Planner** (Modul 1: Aliran Tunai, Modul 2: Nilai Aset Bersih, Modul 3: Simpanan, Modul 4: Perlindungan, Modul 5: Pelaburan, Modul 6: Penyucian, dan Modul 7: Pewarisan).
            </p>
          </div>

          {/* Section: Profil Pelanggan */}
          <div className="mt-2.5 bg-slate-50 rounded-xl border border-slate-200 p-3">
            <div className="flex items-center gap-1.5 mb-1.5 border-b border-slate-200 pb-1">
              <span className="text-sky-600 text-sm">👤</span>
              <h2 className="text-[11px] font-black text-slate-800 tracking-widest uppercase">
                PROFIL PELANGGAN & AHLI KELUARGA
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
              <div className="flex justify-between border-b border-slate-150 pb-0.5">
                <span className="text-slate-500 font-medium">Nama Penuh:</span>
                <span className="text-slate-900 font-bold">{profile?.name || auth.currentUser?.displayName || viewingUserName || 'Abdullah'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-150 pb-0.5">
                <span className="text-slate-500 font-medium">Umur Semasa:</span>
                <span className="text-slate-900 font-bold">{currentAge} tahun</span>
              </div>
              <div className="flex justify-between border-b border-slate-150 pb-0.5">
                <span className="text-slate-500 font-medium">Tarikh Lahir:</span>
                <span className="text-slate-900 font-bold">{profile?.dob || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-150 pb-0.5">
                <span className="text-slate-500 font-medium">Pekerjaan:</span>
                <span className="text-slate-900 font-bold">{profile?.occupation || 'Bekerja Sendiri'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-150 pb-0.5">
                <span className="text-slate-500 font-medium">Syarikat / Majikan:</span>
                <span className="text-slate-900 font-bold">{profile?.employer || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-150 pb-0.5">
                <span className="text-slate-500 font-medium">Negeri Kediaman:</span>
                <span className="text-slate-900 font-bold">{profile?.state || 'Selangor'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-150 pb-0.5">
                <span className="text-slate-500 font-medium">E-mel:</span>
                <span className="text-slate-900 font-bold">{profile?.email || auth.currentUser?.email || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-150 pb-0.5">
                <span className="text-slate-500 font-medium">No. Telefon:</span>
                <span className="text-slate-900 font-bold">{profile?.phone || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-150 pb-0.5 col-span-2">
                <span className="text-slate-500 font-medium">Bilangan Tanggungan Berdaftar:</span>
                <span className="text-slate-900 font-bold">
                  {profile?.dependents?.length ? `${profile.dependents.length} orang` : 'Tiada Maklumat'}
                </span>
              </div>
            </div>

            {profile?.dependents && profile.dependents.length > 0 && (
              <div className="mt-1.5">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">SENARAI TANGGUNGAN BERDAFTAR:</p>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  {profile.dependents.map((dep, index) => (
                    <div key={dep.id || index} className="bg-white border border-slate-200/60 rounded-lg px-2 py-0.5 flex justify-between">
                      <span className="text-slate-700 font-medium">{dep.name}</span>
                      <span className="text-[#1A365D] font-black text-[8px] uppercase bg-[#1A365D]/5 px-1 rounded">{dep.relationship}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Analysis Box */}
          <div className="mt-2.5 bg-slate-900 text-white rounded-xl p-3 border border-slate-800">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <span>📊</span> ANALISA PROFIL KEWANGAN & PERINGKAT HIDUP (LIFE STAGE)
            </h3>
            <p className="text-[10px] font-normal leading-relaxed mt-1 text-slate-300">
              {profileAnalysisText}
            </p>
            <div className="mt-2 pt-1.5 border-t border-slate-800 flex justify-between text-[8px] text-slate-400">
              <span>Syor BMW Planner</span>
              <span>INFAQ Consultancy Services</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <PageFooter pageNum={1} />
      </div>

      {/* ================= PAGE 2: DASHBOARD BELANJAWAN & SCOREBOARD KESIHATAN KEWANGAN ================= */}
      <div className="w-full bg-white print-page flex flex-col justify-between">
        <div className="print-page-content">
          <PageHeader moduleTitle="Dashboard & Scoreboard Kesihatan Kewangan" />

          {/* Title */}
          <div className="mt-1 flex justify-between items-end">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <span>📊</span> DASHBOARD & SCOREBOARD
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
                BMW Planner Dashboard • Scoreboard Meter Berwarna & Analisis Menyeluruh
              </p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg uppercase">
              <span>✨</span> MODEL INFAQ
            </div>
          </div>

          {/* SCOREBOARD KESIHATAN KEWANGAN (SPEEDOMETER METER UTAMA & 5 MINI METER) */}
          <div className="mt-2 bg-slate-50 rounded-xl p-2.5 border border-slate-200 shadow-sm text-slate-850">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-600 text-xs">🎯</span>
                <div>
                  <h3 className="text-[10px] font-black tracking-wide text-slate-900 uppercase leading-tight">
                    SCOREBOARD KESIHATAN KEWANGAN (METER BERWARNA)
                  </h3>
                  <p className="text-[7px] text-slate-500 font-semibold uppercase">
                    Penilaian Komprehensif Berdasarkan Parameter Shariah & Standard Perancangan Kewangan
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[7px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded-full border border-slate-200">
                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                <span>Modul 1 – 5</span>
              </div>
            </div>

            {/* Top Row: Hero Speedometer + Summary Status */}
            <div className="grid grid-cols-12 gap-2 items-center bg-white rounded-lg p-1.5 border border-slate-200 shadow-xs">
              {/* Left: Hero Speedometer Gauge */}
              <div className="col-span-5 flex justify-center border-r border-slate-200 pr-1.5">
                <HeroSpeedometerGauge score={scoreboard.totalScore} />
              </div>

              {/* Right: Diagnosis and Status */}
              <div className="col-span-7 pl-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${scoreboard.overallStatus.badgeColor}`}>
                    {scoreboard.overallStatus.title}
                  </span>
                  <span className="text-[7px] font-mono text-slate-500">
                    Skor: <strong className="text-slate-900">{scoreboard.totalScore}/100</strong>
                  </span>
                </div>
                <p className="text-[8px] text-slate-600 leading-snug font-normal">
                  {scoreboard.overallStatus.desc}
                </p>

                {/* Score Meter Guide */}
                <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-slate-200 text-[6px] font-bold uppercase">
                  <span className="flex items-center gap-0.5 text-rose-600"><span className="w-1 h-1 rounded-full bg-rose-500"></span> 0–39: Kritikal</span>
                  <span className="flex items-center gap-0.5 text-amber-600"><span className="w-1 h-1 rounded-full bg-amber-500"></span> 40–59: Sederhana</span>
                  <span className="flex items-center gap-0.5 text-cyan-600"><span className="w-1 h-1 rounded-full bg-cyan-500"></span> 60–79: Baik</span>
                  <span className="flex items-center gap-0.5 text-emerald-600"><span className="w-1 h-1 rounded-full bg-emerald-500"></span> 80–100: Cemerlang</span>
                </div>
              </div>
            </div>

            {/* Bottom Row: 5 Module Mini Meter Gauges */}
            <div className="grid grid-cols-5 gap-1.5 mt-1.5">
              {/* Modul 1: Aliran Tunai */}
              <div className="bg-white border border-slate-200 rounded-lg p-1.5 flex flex-col justify-between shadow-xs">
                <div className="flex justify-between items-center pb-0.5 border-b border-slate-100">
                  <span className="text-[7px] font-black text-slate-800 uppercase truncate">M1: Aliran Tunai</span>
                  <span className={`text-[6px] font-bold px-0.5 rounded uppercase ${scoreboard.gradeM1.badge}`}>
                    {scoreboard.gradeM1.label}
                  </span>
                </div>
                <MiniMeterGauge score={scoreboard.scoreM1} />
                <div className="mt-0.5 pt-0.5 border-t border-slate-100 text-[6px] text-slate-500 space-y-0.5">
                  <div className="flex justify-between"><span>DSR:</span><strong className="text-slate-800">{dsrPercent.toFixed(0)}%</strong></div>
                  <div className="flex justify-between"><span>Lebihan:</span><strong className="text-slate-800">{surplusPercent.toFixed(0)}%</strong></div>
                </div>
              </div>

              {/* Modul 2: Nilai Aset Bersih */}
              <div className="bg-white border border-slate-200 rounded-lg p-1.5 flex flex-col justify-between shadow-xs">
                <div className="flex justify-between items-center pb-0.5 border-b border-slate-100">
                  <span className="text-[7px] font-black text-slate-800 uppercase truncate">M2: Aset Bersih</span>
                  <span className={`text-[6px] font-bold px-0.5 rounded uppercase ${scoreboard.gradeM2.badge}`}>
                    {scoreboard.gradeM2.label}
                  </span>
                </div>
                <MiniMeterGauge score={scoreboard.scoreM2} />
                <div className="mt-0.5 pt-0.5 border-t border-slate-100 text-[6px] text-slate-500 space-y-0.5">
                  <div className="flex justify-between"><span>Aset Bersih:</span><strong className="text-slate-800">RM {calculatedNetWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong></div>
                  <div className="flex justify-between"><span>Hutang/Aset:</span><strong className="text-slate-800">{debtToAssetRatio.toFixed(0)}%</strong></div>
                </div>
              </div>

              {/* Modul 3: Simpanan */}
              <div className="bg-white border border-slate-200 rounded-lg p-1.5 flex flex-col justify-between shadow-xs">
                <div className="flex justify-between items-center pb-0.5 border-b border-slate-100">
                  <span className="text-[7px] font-black text-slate-800 uppercase truncate">M3: Simpanan</span>
                  <span className={`text-[6px] font-bold px-0.5 rounded uppercase ${scoreboard.gradeM3.badge}`}>
                    {scoreboard.gradeM3.label}
                  </span>
                </div>
                <MiniMeterGauge score={scoreboard.scoreM3} />
                <div className="mt-0.5 pt-0.5 border-t border-slate-100 text-[6px] text-slate-500 space-y-0.5">
                  <div className="flex justify-between"><span>Cair:</span><strong className="text-slate-800">RM {savingsSediaAda.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong></div>
                  <div className="flex justify-between"><span>Sasaran:</span><strong className="text-slate-800">RM {savingsTargetSelesa.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong></div>
                </div>
              </div>

              {/* Modul 4: Perlindungan */}
              <div className="bg-white border border-slate-200 rounded-lg p-1.5 flex flex-col justify-between shadow-xs">
                <div className="flex justify-between items-center pb-0.5 border-b border-slate-100">
                  <span className="text-[7px] font-black text-slate-800 uppercase truncate">M4: Takaful</span>
                  <span className={`text-[6px] font-bold px-0.5 rounded uppercase ${scoreboard.gradeM4.badge}`}>
                    {scoreboard.gradeM4.label}
                  </span>
                </div>
                <MiniMeterGauge score={scoreboard.scoreM4} />
                <div className="mt-0.5 pt-0.5 border-t border-slate-100 text-[6px] text-slate-500 space-y-0.5">
                  <div className="flex justify-between"><span>Cover:</span><strong className="text-slate-800">RM {protectionSediaAda.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong></div>
                  <div className="flex justify-between"><span>Sasaran:</span><strong className="text-slate-800">RM {protectionTargetDeath.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong></div>
                </div>
              </div>

              {/* Modul 5: Pelaburan */}
              <div className="bg-white border border-slate-200 rounded-lg p-1.5 flex flex-col justify-between shadow-xs">
                <div className="flex justify-between items-center pb-0.5 border-b border-slate-100">
                  <span className="text-[7px] font-black text-slate-800 uppercase truncate">M5: Pelaburan</span>
                  <span className={`text-[6px] font-bold px-0.5 rounded uppercase ${scoreboard.gradeM5.badge}`}>
                    {scoreboard.gradeM5.label}
                  </span>
                </div>
                <MiniMeterGauge score={scoreboard.scoreM5} />
                <div className="mt-0.5 pt-0.5 border-t border-slate-100 text-[6px] text-slate-500 space-y-0.5">
                  <div className="flex justify-between"><span>Unjuran:</span><strong className="text-slate-800">RM {retirementSediaAda.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong></div>
                  <div className="flex justify-between"><span>Sasaran:</span><strong className="text-slate-800">RM {requiredRetirementFund.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* Donut Chart & Legend Section */}
          <div className="mt-2 bg-slate-50/70 rounded-xl border border-slate-200 p-2">
            <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-0.5 text-center">
              KOMPOSISI PERBELANJAAN (MODEL INFAQ)
            </h3>
            
            <div className="flex items-center justify-center gap-6 py-0.5">
              {/* PieChart */}
              <div className="w-[140px] h-[105px] flex items-center justify-center">
                <PieChart width={140} height={105}>
                  <Pie
                    data={infaqData.length > 0 ? infaqData : [{ name: 'Sila Masukkan Data', value: 1, color: '#F1F5F9' }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={46}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {infaqData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </div>

              {/* Legend details */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {infaqData.map(model => (
                  <div key={model.name} className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: model.color }}></div>
                    <div>
                      <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">{model.name}</p>
                      <p className="text-[10px] font-mono font-black text-slate-800">{(model.percentage || 0).toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modules Summary Bar (Modul 1 - Modul 7) */}
          <div className="grid grid-cols-7 gap-1.5 mt-2 text-center">
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-1">
              <p className="text-[6px] font-black text-emerald-800 uppercase">M1: Aliran Tunai</p>
              <p className="text-[8px] font-mono font-bold text-slate-900 mt-0.5">RM {netMonthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-1">
              <p className="text-[6px] font-black text-slate-700 uppercase">M2: Aset Bersih</p>
              <p className="text-[8px] font-mono font-bold text-slate-900 mt-0.5">RM {calculatedNetWorth.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-1">
              <p className="text-[6px] font-black text-amber-800 uppercase">M3: Simpanan</p>
              <p className="text-[8px] font-mono font-bold text-slate-900 mt-0.5">RM {savingsSediaAda.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-1">
              <p className="text-[6px] font-black text-indigo-800 uppercase">M4: Perlindungan</p>
              <p className="text-[8px] font-mono font-bold text-slate-900 mt-0.5">RM {protectionSediaAda.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-1">
              <p className="text-[6px] font-black text-blue-800 uppercase">M5: Pelaburan</p>
              <p className="text-[8px] font-mono font-bold text-slate-900 mt-0.5">RM {totalInvestment.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-purple-50/50 border border-purple-200 rounded-lg p-1">
              <p className="text-[6px] font-black text-purple-800 uppercase">M6: Penyucian</p>
              <p className="text-[8px] font-mono font-bold text-slate-900 mt-0.5">{activeZakatRecords.length} Rekod</p>
            </div>
            <div className="bg-rose-50/50 border border-rose-200 rounded-lg p-1">
              <p className="text-[6px] font-black text-rose-800 uppercase">M7: Pewarisan</p>
              <p className="text-[8px] font-mono font-bold text-slate-900 mt-0.5">Pusaka & Wasiat</p>
            </div>
          </div>

          {/* Key Analytics Section (Section 1 & Section 2) */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            
            {/* SECTION 1: Indikator Aliran Tunai & Nilai Aset Bersih */}
            <div className="bg-white rounded-xl border border-slate-200 p-2 space-y-1.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                <h3 className="font-bold text-slate-800 text-[8px] uppercase tracking-widest flex items-center gap-1">
                  <span>📈</span> Indikator Aliran Tunai & Nilai Aset Bersih
                </h3>
                <span className="text-[6px] font-black uppercase text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100">
                  Formula
                </span>
              </div>

              <div className="space-y-1">
                {/* Indicator 1: Nisbah Kos Hutang (DSR) */}
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center text-[8px]">
                    <span className="font-bold text-slate-700">Khidmat Hutang (DSR)</span>
                    <span className="font-mono font-bold text-slate-800">{dsrPercent.toFixed(1)}% <span className="text-[6px] font-normal text-slate-400">(≤ 30%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${dsrPercent <= 30 ? 'bg-emerald-500' : dsrPercent <= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(100, dsrPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[6px]">
                    <span className="text-slate-400">Hutang ÷ Gaji Bersih</span>
                    <span className={`font-extrabold px-1 py-0.2 rounded border uppercase ${dsrStatus.color}`}>
                      {dsrStatus.label}
                    </span>
                  </div>
                </div>

                {/* Indicator 2: Kadar Simpanan / Lebihan */}
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center text-[8px]">
                    <span className="font-bold text-slate-700">Lebihan Aliran Tunai</span>
                    <span className="font-mono font-bold text-slate-800">{surplusPercent.toFixed(1)}% <span className="text-[6px] font-normal text-slate-400">(≥ 30%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${surplusPercent >= 30 ? 'bg-emerald-500' : surplusPercent >= 10 ? 'bg-blue-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(100, surplusPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[6px]">
                    <span className="text-slate-400">Surplus ÷ Gaji Bersih</span>
                    <span className={`font-extrabold px-1 py-0.2 rounded border uppercase ${surplusStatus.color}`}>
                      {surplusStatus.label}
                    </span>
                  </div>
                </div>

                {/* Indicator 3: Debt to Asset Ratio */}
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center text-[8px]">
                    <span className="font-bold text-slate-700">Hutang-kepada-Aset</span>
                    <span className="font-mono font-bold text-slate-800">{debtToAssetRatio.toFixed(1)}% <span className="text-[6px] font-normal text-slate-400">(≤ 50%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${debtToAssetRatio <= 35 ? 'bg-emerald-500' : debtToAssetRatio <= 50 ? 'bg-blue-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(100, debtToAssetRatio)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[6px]">
                    <span className="text-slate-400">Liabiliti ÷ Aset</span>
                    <span className={`font-extrabold px-1 py-0.2 rounded border uppercase ${debtToAssetStatus.color}`}>
                      {debtToAssetStatus.label}
                    </span>
                  </div>
                </div>

                {/* Indicator 4: Liquid Assets to Liabilities */}
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center text-[8px]">
                    <span className="font-bold text-slate-700">Reserv Cair (Liquid to Debt)</span>
                    <span className="font-mono font-bold text-slate-800">{liquidToDebtRatio.toFixed(1)}% <span className="text-[6px] font-normal text-slate-400">(≥ 100%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${liquidToDebtRatio >= 100 ? 'bg-emerald-500' : liquidToDebtRatio >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(100, liquidToDebtRatio)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[6px]">
                    <span className="text-slate-400">Aset Cair ÷ Liabiliti</span>
                    <span className={`font-extrabold px-1 py-0.2 rounded border uppercase ${liquidToDebtStatus.color}`}>
                      {liquidToDebtStatus.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Analisis Sasaran & Shortfall (Kekurangan) */}
            <div className="bg-white rounded-xl border border-slate-200 p-2 space-y-1.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                <h3 className="font-bold text-slate-800 text-[8px] uppercase tracking-widest flex items-center gap-1">
                  <span>🛡️</span> Analisis Sasaran & Shortfall
                </h3>
                <span className="text-[6px] font-black uppercase text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                  Sasaran
                </span>
              </div>

              <div className="space-y-1">
                {/* item 1: Simpanan Kecemasan */}
                <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-extrabold text-slate-700">Tabung Kecemasan (6 Bulan)</span>
                    {savingsShortfallSelesa > 0 ? (
                      <span className="text-[6px] font-black text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-100 uppercase">
                        Kekurangan
                      </span>
                    ) : (
                      <span className="text-[6px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100 uppercase">
                        SIHAT
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-0.5 text-center text-[8px] pt-0.5 border-t border-slate-100">
                    <div>
                      <p className="text-[6px] text-slate-400 uppercase">Sedia Ada</p>
                      <p className="font-mono font-bold text-slate-700">RM {savingsSediaAda.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                      <p className="text-[6px] text-slate-400 uppercase">Sasaran</p>
                      <p className="font-mono font-bold text-slate-700">RM {savingsTargetSelesa.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                      <p className="text-[6px] text-slate-400 uppercase">Shortfall</p>
                      <p className={`font-mono font-bold ${savingsShortfallSelesa > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        RM {savingsShortfallSelesa.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* item 2: Perlindungan Takaful */}
                <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-extrabold text-slate-700">Perlindungan Kematian (10x Gaji)</span>
                    {protectionShortfall > 0 ? (
                      <span className="text-[6px] font-black text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-100 uppercase">
                        Kekurangan
                      </span>
                    ) : (
                      <span className="text-[6px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100 uppercase">
                        SIHAT
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-0.5 text-center text-[8px] pt-0.5 border-t border-slate-100">
                    <div>
                      <p className="text-[6px] text-slate-400 uppercase">Sedia Ada</p>
                      <p className="font-mono font-bold text-slate-700">RM {protectionSediaAda.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                      <p className="text-[6px] text-slate-400 uppercase">Sasaran</p>
                      <p className="font-mono font-bold text-slate-700">RM {protectionTargetDeath.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                      <p className="text-[6px] text-slate-400 uppercase">Shortfall</p>
                      <p className={`font-mono font-bold ${protectionShortfall > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        RM {protectionShortfall.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* item 3: Tabung Persaraan */}
                <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-extrabold text-slate-700">Tabung Persaraan (Umur {rSettings.targetAge})</span>
                    {retirementShortfall > 0 ? (
                      <span className="text-[6px] font-black text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-100 uppercase">
                        Kekurangan
                      </span>
                    ) : (
                      <span className="text-[6px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100 uppercase">
                        SIHAT
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-0.5 text-center text-[8px] pt-0.5 border-t border-slate-100">
                    <div>
                      <p className="text-[6px] text-slate-400 uppercase">Sedia Ada</p>
                      <p className="font-mono font-bold text-slate-700">RM {retirementSediaAda.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                      <p className="text-[6px] text-slate-400 uppercase">Sasaran</p>
                      <p className="font-mono font-bold text-slate-700">RM {requiredRetirementFund.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                      <p className="text-[6px] text-slate-400 uppercase">Shortfall</p>
                      <p className={`font-mono font-bold ${retirementShortfall > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        RM {retirementShortfall.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <PageFooter pageNum={2} />
      </div>

      {/* ================= PAGE 3: MODUL 1 ALIRAN TUNAI ================= */}
      <div className="w-full bg-white print-page flex flex-col justify-between">
        <div className="print-page-content">
          <PageHeader moduleTitle="Modul 1: Aliran Tunai" />

          {/* Title */}
          <div className="mt-1">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span>📊</span> MODUL 1: ALIRAN TUNAI
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
              Tab Pendapatan, Tab Perbelanjaan & Tab Indikator / Rumusan Aliran Tunai
            </p>
          </div>

          {/* Cards block */}
          <div className="grid grid-cols-4 gap-2.5 mt-2.5">
            <div className="bg-emerald-50/20 rounded-xl border border-emerald-500/15 p-2.5">
              <div className="text-[8px] font-black text-emerald-700 tracking-wider uppercase">
                PENDAPATAN BERSIH
              </div>
              <div className="text-sm font-mono font-black text-slate-900 mt-0.5">
                RM {totalMonthlyIncomeBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[7px] font-bold text-slate-400 mt-0.5 uppercase">
                Kasar: RM {grossMonthlyIncome.toLocaleString()}
              </div>
            </div>

            <div className="bg-rose-50/20 rounded-xl border border-rose-500/15 p-2.5">
              <div className="text-[8px] font-black text-rose-600 tracking-wider uppercase">
                PERBELANJAAN BULANAN
              </div>
              <div className="text-sm font-mono font-black text-slate-900 mt-0.5">
                RM {totalMonthlyExpenseBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[7px] font-bold text-slate-400 mt-0.5 uppercase">
                Hutang: RM {monthlyDebtPayments.toLocaleString()}
              </div>
            </div>

            <div className={`rounded-xl p-2.5 border ${surplusBudget >= 0 ? 'bg-teal-50/20 border-teal-500/15' : 'bg-red-50/20 border-red-500/15'}`}>
              <div className={`text-[8px] font-black tracking-wider uppercase ${surplusBudget >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>
                SURPLUS / LEBIHAN
              </div>
              <div className="text-sm font-mono font-black text-slate-900 mt-0.5">
                RM {surplusBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[7px] font-bold text-slate-400 mt-0.5 uppercase">
                {savingsRate.toFixed(1)}% Daripada Pendapatan
              </div>
            </div>

            <div className="bg-indigo-50/20 rounded-xl border border-indigo-500/15 p-2.5">
              <div className="text-[8px] font-black text-indigo-700 tracking-wider uppercase">
                NISBAH HUTANG (DSR)
              </div>
              <div className="text-sm font-mono font-black text-slate-900 mt-0.5">
                {debtServiceRatio.toFixed(1)}%
              </div>
              <div className="text-[7px] font-bold text-slate-400 mt-0.5 uppercase">
                {debtServiceRatio <= 40 ? 'SIHAT (MAX 35-40%)' : 'TINGGI (> 40%)'}
              </div>
            </div>
          </div>

          {/* Indikator & Analisis Section */}
          <div className="grid grid-cols-2 gap-3 mt-2.5 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs">
            <div>
              <div className="font-bold text-slate-800 uppercase text-[9px] mb-0.5 flex justify-between border-b border-slate-200 pb-0.5">
                <span>INDIKATOR 1: Nisbah Perkhidmatan Hutang (DSR)</span>
                <span className={`px-1 rounded text-[7px] font-black ${debtServiceRatio <= 40 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {debtServiceRatio <= 40 ? 'IDEAL' : 'AMARAN'}
                </span>
              </div>
              <p className="text-[9px] text-slate-500 mt-0.5">
                Formula: (Ansuran Hutang Bulanan ÷ Pendapatan Bersih) × 100 = <strong>{debtServiceRatio.toFixed(1)}%</strong>. Sasaran: Maksimum 35% - 40%.
              </p>
            </div>
            <div>
              <div className="font-bold text-slate-800 uppercase text-[9px] mb-0.5 flex justify-between border-b border-slate-200 pb-0.5">
                <span>INDIKATOR 2: Nisbah Surplus / Lebihan</span>
                <span className={`px-1 rounded text-[7px] font-black ${savingsRate >= 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {savingsRate >= 10 ? 'CEMERLANG' : 'RENDAH'}
                </span>
              </div>
              <p className="text-[9px] text-slate-500 mt-0.5">
                Formula: (Surplus ÷ Pendapatan Bersih) × 100 = <strong>{savingsRate.toFixed(1)}%</strong>. Sasaran: Minimum 10% - 20%.
              </p>
            </div>
          </div>

          {/* Detailed Budget Table */}
          <div className="mt-2.5 bg-slate-50/50 rounded-xl border border-slate-200 p-2.5">
            <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1 mb-1.5">
              KANDUNGAN TAB PENDAPATAN & TAB PERBELANJAAN (BELANJAWAN)
            </h3>
            
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold">
                  <th className="py-1 text-[8px] uppercase tracking-wider">Label/Penerangan</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider">Kategori</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider">Sub-Kategori</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider text-right">Jumlah Bulanan (RM)</th>
                </tr>
              </thead>
              <tbody>
                {activeBudgetIncomeList.map((item, idx) => (
                  <tr key={`inc-${idx}`} className="border-b border-slate-100 text-slate-700">
                    <td className="py-0.5 font-medium text-[10px]">{item.label}</td>
                    <td className="py-0.5 text-emerald-700 font-bold uppercase text-[8px]">PENDAPATAN</td>
                    <td className="py-0.5 text-slate-500 capitalize text-[9px]">{item.subCategory}</td>
                    <td className="py-0.5 font-mono font-bold text-slate-950 text-right text-[10px]">
                      {item.subCategory === 'deduction' ? '-' : ''}RM {item.monthly.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {activeBudgetExpenseList.map((item, idx) => (
                  <tr key={`exp-${idx}`} className="border-b border-slate-100 text-slate-700">
                    <td className="py-0.5 font-medium text-[10px]">{item.label}</td>
                    <td className="py-0.5 text-rose-600 font-bold uppercase text-[8px]">PERBELANJAAN</td>
                    <td className="py-0.5 text-slate-500 capitalize text-[9px]">{item.subCategory}</td>
                    <td className="py-0.5 font-mono font-bold text-slate-950 text-right text-[10px]">
                      RM {item.monthly.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Analysis box */}
          <div className="mt-2.5 bg-[#0A1128] text-white rounded-xl p-3">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <span>📝</span> ANALISIS RINGKASAN ALIRAN TUNAI & INDIKATOR
            </h3>
            <p className="text-[10px] font-normal leading-relaxed mt-1 text-slate-300">
              {cashflowAnalysisText}
            </p>
          </div>
        </div>

        <PageFooter pageNum={3} />
      </div>

      {/* ================= PAGE 4: MODUL 2 NILAI ASET BERSIH ================= */}
      <div className="w-full bg-white print-page flex flex-col justify-between">
        <div className="print-page-content">
          <PageHeader moduleTitle="Modul 2: Nilai Aset Bersih" />

          {/* Title */}
          <div className="mt-1">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span>⚖️</span> MODUL 2: NILAI ASET BERSIH
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
              Aset, Liabiliti & 3 Analisis Kesihatan Aset Bersih
            </p>
          </div>

          {/* Net worth display */}
          <div className="mt-2.5 bg-emerald-50/20 border border-emerald-500/15 rounded-xl p-3 text-center">
            <div className="text-[9px] font-black text-emerald-700 tracking-widest uppercase">
              NILAI BERSIH KESELURUHAN (NET WORTH)
            </div>
            <div className="text-xl font-mono font-black text-slate-900 mt-0.5">
              RM {calculatedNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[8px] text-slate-400 uppercase tracking-wider mt-0.5 font-bold">
              TOTAL ASET: RM {totalAssets.toLocaleString()} | TOTAL LIABILITI: RM {totalLiabilities.toLocaleString()} | ASET CAIR: RM {totalLiquidAssets.toLocaleString()}
            </p>
          </div>

          {/* Asset & Liability breakdown tables */}
          <div className="grid grid-cols-2 gap-4 mt-2.5">
            <div>
              <div className="flex justify-between items-center border-b border-emerald-500 pb-0.5 mb-1.5">
                <span className="text-[9px] font-black text-slate-800 uppercase tracking-wider">ASET (BANK, SIMPANAN, HARTANAH, KWSP, SAHAM)</span>
                <span className="text-[10px] font-mono font-black text-emerald-700">RM {totalAssets.toLocaleString()}</span>
              </div>
              <div className="space-y-0.5 max-h-[160px] overflow-hidden text-xs">
                {activeAssetsList.map((item, idx) => (
                  <div key={`ast-${idx}`} className="flex justify-between py-0.5 border-b border-slate-100 text-[10px]">
                    <span className="text-slate-500 truncate max-w-[140px] font-medium">{item.name} <span className="text-[8px] text-slate-400">({item.category})</span></span>
                    <span className="text-slate-900 font-mono font-bold">RM {item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center border-b border-rose-500 pb-0.5 mb-1.5">
                <span className="text-[9px] font-black text-slate-800 uppercase tracking-wider">LIABILITI (HUTANG PERIBADI & ASET)</span>
                <span className="text-[10px] font-mono font-black text-rose-600">RM {totalLiabilities.toLocaleString()}</span>
              </div>
              <div className="space-y-0.5 max-h-[160px] overflow-hidden text-xs">
                {activeLiabilitiesList.map((item, idx) => (
                  <div key={`lia-${idx}`} className="flex justify-between py-0.5 border-b border-slate-100 text-[10px]">
                    <span className="text-slate-500 truncate max-w-[140px] font-medium">{item.name}</span>
                    <span className="text-slate-900 font-mono font-bold">RM {item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3 Analisis Section */}
          <div className="grid grid-cols-3 gap-2.5 mt-2.5 text-xs">
            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              <div className="text-[8px] font-black text-emerald-800 uppercase">ANALISIS 1: Nilai Aset Bersih</div>
              <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">RM {calculatedNetWorth.toLocaleString()}</div>
              <div className={`mt-0.5 inline-block text-[7px] font-black uppercase px-1 rounded ${calculatedNetWorth >= 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'}`}>
                INDIKATOR: {calculatedNetWorth >= 0 ? 'BAGUS' : 'TIDAK BAGUS'}
              </div>
            </div>

            <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200">
              <div className="text-[8px] font-black text-blue-800 uppercase">ANALISIS 2: Liquidity Ratio</div>
              <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">{liquidityRatioMonths.toFixed(1)} bulan</div>
              <div className={`mt-0.5 inline-block text-[7px] font-black uppercase px-1 rounded ${liquidityRatioMonths >= 6 ? 'bg-emerald-200 text-emerald-900' : liquidityRatioMonths >= 3 ? 'bg-blue-200 text-blue-900' : 'bg-rose-200 text-rose-900'}`}>
                INDIKATOR: {liquidityRatioMonths >= 6 ? 'PALING BAGUS' : liquidityRatioMonths >= 3 ? 'BAGUS' : 'BAHAYA'}
              </div>
            </div>

            <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-200">
              <div className="text-[8px] font-black text-indigo-800 uppercase">ANALISIS 3: Kesihatan Hutang</div>
              <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">{debtHealthYears.toFixed(1)} tahun</div>
              <div className={`mt-0.5 inline-block text-[7px] font-black uppercase px-1 rounded ${debtHealthYears < 3.5 ? 'bg-emerald-200 text-emerald-900' : debtHealthYears <= 7 ? 'bg-indigo-200 text-indigo-900' : 'bg-rose-200 text-rose-900'}`}>
                INDIKATOR: {debtHealthYears < 3.5 ? 'SIHAT' : debtHealthYears <= 7 ? 'SEDERHANA' : 'KRITIKAL'}
              </div>
            </div>
          </div>

          {/* Analysis Box */}
          <div className="mt-2.5 bg-[#0A1128] text-white rounded-xl p-3">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <span>📝</span> RUMUSAN ANALISIS KUNCI KIRA-KIRA & ASET BERSIH
            </h3>
            <p className="text-[10px] font-normal leading-relaxed mt-1 text-slate-300">
              {netWorthAnalysisText}
            </p>
          </div>
        </div>

        <PageFooter pageNum={4} />
      </div>

      {/* ================= PAGE 5: MODUL 3 SIMPANAN ================= */}
      <div className="w-full bg-white print-page flex flex-col justify-between">
        <div className="print-page-content">
          <PageHeader moduleTitle="Modul 3: Simpanan" />

          {/* Title */}
          <div className="mt-1">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span>🎯</span> MODUL 3: SIMPANAN
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
              Tab Emergency Fund (Kecemasan) & Tab Sinking Fund (Simpanan Bertujuan)
            </p>
          </div>

          {/* Savings summaries */}
          <div className="grid grid-cols-2 gap-4 mt-2.5">
            <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-3">
              <div className="font-bold text-slate-800 uppercase text-[9px] mb-1.5 flex justify-between border-b border-amber-200 pb-0.5">
                <span>TAB 1: EMERGENCY FUND (KECEMASAN)</span>
                <span className="text-amber-800 bg-amber-100 px-1 rounded text-[7px] font-black">SASARAN 6 BULAN</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Sasaran Asas (3 Bulan):</span>
                  <span className="text-slate-800 font-bold font-mono">RM {savingsTargetAsas.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Sasaran Selesa (6 Bulan):</span>
                  <span className="text-slate-800 font-bold font-mono">RM {savingsTargetSelesa.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Simpanan Cair Sedia Ada:</span>
                  <span className="text-emerald-700 font-bold font-mono">RM {savingsSediaAda.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pt-0.5 border-t border-dashed border-amber-300 text-rose-600 font-bold text-[10px]">
                  <span>Jurang Kekurangan (Shortfall):</span>
                  <span className="font-black font-mono">RM {savingsShortfallSelesa.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50/40 border border-indigo-200 rounded-xl p-3">
              <div className="font-bold text-slate-800 uppercase text-[9px] mb-1.5 flex justify-between border-b border-indigo-200 pb-0.5">
                <span>TAB 2: SINKING FUND (TABUNGAN KHAS)</span>
                <span className="text-indigo-800 bg-indigo-100 px-1 rounded text-[7px] font-black">MATLAMAT KHAS</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Jumlah Sasaran Sinking Fund:</span>
                  <span className="text-slate-800 font-bold font-mono">RM {sinkingFundTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Jumlah Terkumpul Semasa:</span>
                  <span className="text-indigo-700 font-bold font-mono">RM {sinkingFundCurrent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pt-0.5 border-t border-dashed border-indigo-300 text-rose-600 font-bold text-[10px]">
                  <span>Baki Jurang Belum Mencukupi:</span>
                  <span className="font-black font-mono">RM {sinkingFundShortfall.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sinking Funds table */}
          <div className="mt-2.5 bg-slate-50/50 rounded-xl border border-slate-200 p-2.5">
            <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1 mb-1.5">
              SENARAI TABUNGAN SINKING FUND (HARI RAYA, ROADTAX, SEKOLAH, CUTI, SENGGARAAN)
            </h3>
            
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold">
                  <th className="py-1 text-[8px] uppercase tracking-wider">Nama Tabung</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider">Kategori</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider text-right">Sasaran (RM)</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider text-right">Terkumpul (RM)</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider text-right">Baki Jurang (RM)</th>
                </tr>
              </thead>
              <tbody>
                {activeSinkingFunds.map((item, idx) => {
                  const shortfall = Math.max(0, item.targetAmount - item.currentAmount);
                  return (
                    <tr key={`sink-${idx}`} className="border-b border-slate-100 text-slate-700">
                      <td className="py-0.5 font-bold text-[10px]">{item.title}</td>
                      <td className="py-0.5 text-indigo-700 font-bold text-[8px] uppercase">{item.type}</td>
                      <td className="py-0.5 font-mono font-bold text-right text-[10px]">RM {item.targetAmount.toLocaleString()}</td>
                      <td className="py-0.5 font-mono font-bold text-slate-600 text-right text-[10px]">RM {item.currentAmount.toLocaleString()}</td>
                      <td className={`py-0.5 font-mono font-black text-right text-[10px] ${shortfall > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        RM {shortfall.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Analysis box */}
          <div className="mt-2.5 bg-[#0A1128] text-white rounded-xl p-3">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <span>📝</span> ANALISIS INDIKATOR SIMPANAN KECEMASAN & SINKING FUND
            </h3>
            <p className="text-[10px] font-normal leading-relaxed mt-1 text-slate-300">
              {savingsAnalysisText}
            </p>
          </div>
        </div>

        <PageFooter pageNum={5} />
      </div>

      {/* ================= PAGE 6: MODUL 4 PERLINDUNGAN ================= */}
      <div className="w-full bg-white print-page flex flex-col justify-between">
        <div className="print-page-content">
          <PageHeader moduleTitle="Modul 4: Perlindungan" />

          {/* Title */}
          <div className="mt-1">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span>🛡️</span> MODUL 4: PERLINDUNGAN
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
              Tab Senarai Sijil, Tab Jurang Perlindungan (Income Protection) & Tab Debt Settlement
            </p>
          </div>

          {/* Existing policies */}
          <div className="mt-2.5 bg-slate-50/50 rounded-xl border border-slate-200 p-2.5">
            <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1 mb-1.5">
              TAB 1: SENARAI SIJIL TAKAFUL SEDIA ADA
            </h3>
            
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold">
                  <th className="py-1 text-[8px] uppercase tracking-wider">Polisi / Syarikat</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider">Jenis</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider">Caruman Bulanan</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider text-right">Kematian / TPD (RM)</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider text-right">Penyakit Kritikal (RM)</th>
                </tr>
              </thead>
              <tbody>
                {activeProtections.map((item, idx) => (
                  <tr key={`prot-${idx}`} className="border-b border-slate-100 text-slate-700">
                    <td className="py-0.5 text-[10px]">
                      <span className="font-bold">{item.policyName}</span>
                      <span className="text-[8px] text-slate-400 uppercase ml-1">({item.company || '-'})</span>
                    </td>
                    <td className="py-0.5 text-indigo-700 font-bold text-[8px] uppercase">{item.type}</td>
                    <td className="py-0.5 font-mono font-bold text-[10px]">
                      RM {(item.premiumFrequency === 'Yearly' ? (item.premium / 12) : item.premium).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-0.5 font-mono font-bold text-slate-950 text-right text-[10px]">
                      RM {(item.deathBenefit || item.coverageAmount || 0).toLocaleString()}
                    </td>
                    <td className="py-0.5 font-mono font-bold text-slate-950 text-right text-[10px]">
                      RM {(item.criticalIllness || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Income Protection Gap Analysis (Method 1 & 2) */}
          <div className="mt-2.5 bg-slate-50 rounded-xl border border-slate-200 p-2.5 text-xs">
            <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1 mb-1.5">
              TAB 2: ANALISA JURANG PERLINDUNGAN (INCOME PROTECTION GAP ANALYSIS)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[8px] font-black text-[#1A365D] uppercase">KAEDAH 1: CAPITAL INTACT METHOD (5% RETURN)</span>
                <div className="mt-0.5 space-y-0.5 text-[10px]">
                  <div className="flex justify-between"><span className="text-slate-500">Modal Diperlukan:</span> <span className="font-mono font-bold">RM {requiredCapitalIntact.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Manfaat Kematian Semasa:</span> <span className="font-mono font-bold text-emerald-700">RM {totalDeathCoverage.toLocaleString()}</span></div>
                  <div className="flex justify-between border-t border-dashed pt-0.5 text-rose-600 font-bold"><span>Jurang Modal:</span> <span className="font-mono font-black">RM {shortfallCapitalIntact.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                </div>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[8px] font-black text-[#1A365D] uppercase">KAEDAH 2: ASSET LIQUIDATION METHOD (10 TAHUN)</span>
                <div className="mt-0.5 space-y-0.5 text-[10px]">
                  <div className="flex justify-between"><span className="text-slate-500">Perperluan Saraan (10 Thn):</span> <span className="font-mono font-bold">RM {requiredAssetLiquidation.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Manfaat Kematian Semasa:</span> <span className="font-mono font-bold text-emerald-700">RM {totalDeathCoverage.toLocaleString()}</span></div>
                  <div className="flex justify-between border-t border-dashed pt-0.5 text-rose-600 font-bold"><span>Jurang Modal:</span> <span className="font-mono font-black">RM {shortfallAssetLiquidation.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Debt Settlement Plan */}
          <div className="mt-2.5 bg-slate-50 rounded-xl border border-slate-200 p-2 text-xs">
            <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-0.5 mb-1">
              TAB 3: DEBT SETTLEMENT PLAN (SENARAI LIABILITI & STATUS TAKAFUL HUTANG)
            </h3>
            <div className="flex justify-between items-center text-[10px] py-0.5">
              <span className="text-slate-600">Total Liabiliti: <strong>RM {totalLiabilities.toLocaleString()}</strong></span>
              <span className="text-slate-600">Dilindungi MRTT/MLTT/LPPPSA: <strong>RM {liabilityCovered.toLocaleString()}</strong></span>
              <span className="text-rose-600 font-black">Baki Tanpa Perlindungan: RM {(totalLiabilities - liabilityCovered).toLocaleString()}</span>
            </div>
          </div>

          {/* Analysis box */}
          <div className="mt-2.5 bg-[#0A1128] text-white rounded-xl p-3">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <span>📝</span> ANALISIS KEPERLUAN & STRATEGI PERLINDUNGAN TAKAFUL
            </h3>
            <p className="text-[10px] font-normal leading-relaxed mt-1 text-slate-300">
              {protectionAnalysisText}
            </p>
          </div>
        </div>

        <PageFooter pageNum={6} />
      </div>

      {/* ================= PAGE 7: MODUL 5 PELABURAN ================= */}
      <div className="w-full bg-white print-page flex flex-col justify-between">
        <div className="print-page-content">
          <PageHeader moduleTitle="Modul 5: Pelaburan" />

          {/* Title */}
          <div className="mt-1">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span>📈</span> MODUL 5: PELABURAN
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
              Tab Ringkasan Aset (Allocation Breakdown) & Tab Analisa Persaraan
            </p>
          </div>

          {/* Investment portfolio content */}
          <div className="mt-2.5 bg-slate-50/50 rounded-xl border border-slate-200 p-2.5">
            <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1 mb-1.5">
              TAB 1: RINGKASAN ASET & ALLOCATION BREAKDOWN (ASET CAIR VS ASET TETAP)
            </h3>
            
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold">
                  <th className="py-1 text-[8px] uppercase tracking-wider">Nama Pelaburan / Aset</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider">Kategori</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider">Kecairan</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider text-right">Nilai Semasa (RM)</th>
                </tr>
              </thead>
              <tbody>
                {activeAssetsList.map((item, idx) => (
                  <tr key={`inv-${idx}`} className="border-b border-slate-100 text-slate-700">
                    <td className="py-0.5 font-bold text-[10px]">{item.name}</td>
                    <td className="py-0.5 text-indigo-700 font-bold text-[8px] uppercase">{item.category}</td>
                    <td className="py-0.5 text-slate-500 font-bold text-[8px] uppercase">{item.isLiquid ? 'Cair' : 'Tetap'}</td>
                    <td className="py-0.5 font-mono font-black text-slate-950 text-right text-[10px]">
                      RM {item.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Retirement details */}
          <div className="mt-2.5 bg-slate-50 rounded-xl border border-slate-200 p-2.5">
            <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1 mb-1.5">
              TAB 2: ANALISA PERSARAAN & UNJURAN DANA PENCEN (RETIREMENT TIMELINE)
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
              <div className="flex justify-between border-b border-slate-200/50 pb-0.5 text-[10px]">
                <span className="text-slate-400">Umur Bersara Sasaran:</span>
                <span className="text-slate-900 font-bold">{rSettings.targetAge} tahun ({yearsToRetirement} tahun lagi)</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-0.5 text-[10px]">
                <span className="text-slate-400">Kadar Inflasi Diandaikan:</span>
                <span className="text-slate-900 font-bold font-mono">{rSettings.inflationRate}% setahun</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-0.5 text-[10px]">
                <span className="text-slate-400">Nisbah Belanja Pasca-Bersara:</span>
                <span className="text-slate-900 font-bold font-mono">{rSettings.postRetirementSpendingRatio}%</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-0.5 text-[10px]">
                <span className="text-slate-400">ROI Jangkaan Pasca-Bersara:</span>
                <span className="text-slate-900 font-bold font-mono">{rSettings.expectedRoi}% setahun</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-0.5 text-[10px]">
                <span className="text-slate-400">Saraan Tahunan Masa Depan:</span>
                <span className="text-slate-900 font-bold font-mono">RM {postRetirementAnnualNeeds.toLocaleString(undefined, { maximumFractionDigits: 0 })} / thn</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-0.5 text-[10px]">
                <span className="text-slate-400">Unjuran Aset Terkumpul:</span>
                <span className="text-slate-900 font-bold font-mono text-emerald-700">RM {retirementSediaAda.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-0.5 col-span-2 text-[10px]">
                <span className="text-slate-500 font-bold">KEPERLUAN DANA BERSARA (CAPITAL NEEDED):</span>
                <span className="text-slate-950 font-black font-mono text-emerald-800">RM {requiredRetirementFund.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-0.5 col-span-2 text-rose-600 font-bold text-[10px]">
                <span>JURANG DANA PERSARAAN (RETIREMENT SHORTFALL):</span>
                <span className="font-black font-mono">RM {retirementShortfall.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Analysis Box */}
          <div className="mt-2.5 bg-[#0A1128] text-white rounded-xl p-3">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <span>📝</span> RUMUSAN ANALISIS PELABURAN & PERSARAAN
            </h3>
            <p className="text-[10px] font-normal leading-relaxed mt-1 text-slate-300">
              {retirementAnalysisText}
            </p>
          </div>
        </div>

        <PageFooter pageNum={7} />
      </div>

      {/* ================= PAGE 8: MODUL 6 PENYUCIAN ================= */}
      <div className="w-full bg-white print-page flex flex-col justify-between">
        <div className="print-page-content">
          <PageHeader moduleTitle="Modul 6: Penyucian" />

          {/* Title */}
          <div className="mt-1">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span>✨</span> MODUL 6: PENYUCIAN HARTA
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
              Tab Zakat Harta & Tab Zakat Pendapatan (PPZ Method)
            </p>
          </div>

          {/* Splits for Harta Zakat and Pendapatan Zakat */}
          <div className="grid grid-cols-2 gap-4 mt-2.5">
            {/* Zakat Harta */}
            <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-2.5">
              <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1 mb-1.5">
                TAB 1: KALKULASI ZAKAT HARTA (WEALTH)
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Aset Layak Zakat Semasa:</span>
                  <span className="text-slate-850 font-bold font-mono">RM {totalZakatAbleAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Nisbah Nisab Semasa:</span>
                  <span className="text-slate-850 font-bold font-mono">RM {zSettings.nisab.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Status Capaian Nisab:</span>
                  <span className={`font-black uppercase text-[9px] ${isAboveNisab ? 'text-emerald-700 bg-emerald-50 px-1 rounded' : 'text-slate-400 bg-slate-100 px-1 rounded'}`}>
                    {isAboveNisab ? 'MELEBIHI NISAB' : 'DI BAWAH NISAB'}
                  </span>
                </div>
                <div className="flex justify-between pt-0.5 border-t border-dashed border-slate-200 text-emerald-800 font-bold text-[10px]">
                  <span>Syor Zakat Harta (2.5%):</span>
                  <span className="font-black font-mono">RM {recommendedZakatHarta.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Zakat Pendapatan */}
            <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-2.5">
              <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1 mb-1.5">
                TAB 2: ZAKAT PENDAPATAN (KAEDAH PPZ)
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Pendapatan Kasar Setahun:</span>
                  <span className="text-slate-850 font-bold font-mono">RM {jumlahPendapatanKasarSetahun.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Tolakan Pelepasan PPZ:</span>
                  <span className="text-slate-850 font-bold font-mono">RM {jumlahTolakanPelepasanSetahun.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Pendapatan Bersih Layak:</span>
                  <span className="text-slate-850 font-bold font-mono">RM {pendapatanBersihLayakZakat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pt-0.5 border-t border-dashed border-slate-200 text-emerald-850 font-bold text-[10px]">
                  <span>Syor Zakat Bulanan (2.5%):</span>
                  <span className="font-black font-mono">RM {recommendedZakatPendapatanBulanan.toLocaleString(undefined, { minimumFractionDigits: 2 })} / Bln</span>
                </div>
              </div>
            </div>
          </div>

          {/* Past payments */}
          <div className="mt-2.5 bg-slate-50 rounded-xl border border-slate-200 p-2.5">
            <h3 className="text-[9px] font-black text-slate-850 uppercase tracking-widest border-b border-slate-200 pb-1 mb-1.5">
              SEJARAH REKOD BAYARAN ZAKAT DIDAFTARKAN
            </h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold">
                  <th className="py-1 text-[8px] uppercase tracking-wider">Tahun</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider">Jenis Zakat</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider">Tarikh Bayaran</th>
                  <th className="py-1 text-[8px] uppercase tracking-wider text-right">Jumlah Dibayar (RM)</th>
                </tr>
              </thead>
              <tbody>
                {activeZakatRecords.map((item, idx) => (
                  <tr key={`zak-${idx}`} className="border-b border-slate-100 text-slate-700">
                    <td className="py-0.5 font-mono font-bold text-[10px]">{item.year}</td>
                    <td className="py-0.5 text-indigo-700 font-bold text-[8px] uppercase">{item.type}</td>
                    <td className="py-0.5 text-[10px]">{item.datePaid || '-'}</td>
                    <td className="py-0.5 font-mono font-black text-slate-950 text-right text-[10px]">
                      RM {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Analysis box */}
          <div className="mt-2.5 bg-[#0A1128] text-white rounded-xl p-3">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <span>📝</span> ANALISIS KEWAJIPAN & PENYUCIAN ZAKAT
            </h3>
            <p className="text-[10px] font-normal leading-relaxed mt-1 text-slate-300">
              {zakatAnalysisText}
            </p>
          </div>
        </div>

        <PageFooter pageNum={8} />
      </div>

      {/* ================= PAGE 9: MODUL 7 PEWARISAN ================= */}
      <div className="w-full bg-white print-page flex flex-col justify-between">
        <div className="print-page-content">
          <PageHeader moduleTitle="Modul 7: Pewarisan" />

          {/* Title and net worth indicator */}
          <div className="mt-1 flex justify-between items-end">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <span>📜</span> MODUL 7: PEWARISAN
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
                5 Tertib Pusaka, Formulasi Agihan Faraid Syarak & Analisa Pusaka
              </p>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">BAKI HARTA BERSIH (FARAID POOL)</span>
              <div className="text-sm font-mono font-black text-slate-800">
                RM {faraidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 mt-2.5">
            {/* Left column: 5 Tertib Pusaka */}
            <div className="col-span-5 bg-slate-50/50 rounded-xl border border-slate-200 p-2.5">
              <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1 mb-1.5">
                1. SENARAI SEMAK 5 TERTIB PUSAKA
              </h3>
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center bg-white border border-slate-200 rounded-lg p-1.5">
                  <div>
                    <div className="text-[10px] font-bold text-slate-850">1. Pengurusan Jenazah</div>
                    <div className="text-[7px] text-slate-400 uppercase">RM {funeralTotal.toLocaleString()} diperuntukkan.</div>
                  </div>
                  <span className="text-[7px] font-black text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded uppercase">SELESAI</span>
                </div>

                <div className="flex justify-between items-center bg-white border border-slate-200 rounded-lg p-1.5">
                  <div>
                    <div className="text-[10px] font-bold text-slate-850">2. Pelunasan Hutang</div>
                    <div className="text-[7px] text-slate-400 uppercase">RM {debtTotal.toLocaleString()} (Allah & Manusia).</div>
                  </div>
                  <span className="text-[7px] font-black text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded uppercase">SELESAI</span>
                </div>

                <div className="flex justify-between items-center bg-white border border-slate-200 rounded-lg p-1.5">
                  <div>
                    <div className="text-[10px] font-bold text-slate-850">3. Harta Sepencarian</div>
                    <div className="text-[7px] text-slate-400 uppercase">Hak Pasangan ({iSettings.maritalPropertyPercentage}%).</div>
                  </div>
                  <span className="text-[7px] font-black text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded uppercase">DITOLAK</span>
                </div>

                <div className="flex justify-between items-center bg-white border border-slate-200 rounded-lg p-1.5">
                  <div>
                    <div className="text-[10px] font-bold text-slate-850">4. Pelaksanaan Wasiat</div>
                    <div className="text-[7px] text-slate-400 uppercase">RM {allowedWasiat.toLocaleString()} (Maks 1/3).</div>
                  </div>
                  <span className="text-[7px] font-black text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded uppercase">SELESAI</span>
                </div>

                <div className="flex justify-between items-center bg-white border border-slate-200 rounded-lg p-1.5">
                  <div>
                    <div className="text-[10px] font-bold text-slate-850">5. Agihan Faraid</div>
                    <div className="text-[7px] text-slate-400 uppercase">Baki Faraid Bersih.</div>
                  </div>
                  <span className="text-[7px] font-black text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded uppercase">DIPROSES</span>
                </div>
              </div>
            </div>

            {/* Right column: Agihan Faraid */}
            <div className="col-span-7 bg-slate-50/50 rounded-xl border border-slate-200 p-2.5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-1 mb-1.5">
                  <h3 className="text-[9px] font-black text-slate-850 uppercase tracking-widest">
                    2. PENGIRAAN AGIHAN FARAID SYARAK
                  </h3>
                  <span className="text-[7px] font-black text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded uppercase font-mono">NISBAH SYARAK</span>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold">
                      <th className="py-1 text-[8px] uppercase tracking-wider">Waris Layak</th>
                      <th className="py-1 text-[8px] uppercase tracking-wider">Pecahan</th>
                      <th className="py-1 text-[8px] uppercase tracking-wider text-right">Agihan Harta (RM)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faraidResults.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 text-slate-700">
                        <td className="py-0.5 font-bold text-[10px]">{item.name}</td>
                        <td className="py-0.5 font-mono font-bold text-slate-500 text-[9px]">{item.shareLabel} ({((item.amount / Math.max(faraidAmount, 1)) * 100).toFixed(1)}%)</td>
                        <td className="py-0.5 font-mono font-black text-slate-900 text-right text-[10px]">
                          RM {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Advice */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-2 text-[8px] text-amber-900 leading-relaxed font-semibold mt-1.5">
                <strong>NASIHAT PERANCANG PUSAKA:</strong> Untuk elakkan pembekuan aset keluarga, daftarkan dokumen <strong>HIBAH HARTANAH / TAKAFUL</strong> semasa hidup demi kebajikan keluarga.
              </div>
            </div>
          </div>

          {/* Analysis Box */}
          <div className="mt-2.5 bg-[#0A1128] text-white rounded-xl p-3">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <span>📝</span> ANALISIS PEWARISAN & AGREGAT PUSAKA
            </h3>
            <p className="text-[10px] font-normal leading-relaxed mt-1 text-slate-300">
              {inheritanceAnalysisText}
            </p>
          </div>
        </div>

        <PageFooter pageNum={9} />
      </div>

    </div>
  );
}
