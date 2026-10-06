import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { User, Calendar, MapPin, Briefcase, Building, Users, Wallet, CreditCard, Home, Coins, Save, Loader2, CheckCircle2, Plus, Trash2, Mail, Phone } from 'lucide-react';
import { profileService, netWorthService, budgetService } from '../services';
import { UserProfile, NetWorthItem, BudgetProfile } from '../types';
import { auth } from '../firebase';
import { DEFAULT_BUDGET_ITEMS } from '../constants';
import NumericInput from './NumericInput';

export default function Profile() {
  const { viewingUserId, viewingUserName } = useApp();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [netWorthItems, setNetWorthItems] = useState<NetWorthItem[]>([]);
  const [budgetProfile, setBudgetProfile] = useState<BudgetProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const targetUserId = viewingUserId || auth.currentUser?.uid;
    if (!targetUserId) {
      setIsLoading(false);
      return;
    }

    let isSubscribed = true;
    let unsubProfile: (() => void) | null = null;
    let unsubNetWorth: (() => void) | null = null;
    let unsubBudget: (() => void) | null = null;

    const setupSubscriptions = async () => {
      let resolvedEmail = '';
      let resolvedPhone = '';

      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const q = query(collection(db, 'clients'), where('assignedUserId', '==', targetUserId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const clientData = snap.docs[0].data();
          resolvedEmail = clientData.email || '';
          resolvedPhone = clientData.phone || '';
        }
      } catch (err) {
        console.error('Error loading client info:', err);
      }

      // If no registration document found and we are viewing self
      if (!resolvedEmail && targetUserId === auth.currentUser?.uid) {
        resolvedEmail = auth.currentUser?.email || '';
      }

      if (!isSubscribed) return;

      unsubProfile = profileService.subscribe((data) => {
        if (data.length > 0) {
          const existingProfile = { ...data[0] };
          if (!existingProfile.email && resolvedEmail) {
            existingProfile.email = resolvedEmail;
          }
          if (!existingProfile.phone && resolvedPhone) {
            existingProfile.phone = resolvedPhone;
          }
          setProfile(existingProfile);
        } else {
          // Create default profile if not exists
          profileService.add({
            name: viewingUserName || (targetUserId === auth.currentUser?.uid ? (auth.currentUser?.displayName || '') : 'Pelanggan'),
            dob: '',
            address: '',
            occupation: '',
            employer: '',
            income: 0,
            state: '',
            dependents: [],
            email: resolvedEmail,
            phone: resolvedPhone,
            emergencyPhone: '',
          }, targetUserId);
        }
      }, targetUserId);

      unsubNetWorth = netWorthService.subscribe((data) => {
        setNetWorthItems(data);
      }, targetUserId);

      unsubBudget = budgetService.subscribe((data) => {
        if (data.length > 0) {
          setBudgetProfile(data[0]);
        } else {
          const newBudget = {
            userId: targetUserId,
            items: [...DEFAULT_BUDGET_ITEMS],
            lastUpdated: new Date().toISOString()
          };
          setBudgetProfile(newBudget);
        }
        setIsLoading(false);
      }, targetUserId);
    };

    setupSubscriptions();

    return () => {
      isSubscribed = false;
      if (unsubProfile) unsubProfile();
      if (unsubNetWorth) unsubNetWorth();
      if (unsubBudget) unsubBudget();
    };
  }, [viewingUserId]);

  // Sync income from budget to profile locally if not editing
  useEffect(() => {
    if (budgetProfile && profile) {
      const incomeItems = budgetProfile.items.filter(i => i.category === 'income');
      const active = incomeItems.filter(i => i.subCategory === 'active').reduce((acc, i) => acc + (i.monthly || 0), 0);
      const additional = incomeItems.filter(i => i.subCategory === 'additional').reduce((acc, i) => acc + (i.monthly || 0), 0);
      const deductions = incomeItems.filter(i => i.subCategory === 'deduction').reduce((acc, i) => acc + (i.monthly || 0), 0);
      const annualNet = (active + additional - deductions) * 12;

      if (Math.abs(profile.income - annualNet) > 0.01 && !isSaving) {
        setProfile(prev => prev ? { ...prev, income: annualNet } : null);
      }
    }
  }, [budgetProfile, isSaving]);

  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    if (!profile?.id) return;
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleUpdateAsset = (id: string, updates: Partial<NetWorthItem>) => {
    setNetWorthItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    setIsSaving(true);
    try {
      // Sync income back to budget if changed
      if (budgetProfile) {
        const incomeItems = budgetProfile.items.filter(i => i.category === 'income');
        const activeSum = incomeItems.filter(i => i.subCategory === 'active').reduce((acc, i) => acc + (i.monthly || 0), 0);
        const additionalSum = incomeItems.filter(i => i.subCategory === 'additional').reduce((acc, i) => acc + (i.monthly || 0), 0);
        const deductionsSum = incomeItems.filter(i => i.subCategory === 'deduction').reduce((acc, i) => acc + (i.monthly || 0), 0);
        const currentAnnualNet = (activeSum + additionalSum - deductionsSum) * 12;

        if (Math.abs(profile.income - currentAnnualNet) > 0.01) {
          const targetMonthlyNet = profile.income / 12;
          const diff = targetMonthlyNet - (activeSum + additionalSum - deductionsSum);
          
          const updatedItems = budgetProfile.items.map(item => {
            if (item.id === '1' || item.label === 'Gaji Asas') {
              return { ...item, monthly: Math.max(0, (item.monthly || 0) + diff) };
            }
            return item;
          });

          const updatedBudget = { ...budgetProfile, items: updatedItems, lastUpdated: new Date().toISOString() };
          if (budgetProfile.id) {
            await budgetService.update(budgetProfile.id, updatedBudget);
          } else {
            await budgetService.add(updatedBudget);
          }
        }
      }

      // Save profile
      await profileService.update(profile.id, profile);
      
      // Save all changed net worth items
      for (const item of netWorthItems) {
        if (item.id && !item.id.startsWith('tmp-')) {
          await netWorthService.update(item.id, item);
        }
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const findAsset = (name: string) => netWorthItems.find(i => i.name.toLowerCase().includes(name.toLowerCase()));

  if (isLoading) return <div className="p-20 text-center uppercase tracking-widest text-slate-400 font-bold">Memuatkan Profil...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-black">
            {profile?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{profile?.name || 'Pengguna'}</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{profile?.occupation || 'Kemas Kini Pekerjaan'}</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-black text-xs md:text-sm uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(16,185,129,0.35)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.5)] ring-4 ring-emerald-500/20 ${saveSuccess ? 'bg-emerald-600 text-white scale-100' : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:scale-[1.03] active:scale-95'}`}
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
          {saveSuccess ? 'Berjaya Disimpan' : 'Simpan Semua Perubahan'}
        </button>
      </div>

      <div className="text-slate-600">
        {/* MAKLUMAT PERIBADI */}
        <div className="space-y-6">
          <SectionHeader icon={<User size={18} />} title="Maklumat Peribadi" />
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField 
                label="Nama Penuh" 
                icon={<User size={14}/>} 
                value={profile?.name || ''} 
                onChange={v => handleUpdateProfile({ name: v })}
              />
              <InputField 
                label="Tarikh Lahir" 
                icon={<Calendar size={14}/>} 
                type="date"
                value={profile?.dob || ''} 
                onChange={v => handleUpdateProfile({ dob: v })}
              />
              <InputField 
                label="Emel" 
                icon={<Mail size={14}/>} 
                type="email"
                value={profile?.email || ''} 
                onChange={v => handleUpdateProfile({ email: v })}
              />
              <InputField 
                label="Nombor Telefon" 
                icon={<Phone size={14}/>} 
                value={profile?.phone || ''} 
                onChange={v => handleUpdateProfile({ phone: v })}
              />
              <InputField 
                label="Nombor Telefon Kecemasan" 
                icon={<Phone size={14}/>} 
                value={profile?.emergencyPhone || ''} 
                onChange={v => handleUpdateProfile({ emergencyPhone: v })}
              />
              <InputField 
                label="Pekerjaan" 
                icon={<Briefcase size={14}/>} 
                value={profile?.occupation || ''} 
                onChange={v => handleUpdateProfile({ occupation: v })}
              />
              <InputField 
                label="Majikan" 
                icon={<Building size={14}/>} 
                value={profile?.employer || ''} 
                onChange={v => handleUpdateProfile({ employer: v })}
              />
              <div className="space-y-1.5 flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Pendapatan (RM)</label>
                <div className="flex gap-3 text-slate-400">
                  <div className="flex-1 space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-tighter ml-1">Bulanan</span>
                    <InputField 
                      label="Bulanan" 
                      hideLabel
                      icon={<Wallet size={14}/>} 
                      type="number"
                      value={(profile?.income || 0) / 12} 
                      onChange={v => handleUpdateProfile({ income: (parseFloat(v) || 0) * 12 })}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-tighter ml-1">Tahunan</span>
                    <InputField 
                      label="Tahunan" 
                      hideLabel
                      icon={<Wallet size={14}/>} 
                      type="number"
                      value={profile?.income || 0} 
                      onChange={v => handleUpdateProfile({ income: parseFloat(v) || 0 })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4 md:col-span-2 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senarai Tanggungan</label>
                  <button 
                    onClick={() => {
                      const newDependent = { id: Math.random().toString(36).substr(2, 9), name: '', relationship: '' };
                      handleUpdateProfile({ dependents: [...(profile?.dependents || []), newDependent] });
                    }}
                    className="flex items-center gap-1.5 text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                  >
                    <Plus size={12} /> Tambah Tanggungan
                  </button>
                </div>

                <div className="space-y-3">
                  {(profile?.dependents || []).length > 0 ? (profile?.dependents || []).map((dep, idx) => (
                    <div key={dep.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className="md:col-span-6">
                        <InputField 
                          label="Nama" 
                          icon={<User size={12}/>} 
                          hideLabel 
                          value={dep.name} 
                          onChange={v => {
                            const newDeps = [...profile!.dependents];
                            newDeps[idx].name = v;
                            handleUpdateProfile({ dependents: newDeps });
                          }} 
                        />
                      </div>
                      <div className="md:col-span-4">
                        <InputField 
                          label="Hubungan" 
                          icon={<Users size={12}/>} 
                          hideLabel 
                          value={dep.relationship} 
                          onChange={v => {
                            const newDeps = [...profile!.dependents];
                            newDeps[idx].relationship = v;
                            handleUpdateProfile({ dependents: newDeps });
                          }} 
                        />
                      </div>
                      <div className="md:col-span-2 flex justify-end">
                        <button 
                          onClick={() => {
                            const newDeps = profile!.dependents.filter(d => d.id !== dep.id);
                            handleUpdateProfile({ dependents: newDeps });
                          }}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Tiada tanggungan disenaraikan</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <InputField 
                  label="Alamat" 
                  icon={<MapPin size={14}/>} 
                  value={profile?.address || ''} 
                  onChange={v => handleUpdateProfile({ address: v })}
                />
              </div>
              <div className="md:col-span-1">
                <SelectField
                  label="Negeri"
                  icon={<MapPin size={14}/>}
                  value={profile?.state || ''}
                  onChange={v => handleUpdateProfile({ state: v })}
                  options={[
                    { value: '', label: 'Pilih Negeri' },
                    { value: 'Johor', label: 'Johor' },
                    { value: 'Kedah', label: 'Kedah' },
                    { value: 'Kelantan', label: 'Kelantan' },
                    { value: 'Melaka', label: 'Melaka' },
                    { value: 'Negeri Sembilan', label: 'Negeri Sembilan' },
                    { value: 'Pahang', label: 'Pahang' },
                    { value: 'Perak', label: 'Perak' },
                    { value: 'Perlis', label: 'Perlis' },
                    { value: 'Pulau Pinang', label: 'Pulau Pinang' },
                    { value: 'Sabah', label: 'Sabah' },
                    { value: 'Sarawak', label: 'Sarawak' },
                    { value: 'Selangor', label: 'Selangor' },
                    { value: 'Terengganu', label: 'Terengganu' },
                    { value: 'Wilayah Persekutuan Kuala Lumpur', label: 'W.P. Kuala Lumpur' },
                    { value: 'Wilayah Persekutuan Labuan', label: 'W.P. Labuan' },
                    { value: 'Wilayah Persekutuan Putrajaya', label: 'W.P. Putrajaya' },
                  ]}
                />
              </div>
            </div>
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
          title="Simpan Semua Perubahan"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
          <span>{saveSuccess ? 'Berjaya Disimpan' : 'Simpan Semua Perubahan'}</span>
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <div className="flex items-center gap-3 ml-2">
      <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
        {icon}
      </div>
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">{title}</h2>
    </div>
  );
}

function InputField({ label, value, onChange, icon, type = "text", disabled = false, inputClassName = "text-xs text-slate-700", containerClassName = "bg-slate-50", hideLabel = false }: { label: string, value: any, onChange?: (v: any) => void, icon?: React.ReactNode, type?: string, disabled?: boolean, inputClassName?: string, containerClassName?: string, hideLabel?: boolean }) {
  return (
    <div className="space-y-1.5 flex-1">
      {!hideLabel && <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>}
      <div className={`relative group border border-slate-100 rounded-xl transition-all ${containerClassName}`}>
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-indigo-500">{icon}</div>}
        {type === 'number' ? (
          <NumericInput 
            value={value}
            onChange={(v) => onChange?.(v)}
            disabled={disabled}
            placeholder={hideLabel ? label : ""}
            className={`w-full px-3 py-2.5 font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all rounded-xl ${icon ? 'pl-9' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${inputClassName}`}
          />
        ) : (
          <input 
            type={type}
            placeholder={hideLabel ? label : ""}
            value={value}
            onChange={e => onChange?.(e.target.value)}
            disabled={disabled}
            className={`w-full px-3 py-2.5 font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all rounded-xl ${icon ? 'pl-9' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${inputClassName}`}
          />
        )}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, icon, options, disabled = false, selectClassName = "text-xs text-slate-700", containerClassName = "bg-slate-50" }: { label: string, value: any, onChange?: (v: any) => void, icon?: React.ReactNode, options: { value: string, label: string }[], disabled?: boolean, selectClassName?: string, containerClassName?: string }) {
  return (
    <div className="space-y-1.5 flex-1">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className={`relative group border border-slate-100 rounded-xl transition-all ${containerClassName}`}>
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-indigo-500">{icon}</div>}
        <select 
          value={value}
          onChange={e => onChange?.(e.target.value)}
          disabled={disabled}
          className={`w-full px-3 py-2.5 font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all rounded-xl appearance-none ${icon ? 'pl-9' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${selectClassName}`}
        >
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
        </div>
      </div>
    </div>
  );
}

function AccountBox({ title, item, onUpdate }: { title: string, item: NetWorthItem | undefined, onUpdate: (id: string, updates: Partial<NetWorthItem>) => void }) {
  if (!item) return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 opacity-60">
      <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">{title}</h4>
      <p className="text-[10px] italic">Item tidak ditemui dalam Net Worth. Sila tambah dahulu.</p>
    </div>
  );

  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all group">
      <h4 className="text-[10px] font-black text-slate-400 group-hover:text-indigo-600 uppercase mb-3 tracking-widest">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-7">
          <InputField label="Bank / Institusi" value={item.accountNo || ''} onChange={v => onUpdate(item.id!, { accountNo: v })} />
        </div>
        <div className="md:col-span-5">
          <InputField label="Baki Terkini" type="number" value={item.value || 0} onChange={v => onUpdate(item.id!, { value: parseFloat(v) || 0 })} />
        </div>
      </div>
    </div>
  );
}
