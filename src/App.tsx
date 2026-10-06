import { useState, useEffect } from 'react';
import { loginWithGoogle, logout } from './firebase';
import { 
  LayoutDashboard, 
  Wallet, 
  ShieldCheck, 
  Vault, 
  TrendingUp, 
  Sparkles, 
  ScrollText,
  Building2,
  LogOut,
  Menu,
  X,
  PlayCircle,
  UserCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  FileDown,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from './contexts/AppContext';

// Components
import Dashboard from './components/Dashboard';
import Cashflow from './components/Cashflow';
import Protection from './components/Protection';
import Savings from './components/Savings';
import Investment from './components/Investment';
import Zakat from './components/Zakat';
import Inheritance from './components/Inheritance';
import NetWorth from './components/NetWorth';
import Profile from './components/Profile';
import AdminPanel from './components/AdminPanel';
import PrintReport from './components/PrintReport';

type Tab = 'profile' | 'dashboard' | 'cashflow' | 'networth' | 'protection' | 'savings' | 'investment' | 'zakat' | 'inheritance' | 'admin';

export default function App() {
  const { user, role, isAdmin, loading, isClientDeactivated, viewingUserId, viewingUserName, setViewingUserId } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('isSidebarCollapsed');
    return saved === 'true';
  });

  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const handlePdfExport = () => {
    let inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch (e) {
      inIframe = true;
    }

    const clientName = viewingUserName || user?.displayName || 'Pelanggan';
    document.title = `BMW Planner Report - ${clientName}`;

    if (inIframe) {
      setShowPrintModal(true);
    } else {
      window.print();
    }
  };

  useEffect(() => {
    localStorage.setItem('isSidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const handleInviteParam = async () => {
      if (!user) return;
      const params = new URLSearchParams(window.location.search);
      const inviteClientId = params.get('inviteClient');

      if (inviteClientId) {
        try {
          const { doc, getDoc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          const clientRef = doc(db, 'clients', inviteClientId);
          const clientSnap = await getDoc(clientRef);
          
          if (clientSnap.exists()) {
            const clientData = clientSnap.data();
            if (!clientData.assignedUserId) {
              await updateDoc(clientRef, {
                assignedUserId: user.uid,
                status: 'Active'
              });
              setInviteSuccess(`Selamat datang, ${clientData.name || 'Pelanggan'}! Profil anda berjaya disambungkan. Sila isikan maklumat anda.`);
            } else if (clientData.assignedUserId === user.uid) {
              setInviteSuccess(`Selamat datang semula! Profil anda telah sedia dihubungkan.`);
            } else {
              setInviteError(`Ralat peranti: Profil jemputan ini telah dihubungkan dengan akaun Google yang lain.`);
            }
          } else {
            setInviteError('Pautan jemputan tidak sah atau telah padam.');
          }
          
          // Clean URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error('Error handling invitation link:', err);
          setInviteError('Ralat sistem mengendalikan jemputan.');
        }
      } else if (user.email) {
        // If logged in but no invitation parameter was specified in the URL,
        // search for any pending or unassigned client profiles matching this user's email
        try {
          const { collection, query, where, getDocs, updateDoc } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          
          const clientsRef = collection(db, 'clients');
          const emailLower = user.email.toLowerCase().trim();
          
          let matchedDoc: any = null;

          // 1. Direct query matching email string directly
          const emailQuery1 = query(clientsRef, where('email', '==', user.email));
          const querySnap1 = await getDocs(emailQuery1);
          if (!querySnap1.empty) {
            matchedDoc = querySnap1.docs.find(d => {
              const data = d.data();
              return !data.assignedUserId || data.status === 'Pending';
            });
          }

          // 2. Direct query matching lowercased email string
          if (!matchedDoc && emailLower !== user.email) {
            const emailQuery2 = query(clientsRef, where('email', '==', emailLower));
            const querySnap2 = await getDocs(emailQuery2);
            if (!querySnap2.empty) {
              matchedDoc = querySnap2.docs.find(d => {
                const data = d.data();
                return !data.assignedUserId || data.status === 'Pending';
              });
            }
          }

          // 3. Fallback client-side case-insensitive and trimmed match on ALL unassigned/pending clients
          if (!matchedDoc) {
            const allSnap = await getDocs(clientsRef);
            matchedDoc = allSnap.docs.find(d => {
              const data = d.data();
              const emailsMatch = data.email && data.email.trim().toLowerCase() === emailLower;
              const isUnassignedOrPending = !data.assignedUserId || data.status === 'Pending';
              return emailsMatch && isUnassignedOrPending;
            });
          }

          if (matchedDoc) {
            const clientData = matchedDoc.data();
            await updateDoc(matchedDoc.ref, {
              assignedUserId: user.uid,
              status: 'Active'
            });
            console.log(`Auto-linked user ${user.email} to client record ${matchedDoc.id}`);
            setInviteSuccess(`Selamat datang, ${clientData.name || 'Pelanggan'}! Akaun anda berjaya dikesan dan diaktifkan.`);
          }
        } catch (autoLinkErr) {
          console.error('Error auto-linking user email to client:', autoLinkErr);
        }
      }
    };

    handleInviteParam();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="mb-6 inline-flex p-4 bg-blue-50 rounded-full text-blue-600">
            <Wallet size={48} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1 font-sans">BMW {`Planner`}</h1>
          <p className="text-xs text-emerald-600 font-bold mb-5 uppercase tracking-wider">
            by INFAQ Consultancy • Dibangunkan oleh Afyan Mat Rawi, IFP
          </p>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Sistem pengurusan kewangan peribadi berdasarkan modul pembelajaran tersusun. Kawal aliran tunai, lindungi pendapatan, bina simpanan, dan kembangkan pelaburan anda.
          </p>
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" alt="Google" className="w-5 h-5" />
            Log Masuk dengan Google
          </button>
        </motion.div>
      </div>
    );
  }

  if (isClientDeactivated && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-rose-50/20 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-rose-100 p-8 text-center space-y-6"
        >
          <div className="mb-4 inline-flex p-4 bg-rose-55 rounded-full text-rose-550 block mx-auto bg-rose-50 text-rose-500">
            <XCircle size={48} />
          </div>
          <h1 className="text-xl font-black text-rose-600 uppercase tracking-tight">AKSES DIHADKAN / MAKLUMAT DISAHKAN</h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            Maaf, akaun anda telah dinyahaktifkan buat sementara waktu oleh Pentadbir atau Perunding Kewangan anda. 
          </p>
          <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Sebab Penyekatan:</p>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              "Akses pengguna dinyahaktifkan secara pentadbiran tanpa memadam data kewangan anda daripada fail jagaan."
            </p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Segala data input modul kewangan anda tetap dipelihara dengan selamat. Sila hubungi urus setia pentadbiran untuk bantuan pengaktifan semula akses profil.
          </p>
          
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 border border-slate-200 text-slate-700 py-2.5 px-4 rounded-xl hover:bg-slate-200 transition-colors font-bold text-xs uppercase"
          >
            <LogOut size={14} />
            Log Keluar dari Akaun
          </button>
        </motion.div>
      </div>
    );
  }

  const menuItems: { id: Tab; label: string; icon: any; color: string }[] = [];

  if (isAdmin) {
    menuItems.push({ id: 'admin', label: 'Urus Pelanggan & Admin', icon: ShieldCheck, color: 'text-purple-600' });
  }

  menuItems.push(
    { id: 'profile', label: 'Profil Saya', icon: UserCircle, color: 'text-indigo-600' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-gray-600' },
    { id: 'cashflow', label: 'Modul 1: Aliran Tunai', icon: Wallet, color: 'text-emerald-600' },
    { id: 'networth', label: 'Modul 2: Nilai Aset Bersih', icon: Building2, color: 'text-slate-600' },
    { id: 'savings', label: 'Modul 3: Simpanan', icon: Vault, color: 'text-amber-600' },
    { id: 'protection', label: 'Modul 4: Perlindungan', icon: ShieldCheck, color: 'text-indigo-600' },
    { id: 'investment', label: 'Modul 5: Pelaburan', icon: TrendingUp, color: 'text-blue-600' },
    { id: 'zakat', label: 'Modul 6: Penyucian', icon: Sparkles, color: 'text-purple-600' },
    { id: 'inheritance', label: 'Modul 7: Pewarisan', icon: ScrollText, color: 'text-rose-600' },
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'admin': return <AdminPanel switchTab={setActiveTab} />;
      case 'profile': return <Profile />;
      case 'dashboard': return <Dashboard switchTab={setActiveTab} />;
      case 'cashflow': return <Cashflow switchTab={setActiveTab} />;
      case 'networth': return <NetWorth switchTab={setActiveTab} />;
      case 'protection': return <Protection switchTab={setActiveTab} />;
      case 'savings': return <Savings switchTab={setActiveTab} />;
      case 'investment': return <Investment switchTab={setActiveTab} />;
      case 'zakat': return <Zakat switchTab={setActiveTab} />;
      case 'inheritance': return <Inheritance switchTab={setActiveTab} />;
      default: return <Dashboard switchTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-slate-900 overflow-hidden">
      <div className="no-print flex-1 flex flex-col overflow-hidden min-h-screen">
      {/* Impersonation Banner */}
      {viewingUserId && (
        <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white px-6 py-2.5 text-xs font-bold flex flex-col sm:flex-row justify-between items-center gap-2 z-50 border-b border-indigo-500/30">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-yellow-450 rounded-full animate-pulse bg-yellow-400"></span>
            <span>MOD PEMERHATIAN AKTIF: Sedang melihat & mengurus profil pelanggan <strong>{viewingUserName || 'Pelanggan'}</strong></span>
          </div>
          <button 
            onClick={() => {
              setViewingUserId(null);
              setActiveTab('admin');
            }}
            className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold px-4 py-1 rounded-lg transition text-[10px] uppercase shadow-sm"
          >
            Kembali ke Profil Saya
          </button>
        </div>
      )}

      {/* Invitation Alerts */}
      {inviteSuccess && (
        <div className="bg-emerald-500 text-white px-6 py-3.5 text-xs font-bold flex justify-between items-center z-50 shadow">
          <span>{inviteSuccess}</span>
          <button onClick={() => setInviteSuccess(null)} className="hover:bg-white/10 p-1 rounded font-normal text-[10px] uppercase">Tutup</button>
        </div>
      )}
      {inviteError && (
        <div className="bg-rose-600 text-white px-6 py-3.5 text-xs font-bold flex justify-between items-center z-50 shadow">
          <span>{inviteError}</span>
          <button onClick={() => setInviteError(null)} className="hover:bg-white/10 p-1 rounded font-normal text-[10px] uppercase">Tutup</button>
        </div>
      )}

      {/* Header */}
      <header className="h-16 bg-[#1A365D] text-white flex items-center justify-between px-6 shrink-0 z-40 shadow-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex p-2 hover:bg-white/10 text-emerald-305 hover:text-white rounded-lg transition-all items-center justify-center border border-white/10 hover:border-white/20 active:scale-95 text-emerald-300"
            title={isSidebarCollapsed ? "Papar Menu Sisi (Sidebar)" : "Sembunyi Menu Sisi (Sidebar)"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight size={18} className="animate-pulse" />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
          
          <div className="w-12 h-10 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-xs italic text-white text-center shrink-0">BMW</div>
          <div>
            <h1 className="text-md md:text-lg font-bold tracking-tight leading-none uppercase">BMW {`Planner`}</h1>
            <p className="text-[10px] text-emerald-400 font-medium tracking-wider mt-1.5 uppercase">
              by INFAQ Consultancy • Afyan Mat Rawi, IFP {role === 'admin' && <span className="bg-purple-600/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded ml-1 tracking-normal">ADMIN</span>}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 md:gap-6">
          <button
            onClick={handlePdfExport}
            className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-[0_4px_12px_rgba(16,185,129,0.3)] active:scale-95 cursor-pointer no-print"
            title="Eksport laporan kewangan semasa sebagai PDF"
          >
            <FileDown size={14} />
            <span>Eksport PDF</span>
          </button>

          <div className="hidden md:flex items-center gap-4 mr-4">
            <div className="text-right">
              <p className="text-[10px] opacity-60 uppercase">Sessi Aktif</p>
              <p className="text-xs font-mono">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 hover:bg-white/10 rounded-lg">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={`
          fixed md:sticky top-0 left-0 z-30 h-full bg-white border-r border-slate-200 transform transition-all duration-300 shrink-0 overflow-hidden
          ${isSidebarCollapsed ? 'md:w-0 md:border-r-0' : 'md:w-64'}
          ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="h-full flex flex-col p-4 w-64">
            <nav className="flex-1 space-y-1 mt-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all group text-left
                    ${activeTab === item.id 
                      ? 'bg-slate-100 text-slate-900 font-bold border-l-4 border-emerald-500' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent'
                    }
                  `}
                >
                  <item.icon size={18} className={`shrink-0 ${activeTab === item.id ? 'text-emerald-500' : 'group-hover:text-emerald-400'}`} />
                  <span className="text-sm text-left">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-auto pt-4 border-t border-slate-100 mb-16 md:mb-0">
              <div className="flex items-center gap-3 mb-4 px-2">
                <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="" className="w-8 h-8 rounded-lg" />
                <div className="truncate">
                  <p className="text-xs font-bold truncate text-slate-900">{user.displayName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all text-xs font-medium"
              >
                <LogOut size={16} />
                <span>LOG KELUAR</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-[#F8F9FA] p-6 lg:p-8 transition-all duration-300">
          <div className={`w-full mx-auto transition-all duration-300 ${isSidebarCollapsed ? 'max-w-7xl' : 'max-w-6xl'}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${viewingUserId || 'self'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Footer Bar */}
      <footer className="h-12 bg-white border-t border-slate-200 px-6 sm:px-8 flex items-center justify-between shrink-0 z-40 text-[10px] text-slate-400 font-medium">
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="uppercase tracking-tight font-bold text-slate-500">BMW Planner (by INFAQ Consultancy)</span>
          <span className="w-1 h-1 bg-slate-200 rounded-full hidden sm:inline"></span>
          <span className="hidden sm:inline">Dibangunkan oleh Afyan Mat Rawi, IFP</span>
          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
          <span>DATA SYNC: {new Date().toLocaleTimeString()}</span>
        </div>
        <div className="flex gap-4 uppercase tracking-tighter text-[10px] font-bold text-slate-500">
          <span className="sm:hidden text-[9px] text-slate-500">Afyan Mat Rawi, IFP</span>
          <span className="hidden sm:inline hover:text-emerald-500 cursor-pointer">Panduan Pengguna</span>
          <span className="hidden sm:inline hover:text-emerald-500 cursor-pointer">Bantuan Teknikal</span>
        </div>
      </footer>

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
      
      <PrintReport />
    </div>
  );
}
