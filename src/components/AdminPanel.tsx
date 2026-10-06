import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Copy, 
  Check, 
  Trash2, 
  Eye, 
  ShieldCheck, 
  Mail, 
  Clock, 
  CheckCircle,
  HelpCircle,
  Smartphone,
  BookOpen,
  Info,
  AlertCircle,
  Lock,
  Unlock,
  XCircle,
  ArrowUpDown,
  FileText,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { adminService, ClientProfile, UserRoleRecord } from '../services/adminService';
import { useApp } from '../contexts/AppContext';
import { motion } from 'motion/react';

export default function AdminPanel({ switchTab }: { switchTab?: (tab: any) => void } = {}) {
  const { setViewingUserId, user } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'clients' | 'admins'>('clients');
  
  // Clients state
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'name' | 'email' | 'status' | 'date'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [editingClientNotes, setEditingClientNotes] = useState<{ id: string, name: string, notes: string } | null>(null);
  
  // New Client Form
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);

  // Admin state
  const [userRoles, setUserRoles] = useState<UserRoleRecord[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Custom alert and confirm modal state to bypass iframe limitations
  const [alertMessage, setAlertMessage] = useState<{ title: string; text: string; buttonText?: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [pendingClientForLink, setPendingClientForLink] = useState<ClientProfile | null>(null);

  // Load clients and roles
  useEffect(() => {
    const unsubClients = adminService.subscribeClients(setClients);
    const unsubRoles = adminService.subscribeUserRoles(setUserRoles);
    return () => {
      unsubClients();
      unsubRoles();
    };
  }, []);

  // Handle Client creation
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientEmail) return;
    
    setIsSubmittingClient(true);
    const success = await adminService.addClient({
      name: newClientName.trim(),
      email: newClientEmail.trim().toLowerCase(),
      phone: newClientPhone.trim(),
      notes: newClientNotes.trim(),
      status: 'Pending'
    });

    setIsSubmittingClient(false);
    if (success) {
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
      setNewClientNotes('');
      setShowAddClient(false);
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    setConfirmDialog({
      title: 'Padam Pelanggan',
      message: `Adakah anda pasti mahu memadam rekod pelanggan "${name}"? Tindakan ini tidak boleh diundurkan.`,
      onConfirm: async () => {
        await adminService.deleteClient(id);
      }
    });
  };

  const handleToggleClientStatus = async (id: string, currentStatus: string, name: string) => {
    const isDeactivating = currentStatus !== 'Deactivated';
    setConfirmDialog({
      title: isDeactivating ? 'Nyahaktifkan Akses Pelanggan' : 'Aktifkan Semula Akses Pelanggan',
      message: isDeactivating 
        ? `Adakah anda pasti mahu menyahaktifkan akses untuk "${name}"? Data mereka tetap dipelihara, namun akses ke aplikasi akan disekat.`
        : `Adakah anda pasti mahu mengaktifkan semula akses untuk "${name}"? Mereka akan dapat memasuki aplikasi semula.`,
      onConfirm: async () => {
        const newStatus = isDeactivating ? 'Deactivated' : 'Active';
        await adminService.updateClient(id, { status: newStatus });
      }
    });
  };

  const handleCopyLink = (clientId: string) => {
    let origin = window.location.origin;
    if (origin.includes('-dev-')) {
      origin = origin.replace('-dev-', '-pre-');
    }
    const link = `${origin}/?inviteClient=${clientId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(clientId);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error('Failed to copy link:', err);
    });
  };

  const handleViewClient = (client: ClientProfile) => {
    if (!client.assignedUserId) {
      setAlertMessage({
        title: 'Pautan Belum Diaktifkan',
        text: `Pelanggan "${client.name}" belum mengaktifkan pautan jemputan mereka.\n\nSila salin pautan jemputan dan hantar kepada pelanggan tersebut. Apabila pelanggan mendaftar masuk dan menghubungkan akaun mereka, butang mata ini akan membolehkan anda melihat serta menguruskannya secara langsung!\n\nKlik butang di bawah untuk salin pautan jemputan pelanggan ini secara automatik.`,
        buttonText: 'Salin Pautan Pendaftaran'
      });
      setPendingClientForLink(client);
      return;
    }
    setViewingUserId(client.assignedUserId, client.name);
    if (switchTab) {
      switchTab('dashboard');
    }
  };

  // Handle Admin invitation
  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) return;

    setIsSubmittingAdmin(true);
    setAdminMessage(null);
    try {
      await adminService.addPreapprovedAdmin(newAdminEmail);
      setAdminMessage({ type: 'success', text: `E-mel admin ${newAdminEmail} berjaya didaftarkan!` });
      setNewAdminEmail('');
    } catch (err) {
      setAdminMessage({ type: 'error', text: 'Gagal menambah admin.' });
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleDemoteAdmin = async (roleRecordId: string, roleRecordEmail: string) => {
    if (roleRecordEmail.toLowerCase() === 'afyan.ikhlas@gmail.com') {
      setAlertMessage({
        title: 'Tindakan Disekat',
        text: 'Super admin tidak boleh diturunkan pangkat daripada sistem.'
      });
      return;
    }
    setConfirmDialog({
      title: 'Tukar Peranan Pengguna',
      message: `Adakah anda pasti mahu mematikan status admin untuk "${roleRecordEmail}" dan menukarnya kepada pengguna biasa?`,
      onConfirm: async () => {
        await adminService.updateUserRole(roleRecordId, 'pengguna');
      }
    });
  };

  const handlePromoteUser = async (roleRecordId: string) => {
    await adminService.updateUserRole(roleRecordId, 'admin');
  };

  const handleDeleteRole = async (roleRecordId: string, roleRecordEmail: string) => {
    if (roleRecordEmail.toLowerCase() === 'afyan.ikhlas@gmail.com') {
      setAlertMessage({
        title: 'Tindakan Disekat',
        text: 'Super admin tidak boleh dipadam daripada rekod peranan sistem.'
      });
      return;
    }
    setConfirmDialog({
      title: 'Padam Peranan',
      message: `Adakah anda pasti mahu memadam rekod peranan peranti pentadbir untuk "${roleRecordEmail}"?`,
      onConfirm: async () => {
        await adminService.deleteUserRole(roleRecordId);
      }
    });
  };

  const handleSort = (field: 'name' | 'email' | 'status' | 'date') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: 'name' | 'email' | 'status' | 'date') => {
    if (sortField !== field) {
      return <ArrowUpDown size={11} className="text-slate-300 opacity-50 group-hover:opacity-100 transition-opacity inline-block align-middle ml-1" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp size={12} className="text-[#1A365D] inline-block align-middle ml-1 font-bold" />
      : <ChevronDown size={12} className="text-[#1A365D] inline-block align-middle ml-1 font-bold" />;
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery))
  );

  const sortedAndFilteredClients = [...filteredClients].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name, 'ms');
    } else if (sortField === 'email') {
      comparison = a.email.localeCompare(b.email, 'ms');
    } else if (sortField === 'status') {
      const statusOrder: { [key: string]: number } = { 'Active': 1, 'Pending': 2, 'Deactivated': 3 };
      const valA = statusOrder[a.status] || 99;
      const valB = statusOrder[b.status] || 99;
      comparison = valA - valB;
    } else if (sortField === 'date') {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      comparison = dateA - dateB;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <ShieldCheck className="text-emerald-500" size={28} />
            Halaman Kawalan Pentadbir (Admin)
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Urus pelanggan, pantau kemasukan data kewangan mereka, dan lantik pentadbir sistem baru.
          </p>
        </div>
        <div className="flex bg-slate-800 rounded-lg p-1 w-full md:w-auto self-stretch md:self-auto border border-slate-700">
          <button
            onClick={() => setActiveSubTab('clients')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition-all ${
              activeSubTab === 'clients' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users size={14} />
            Urus Pelanggan
          </button>
          <button
            onClick={() => setActiveSubTab('admins')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition-all ${
              activeSubTab === 'admins' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck size={14} />
            Urus Admin
          </button>
        </div>
      </div>

      {activeSubTab === 'clients' ? (
        <div className="space-y-6">
          {/* Form Create Client toggled */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative max-w-sm w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search size={16} className="text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Cari pelanggan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>
            
            <button
              onClick={() => setShowAddClient(!showAddClient)}
              className="flex items-center gap-2 bg-[#1A365D] hover:bg-[#1A365D]/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
            >
              <UserPlus size={16} />
              {showAddClient ? 'Tutup Pendaftaran' : 'Tambah Pelanggan Baru'}
            </button>
          </div>

          {showAddClient && (
            <form onSubmit={handleCreateClient} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-2xl">
              <h3 className="text-md font-bold text-slate-800">Daftar Pelanggan Baru</h3>
              <p className="text-xs text-slate-500">Isikan butiran pelanggan yang baru. Pautan berasingan akan dijana yang boleh anda kongsi kepada mereka untuk melengkapkan fail kewangan.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Nama Penuh</label>
                  <input
                    type="text"
                    required
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Contoh: Ahmad Fauzi bin Hassan"
                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">E-mel Pelanggan</label>
                  <input
                    type="email"
                    required
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="Contoh: ahmad@gmail.com"
                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">No Telefon (Pilihan)</label>
                  <input
                    type="tel"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="Contoh: +60123456789"
                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Nota / Perihal (Pilihan)</label>
                  <input
                    type="text"
                    value={newClientNotes}
                    onChange={(e) => setNewClientNotes(e.target.value)}
                    placeholder="E.g., Pasangan Fauzi & Atikah"
                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClient}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  {isSubmittingClient ? 'Menyimpan...' : 'Daftar & Jana Pautan'}
                </button>
              </div>
            </form>
          )}

          {/* List Clients */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <h3 className="font-bold text-slate-800 text-sm">Jumlah Pelanggan Jagaan ({sortedAndFilteredClients.length})</h3>
            </div>

            {sortedAndFilteredClients.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Users className="mx-auto text-slate-300" size={40} />
                <p className="text-sm">Tiada pelanggan ditemui.</p>
                <p className="text-xs">Klik "Tambah Pelanggan Baru" di sebelah atas untuk memulakan jagaan.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase text-[10px] font-mono tracking-wider border-b border-slate-200">
                      <th 
                        className="py-3 px-6 cursor-pointer select-none hover:bg-slate-200/60 transition-colors group"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Pelanggan
                          {renderSortIcon('name')}
                        </div>
                      </th>
                      <th 
                        className="py-3 px-6 cursor-pointer select-none hover:bg-slate-200/60 transition-colors group"
                        onClick={() => handleSort('email')}
                      >
                        <div className="flex items-center gap-1">
                          Hubungan (Telefon & E-mel)
                          {renderSortIcon('email')}
                        </div>
                      </th>
                      <th 
                        className="py-3 px-6 text-center cursor-pointer select-none hover:bg-slate-200/60 transition-colors group"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Status Pautan
                          {renderSortIcon('status')}
                        </div>
                      </th>
                      <th 
                        className="py-3 px-6 cursor-pointer select-none hover:bg-slate-200/60 transition-colors group"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center gap-1">
                          Tarikh Daftar
                          {renderSortIcon('date')}
                        </div>
                      </th>
                      <th className="py-3 px-6 text-right select-none">Tindakan Jagaan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {sortedAndFilteredClients.map((client) => {
                      const isPending = client.status === 'Pending';
                      const isDeactivated = client.status === 'Deactivated';
                      return (
                        <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6 font-medium text-slate-900">
                            <div>
                              <p className="font-bold text-slate-800">{client.name}</p>
                              {client.notes && <p className="text-xs text-slate-500 italic mt-0.5">{client.notes}</p>}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-600 text-xs">
                            <div className="space-y-1">
                              <p className="flex items-center gap-1.5"><Mail size={12} className="text-slate-400" /> {client.email}</p>
                              {client.phone && <p className="flex items-center gap-1.5"><Smartphone size={12} className="text-slate-400" /> {client.phone}</p>}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isDeactivated
                                ? 'bg-rose-100 text-rose-850'
                                : isPending 
                                  ? 'bg-amber-100 text-amber-700' 
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isDeactivated ? <XCircle size={10} /> : isPending ? <Clock size={10} /> : <CheckCircle size={10} />}
                              {isDeactivated ? 'Nyahaktif (Disekat)' : isPending ? 'Menunggu log masuk' : 'Aktif (Dihubung)'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500">
                            {new Date(client.createdAt).toLocaleDateString('ms-MY', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2">
                              {/* Copy Link button */}
                              <button
                                onClick={() => handleCopyLink(client.id || '')}
                                title="Salin pautan jemputan pelanggan"
                                className="p-2 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 rounded-lg text-slate-600 transition"
                              >
                                {copiedId === client.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                              </button>
                              
                              {/* View Data button */}
                              <button
                                onClick={() => handleViewClient(client)}
                                disabled={isDeactivated}
                                title={isDeactivated ? "Akses disekat: Sila aktifkan semula akses pelanggan terlebih dahulu" : isPending ? "Maklumat Belum Diaktifkan: Klik untuk maklumat lanjut" : "Tengok & Kelola Data Kewangan Pelanggan"}
                                className={`p-2 border rounded-lg transition ${
                                  isDeactivated
                                    ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                                    : isPending 
                                      ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white' 
                                      : 'border-[#1A365D]/30 bg-[#1A365D]/5 text-[#1A365D] hover:bg-[#1A365D] hover:text-white'
                                }`}
                              >
                                <Eye size={14} />
                              </button>

                              {/* Admin Notes button */}
                              <button
                                onClick={() => setEditingClientNotes({ id: client.id || '', name: client.name, notes: client.notes || '' })}
                                title="Catat / Edit Nota Penjagaan Pelanggan (Hanya Admin)"
                                className="p-2 border border-blue-250 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition"
                              >
                                <FileText size={14} />
                              </button>

                              {/* Toggle Lock status button */}
                              <button
                                onClick={() => handleToggleClientStatus(client.id || '', client.status, client.name)}
                                title={isDeactivated ? "Aktifkan semula akses pelanggan" : "Nyahaktifkan akses pelanggan (tanpa padam data)"}
                                className={`p-2 border rounded-lg transition ${
                                  isDeactivated
                                    ? 'border-emerald-250 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                                    : 'border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white'
                                }`}
                              >
                                {isDeactivated ? <Unlock size={14} /> : <Lock size={14} />}
                              </button>

                              {/* Delete button */}
                              <button
                                onClick={() => handleDeleteClient(client.id || '', client.name)}
                                title="Padam rekod pelanggan"
                                className="p-2 border border-rose-100 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Admins View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invite Admin Column */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit">
            <h3 className="font-bold text-slate-800 text-sm">Daftar Admin Baru</h3>
            <p className="text-xs text-slate-500">
              Isikan e-mel pentadbir baru di bawah. Apabila mereka mendaftar masuk menerusi Google menggunakan e-mel ini, sistem akan menukar peranan mereka sebagai Admin secara automatik.
            </p>

            <form onSubmit={handleInviteAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">E-mel Pentadbir</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Mail size={14} className="text-slate-400" />
                  </span>
                  <input
                    type="email"
                    required
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="Contoh: rakan_admin@gmail.com"
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {adminMessage && (
                <div className={`p-3 rounded-xl text-xs font-medium border ${
                  adminMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}>
                  {adminMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingAdmin}
                className="w-full bg-[#1A365D] hover:bg-[#1A365D]/95 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-sm"
              >
                {isSubmittingAdmin ? 'Sedang Mendaftar...' : 'Pre-Approve Admin Baru'}
              </button>
            </form>
          </div>

          {/* Admins list column */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">Senarai Peranan Sistem ({userRoles.length})</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase text-[10px] font-mono tracking-wider border-b border-slate-200">
                    <th className="py-3 px-6">E-mel / Pengguna</th>
                    <th className="py-3 px-6 text-center">Peranan</th>
                    <th className="py-3 px-6 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {userRoles.map((roleRecord) => {
                    const isPreapproved = roleRecord.id?.startsWith('email:');
                    const isCurrentUser = roleRecord.userId === user?.uid;
                    const isSuperAdmin = roleRecord.email.toLowerCase() === 'afyan.ikhlas@gmail.com';
                    
                    return (
                      <tr key={roleRecord.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-bold text-slate-800">
                              {roleRecord.name || (isPreapproved ? 'Menunggu Pendaftaran' : 'Tiada Nama')}
                              {isCurrentUser && <span className="ml-1.5 text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">SAYA</span>}
                            </p>
                            <p className="text-xs text-slate-500">{roleRecord.email}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            roleRecord.role === 'admin' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <ShieldCheck size={10} />
                            {roleRecord.role}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2">
                            {roleRecord.role === 'admin' ? (
                              <button
                                onClick={() => handleDemoteAdmin(roleRecord.id || '', roleRecord.email)}
                                disabled={isSuperAdmin || isCurrentUser}
                                className={`text-xs px-2.5 py-1.5 border rounded-lg transition ${
                                  isSuperAdmin || isCurrentUser
                                    ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                    : 'border-amber-200 hover:bg-amber-50 text-amber-600'
                                }`}
                              >
                                Tukar Pengguna
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePromoteUser(roleRecord.id || '')}
                                className="text-xs px-2.5 py-1.5 border border-purple-200 hover:bg-purple-100 text-purple-700 rounded-lg transition"
                              >
                                Lantik Admin
                              </button>
                            )}

                            {!isSuperAdmin && !isCurrentUser && (
                              <button
                                onClick={() => handleDeleteRole(roleRecord.id || '', roleRecord.email)}
                                className="p-2 border border-rose-100 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-500">
              <AlertCircle size={24} />
              <h4 className="font-bold text-slate-800">{alertMessage.title}</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{alertMessage.text}</p>
            <button
              onClick={() => {
                if (pendingClientForLink) {
                  handleCopyLink(pendingClientForLink.id || '');
                  setPendingClientForLink(null);
                }
                setAlertMessage(null);
              }}
              className="w-full bg-[#1A365D] hover:bg-[#1A365D]/95 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm"
            >
              {alertMessage.buttonText || 'Faham'}
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-500">
              <AlertCircle size={24} className="text-amber-500" />
              <h4 className="font-bold text-slate-800">{confirmDialog.title}</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                   setConfirmDialog(null);
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm"
              >
                Pasti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Notes Dialog Modal */}
      {editingClientNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FileText className="text-blue-600" size={18} />
                  Nota Pentadbir: {editingClientNotes.name}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  Hanya anda (Admin) sahaja yang boleh melihat, merekod, dan menyunting nota penulisan ini.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                Nota / Ulasan Penjagaan Pelanggan
              </label>
              <textarea
                rows={6}
                value={editingClientNotes.notes}
                onChange={(e) => setEditingClientNotes({ ...editingClientNotes, notes: e.target.value })}
                placeholder="Tulis maklumat perbincangan, butiran portfolio, tugasan seterusnya, atau nota khusus di sini..."
                className="w-full px-4 py-3 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-350"
              />
              <div className="flex justify-between text-[10px] text-slate-450 font-bold text-slate-400">
                <span>Data dipelihara dengan selamat secara admin cloud.</span>
                <span>{editingClientNotes.notes.length} aksara</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingClientNotes(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await adminService.updateClient(editingClientNotes.id, { notes: editingClientNotes.notes });
                    setEditingClientNotes(null);
                  } catch (err) {
                    console.error("Gagal menyimpan nota:", err);
                  }
                }}
                className="px-4 py-2 text-xs font-bold bg-[#1A365D] hover:bg-[#1A365D]/90 text-white rounded-xl shadow-sm transition"
              >
                Simpan Nota
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
