import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useApp } from '../contexts/AppContext';
import { Plus, Trash2, Building2, Landmark, CreditCard, ChevronDown, ChevronUp, PlayCircle, Save, Loader2, TrendingUp, Sparkles, Info, CheckCircle2, XCircle, Check } from 'lucide-react';
import { netWorthService, budgetService } from '../services';
import { NetWorthItem, BudgetProfile } from '../types';
import { auth } from '../firebase';
import NumericInput from './NumericInput';

export default function NetWorth({ switchTab }: { switchTab?: (tab: any) => void }) {
  const { viewingUserId } = useApp();
  const [items, setItems] = useState<NetWorthItem[]>([]);
  const [budgetProfile, setBudgetProfile] = useState<BudgetProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newAssetCategory, setNewAssetCategory] = useState('');
  const [newLiabilityCategory, setNewLiabilityCategory] = useState('');

  // Use a ref to keep track of current items for the subscription callback
  const itemsRef = useRef<NetWorthItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    let isMounted = true;
    const targetUserId = viewingUserId || auth.currentUser?.uid;
    if (!targetUserId) {
      setIsLoading(false);
      return;
    }

    const unsubNetWorth = netWorthService.subscribe((data: NetWorthItem[]) => {
      if (!isMounted) return;
      
      const categoryMapping: Record<string, string> = {
        'ASET SIMPANAN': 'Bank dan akaun Simpanan',
        'Bank dan Akaun Simpanan': 'Bank dan akaun Simpanan',
        'PELABURAN - Real Property': 'Hartanah',
        'PELABURAN - Ekuiti': 'Saham, saham amanah, koperasi',
        'Saham, Saham Amanah, Koperasi': 'Saham, saham amanah, koperasi',
        'ASET-ASET LAIN': 'AKAUN KWSP'
      };

      const serverItems = data.map(item => {
        let updatedItem = { ...item };
        if (categoryMapping[item.category]) {
          updatedItem.category = categoryMapping[item.category];
        }
        if (updatedItem.name === 'Rumah (Kediaman)' && updatedItem.category === 'Hartanah') updatedItem.name = 'Rumah Kediaman';
        if (updatedItem.name === 'Rumah kediaman' && updatedItem.category === 'Hartanah') updatedItem.name = 'Rumah Kediaman';
        if (updatedItem.name === 'ASB - Loan (Nilai Sijil)' && updatedItem.category === 'Saham, saham amanah, koperasi') updatedItem.name = 'ASB Financing';
        if (updatedItem.name === 'Kereta (Nilai Semasa)' && updatedItem.category === 'AKAUN KWSP') updatedItem.name = 'Kereta';
        if (updatedItem.name === 'KWSP - Akaun 1' && updatedItem.category === 'AKAUN KWSP') updatedItem.name = 'Akaun 1';
        if (updatedItem.name === 'KWSP - Akaun 2' && updatedItem.category === 'AKAUN KWSP') updatedItem.name = 'Akaun 2';
        if (updatedItem.name === 'KWSP - Akaun 3' && updatedItem.category === 'AKAUN KWSP') updatedItem.name = 'Akaun 3';
        if (updatedItem.name === 'Emas' && updatedItem.category === 'Hartanah') updatedItem.category = 'Emas, Perak & Logam Berharga';
        return updatedItem;
      });

      setItems(prev => {
        if (serverItems.length === 0 && prev.length === 0) {
          const template: NetWorthItem[] = [
            // Bank dan akaun Simpanan
            { userId: targetUserId, name: 'Tunai', type: 'Asset' as const, category: 'Bank dan akaun Simpanan', value: 0, isLiquid: true, hasCharge: false },
            { userId: targetUserId, name: 'Bank', type: 'Asset' as const, category: 'Bank dan akaun Simpanan', value: 0, isLiquid: true, hasCharge: false },
            { userId: targetUserId, name: 'Tabung Haji', type: 'Asset' as const, category: 'Bank dan akaun Simpanan', value: 0, isLiquid: true, hasCharge: false },
            { userId: targetUserId, name: 'ASB', type: 'Asset' as const, category: 'Bank dan akaun Simpanan', value: 0, isLiquid: true, hasCharge: false },
            { userId: targetUserId, name: 'Deposit Tetap', type: 'Asset' as const, category: 'Bank dan akaun Simpanan', value: 0, isLiquid: true, hasCharge: false },
            // Hartanah
            { userId: targetUserId, name: 'Rumah Kediaman', type: 'Asset' as const, category: 'Hartanah', value: 0, isLiquid: false, hasCharge: false },
            { userId: targetUserId, name: 'Hartanah (Sewa)', type: 'Asset' as const, category: 'Hartanah', value: 0, isLiquid: false, hasCharge: true },
            // Saham
            { userId: targetUserId, name: 'Saham', type: 'Asset' as const, category: 'Saham, saham amanah, koperasi', value: 0, isLiquid: true, hasCharge: false },
            { userId: targetUserId, name: 'Saham Amanah', type: 'Asset' as const, category: 'Saham, saham amanah, koperasi', value: 0, isLiquid: true, hasCharge: false },
            { userId: targetUserId, name: 'ASB Financing', type: 'Asset' as const, category: 'Saham, saham amanah, koperasi', value: 0, isLiquid: false, hasCharge: true },
            // Emas
            { userId: targetUserId, name: 'Emas', type: 'Asset' as const, category: 'Emas, Perak & Logam Berharga', value: 0, isLiquid: true, hasCharge: false },
            // AKAUN KWSP
            { userId: targetUserId, name: 'Akaun 1', type: 'Asset' as const, category: 'AKAUN KWSP', value: 0, isLiquid: false, hasCharge: false },
            { userId: targetUserId, name: 'Akaun 2', type: 'Asset' as const, category: 'AKAUN KWSP', value: 0, isLiquid: false, hasCharge: false },
            { userId: targetUserId, name: 'Akaun 3', type: 'Asset' as const, category: 'AKAUN KWSP', value: 0, isLiquid: false, hasCharge: false },
            { userId: targetUserId, name: 'Kereta', type: 'Asset' as const, category: 'AKAUN KWSP', value: 0, isLiquid: false, hasCharge: false },
            // LIABILITI
            { userId: targetUserId, name: 'Pembiayaan Peribadi', type: 'Liability' as const, category: 'HUTANG PERIBADI', value: 0, hasCoverage: false },
            { userId: targetUserId, name: 'Kad Kredit', type: 'Liability' as const, category: 'HUTANG PERIBADI', value: 0, hasCoverage: false },
            { userId: targetUserId, name: 'Hutang Pendidikan', type: 'Liability' as const, category: 'HUTANG PERIBADI', value: 0, hasCoverage: false },
            { userId: targetUserId, name: 'Pembiayaan Perumahan', type: 'Liability' as const, category: 'PEMBIAYAAN KE ATAS ASET', value: 0, hasCoverage: true },
            { userId: targetUserId, name: 'Pembiayaan Kereta', type: 'Liability' as const, category: 'PEMBIAYAAN KE ATAS ASET', value: 0, hasCoverage: true },
          ].map((item, index) => ({ ...item, id: `tmp-${index}` }));
          return template;
        }

        // Keep local items that are NOT on server yet
        const localItems = prev.filter(i => 
          (i.id?.startsWith('tmp-') || i.id?.startsWith('custom-')) && 
          !serverItems.some(si => si.name === i.name && si.category === i.category)
        );
        return [...serverItems, ...localItems];
      });
      setIsLoading(false);
    });

    const unsubBudget = budgetService.subscribe((data) => {
      if (data && data.length > 0) {
        setBudgetProfile(data[0]);
      }
    });

    return () => { isMounted = false; unsubNetWorth(); unsubBudget(); };
  }, [viewingUserId]);

  const handleUpdate = (id: string, updates: Partial<NetWorthItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleAddItem = (type: 'Asset' | 'Liability', category: string) => {
    const targetUserId = viewingUserId || auth.currentUser?.uid;
    if (!targetUserId) return;
    const newItem: NetWorthItem = {
      id: `custom-${Date.now()}`,
      userId: targetUserId,
      name: 'Item Baru',
      type,
      category,
      value: 0,
      isLiquid: type === 'Asset',
      hasCoverage: false,
      hasCharge: false
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleDeleteItem = async (id: string) => {
    if (!id.startsWith('tmp-') && !id.startsWith('custom-')) {
      await netWorthService.remove(id).catch(console.error);
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleDeleteCategory = async (type: 'Asset' | 'Liability', category: string) => {
    const itemsToDelete = items.filter(i => i.type === type && i.category === category);
    for (const item of itemsToDelete) {
      if (!item.id?.startsWith('tmp-') && !item.id?.startsWith('custom-')) {
        await netWorthService.remove(item.id!).catch(console.error);
      }
    }
    setItems(prev => prev.filter(i => !(i.type === type && i.category === category)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedItems = [...items];
      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];
        const { id, ...data } = item;
        if (id && !id.startsWith('tmp-') && !id.startsWith('custom-')) {
          await netWorthService.update(id, data);
        } else {
          const newId = await netWorthService.add(data);
          if (newId) {
            updatedItems[i] = { ...item, id: newId };
          }
        }
      }
      setItems(updatedItems);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Ralat semasa menyimpan rekod. Sila cuba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalAssets = items.filter(i => i.type === 'Asset').reduce((acc, i) => acc + (i.value || 0), 0);
  const totalLiquidAssets = items.filter(i => i.type === 'Asset' && i.isLiquid).reduce((acc, i) => acc + (i.value || 0), 0);
  const totalLiabilities = items.filter(i => i.type === 'Liability').reduce((acc, i) => acc + (i.value || 0), 0);
  const netWorthValue = totalAssets - totalLiabilities;

  const assetCategories = Array.from(new Set(items.filter(i => i.type === 'Asset').map(i => i.category)))
    .sort((a, b) => {
      const order = [
        'Bank dan akaun Simpanan',
        'Hartanah',
        'Saham, saham amanah, koperasi',
        'Emas, Perak & Logam Berharga',
        'AKAUN KWSP',
        'Sijil Takaful (Nilai Tunai)'
      ];
      const idxA = order.indexOf(a as string);
      const idxB = order.indexOf(b as string);
      
      // If both are in the order list, follow that order
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      
      // If only one is in the list, it comes first
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      
      // Custom categories added by user come at the end
      return (a as string).localeCompare(b as string);
    });
  const liabilityCategories = Array.from(new Set(items.filter(i => i.type === 'Liability').map(i => i.category)))
    .sort((a, b) => {
      const order = [
        'HUTANG PERIBADI',
        'PEMBIAYAAN KE ATAS ASET'
      ];
      const idxA = order.indexOf(a as string);
      const idxB = order.indexOf(b as string);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (a as string).localeCompare(b as string);
    });

  if (isLoading) return <div className="p-20 text-center uppercase tracking-widest text-slate-400 font-bold">Memuatkan...</div>;

  return (
    <div className="space-y-8 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Modul 2: NILAI ASET BERSIH</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Pengurusan Aset & Liabiliti</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_4px_18px_rgba(16,185,129,0.35)] ring-4 ring-emerald-500/20 active:scale-95 ${
              isSaving
                ? 'bg-emerald-600 text-white scale-100'
                : saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(16,185,129,0.45)]'
            }`}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {saveSuccess ? 'Rekod Disimpan' : 'Simpan Rekod'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ASSETS SECTION */}
        <div className="space-y-6">
          <div className="bg-emerald-600 text-white p-4 rounded-t-2xl flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-2">
              <ChevronUp size={18} />
              <span className="text-sm font-black uppercase tracking-widest">Senarai Aset</span>
            </div>
            <span className="text-sm font-mono font-bold">RM {totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          
          <div className="bg-white border-x border-b border-slate-100 rounded-b-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
            {assetCategories.map((cat: any, cIdx) => (
              <div key={cat as string} className="p-4 space-y-3 relative group/section">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[11px] font-black text-emerald-700 uppercase tracking-widest px-2 py-1 bg-emerald-50 rounded-lg inline-block">{cIdx + 1}. {cat}</h3>
                    {cat !== 'Sijil Takaful (Nilai Tunai)' && (
                      <button 
                        onClick={() => handleDeleteCategory('Asset', cat as string)}
                        className="opacity-60 hover:opacity-100 text-rose-400 hover:text-rose-600 transition-all p-1.5 hover:bg-rose-50 rounded-lg"
                        title="Hapus Kategori"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {cat !== 'Sijil Takaful (Nilai Tunai)' ? (
                    <button 
                      onClick={() => handleAddItem('Asset', cat as string)}
                      className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 flex items-center gap-1 transition-all uppercase tracking-tighter"
                    >
                      <Plus size={12} /> Tambah Item
                    </button>
                  ) : (
                    <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded uppercase cursor-help" title="Urus atau tambah sijil di Modul 4: Perlindungan">Urus di Modul 4</span>
                  )}
                </div>
                <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 px-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      {cat === 'Emas, Perak & Logam Berharga' ? (
                        <>
                          <div className="col-span-3">Perkara</div>
                          <div className="col-span-2 text-right">Harga/g</div>
                          <div className="col-span-2 text-right">Berat (g)</div>
                          <div className="col-span-2 text-right">Nilai (RM)</div>
                          <div className="col-span-1 text-center">CAIR</div>
                          <div className="col-span-2 text-center">CAJ</div>
                        </>
                      ) : (
                        <>
                          <div className="col-span-5">Perkara</div>
                          <div className="col-span-3 text-right">Nilai (RM)</div>
                          <div className="col-span-2 text-center flex items-center justify-center gap-1">CAIR <CheckCircle2 size={10} /></div>
                          <div className="col-span-2 text-center flex items-center justify-center gap-1">CAJ / KOS <CheckCircle2 size={10} /></div>
                        </>
                      )}
                    </div>
                    {items.filter(i => i.type === 'Asset' && i.category === cat).map((item, iIdx) => {
                      const isGold = cat === 'Emas, Perak & Logam Berharga';
                      return (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50/50 p-2 rounded-lg border border-transparent hover:border-emerald-100 transition-all group relative">
                          <div className="absolute left-1.5 w-6 flex justify-center text-[8px] font-black text-slate-300">
                            {cIdx + 1}.{iIdx + 1}
                          </div>
                          {isGold ? (
                            <>
                              <div className="col-span-3 relative ml-5">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={e => handleUpdate(item.id!, { name: e.target.value })}
                                  className="w-full bg-transparent text-[11px] font-bold text-slate-700 focus:outline-none placeholder:text-slate-300"
                                  placeholder="Nama aset..."
                                />
                              </div>
                              <div className="col-span-2">
                                <NumericInput
                                  value={item.pricePerUnit || 0}
                                  onChange={val => {
                                    handleUpdate(item.id!, { pricePerUnit: val, value: val * (item.weight || 0) });
                                  }}
                                  className="bg-white border border-slate-200 rounded px-1.5 py-1 text-right text-[10px] font-mono font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none w-full"
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="col-span-2">
                                <NumericInput
                                  value={item.weight || 0}
                                  onChange={val => {
                                    handleUpdate(item.id!, { weight: val, value: val * (item.pricePerUnit || 0) });
                                  }}
                                  className="bg-white border border-slate-200 rounded px-1.5 py-1 text-right text-[10px] font-mono font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none w-full"
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="col-span-2">
                                <div className="px-1 py-1 text-right text-[11px] font-mono font-black text-emerald-700 truncate">
                                  {(item.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </div>
                              <div className="col-span-1 flex justify-center">
                                <button 
                                  onClick={() => handleUpdate(item.id!, { isLiquid: !item.isLiquid })}
                                  className={`w-5 h-5 rounded flex items-center justify-center transition-all border ${item.isLiquid ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-slate-200 text-transparent'}`}
                                >
                                  <Check size={12} className={item.isLiquid ? 'opacity-100' : 'opacity-0'} />
                                </button>
                              </div>
                              <div className="col-span-2 flex items-center gap-1 justify-center">
                                <button 
                                  onClick={() => handleUpdate(item.id!, { hasCharge: !item.hasCharge })}
                                  className={`w-5 h-5 rounded flex items-center justify-center transition-all border ${item.hasCharge ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white border-slate-200 text-transparent'}`}
                                >
                                  <Check size={12} className={item.hasCharge ? 'opacity-100' : 'opacity-0'} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteItem(item.id!)} 
                                  className="opacity-60 hover:opacity-100 text-rose-400 hover:text-rose-600 transition-all p-1.5 hover:bg-rose-50 rounded-lg"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="col-span-5 relative ml-5">
                                {item.id?.startsWith('takaful-') ? (
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-slate-700">{item.name}</span>
                                    <span className="text-[8px] text-amber-600 font-bold uppercase tracking-tight mt-0.5">Disegerakkan dari Modul 4</span>
                                  </div>
                                ) : (
                                  <>
                                    <input
                                      type="text"
                                      value={item.name}
                                      onChange={e => handleUpdate(item.id!, { name: e.target.value })}
                                      className="w-full bg-transparent text-[11px] font-bold text-slate-700 focus:outline-none placeholder:text-slate-300"
                                      placeholder="Nama aset..."
                                    />
                                    {item.accountNo && <p className="text-[9px] text-indigo-500 font-mono font-bold mt-0.5 truncate uppercase">A/C: {item.accountNo}</p>}
                                  </>
                                )}
                              </div>
                              <div className="col-span-3 flex items-center gap-2 justify-end">
                                {item.id?.startsWith('takaful-') ? (
                                  <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-right text-xs font-mono font-bold text-slate-500 cursor-not-allowed w-full select-none">
                                    {(item.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                ) : (
                                  <NumericInput
                                    value={item.value || 0}
                                    onChange={val => handleUpdate(item.id!, { value: val })}
                                    className="bg-white border border-slate-200 rounded px-2 py-1 text-right text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none w-full"
                                    placeholder="0.00"
                                  />
                                )}
                              </div>
                              <div className="col-span-2 flex justify-center">
                                {item.id?.startsWith('takaful-') ? (
                                  <div className="w-6 h-6 rounded flex items-center justify-center border bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed">
                                    <Check size={14} className="opacity-0" />
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => handleUpdate(item.id!, { isLiquid: !item.isLiquid })}
                                    className={`w-6 h-6 rounded flex items-center justify-center transition-all border ${item.isLiquid ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-slate-200 text-transparent'}`}
                                  >
                                    <Check size={14} className={item.isLiquid ? 'opacity-100' : 'opacity-0'} />
                                  </button>
                                )}
                              </div>
                              <div className="col-span-2 flex items-center gap-2 justify-center">
                                {item.id?.startsWith('takaful-') ? (
                                  <>
                                    <div className="w-6 h-6 rounded flex items-center justify-center border bg-amber-500 border-amber-500 text-white cursor-not-allowed shadow-md">
                                      <Check size={14} className="opacity-100" />
                                    </div>
                                    <div className="w-6 flex justify-center">
                                      <span className="text-slate-400 p-1 cursor-help" title="Ubah atau padam melalui Modul 4: Perlindungan">
                                        <Info size={14} />
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => handleUpdate(item.id!, { hasCharge: !item.hasCharge })}
                                      className={`w-6 h-6 rounded flex items-center justify-center transition-all border ${item.hasCharge ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white border-slate-200 text-transparent'}`}
                                    >
                                      <Check size={14} className={item.hasCharge ? 'opacity-100' : 'opacity-0'} />
                                    </button>
                                    <div className="w-6 flex justify-center">
                                      <button 
                                        onClick={() => handleDeleteItem(item.id!)} 
                                        className="opacity-60 hover:opacity-100 text-rose-400 hover:text-rose-600 transition-all p-1.5 hover:bg-rose-50 rounded-lg"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                          </>
                        )}
                      </div>
                    )})}
                </div>
              </div>
            ))}

            {/* TAMBAH KATEGORI BARU (ASSET) */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nama Kategori Baru..."
                  value={newAssetCategory}
                  onChange={e => setNewAssetCategory(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-tight focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                <button 
                  onClick={() => {
                    if (newAssetCategory.trim()) {
                      handleAddItem('Asset', newAssetCategory.trim());
                      setNewAssetCategory('');
                    }
                  }}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Plus size={14} /> Kategori Baru
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* LIABILITIES SECTION */}
        <div className="space-y-6">
          <div className="bg-rose-600 text-white p-4 rounded-t-2xl flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-2">
              <ChevronDown size={18} />
              <span className="text-sm font-black uppercase tracking-widest">Senarai Liabiliti</span>
            </div>
            <span className="text-sm font-mono font-bold">RM {totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="bg-white border-x border-b border-slate-100 rounded-b-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
            {liabilityCategories.map((cat: any, cIdx) => (
              <div key={cat as string} className="p-4 space-y-3 relative group/section">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[11px] font-black text-rose-700 uppercase tracking-widest px-2 py-1 bg-rose-50 rounded-lg inline-block">{cIdx + 1}. {cat}</h3>
                    <button 
                      onClick={() => handleDeleteCategory('Liability', cat as string)}
                      className="opacity-60 hover:opacity-100 text-rose-400 hover:text-rose-600 transition-all p-1.5 hover:bg-rose-50 rounded-lg"
                      title="Hapus Kategori"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <button 
                    onClick={() => handleAddItem('Liability', cat as string)}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-all uppercase tracking-tighter"
                  >
                    <Plus size={12} /> Tambah Item
                  </button>
                </div>
                <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 px-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      <div className="col-span-6">Perkara</div>
                      <div className="col-span-4 text-right">Nilai (RM)</div>
                      <div className="col-span-2 text-center flex items-center justify-center gap-1">COVER <CheckCircle2 size={10} /></div>
                    </div>
                    {items.filter(i => i.type === 'Liability' && i.category === cat).map((item, iIdx) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50/50 p-2 rounded-lg border border-transparent hover:border-rose-100 transition-all group relative">
                        <div className="absolute left-1.5 w-6 flex justify-center text-[8px] font-black text-slate-300">
                          {cIdx + 1}.{iIdx + 1}
                        </div>
                        <div className="col-span-6 relative ml-5">
                          <input
                            type="text"
                            value={item.name}
                            onChange={e => handleUpdate(item.id!, { name: e.target.value })}
                            className="w-full bg-transparent text-[11px] font-bold text-slate-700 focus:outline-none placeholder:text-slate-300"
                            placeholder="Nama hutang..."
                          />
                          {item.accountNo && <p className="text-[9px] text-rose-500 font-mono font-bold mt-0.5 truncate uppercase">A/C: {item.accountNo}</p>}
                        </div>
                        <div className="col-span-4 flex items-center gap-2 justify-end">
                          <NumericInput
                            value={item.value || 0}
                            onChange={val => handleUpdate(item.id!, { value: val })}
                            className="bg-white border border-slate-200 rounded px-2 py-1 text-right text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-rose-500 outline-none w-full"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="col-span-2 flex items-center gap-2 justify-center">
                          <button 
                            onClick={() => handleUpdate(item.id!, { hasCoverage: !item.hasCoverage })}
                            className={`w-6 h-6 rounded flex items-center justify-center transition-all border ${item.hasCoverage ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'bg-white border-slate-200 text-transparent'}`}
                          >
                            <Check size={14} className={item.hasCoverage ? 'opacity-100' : 'opacity-0'} />
                          </button>
                          <div className="w-6 flex justify-center">
                            <button 
                              onClick={() => handleDeleteItem(item.id!)} 
                              className="opacity-60 hover:opacity-100 text-rose-400 hover:text-rose-600 transition-all p-1.5 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* TAMBAH KATEGORI BARU (LIABILITY) */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nama Kategori Baru..."
                  value={newLiabilityCategory}
                  onChange={e => setNewLiabilityCategory(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-tight focus:ring-1 focus:ring-rose-500 outline-none"
                />
                <button 
                  onClick={() => {
                    if (newLiabilityCategory.trim()) {
                      handleAddItem('Liability', newLiabilityCategory.trim());
                      setNewLiabilityCategory('');
                    }
                  }}
                  className="bg-rose-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Plus size={14} /> Kategori Baru
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED SUMMARY */}
      <div className="bg-[#1A365D] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
          <TrendingUp size={120} />
        </div>
        
        <div className="relative z-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Aset</p>
              <p className="text-2xl font-mono font-bold text-emerald-400">RM {totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Aset Cair</p>
              <p className="text-2xl font-mono font-bold text-blue-400">RM {totalLiquidAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-1 border-white/10 md:border-l md:pl-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Liabiliti</p>
              <p className="text-2xl font-mono font-bold text-rose-400">RM {totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-1 bg-white/5 p-4 rounded-2xl border border-white/10">
              <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest">NILAI ASET BERSIH</p>
              <p className={`text-3xl font-mono font-black ${netWorthValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                RM {netWorthValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="text-emerald-400" size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Komposisi Aset Cair</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-400 transition-all duration-1000" 
                      style={{ width: `${totalAssets > 0 ? (totalLiquidAssets / totalAssets) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold">{totalAssets > 0 ? ((totalLiquidAssets / totalAssets) * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Info className="text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Perlindungan Hutang</p>
                <p className="text-xs font-bold text-white/80 mt-1 uppercase tracking-tight">
                  {items.filter(i => i.type === 'Liability' && i.hasCoverage).length} dari {items.filter(i => i.type === 'Liability').length} HUTANG mempunyai MRTA/Takaful
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* SUMMARY & ANALYSIS SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        {/* Ringkasan Aliran Tunai dan Aset Bersih */}
        <div className="space-y-4">
          <div className="bg-emerald-600 text-white p-3 rounded-t-xl text-center">
            <h3 className="text-sm font-black uppercase tracking-widest">Ringkasan Aliran Tunai dan Aset Bersih</h3>
          </div>
          <div className="bg-white border border-slate-200 rounded-b-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                {[
                  { label: 'Pendapatan Tahunan', value: (budgetProfile?.items?.filter(i => i.category === 'income').reduce((acc, i) => acc + (i.monthly || 0) * (i.subCategory === 'deduction' ? -1 : 1), 0) || 0) * 12 },
                  { label: 'Perbelanjaan Tahunan', value: (budgetProfile?.items?.filter(i => i.category === 'expense').reduce((acc, i) => acc + (i.monthly || 0), 0) || 0) * 12 },
                  { label: 'Lebihan', value: ((budgetProfile?.items?.filter(i => i.category === 'income').reduce((acc, i) => acc + (i.monthly || 0) * (i.subCategory === 'deduction' ? -1 : 1), 0) || 0) - (budgetProfile?.items?.filter(i => i.category === 'expense').reduce((acc, i) => acc + (i.monthly || 0), 0) || 0)) * 12 },
                  { label: 'Total Aset', value: totalAssets },
                  { label: 'Total Liabiliti', value: totalLiabilities },
                  { label: 'Total Aset Cair', value: totalLiquidAssets },
                ].map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-4 py-3 font-bold text-slate-600">{row.label}</td>
                    <td className="px-4 py-3 text-emerald-600 font-mono font-bold w-1/3">RM</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{row.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analisis & Indikator */}
        <div className="space-y-4">
          <div className="bg-emerald-600 text-white p-3 rounded-t-xl text-center">
            <h3 className="text-sm font-black uppercase tracking-widest">Analisis & Indikator Aliran Tunai dan Aset Bersih</h3>
          </div>
          <div className="bg-[#E9F5E9] p-4 border-x border-slate-200">
            <p className="text-[10px] font-black text-emerald-800 uppercase mb-1">ANALISIS 1: Nilai Aset Bersih</p>
            <p className="text-[11px] text-emerald-900/70 font-medium leading-relaxed">
              Analisis ini untuk menilai tahap aset bersih anda. Ia untuk mengandaikan jika kita jual semua aset yang kita ada dan bayar semua hutang piutang kita, berapa nilai yang tinggal?
            </p>
            <div className="mt-3 flex flex-col gap-1">
              <p className="text-[10px] font-bold text-emerald-800">Formula: <span className="font-normal opacity-80">Total Aset (tolak) Total Liabiliti.</span></p>
              <p className="text-[10px] font-bold text-emerald-800">Indikator: <span className="font-normal opacity-80">Positif: Bagus. Negatif: Tidak bagus.</span></p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-b-xl overflow-hidden shadow-sm">
            <div className="bg-slate-100 p-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Formula</div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-600">Total Aset</td>
                  <td className="px-4 py-3 text-emerald-600 font-mono font-bold w-1/3">RM</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-600">(tolak) Total Liabiliti</td>
                  <td className="px-4 py-3 text-rose-600 font-mono font-bold w-1/3">RM</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr className="bg-emerald-50">
                  <td className="px-4 py-3 font-black text-emerald-900">Aset Bersih</td>
                  <td className="px-4 py-3 text-emerald-600 font-mono font-bold w-1/3">RM</td>
                  <td className="px-4 py-3 text-right font-mono font-black text-emerald-700">{netWorthValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr className={netWorthValue >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}>
                  <td className="px-4 py-3 font-black uppercase tracking-widest">INDIKATOR</td>
                  <td colSpan={2} className="px-4 py-3 text-right font-black uppercase tracking-widest text-lg">
                    {netWorthValue >= 0 ? 'Bagus' : 'Tidak Bagus'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ANALISIS 2: Liquidity Ratio */}
        <div className="space-y-4">
          <div className="bg-blue-600 text-white p-3 rounded-t-xl text-center">
            <h3 className="text-sm font-black uppercase tracking-widest">ANALISIS 2: Liquidity Ratio / Tahap Kecairan Aset</h3>
          </div>
          <div className="bg-blue-50 p-4 border-x border-slate-200">
            <p className="text-[11px] text-blue-900/70 font-medium leading-relaxed">
              Analisis ini untuk menilai berapakah jumlah aset kita yang cair untuk ditukarkan kepada aset tunai. Ia penting untuk menilai sejauh mana kita bersedia dengan aset cari untuk menghadapi situasi kecemasan...
            </p>
            <div className="mt-3 space-y-2">
              <p className="text-[10px] font-bold text-blue-800">Formula: <span className="font-normal opacity-80">Total Aset Cair ÷ Pendapatan Bulanan = XX bulan</span></p>
              <div className="text-[9px] text-blue-700 bg-white/50 p-2 rounded-lg border border-blue-100">
                <p>• Bawah 3 bulan: <strong>BAHAYA</strong></p>
                <p>• 3 ke 6 bulan: <strong>BAGUS</strong></p>
                <p>• 6 bulan ke atas: <strong>PALING BAGUS</strong></p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-b-xl overflow-hidden shadow-sm">
            <div className="bg-slate-100 p-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Formula</div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-600">Total Aset Cair</td>
                  <td className="px-4 py-3 text-blue-600 font-mono font-bold w-1/3">RM</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{totalLiquidAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  {/* Calculate Monthly Net Income */}
                  <td className="px-4 py-3 font-bold text-slate-600">÷ Pendapatan Bulanan</td>
                  <td className="px-4 py-3 text-blue-600 font-mono font-bold w-1/3">RM</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                    {(() => {
                      const netMonthly = budgetProfile?.items?.filter(i => i.category === 'income').reduce((acc, i) => acc + (i.monthly || 0) * (i.subCategory === 'deduction' ? -1 : 1), 0) || 1;
                      return netMonthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()}
                  </td>
                </tr>
                <tr className="bg-blue-50">
                  <td className="px-4 py-3 font-black text-blue-900">Liquidity Ratio</td>
                  <td colSpan={2} className="px-4 py-3 text-right font-mono font-black text-blue-700">
                    {(() => {
                      const netMonthly = budgetProfile?.items?.filter(i => i.category === 'income').reduce((acc, i) => acc + (i.monthly || 0) * (i.subCategory === 'deduction' ? -1 : 1), 0) || 1;
                      const ratio = totalLiquidAssets / Math.max(netMonthly, 1);
                      return `${ratio.toFixed(1)} bulan`;
                    })()}
                  </td>
                </tr>
                {(() => {
                  const netMonthly = budgetProfile?.items?.filter(i => i.category === 'income').reduce((acc, i) => acc + (i.monthly || 0) * (i.subCategory === 'deduction' ? -1 : 1), 0) || 1;
                  const ratio = totalLiquidAssets / Math.max(netMonthly, 1);
                  let status = 'BAHAYA';
                  let bgColor = 'bg-rose-500';
                  if (ratio >= 6) { status = 'PALING BAGUS'; bgColor = 'bg-emerald-500'; }
                  else if (ratio >= 3) { status = 'BAGUS'; bgColor = 'bg-blue-500'; }
                  
                  return (
                    <tr className={`${bgColor} text-white`}>
                      <td className="px-4 py-3 font-black uppercase tracking-widest">INDIKATOR</td>
                      <td colSpan={2} className="px-4 py-3 text-right font-black uppercase tracking-widest text-lg">{status}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* ANALISIS 3: Tahap Kesihatan Hutang */}
        <div className="space-y-4">
          <div className="bg-indigo-600 text-white p-3 rounded-t-xl text-center">
            <h3 className="text-sm font-black uppercase tracking-widest">ANALISIS 3: Tahap "Kesihatan" Hutang</h3>
          </div>
          <div className="bg-indigo-50 p-4 border-x border-slate-200">
            <p className="text-[11px] text-indigo-900/70 font-medium leading-relaxed">
              Analisis ini untuk menilai sejauh mana hutang kita terkawal atau tidak. Hutangpun ada tahap kesihatan. Hutang ibarat kolesterol...
            </p>
            <div className="mt-3 space-y-2">
              <p className="text-[10px] font-bold text-indigo-800">Formula: <span className="font-normal opacity-80">Total Liabiliti ÷ Pendapatan Tahunan = XX tahun</span></p>
              <div className="text-[9px] text-indigo-700 bg-white/50 p-2 rounded-lg border border-indigo-100">
                <p>• Kurang 3.5 tahun: <strong>SIHAT</strong></p>
                <p>• 3.5 ke 7 tahun: <strong>SEDERHANA</strong></p>
                <p>• Lebih 7 tahun: <strong>KRITIKAL</strong></p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-b-xl overflow-hidden shadow-sm">
            <div className="bg-slate-100 p-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Formula</div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-600">Total Liabiliti</td>
                  <td className="px-4 py-3 text-indigo-600 font-mono font-bold w-1/3">RM</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-600">÷ Pendapatan Tahunan</td>
                  <td className="px-4 py-3 text-indigo-600 font-mono font-bold w-1/3">RM</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                    {(() => {
                      const annualNet = (budgetProfile?.items?.filter(i => i.category === 'income').reduce((acc, i) => acc + (i.monthly || 0) * (i.subCategory === 'deduction' ? -1 : 1), 0) || 1) * 12;
                      return annualNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()}
                  </td>
                </tr>
                <tr className="bg-indigo-50">
                  <td className="px-4 py-3 font-black text-indigo-900">Kesihatan Hutang</td>
                  <td colSpan={2} className="px-4 py-3 text-right font-mono font-black text-indigo-700">
                    {(() => {
                      const annualNet = (budgetProfile?.items?.filter(i => i.category === 'income').reduce((acc, i) => acc + (i.monthly || 0) * (i.subCategory === 'deduction' ? -1 : 1), 0) || 1) * 12;
                      const ratio = totalLiabilities / Math.max(annualNet, 1);
                      return `${ratio.toFixed(1)} tahun`;
                    })()}
                  </td>
                </tr>
                {(() => {
                  const annualNet = (budgetProfile?.items?.filter(i => i.category === 'income').reduce((acc, i) => acc + (i.monthly || 0) * (i.subCategory === 'deduction' ? -1 : 1), 0) || 1) * 12;
                  const ratio = totalLiabilities / Math.max(annualNet, 1);
                  let status = 'KRITIKAL';
                  let bgColor = 'bg-rose-600';
                  if (ratio < 3.5) { status = 'SIHAT'; bgColor = 'bg-emerald-500'; }
                  else if (ratio <= 7) { status = 'SEDERHANA'; bgColor = 'bg-amber-500'; }
                  
                  return (
                    <tr className={`${bgColor} text-white`}>
                      <td className="px-4 py-3 font-black uppercase tracking-widest">INDIKATOR</td>
                      <td colSpan={2} className="px-4 py-3 text-right font-black uppercase tracking-widest text-lg">{status}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
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
          title="Simpan Rekod"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
          <span>{saveSuccess ? 'Rekod Disimpan' : 'Simpan Rekod'}</span>
        </button>
      </div>
    </div>
  );
}

