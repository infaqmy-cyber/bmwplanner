import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Plus, Trash2, PlayCircle, Info, Save, ChevronDown, Sparkles, TrendingUp, AlertCircle, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { budgetService, savingsService, protectionService, investmentService } from '../services';
import { BudgetProfile, BudgetItem, Savings, Protection, Investment } from '../types';
import { auth } from '../firebase';
import { DEFAULT_BUDGET_ITEMS } from '../constants';
import NumericInput from './NumericInput';

export default function Cashflow({ switchTab }: { switchTab?: (tab: any) => void }) {
  const { viewingUserId } = useApp();
  const [profile, setProfile] = useState<BudgetProfile | null>(null);
  const [savings, setSavings] = useState<Savings[]>([]);
  const [protections, setProtections] = useState<Protection[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'income' | 'expenses' | 'summary'>('income');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [isAddingIncomeCategory, setIsAddingIncomeCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    let isMounted = true;
    const currentUserId = viewingUserId || auth.currentUser?.uid;
    
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    const unsub = budgetService.subscribe((profiles) => {
      if (!isMounted) return;
      
      if (profiles.length > 0) {
        const loadedProfile = { ...profiles[0] };
        
        // Ensure default items that might be missing (e.g. newly added categories) are included
        const existingIds = new Set(loadedProfile.items?.map(i => i.id) || []);
        const missingDefaults = DEFAULT_BUDGET_ITEMS.filter(def => !existingIds.has(def.id));
        
        if (missingDefaults.length > 0) {
          loadedProfile.items = [...(loadedProfile.items || []), ...missingDefaults];
        }

        if (!loadedProfile.items || loadedProfile.items.length === 0) {
          loadedProfile.items = [...DEFAULT_BUDGET_ITEMS];
        }
        setProfile(loadedProfile);
      } else {
        setProfile({ 
          userId: currentUserId, 
          lastUpdated: new Date().toISOString(), 
          items: [...DEFAULT_BUDGET_ITEMS] 
        });
      }
      setIsLoading(false);
    });

    const unsubSav = savingsService.subscribe(setSavings, currentUserId);
    const unsubProt = protectionService.subscribe(setProtections, currentUserId);
    const unsubInv = investmentService.subscribe(setInvestments, currentUserId);

    return () => {
      isMounted = false;
      unsub();
      unsubSav();
      unsubProt();
      unsubInv();
    };
  }, [viewingUserId, auth.currentUser]);

  // Maintain protections sync locally
  useEffect(() => {
    if (!profile) return;
  }, [protections, profile?.items.length]); 
// Focus on length changes to avoid loops while allowing sync

  const handleUpdateItem = async (id: string, monthly: number) => {
    if (!profile) return;
    const targetUserId = viewingUserId || auth.currentUser?.uid || '';
    
    const newItems = profile.items.map(item => item.id === id ? { ...item, monthly } : item);
    setProfile({ ...profile, items: newItems });

    // Sync to Protection module if it's a protection item
    const item = newItems.find(i => i.id === id);
    if (item?.subCategory === 'Protection') {
      const detail = protections.find(p => p.id === id);
      try {
        const detailToSave: Protection = detail ? {
          ...detail,
          policyName: item.label || detail.policyName || 'Sijil Baru',
          premium: detail.premiumFrequency === 'Yearly' ? monthly * 12 : monthly,
        } : {
          id,
          userId: targetUserId,
          type: 'Life',
          policyName: item.label || 'Sijil Baru',
          premium: monthly,
          premiumFrequency: 'Monthly',
          coverageAmount: 0
        };

        await protectionService.set(id, detailToSave, targetUserId);

        // Auto-save budget as well so Protection module stays in sync
        if (profile.id) {
          await budgetService.set(profile.id, {
            ...profile,
            items: newItems,
            lastUpdated: new Date().toISOString()
          }, targetUserId);
        }
      } catch (e) {
        console.error("Failed to sync amount update:", e);
      }
    }
  };

  const handleUpdateLabel = async (id: string, label: string) => {
    if (!profile) return;
    const targetUserId = viewingUserId || auth.currentUser?.uid || '';

    const newItems = profile.items.map(item => item.id === id ? { ...item, label } : item);
    setProfile({ ...profile, items: newItems });

    // Sync to Protection module if it's a protection item
    const item = newItems.find(i => i.id === id);
    if (item?.subCategory === 'Protection') {
      const detail = protections.find(p => p.id === id);
      try {
        const detailToSave: Protection = detail ? {
          ...detail,
          policyName: label || 'Sijil Baru'
        } : {
          id,
          userId: targetUserId,
          type: 'Life',
          policyName: label || 'Sijil Baru',
          premium: item.monthly,
          premiumFrequency: 'Monthly',
          coverageAmount: 0
        };

        await protectionService.set(id, detailToSave, targetUserId);

        // Auto-save budget as well
        if (profile.id) {
          await budgetService.set(profile.id, {
            ...profile,
            items: newItems,
            lastUpdated: new Date().toISOString()
          }, targetUserId);
        }
      } catch (e) {
        console.error("Failed to sync label update:", e);
      }
    }
  };

  const handleAddItem = async (category: string, subCategory: string) => {
    const targetUserId = viewingUserId || auth.currentUser?.uid || '';
    const id = `custom-${category}-${subCategory}-${Date.now()}`;
    const newItem: BudgetItem = {
      id,
      category,
      subCategory,
      label: subCategory === 'Protection' ? 'Sijil Baru' : (subCategory === 'rental' ? 'Hartanah Baru' : ''),
      monthly: 0,
      isCustom: true,
      rentalCollection: subCategory === 'rental' ? 0 : undefined,
      installment: subCategory === 'rental' ? 0 : undefined
    };
    
    setProfile(prev => {
      if (!prev) return null;
      return {
        ...prev,
        items: [...prev.items, newItem]
      };
    });

    // If it's a protection item, create the shadow record immediately so it "tallies"
    if (subCategory === 'Protection') {
      try {
        await protectionService.set(id, {
          id,
          userId: targetUserId,
          policyName: 'Sijil Baru',
          premium: 0,
          premiumFrequency: 'Monthly',
          type: 'Life',
          coverageAmount: 0
        }, targetUserId);
      } catch (e) {
        console.error("Failed to create protection record:", e);
      }
    }
  };

  const handleDeleteItem = async (id: string) => {
    const itemToDelete = profile?.items.find(i => i.id === id);
    const isProt = itemToDelete?.subCategory === 'Protection';

    setProfile(prev => {
      if (!prev) return null;
      return {
        ...prev,
        items: prev.items.filter(i => i.id !== id)
      };
    });

    if (isProt) {
      try {
        await protectionService.remove(id);
      } catch (error) {
        console.error("Error deleting protection detail:", error);
      }
    }
  };

  const handleDeleteCategory = (catName: string, category: string = 'expense') => {
    const itemsToDelete = profile?.items.filter(i => i.category === category && i.subCategory === catName) || [];
    
    setProfile(prev => {
      if (!prev) return null;
      return {
        ...prev,
        items: prev.items.filter(i => i.category !== category || i.subCategory !== catName)
      };
    });

    // Delete protection details for all deleted items if the subCategory was Protection
    if (catName === 'Protection' && category === 'surplus') {
      itemsToDelete.forEach(async (item) => {
        try {
          await protectionService.remove(item.id);
        } catch (error) {
          console.error("Error deleting protection detail:", error);
        }
      });
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    const targetUserId = viewingUserId || auth.currentUser?.uid || '';
    try {
      const dataToSave: BudgetProfile = {
        ...profile,
        items: profile.items,
        lastUpdated: new Date().toISOString()
      };

      if (profile.id) {
        await budgetService.set(profile.id, dataToSave, targetUserId);
      } else {
        const newBudgetId = await budgetService.add(dataToSave, targetUserId);
        if (newBudgetId) {
          setProfile(prev => prev ? { ...prev, id: newBudgetId } : prev);
        }
      }

      // Sync Protection records to ensure "tally"
      const protectionItems = profile.items.filter(i => i.subCategory === 'Protection');
      for (const item of protectionItems) {
        const existingDetail = protections.find(p => p.id === item.id);
        const detailToSave: Protection = existingDetail ? {
          ...existingDetail,
          policyName: item.label || existingDetail.policyName || 'Sijil Baru',
          premium: existingDetail.premiumFrequency === 'Yearly' ? item.monthly * 12 : item.monthly,
        } : {
          id: item.id,
          userId: targetUserId, 
          type: 'Life', 
          premiumFrequency: 'Monthly',
          policyName: item.label || 'Sijil Baru',
          premium: item.monthly,
          coverageAmount: 0,
        };
        await protectionService.set(item.id, detailToSave, targetUserId);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving budget:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRental = (id: string, field: 'rentalCollection' | 'installment', value: number) => {
    setProfile(prev => {
      if (!prev) return null;
      return {
        ...prev,
        items: prev.items.map(item => {
          if (item.id === id) {
            const newItem = { ...item, [field]: value };
            newItem.monthly = (newItem.rentalCollection || 0) - (newItem.installment || 0);
            return newItem;
          }
          return item;
        })
      };
    });
  };

  const getSubTotal = (items: BudgetItem[]) => items.reduce((acc, i) => acc + (i.monthly || 0), 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="animate-spin text-[#1A365D]" size={40} />
        <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Sila Tunggu...</p>
      </div>
    );
  }

  // Income Calculations
  const incomeItems = profile?.items.filter(i => i.category === 'income') || [];
  const grossIncome = getSubTotal(incomeItems.filter(i => i.subCategory !== 'deduction'));
  const deductions = getSubTotal(incomeItems.filter(i => i.subCategory === 'deduction'));
  const netIncome = grossIncome - deductions;

  // Expense Calculations
  const expenseItems = profile?.items.filter(i => i.category === 'expense') || [];
  const surplusItems = profile?.items.filter(i => i.category === 'surplus') || [];
  const totalExpense = getSubTotal(expenseItems);
  const surplus = netIncome - totalExpense;

  // Actual Values from other modules
  // Use planned surplus items for the summary table
  const plannedSavings = getSubTotal(surplusItems.filter(i => i.subCategory === 'Saving'));
  const plannedProtection = getSubTotal(surplusItems.filter(i => i.subCategory === 'Protection'));
  const plannedInvestment = getSubTotal(surplusItems.filter(i => i.subCategory === 'Investment'));

  const actualSavings = savings.reduce((acc, s) => acc + (s.currentAmount || 0), 0);
  const actualProtection = protections.reduce((acc, p) => acc + (p.coverageAmount || 0), 0);
  const actualInvestment = investments.reduce((acc, i) => acc + (i.currentValue || 0), 0);

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Modul 1: ALIRAN TUNAI</h1>
          <p className="text-xs text-slate-400 font-medium tracking-wider uppercase mt-1">Pengurusan pendapatan dan perbelanjaan</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (window.confirm('Adakah anda pasti untuk tetapan semula plan ini? Semua data anda akan dipadam.')) {
                setProfile(prev => prev ? { ...prev, items: [...DEFAULT_BUDGET_ITEMS] } : null);
              }
            }}
            className="flex items-center justify-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-tight hover:bg-slate-200 transition-all shadow-sm"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] active:scale-95 transition-all shadow-[0_4px_15px_rgba(16,185,129,0.3)] ring-4 ring-emerald-500/15 disabled:opacity-50"
          >
            <Save size={16} /> {isSaving ? 'Menyimpan...' : 'Simpan Plan'}
          </button>
        </div>
      </header>

      {/* View Switcher */}
      <div className="flex gap-2 p-1 bg-slate-200 rounded-xl overflow-x-auto whitespace-nowrap">
        {[
          { id: 'income', label: 'Pendapatan (I)', icon: TrendingUp },
          { id: 'expenses', label: 'Perbelanjaan (E)', icon: ChevronDown },
          { id: 'summary', label: 'Surplus & Summary (S)', icon: Sparkles },
        ].map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeView === view.id ? 'bg-white text-[#1A365D] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <view.icon size={14} />
            {view.label}
          </button>
        ))}
      </div>

      {/* Main Content Areas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {activeView === 'income' && (
          <div className="divide-y divide-slate-100">
            {(() => {
              const baseCats = ['active', 'deduction', 'additional', 'rental'];
              const customCats = incomeItems
                .filter(i => i.isCustom && !baseCats.includes(i.subCategory))
                .map(i => i.subCategory);
              const allCats = [...baseCats, ...Array.from(new Set(customCats))];

              return allCats.map((cat: string, idx) => {
                let title = '';
                let isDeduction = false;
                let isRental = false;

                if (cat === 'active') title = 'Pendapatan Utama';
                else if (cat === 'deduction') { title = 'Potongan / Tolak'; isDeduction = true; }
                else if (cat === 'additional') title = 'Pendapatan Tambahan';
                else if (cat === 'rental') { title = 'Pendapatan Sewaan'; isRental = true; }
                else title = cat;

                return (
                  <IncomeSection 
                    key={cat}
                    index={idx + 1}
                    title={title}
                    catId={cat}
                    items={incomeItems.filter(i => i.subCategory === cat)}
                    onUpdate={handleUpdateItem}
                    onUpdateRental={(id: string, field: any, val: number) => handleUpdateRental(id, field, val)}
                    onUpdateLabel={handleUpdateLabel}
                    onAdd={() => handleAddItem('income', cat)}
                    onDelete={handleDeleteItem}
                    onDeleteCategory={(catId) => handleDeleteCategory(catId, 'income')}
                    isDeduction={isDeduction}
                    isRental={isRental}
                    isCustom={!baseCats.includes(cat)}
                  />
                );
              });
            })()}
            
            <div className="bg-emerald-50 p-4 border-t border-emerald-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-emerald-900 uppercase">JUMLAH PENDAPATAN BERSIH (I) - BULANAN</span>
                <span className="text-lg font-mono font-bold text-emerald-600">RM {netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-emerald-700/60 uppercase">JUMLAH PENDAPATAN BERSIH (I) - TAHUNAN</span>
                <span className="text-sm font-mono font-bold text-emerald-500/80">RM {(netIncome * 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="p-8 flex flex-col items-center gap-4 bg-slate-50 border-t border-slate-100">
               <div className="w-full max-w-md">
                {!isAddingIncomeCategory ? (
                  <button 
                    onClick={() => setIsAddingIncomeCategory(true)}
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl hover:bg-emerald-100 transition-colors uppercase tracking-widest border border-emerald-100 shadow-sm"
                  >
                    <Plus size={14} /> Tambah Kategori Pendapatan Baru
                  </button>
                ) : (
                  <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-md space-y-3">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Nama Kategori Baru</p>
                    <input
                      autoFocus
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Contoh: Freelance, Dividen, etc."
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newCatName) {
                          handleAddItem('income', newCatName);
                          setNewCatName('');
                          setIsAddingIncomeCategory(false);
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsAddingIncomeCategory(false)}
                        className="flex-1 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={() => {
                          if (newCatName) {
                            handleAddItem('income', newCatName);
                            setNewCatName('');
                            setIsAddingIncomeCategory(false);
                          }
                        }}
                        className="flex-2 px-4 py-2 text-[10px] font-bold text-white bg-emerald-600 uppercase tracking-widest rounded-lg hover:bg-emerald-700 shadow-sm"
                      >
                        Tambah Kategori
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full max-w-xs flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.03] hover:shadow-[0_8px_24px_rgba(16,185,129,0.5)] active:scale-95 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.35)] ring-4 ring-emerald-500/20 disabled:opacity-50"
              >
                <Save size={16} /> {isSaving ? 'Sedang Menyimpan...' : 'Simpan Plan Pendapatan'}
              </button>
            </div>
          </div>
        )}

        {activeView === 'expenses' && (
          <div className="divide-y divide-slate-100">
            {(() => {
              const baseCats = ['Debt', 'Home', 'Transport', 'Food', 'Utility', 'Air', 'Elektrik', 'Children', 'Self', 'Entertainment', 'Gift'];
              const customCats = expenseItems
                .filter(i => i.isCustom && !baseCats.includes(i.subCategory))
                .map(i => i.subCategory);
              const allCats = [...baseCats, ...Array.from(new Set(customCats))];
              
              let currentBaseIdx = 0;
              return allCats.map((cat: any) => {
                let title = cat;
                
                // Logic to keep same number for utility group (5)
                if (cat !== 'Air' && cat !== 'Elektrik') {
                  currentBaseIdx++;
                }

                if (cat === 'Debt') { title = 'Hutang Piutang'; }
                else if (cat === 'Home') { title = 'Rumah'; }
                else if (cat === 'Transport') { title = 'Kenderaan'; }
                else if (cat === 'Food') { title = 'Makanan'; }
                else if (cat === 'Utility') { title = 'Utiliti'; }
                else if (cat === 'Air') { title = 'Bil Air'; }
                else if (cat === 'Elektrik') { title = 'Bil Elektrik'; }
                else if (cat === 'Children') { title = 'Anak-anak'; }
                else if (cat === 'Self') { title = 'Kendiri'; }
                else if (cat === 'Entertainment') { title = 'Hiburan'; }
                else if (cat === 'Gift') { title = 'Pemberian / Gift'; }

                return (
                  <ExpenseCategory 
                    key={cat as string} 
                    index={currentBaseIdx}
                    title={title}
                    catId={cat as string}
                    items={expenseItems.filter(i => i.subCategory === cat)}
                    onUpdate={handleUpdateItem}
                    onUpdateLabel={handleUpdateLabel}
                    onAdd={() => handleAddItem('expense', cat as string)}
                    onDelete={handleDeleteItem}
                    onDeleteCategory={handleDeleteCategory}
                    isCustom={!['Debt', 'Home', 'Transport', 'Food', 'Utility', 'Air', 'Elektrik', 'Children', 'Self', 'Entertainment', 'Gift'].includes(cat as string)}
                  />
                );
              });
            })()}
            <div className="bg-rose-50 p-4 border-t border-rose-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-rose-900 uppercase">JUMLAH PERBELANJAAN (E) - BULANAN</span>
                <span className="text-lg font-mono font-bold text-rose-600">RM {totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-rose-700/60 uppercase">JUMLAH PERBELANJAAN (E) - TAHUNAN</span>
                <span className="text-sm font-mono font-bold text-rose-500/80">RM {(totalExpense * 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="p-8 flex flex-col items-center gap-4 bg-slate-50 border-t border-slate-100">
              <div className="w-full max-w-md">
                {!isAddingNewCategory ? (
                  <button 
                    onClick={() => setIsAddingNewCategory(true)}
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 px-4 py-3 rounded-xl hover:bg-rose-100 transition-colors uppercase tracking-widest border border-rose-100 shadow-sm"
                  >
                    <Plus size={14} /> Tambah Kategori Belanja Baru
                  </button>
                ) : (
                  <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-md space-y-3">
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Nama Kategori Baru</p>
                    <input
                      autoFocus
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-rose-500"
                      placeholder="Contoh: Melancong, Astro, etc."
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (newCatName) {
                            const newItem: BudgetItem = {
                              id: `custom-cat-${Date.now()}`,
                              category: 'expense',
                              subCategory: newCatName,
                              label: '',
                              monthly: 0,
                              isCustom: true
                            };
                            setProfile(prev => prev ? { ...prev, items: [...prev.items, newItem] } : null);
                            setNewCatName('');
                            setIsAddingNewCategory(false);
                          }
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsAddingNewCategory(false)}
                        className="flex-1 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={() => {
                          if (newCatName) {
                            const newItem: BudgetItem = {
                              id: `custom-cat-${Date.now()}`,
                              category: 'expense',
                              subCategory: newCatName,
                              label: '',
                              monthly: 0,
                              isCustom: true
                            };
                            setProfile(prev => prev ? { ...prev, items: [...prev.items, newItem] } : null);
                            setNewCatName('');
                            setIsAddingNewCategory(false);
                          }
                        }}
                        className="flex-2 px-4 py-2 text-[10px] font-bold text-white bg-rose-600 uppercase tracking-widest rounded-lg hover:bg-rose-700 shadow-sm"
                      >
                        Tambah Kategori
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full max-w-xs flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.03] hover:shadow-[0_8px_24px_rgba(16,185,129,0.5)] active:scale-95 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.35)] ring-4 ring-emerald-500/20 disabled:opacity-50"
              >
                <Save size={16} /> {isSaving ? 'Sedang Menyimpan...' : 'Simpan Plan Perbelanjaan'}
              </button>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <Info size={12} /> Pastikan anda menekan Simpan setelah selesai
              </p>
            </div>
          </div>
        )}

        {activeView === 'summary' && (
          <div className="p-6 space-y-8">
            {/* Equation Area */}
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <p className="text-[10px] font-black text-[#1A365D] uppercase tracking-widest mb-6">Formula Aliran Tunai Balans</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                {/* Monthly Equation */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-4">ALIRAN TUNAI KADAR SEBULAN (MONTHLY)</span>
                  <div className="flex flex-wrap items-center justify-center gap-2 font-mono font-black text-lg text-slate-800">
                    <span className="text-emerald-600">RM {netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-[9px] font-sans text-emerald-700 bg-emerald-55 font-normal tracking-wide px-1.5 py-0.5 rounded">INCOME</span>
                    <span className="text-slate-300 font-sans mx-1">-</span>
                    <span className="text-rose-600">RM {totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-[9px] font-sans text-rose-700 bg-rose-55 font-normal tracking-wide px-1.5 py-0.5 rounded">EXPENSES</span>
                    <span className="text-slate-300 font-sans mx-1">=</span>
                    <span className={surplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}>RM {surplus.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className={`text-[9px] font-sans font-bold tracking-wide px-1.5 py-0.5 rounded ${surplus >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>SURPLUS</span>
                  </div>
                </div>

                {/* Annual Equation */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-4">ALIRAN TUNAI KADAR SETAHUN (ANNUAL)</span>
                  <div className="flex flex-wrap items-center justify-center gap-2 font-mono font-black text-lg text-slate-800">
                    <span className="text-emerald-600">RM {(netIncome * 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-[9px] font-sans text-emerald-700 bg-emerald-55 font-normal tracking-wide px-1.5 py-0.5 rounded">INCOME (YR)</span>
                    <span className="text-slate-300 font-sans mx-1">-</span>
                    <span className="text-rose-600">RM {(totalExpense * 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-[9px] font-sans text-rose-700 bg-rose-55 font-normal tracking-wide px-1.5 py-0.5 rounded">EXPENSES (YR)</span>
                    <span className="text-slate-300 font-sans mx-1">=</span>
                    <span className={surplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}>RM {(surplus * 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className={`text-[9px] font-sans font-bold tracking-wide px-1.5 py-0.5 rounded ${surplus >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>SURPLUS (YR)</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Lebihan Detailed Style (matches Image 1 requests for list format) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              <div className="bg-black text-white px-4 py-3 text-[10px] font-bold uppercase tracking-widest">
                SENARAI KOMITMEN TETAP UNTUK SIMPANAN, TAKAFUL DAN PELABURAN
              </div>
              
              <ExpenseCategory 
                title="Simpanan"
                index={1}
                catId="Saving"
                placeholder="Simpanan tetap bulanan"
                items={surplusItems.filter(i => i.subCategory === 'Saving')}
                onUpdate={handleUpdateItem}
                onUpdateLabel={handleUpdateLabel}
                onAdd={() => handleAddItem('surplus', 'Saving')}
                onDelete={handleDeleteItem}
                onDeleteCategory={(id) => handleDeleteCategory(id, 'surplus')}
                isCustom={false}
              />

              <ExpenseCategory 
                title="Takaful"
                index={2}
                catId="Protection"
                placeholder="Nama Sijil Takaful"
                items={surplusItems.filter(i => i.subCategory === 'Protection').sort((a, b) => {
                  const detailA = protections.find(p => p.id === a.id);
                  const detailB = protections.find(p => p.id === b.id);
                  const yearA = parseInt(detailA?.yearStarted || '9999');
                  const yearB = parseInt(detailB?.yearStarted || '9999');
                  return yearA - yearB;
                })}
                onUpdate={handleUpdateItem}
                onUpdateLabel={handleUpdateLabel}
                onAdd={() => handleAddItem('surplus', 'Protection')}
                onDelete={handleDeleteItem}
                onDeleteCategory={(id) => handleDeleteCategory(id, 'surplus')}
                isCustom={false}
                protections={protections}
                onDetailClick={() => switchTab?.('protection')}
              />

              <ExpenseCategory 
                title="Pelaburan"
                index={3}
                catId="Investment"
                placeholder="Pelaburan tetap setiap bulan contoh seperti unit amanah, SSPN dan sebagainya"
                items={surplusItems.filter(i => i.subCategory === 'Investment')}
                onUpdate={handleUpdateItem}
                onUpdateLabel={handleUpdateLabel}
                onAdd={() => handleAddItem('surplus', 'Investment')}
                onDelete={handleDeleteItem}
                onDeleteCategory={(id) => handleDeleteCategory(id, 'surplus')}
                isCustom={false}
              />

              <div className="bg-emerald-50 p-4 border-t border-emerald-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-tight">JUMLAH LEBIHAN DIRANCANG - BULANAN</span>
                  <span className="text-lg font-mono font-bold text-emerald-600">RM {(plannedSavings + plannedProtection + plannedInvestment).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-emerald-700/60 uppercase tracking-tight">JUMLAH LEBIHAN DIRANCANG - TAHUNAN</span>
                  <span className="text-sm font-mono font-bold text-emerald-500/80">RM {((plannedSavings + plannedProtection + plannedInvestment) * 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Infaq Model Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#1A365D] text-white text-[10px] font-bold uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Perkara</th>
                    <th className="px-4 py-3 text-center">Peruntukan (%)</th>
                    <th className="px-4 py-3 text-right">Cadangan (RM)</th>
                    <th className="px-4 py-3 text-right">Sebenar (RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <SummaryRow label="HOUSEHOLD / KERUMAHAN" target={30} actual={getSubTotal(expenseItems.filter(i => i.subCategory !== 'Debt' && i.subCategory !== 'Gift'))} income={netIncome} />
                  <SummaryRow label="REPAYMENT / HUTANG" target={30} actual={getSubTotal(expenseItems.filter(i => i.subCategory === 'Debt'))} income={netIncome} isDebt />
                  <SummaryRow label="GIFT / PEMBERIAN" target={5} actual={getSubTotal(expenseItems.filter(i => i.subCategory === 'Gift'))} income={netIncome} />
                  <SummaryRow label="OTHERS / LAIN-LAIN" target={5} actual={0} income={netIncome} />
                  <SummaryRow label="SURPLUS: SAVING" target={10} actual={plannedSavings} income={netIncome} />
                  <SummaryRow label="SURPLUS: PROTECTION" target={10} actual={plannedProtection} income={netIncome} />
                  <SummaryRow label="SURPLUS: INVESTMENT" target={10} actual={plannedInvestment} income={netIncome} />
                  <tr className="bg-slate-50 font-bold">
                    <td className="px-4 py-3 text-xs uppercase">TOTAL</td>
                    <td className="px-4 py-3 text-center text-xs">100%</td>
                    <td className="px-4 py-3 text-right text-xs">RM {netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-xs">RM {(getSubTotal(expenseItems) + plannedSavings + plannedProtection + plannedInvestment).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full max-w-xs flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.03] hover:shadow-[0_8px_24px_rgba(16,185,129,0.5)] active:scale-95 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.35)] ring-4 ring-emerald-500/20 disabled:opacity-50"
              >
                <Save size={16} /> {isSaving ? 'Sedang Menyimpan...' : 'Simpan Plan Surplus'}
              </button>
            </div>

            {/* Health Indicators (Advanced) */}
            <div className="grid grid-cols-1 gap-6">
              <DetailedIndicator 
                id="1"
                title="INDIKATOR 1: Berapa peratus pendapatan anda untuk membayar hutang piutang?"
                description="Hutang yang terlalu tinggi menjejaskan fleksibiliti kewangan anda."
                value={(getSubTotal(expenseItems.filter(i => i.subCategory === 'Debt')) / netIncome) * 100}
                levels={[
                  { label: 'TAHAP A', range: 'Jika 30% pendapatan anda untuk membayar hutang, ia bermakna tahap kesihatan anda sihat sejahtera.', color: 'emerald', max: 30 },
                  { label: 'TAHAP B', range: 'Jika peruntukan untuk membayar hutang anda di antara 31% ke 50%, bermakna anda perlu berjaga-jaga dengan kedudukan kewangan anda.', color: 'amber', max: 50 },
                  { label: 'TAHAP C', range: 'Jika peruntukan bayaran hutang anda melebihi 50%, ini adalah tahap yang berbahaya!', color: 'rose', max: 100 }
                ]}
              />
              
              <DetailedIndicator 
                id="2"
                title="INDIKATOR 2: Berapa peratus SURPLUS / LEBIHAN?"
                description="Simpanan adalah kunci kepada kekayaan jangka masa panjang."
                value={(surplus / netIncome) * 100}
                isHighBetter
                levels={[
                  { label: 'TAHAP A', range: 'Jika 30% ke atas, ia adalah terbaik. Anda mempunyai aliran tunai kewangan yang sangat positif. Lebih tinggi lebih baik. Dalam situasi ini semestinya anda mudah untuk membuat perancangan jangka masa panjang iaitu menyimpan, melindungi kewangan dan melabur (SAVING, PROTECT dan INVEST).', color: 'emerald', min: 30 },
                  { label: 'TAHAP B', range: 'Jika 15% ke 30%, ia memuaskan. Anda mempunyai peluang untuk membetulkan aliran tunai anda. Anda boleh perlahan-lahan melakukan dan memulakan perancangan kewangan untuk jangka masa panjang.', color: 'amber', min: 15, max: 29.9 },
                  { label: 'TAHAP C', range: 'Jika bawah 15%, ini bermakna aliran tunai anda agak sesak. Anda sukar untuk merancang kewangan untuk jangka masa panjang; menyimpan, melabur dan melindungi kewangan.', color: 'rose', min: -100, max: 14.9 }
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-16 right-6 z-50 md:bottom-20 md:right-10">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-4 rounded-full font-black text-xs md:text-sm uppercase tracking-wider transition-all shadow-[0_10px_30px_rgba(16,185,129,0.4)] hover:shadow-[0_15px_35px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 ring-4 ring-emerald-500/20 ${
            saveSuccess 
              ? 'bg-emerald-600 text-white' 
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
          }`}
          title="Simpan Plan Aliran Tunai"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
          <span>{saveSuccess ? 'Plan Disimpan' : 'Simpan Plan'}</span>
        </button>
      </div>
    </div>
  );
}

function IncomeSection({ 
  title, 
  catId,
  index,
  items, 
  onUpdate, 
  onUpdateRental,
  onUpdateLabel, 
  onAdd, 
  onDelete, 
  onDeleteCategory,
  isDeduction, 
  isRental,
  isCustom
}: { 
  key?: string,
  title: string, 
  catId: string,
  index: number,
  items: BudgetItem[], 
  onUpdate: any, 
  onUpdateRental?: any,
  onUpdateLabel: any, 
  onAdd: () => void, 
  onDelete: (id: string) => void, 
  onDeleteCategory?: (id: string) => void,
  isDeduction?: boolean,
  isRental?: boolean,
  isCustom?: boolean
}) {
  return (
    <div className="p-4 relative group/cat">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{index}. {title}</h3>
          {isCustom && onDeleteCategory && (
            <button 
              onClick={() => onDeleteCategory(catId)}
              className="p-1 text-rose-300 hover:text-rose-600 opacity-20 group-hover/cat:opacity-100 transition-all"
              title="Hapus Kategori"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
        <button onClick={onAdd} className="text-xs text-emerald-600 font-bold hover:underline uppercase tracking-tighter flex items-center gap-1">
          <Plus size={12} /> Tambah
        </button>
      </div>

      {/* Column Headers */}
      {items.length > 0 && (
        <div className="flex items-center gap-4 mb-2 pr-2">
          <div className="flex-1"></div>
          <div className="flex items-center gap-2">
            {!isRental ? (
              <>
                <div className="w-32 text-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bulanan</span>
                </div>
                <div className="w-32 text-right">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tahunan</span>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <div className="w-24 text-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Kutipan Sewa</span>
                </div>
                <div className="w-24 text-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Ansuran</span>
                </div>
                <div className="w-24 text-right">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hasil (Bln)</span>
                </div>
                <div className="w-24 text-right">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hasil (Thn)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 group">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-6 shrink-0 text-[10px] font-black text-slate-300">
                {index}.{idx + 1}
              </div>
              <input
                type="text"
                placeholder={isRental ? "Nama Hartanah" : "Nama Pendapatan"}
                value={item.label}
                onChange={e => onUpdateLabel(item.id, e.target.value)}
                className="text-xs font-bold text-slate-800 uppercase tracking-tight bg-white border border-slate-200 px-3 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-[#1A365D] focus:border-[#1A365D] w-full shadow-sm"
              />
              <div className="w-8 flex justify-center shrink-0">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }} 
                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-20 group-hover:opacity-100 cursor-pointer flex items-center justify-center"
                  title="Hapus"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isRental ? (
                <>
                  <NumericInput
                    placeholder="0.00"
                    value={item.monthly || 0}
                    onChange={val => onUpdate(item.id, val)}
                    className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-700 outline-none focus:ring-1 focus:ring-[#1A365D] w-32 text-right shadow-sm"
                  />
                  <NumericInput
                    placeholder="0.00"
                    value={item.monthly * 12 || 0}
                    onChange={val => onUpdate(item.id, val / 12)}
                    className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-400 outline-none focus:ring-1 focus:ring-[#1A365D] w-32 text-right shadow-sm"
                  />
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <NumericInput
                    placeholder="Collect"
                    value={item.rentalCollection || 0}
                    onChange={val => onUpdateRental(item.id, 'rentalCollection', val)}
                    className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-emerald-600 outline-none focus:ring-1 focus:ring-[#1A365D] w-24 text-right shadow-sm"
                  />
                  <span className="text-slate-300 font-bold">-</span>
                  <NumericInput
                    placeholder="Install"
                    value={item.installment || 0}
                    onChange={val => onUpdateRental(item.id, 'installment', val)}
                    className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-rose-500 outline-none focus:ring-1 focus:ring-[#1A365D] w-24 text-right shadow-sm"
                  />
                  <div className="w-24 text-right">
                    <span className={`text-xs font-mono font-bold ${item.monthly >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      RM {item.monthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-24 text-right">
                    <span className={`text-xs font-mono font-bold ${item.monthly * 12 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      RM {(item.monthly * 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-8">Jumlah {title}</span>
          </div>
          <div className="flex items-center gap-2">
            {!isRental ? (
              <>
                <div className="w-32 text-right">
                  <span className={`text-xs font-mono font-bold ${isDeduction ? 'text-rose-600' : 'text-[#1A365D]'}`}>
                    RM {items.reduce((acc, i) => acc + (i.monthly || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-32 text-right">
                  <span className={`text-xs font-mono font-bold ${isDeduction ? 'text-rose-400' : 'text-slate-400'}`}>
                    RM {items.reduce((acc, i) => acc + (i.monthly * 12 || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-24 text-right">
                  <span className="text-xs font-mono font-bold text-emerald-600">
                    RM {items.reduce((acc, i) => acc + (i.rentalCollection || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-24 text-right pr-2">
                  <span className="text-xs font-mono font-bold text-rose-500">
                    RM {items.reduce((acc, i) => acc + (i.installment || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-24 text-right">
                  <span className={`text-xs font-mono font-bold ${items.reduce((acc, i) => acc + (i.monthly || 0), 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    RM {items.reduce((acc, i) => acc + (i.monthly || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-24 text-right">
                  <span className={`text-xs font-mono font-bold ${items.reduce((acc, i) => acc + (i.monthly * 12 || 0), 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    RM {items.reduce((acc, i) => acc + (i.monthly * 12 || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ExpenseCategoryProps {
  key?: string;
  index: number;
  title: string;
  catId: string;
  items: BudgetItem[];
  onUpdate: (id: string, value: number) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onDeleteCategory?: (catId: string) => void;
  isCustom?: boolean;
  placeholder?: string;
  protections?: Protection[];
  onDetailClick?: () => void;
}

function ExpenseCategory({ title, catId, index, items, onUpdate, onUpdateLabel, onAdd, onDelete, onDeleteCategory, isCustom, placeholder, protections, onDetailClick }: ExpenseCategoryProps) {
  return (
    <div className="p-4 relative group/cat">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">{index}. {title}</h3>
          {isCustom && onDeleteCategory && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCategory(catId);
              }}
              className="p-1 text-rose-300 hover:text-rose-600 transition-colors opacity-40 group-hover/cat:opacity-100"
              title="Padam Kategori"
            >
              <Trash2 size={12} />
            </button>
          )}
          {catId === 'Protection' && onDetailClick && items.length > 0 && (
            <button 
              onClick={onDetailClick}
              className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1"
            >
              <ShieldCheck size={10} /> LIHAT DETAIL
            </button>
          )}
        </div>
        {catId === 'Protection' ? (
          <button 
            onClick={onDetailClick} 
            className="text-xs text-blue-600 font-bold hover:underline uppercase tracking-tighter flex items-center gap-1"
          >
            <Plus size={12} /> Urus Sijil Takaful
          </button>
        ) : (
          <button onClick={onAdd} className="text-xs text-emerald-600 font-bold hover:underline uppercase tracking-tighter flex items-center gap-1">
            <Plus size={12} /> Tambah Item
          </button>
        )}
      </div>

      {/* Column Headers */}
      {items.length > 0 && (
        <div className="flex items-center gap-4 mb-2 pr-2">
          <div className="flex-1"></div>
          <div className="flex items-center gap-2">
            <div className="w-28 text-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bulanan</span>
            </div>
            <div className="w-28 text-right">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tahunan</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, idx) => {
          const detail = protections?.find(p => p.id === item.id);
          const hasDetails = detail && (detail.company || detail.type);
          const isProtection = catId === 'Protection';
          
          return (
            <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 group">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-6 shrink-0 text-[10px] font-black text-slate-300 group-hover:text-slate-400 transition-colors">
                  {index}.{idx + 1}
                </div>
                <div className="relative flex-1">
                  {isProtection ? (
                    <div 
                      className="text-xs font-bold text-slate-800 uppercase tracking-tight bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg w-full flex items-center justify-between cursor-default"
                      title="Urus di Modul Perlindungan"
                    >
                      <span>{(detail?.policyName) ? detail.policyName : item.label}</span>
                      <ShieldCheck size={12} className="text-blue-400" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder={placeholder || "Nama Item"}
                      value={item.label}
                      onChange={e => onUpdateLabel(item.id, e.target.value)}
                      className="text-xs font-bold text-slate-800 uppercase tracking-tight bg-white border border-slate-200 px-3 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-[#1A365D] focus:border-[#1A365D] w-full shadow-sm"
                    />
                  )}
                  {hasDetails && (
                    <div className="absolute -bottom-4 left-1 flex items-center gap-1.5">
                      {detail.type && <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter bg-white px-1 border border-slate-100 rounded">TYPE: {detail.type}</span>}
                      {detail.company && <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter bg-white px-1 border border-blue-100 rounded">SYARIKAT: {detail.company}</span>}
                    </div>
                  )}
                </div>
                {!isProtection && (
                  <div className="w-8 flex justify-center shrink-0">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }} 
                      className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-20 group-hover:opacity-100 cursor-pointer flex items-center justify-center"
                      title="Hapus"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {isProtection ? (
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-700 w-28 text-right cursor-default">
                      {(item.monthly || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-400 w-28 text-right cursor-default">
                      {(item.monthly * 12 || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ) : (
                  <>
                    <NumericInput
                      placeholder="0.00"
                      value={item.monthly || 0}
                      onChange={val => onUpdate(item.id, val)}
                      className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-700 outline-none focus:ring-1 focus:ring-[#1A365D] w-28 text-right shadow-sm"
                    />
                    <NumericInput
                      placeholder="0.00"
                      value={item.monthly * 12 || 0}
                      onChange={val => onUpdate(item.id, val / 12)}
                      className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-400 outline-none focus:ring-1 focus:ring-[#1A365D] w-28 text-right shadow-sm"
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {items.length > 1 && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-8">Jumlah {title}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-28 text-right">
              <span className="text-xs font-mono font-bold text-[#1A365D]">
                RM {items.reduce((acc, i) => acc + (i.monthly || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="w-28 text-right">
              <span className="text-xs font-mono font-bold text-slate-400">
                RM {items.reduce((acc, i) => acc + (i.monthly * 12 || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailedIndicator({ title, description, value, levels, isHighBetter }: { id: string, title: string, description: string, value: number, levels: any[], isHighBetter?: boolean }) {
  const currentLevel = levels.find(l => {
    if (isHighBetter) {
      return value >= (l.min || 0) && (l.max ? value <= l.max : true);
    }
    return value <= (l.max || 100) && (l.min ? value >= l.min : true);
  });

  const levelColor = currentLevel?.color === 'emerald' ? 'bg-emerald-500' : currentLevel?.color === 'amber' ? 'bg-amber-500' : 'bg-rose-500';
  const levelText = currentLevel?.color === 'emerald' ? 'text-emerald-700' : currentLevel?.color === 'amber' ? 'text-amber-700' : 'text-rose-700';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="max-w-xl">
          <h4 className="text-sm font-bold text-slate-800 leading-tight mb-2 uppercase">{title}</h4>
          <p className="text-xs text-slate-500 font-medium">{description}</p>
        </div>
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-100 min-w-[140px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Keputusan Anda</span>
          <span className={`text-3xl font-mono font-bold ${levelText}`}>{value.toFixed(1)}%</span>
          <div className={`mt-2 px-3 py-1 rounded-full ${levelColor} text-white text-[10px] font-bold uppercase tracking-widest`}>
            {currentLevel?.label || 'UNKNOWN'}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {levels.map((l, i) => {
          const isActive = l.label === currentLevel?.label;
          const bgClassName = l.color === 'emerald' ? 'bg-emerald-50 border-emerald-100' : l.color === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100';
          const indicatorColor = l.color === 'emerald' ? 'bg-emerald-500' : l.color === 'amber' ? 'bg-amber-500' : 'bg-rose-500';

          return (
            <div key={i} className={`p-4 rounded-xl border transition-all ${isActive ? `${bgClassName} ring-2 ring-offset-2 ring-${l.color}-500/20` : 'bg-white border-slate-100 opacity-60'}`}>
              <div className="flex items-start gap-4">
                <div className={`mt-1 h-3 w-3 rounded-full shrink-0 ${indicatorColor}`} />
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>{l.label}</span>
                  <p className={`text-[11px] font-medium leading-relaxed mt-1 ${isActive ? 'text-slate-700' : 'text-slate-500'}`}>
                    {l.range}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tahap Anda?</span>
        <div className="flex gap-2">
          {['A', 'B', 'C'].map(char => (
            <div key={char} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all border ${currentLevel?.label.includes(char) ? 'bg-[#1A365D] text-white border-[#1A365D] scale-110 shadow-md' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
              {char}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, target, actual, income, isDebt }: { label: string, target: number, actual: number, income: number, isDebt?: boolean }) {
  const targetRM = income * (target / 100);
  const actualPercent = (actual / income) * 100;
  
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-[10px] font-bold text-slate-800 uppercase tracking-tight">{label}</p>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-xs font-mono font-bold text-slate-500">{target}%</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-xs font-mono text-slate-400">RM {targetRM.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end">
          <span className={`text-xs font-mono font-bold ${actualPercent > target && isDebt ? 'text-rose-600' : 'text-slate-800'}`}>
            RM {actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] font-bold text-slate-400">{actualPercent.toFixed(1)}%</span>
        </div>
      </td>
    </tr>
  );
}

function Indicator({ label, value, target, isLowBetter }: { label: string, value: number, target: number, isLowBetter?: boolean }) {
  const isHealthy = isLowBetter ? value <= target : value >= target;
  
  return (
    <div className={`p-4 rounded-xl border flex items-center gap-4 ${isHealthy ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
      <div className={`p-2 rounded-lg ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'} text-white shadow-sm`}>
        {isHealthy ? <Sparkles size={16} /> : <AlertCircle size={16} />}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className={`text-lg font-mono font-bold ${isHealthy ? 'text-emerald-700' : 'text-rose-700'}`}>{value.toFixed(1)}%</span>
          <span className="text-[10px] text-slate-400 italic">Target: {target}%</span>
        </div>
      </div>
    </div>
  );
}
