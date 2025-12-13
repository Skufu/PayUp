import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  where
} from 'firebase/firestore';
import { 
  Plus, 
  QrCode, 
  Receipt, 
  Users, 
  History, 
  Check, 
  X, 
  ArrowRight, 
  Camera, 
  Wallet, 
  AlertCircle,
  MoreHorizontal,
  Trash2,
  ChevronDown,
  ArrowLeftRight,
  Smartphone,
  Menu,
  Link as LinkIcon,
  Copy,
  LogOut,
  MapPin,
  Share2,
  Bell,
  Clock,
  Eye,
  User,
  Settings,
  Upload,
  Trophy,
  TrendingDown,
  TrendingUp
} from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'payup-default';

// --- THEME & AESTHETICS ---
const Fonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@400;500;600;700;800&display=swap');
    
    :root {
      --font-display: 'Syne', sans-serif;
      --font-mono: 'DM Mono', monospace;
      --color-bg: #0a0a0c;
      --color-surface: #131316;
      --color-surface-highlight: #1c1c21;
      --color-primary: #dfff4f; /* Acid Lime */
      --color-secondary: #ff4f99; /* Hot Pink */
      --color-text: #f0f0f0;
      --color-text-dim: #888890;
    }

    body {
      background-color: #050507;
      color: var(--color-text);
      font-family: var(--font-mono);
      -webkit-font-smoothing: antialiased;
      margin: 0;
      overflow: hidden; /* Prevent body scroll, handle in app container */
    }

    .font-display { font-family: var(--font-display); }
    .font-mono { font-family: var(--font-mono); }

    /* Custom Animations */
    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
      100% { transform: translateY(0px); }
    }
    
    @keyframes slide-up {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes slide-in-left {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }

    .animate-float { animation: float 6s ease-in-out infinite; }
    .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    .animate-slide-in-left { animation: slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    
    /* Scrollbar hide */
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    .glass-panel {
      background: rgba(19, 19, 22, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .glass-panel-top {
      background: rgba(19, 19, 22, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .acid-border {
      position: relative;
    }
    .acid-border::after {
      content: '';
      position: absolute;
      bottom: -4px;
      right: -4px;
      width: 100%;
      height: 100%;
      border: 1px solid var(--color-primary);
      z-index: -1;
      transition: all 0.2s;
    }
    .acid-border:active::after {
      bottom: 0px;
      right: 0px;
    }
  `}</style>
);

// --- MOCK DATA ---
const ALL_USERS = [
  { id: 'u1', name: 'Adrian', avatar: 'A', color: 'bg-blue-500', qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCASH-ADRIAN-09170000001' },
  { id: 'u2', name: 'Hazel', avatar: 'H', color: 'bg-pink-500', qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCASH-HAZEL-09170000002' },
  { id: 'u3', name: 'Tyn', avatar: 'T', color: 'bg-purple-500', qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCASH-TYN-09170000003' },
  { id: 'u4', name: 'Banjo', avatar: 'B', color: 'bg-green-500', qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCASH-BANJO-09170000004' },
  { id: 'u5', name: 'Creed', avatar: 'C', color: 'bg-yellow-500', qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCASH-CREED-09170000005' },
  { id: 'u6', name: 'Owen', avatar: 'O', color: 'bg-orange-500', qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCASH-OWEN-09170000006' },
  { id: 'u7', name: 'Mika', avatar: 'M', color: 'bg-teal-500', qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCASH-MIKA-09170000007' },
];

const MOCK_PROOF_URL = "https://placehold.co/400x800/1c1c21/dfff4f?text=GCash+Receipt";

// --- COMPONENTS ---

// 1. App Shell (Responsive Web/Mobile Wrapper)
const AppShell = ({ children, currentUser, onSwitchUser, onMenuClick, currentGroup, activeTab, onTabChange, notificationCount, onCentralAdd, onOpenMembers, onOpenMyQr }) => {
  const [showInviteToast, setShowInviteToast] = useState(false);

  const handleInvite = () => {
     navigator.clipboard.writeText(`https://payup.app/join/${currentGroup?.id || 'default'}`);
     setShowInviteToast(true);
     setTimeout(() => setShowInviteToast(false), 2000);
  };

  return (
    <div className="h-[100dvh] w-full bg-[#050507] flex justify-center font-mono">
      <div className="w-full max-w-md h-full bg-[#0a0a0c] relative shadow-2xl flex flex-col border-x border-white/5">
        
        {/* Background Atmosphere */}
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-gradient-to-b from-[#1c1c21] to-transparent opacity-50 blur-3xl pointer-events-none" />
        <div className="absolute top-[10%] right-[-10%] w-64 h-64 bg-[#dfff4f] rounded-full mix-blend-overlay filter blur-[100px] opacity-10 animate-float pointer-events-none" />
        
        {/* Header */}
        <div className="relative z-40 glass-panel px-4 py-4 flex justify-between items-center shrink-0 gap-3">
          <button onClick={onMenuClick} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
            <Menu size={24} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold tracking-tight text-[#dfff4f] drop-shadow-md truncate">
              PayUp
            </h1>
            <p className="text-[10px] text-gray-500 font-mono tracking-[0.1em] uppercase truncate">
               {currentGroup ? currentGroup.name : 'Loading...'}
            </p>
          </div>
          
          <button 
            onClick={handleInvite}
            className="p-2 text-gray-400 hover:text-[#dfff4f] transition-colors relative"
            title="Invite Friends"
          >
             <Share2 size={20} />
             {showInviteToast && (
                <div className="absolute top-full right-0 mt-2 whitespace-nowrap bg-[#dfff4f] text-black text-[10px] font-bold px-2 py-1 rounded animate-slide-up">
                   Link Copied!
                </div>
             )}
          </button>

          <div className="relative group">
            <button className="flex items-center gap-2 bg-white/5 px-2 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
              <div className={`w-6 h-6 rounded-full ${currentUser.color} flex items-center justify-center text-[10px] text-black font-bold`}>
                {currentUser.avatar}
              </div>
              <ChevronDown size={12} className="text-gray-400" />
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#131316] border border-white/10 rounded-xl shadow-xl overflow-hidden hidden group-hover:block animate-slide-up z-50">
              <div className="px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider bg-white/5">View As</div>
              {ALL_USERS.map(u => (
                <button 
                  key={u.id}
                  onClick={() => onSwitchUser(u)}
                  className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
                >
                  <div className={`w-6 h-6 rounded-full ${u.color} flex items-center justify-center text-[10px] text-black font-bold`}>
                    {u.avatar}
                  </div>
                  <span className="text-sm font-mono">{u.name}</span>
                  {currentUser.id === u.id && <Check size={14} className="ml-auto text-[#dfff4f]" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4 pt-6 relative z-10 scroll-smooth">
          {children}
        </main>

        {/* Bottom Nav - Updated with Central Add Button */}
        <div className="glass-panel-top pb-8 pt-4 px-6 flex justify-between items-center z-40 shrink-0">
          <NavIcon 
            icon={Wallet} 
            active={activeTab === 'wallet'} 
            onClick={() => onTabChange('wallet')} 
            label="Wallet" 
          />
          <NavIcon 
            icon={Bell} 
            active={activeTab === 'notifications'} 
            onClick={() => onTabChange('notifications')} 
            label="Activity"
            badge={notificationCount}
          />
          
          {/* Central Add Button */}
          <div className="relative -top-6">
            <button 
              onClick={onCentralAdd}
              className="w-16 h-16 rounded-full bg-[#dfff4f] flex items-center justify-center text-black shadow-[0_0_20px_rgba(223,255,79,0.4)] border-4 border-[#0a0a0c] hover:scale-105 transition-transform active:scale-95"
            >
              <Plus size={32} strokeWidth={2.5} />
            </button>
          </div>

          <NavIcon icon={Users} onClick={onOpenMembers} />
          <NavIcon icon={QrCode} onClick={onOpenMyQr} />
        </div>
      </div>
    </div>
  );
};

const NavIcon = ({ icon: Icon, active, onClick, badge }) => (
  <button 
    onClick={onClick}
    className={`relative p-3 rounded-2xl transition-all duration-300 ${active ? 'text-[#dfff4f] bg-[#dfff4f]/5 shadow-[0_0_15px_rgba(223,255,79,0.1)]' : 'text-gray-600 hover:text-gray-300'}`}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    {badge > 0 && (
      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#ff4f99] rounded-full border border-[#0a0a0c]" />
    )}
  </button>
);

// 2. Profile Modal (Unchanged)
const ProfileModal = ({ isOpen, onClose, currentUser, onUpdateProfile }) => {
  const [name, setName] = useState(currentUser?.name || '');
  const [qrUrl, setQrUrl] = useState(currentUser?.qr || '');

  useEffect(() => {
    if(isOpen && currentUser) {
        setName(currentUser.name);
        setQrUrl(currentUser.qr);
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
       <div className="relative w-full max-w-sm bg-[#131316] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
          <div className="relative h-32 bg-gradient-to-b from-[#1c1c21] to-[#131316]">
             <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-sm z-10">
                <X size={20} />
             </button>
             <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                <div className={`w-24 h-24 rounded-full ${currentUser.color} flex items-center justify-center text-4xl font-bold text-black border-[6px] border-[#131316] shadow-xl`}>
                   {currentUser.avatar}
                </div>
                <button className="absolute bottom-0 right-0 p-1.5 bg-[#dfff4f] rounded-full text-black hover:scale-110 transition-transform shadow-lg border border-[#131316]">
                   <Camera size={14} />
                </button>
             </div>
          </div>
          <div className="pt-14 pb-8 px-6 text-center">
             <div className="mb-8">
                <label className="text-[10px] uppercase text-gray-500 font-mono tracking-widest mb-1 block">Display Name</label>
                <div className="flex items-center justify-center gap-2 relative">
                   <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-transparent text-center text-2xl font-bold text-white focus:outline-none focus:border-b focus:border-[#dfff4f] w-full max-w-[200px] pb-1"
                   />
                   <MoreHorizontal size={16} className="text-gray-600 absolute right-4" />
                </div>
             </div>
             <div className="bg-[#0a0a0c] rounded-2xl p-6 border border-white/5 mb-6 relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#dfff4f]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-xs font-mono text-gray-400 mb-4 flex items-center justify-center gap-2">
                   <QrCode size={14} /> YOUR GCASH QR
                </h3>
                <div className="w-48 h-48 mx-auto bg-white p-4 rounded-xl mb-4 relative shadow-lg">
                   <img src={qrUrl} alt="QR" className="w-full h-full mix-blend-multiply object-cover" />
                   <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl cursor-pointer backdrop-blur-[2px]">
                      <Upload size={24} className="text-white mb-2" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change QR</span>
                   </div>
                </div>
                <p className="text-[10px] text-gray-500">Tap image to upload new QR</p>
             </div>
             <button 
                onClick={() => {
                   onUpdateProfile({ ...currentUser, name, qr: qrUrl });
                   onClose();
                }}
                className="w-full py-4 bg-[#1c1c21] hover:bg-[#dfff4f] hover:text-black border border-white/10 rounded-xl font-bold font-mono transition-all uppercase tracking-widest acid-border"
             >
                Save Changes
             </button>
          </div>
       </div>
    </div>
  )
}

// 3. Side Menu (Unchanged)
const SideMenu = ({ isOpen, onClose, groups, currentGroupId, onSelectGroup, onCreateGroup, onOpenProfile }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex">
      <div 
         className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
         onClick={onClose}
      />
      <div className="relative w-[80%] max-w-xs h-full bg-[#131316] border-r border-white/10 shadow-2xl animate-slide-in-left flex flex-col">
         <div className="p-6 border-b border-white/10 bg-[#1c1c21]">
            <h2 className="font-display text-2xl font-bold text-[#dfff4f] mb-1">PayUp</h2>
            <p className="text-xs text-gray-500 font-mono">Manage your trips</p>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-4 ml-2">Your Groups</div>
            {groups.map(group => (
               <button
                  key={group.id}
                  onClick={() => {
                     onSelectGroup(group);
                     onClose();
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${
                     currentGroupId === group.id 
                     ? 'bg-[#dfff4f]/10 border-[#dfff4f]/50 text-white' 
                     : 'bg-transparent border-transparent hover:bg-white/5 text-gray-400'
                  }`}
               >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${currentGroupId === group.id ? 'bg-[#dfff4f] text-black' : 'bg-[#1c1c21] text-gray-500'}`}>
                     <MapPin size={18} />
                  </div>
                  <div className="min-w-0">
                     <div className={`font-bold text-sm truncate ${currentGroupId === group.id ? 'text-[#dfff4f]' : 'text-white'}`}>{group.name}</div>
                     <div className="text-[10px] truncate opacity-60">{group.members?.length || 0} Members</div>
                  </div>
                  {currentGroupId === group.id && <Check size={16} className="ml-auto text-[#dfff4f]" />}
               </button>
            ))}
         </div>
         <div className="p-4 border-t border-white/10 bg-[#0a0a0c] space-y-3">
            <button 
               onClick={() => {
                  onCreateGroup();
                  onClose();
               }}
               className="w-full bg-[#1c1c21] hover:bg-white/10 text-white font-bold py-3 rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-colors"
            >
               <Plus size={18} /> New Trip Group
            </button>
            <button 
               onClick={() => {
                  onOpenProfile();
                  onClose();
               }}
               className="w-full bg-transparent hover:bg-white/5 text-gray-400 hover:text-white py-3 rounded-xl border border-white/5 flex items-center justify-center gap-2 transition-colors font-mono text-sm"
            >
               <User size={16} /> My Profile
            </button>
         </div>
      </div>
    </div>
  );
};

// 4. Notification View (Unchanged)
const NotificationView = ({ payments, currentUser, activeUsers, onReviewPayment }) => {
  const [selectedPayment, setSelectedPayment] = useState(null);

  const incomingPayments = payments.filter(p => p.receiverId === currentUser.id);
  const outgoingPayments = payments.filter(p => p.senderId === currentUser.id);
  
  const allActivities = [...incomingPayments, ...outgoingPayments].sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

  return (
    <div className="space-y-6">
      <h2 className="text-xs uppercase text-gray-500 font-mono tracking-widest px-2">Payment Notifications</h2>
      
      {allActivities.length === 0 && (
         <div className="flex flex-col items-center justify-center py-12 opacity-30">
            <Bell size={48} className="mb-4" />
            <p className="text-sm font-mono">No notifications yet.</p>
         </div>
      )}

      {allActivities.map(payment => {
        const isIncoming = payment.receiverId === currentUser.id;
        const otherUser = activeUsers.find(u => u.id === (isIncoming ? payment.senderId : payment.receiverId)) || { name: 'Unknown' };
        
        return (
          <div key={payment.id} className="relative p-4 rounded-2xl bg-[#131316] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between group">
             <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${otherUser.color} flex items-center justify-center text-black font-bold text-sm relative`}>
                   {otherUser.avatar}
                   <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#131316] flex items-center justify-center ${
                      payment.status === 'approved' ? 'bg-[#dfff4f]' : 
                      payment.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                   }`}>
                      {payment.status === 'approved' ? <Check size={10} color="black" /> : <Clock size={10} color="black" />}
                   </div>
                </div>
                <div>
                   <p className="text-sm font-bold text-white">
                      {isIncoming ? `${otherUser.name} paid you` : `You paid ${otherUser.name}`}
                   </p>
                   <p className="text-xs text-gray-500 font-mono">
                      {parseFloat(payment.amount).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })} • {payment.status}
                   </p>
                </div>
             </div>
             
             {isIncoming && payment.status === 'pending' && (
                <button 
                  onClick={() => setSelectedPayment(payment)}
                  className="bg-[#dfff4f] text-black px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono hover:bg-[#ccee3e] transition-colors"
                >
                   REVIEW
                </button>
             )}

             {(!isIncoming || payment.status !== 'pending') && (
                <button 
                   onClick={() => setSelectedPayment(payment)}
                   className="p-2 text-gray-600 hover:text-white"
                >
                   <Eye size={18} />
                </button>
             )}
          </div>
        );
      })}

      {selectedPayment && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedPayment(null)} />
            <div className="relative w-full max-w-sm bg-[#131316] rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
               <div className="p-4 border-b border-white/10 bg-[#1c1c21] flex justify-between items-center">
                  <h3 className="font-bold text-white">Payment Proof</h3>
                  <button onClick={() => setSelectedPayment(null)}><X size={20} className="text-gray-400" /></button>
               </div>
               <div className="p-4 flex flex-col items-center">
                  <div className="w-full bg-[#0a0a0c] rounded-xl overflow-hidden mb-4 border border-white/5 relative group">
                     <img src={MOCK_PROOF_URL} alt="Proof" className="w-full h-auto opacity-80 group-hover:opacity-100 transition-opacity" />
                     <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] text-white font-mono">
                        SAMPLE PROOF
                     </div>
                  </div>
                  <div className="text-center mb-6">
                     <p className="text-gray-500 text-xs uppercase tracking-wider">Amount Paid</p>
                     <p className="text-3xl font-mono font-bold text-[#dfff4f]">
                        {parseFloat(selectedPayment.amount).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                     </p>
                  </div>
                  {selectedPayment.status === 'pending' && selectedPayment.receiverId === currentUser.id ? (
                     <div className="flex w-full gap-2">
                        <button 
                           onClick={() => setSelectedPayment(null)}
                           className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 font-bold hover:bg-white/5 transition-colors"
                        >
                           REJECT
                        </button>
                        <button 
                           onClick={() => {
                              onReviewPayment(selectedPayment.id, 'approved', selectedPayment);
                              setSelectedPayment(null);
                           }}
                           className="flex-1 py-3 rounded-xl bg-[#dfff4f] text-black font-bold hover:bg-[#ccee3e] transition-colors"
                        >
                           APPROVE
                        </button>
                     </div>
                  ) : (
                     <div className="w-full text-center p-3 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-xs text-gray-400 font-mono uppercase">
                           Status: <span className={selectedPayment.status === 'approved' ? 'text-[#dfff4f]' : 'text-white'}>{selectedPayment.status}</span>
                        </p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

// 5. Create Group Modal (Unchanged)
const CreateGroupModal = ({ isOpen, onClose, onConfirm }) => {
   const [groupName, setGroupName] = useState('');
   const [selectedMembers, setSelectedMembers] = useState(ALL_USERS.map(u => u.id));

   const toggleMember = (uid) => {
      if (selectedMembers.includes(uid)) {
         setSelectedMembers(prev => prev.filter(id => id !== uid));
      } else {
         setSelectedMembers(prev => [...prev, uid]);
      }
   }

   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
         <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
         <div className="relative w-full max-w-sm bg-[#131316] rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
            <div className="p-6 border-b border-white/10 bg-[#1c1c21] flex justify-between items-center">
               <h3 className="font-display text-xl font-bold text-white">New Trip Group</h3>
               <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-6">
               <div>
                  <label className="text-[10px] uppercase text-gray-500 font-mono mb-2 block tracking-wider">Group Name</label>
                  <input 
                     autoFocus
                     type="text" 
                     value={groupName}
                     onChange={e => setGroupName(e.target.value)}
                     placeholder="e.g. Siargao 2025"
                     className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#dfff4f]"
                  />
               </div>
               <div>
                  <label className="text-[10px] uppercase text-gray-500 font-mono mb-2 block tracking-wider">Included People</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                     {ALL_USERS.map(u => (
                        <button
                           key={u.id}
                           onClick={() => toggleMember(u.id)}
                           className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              selectedMembers.includes(u.id) 
                              ? 'bg-[#dfff4f]/10 border-[#dfff4f]/30' 
                              : 'bg-transparent border-white/5 opacity-50'
                           }`}
                        >
                           <div className={`w-8 h-8 rounded-full ${u.color} flex items-center justify-center text-xs font-bold text-black`}>
                              {u.avatar}
                           </div>
                           <span className={`text-sm font-medium ${selectedMembers.includes(u.id) ? 'text-white' : 'text-gray-500'}`}>{u.name}</span>
                           {selectedMembers.includes(u.id) && <Check size={14} className="ml-auto text-[#dfff4f]" />}
                        </button>
                     ))}
                  </div>
               </div>
               <button 
                  disabled={!groupName || selectedMembers.length < 2}
                  onClick={() => {
                     onConfirm(groupName, selectedMembers);
                     setGroupName('');
                  }}
                  className="w-full bg-[#dfff4f] text-black font-bold font-mono py-4 rounded-xl acid-border hover:bg-[#ccee3e] disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  CREATE GROUP
               </button>
            </div>
         </div>
      </div>
   )
}

// 6. Balance Card (Unchanged)
const BalanceCard = ({ balances, currentUser }) => {
  const myBalance = balances[currentUser.id] || 0;
  const isOwed = myBalance > 0;
  const isDebt = myBalance < 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#1c1c21] border border-white/5 p-8 mb-8 group transition-transform hover:scale-[1.02] duration-500">
      <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-20 transition-colors duration-500 ${isDebt ? 'bg-[#ff4f99]' : 'bg-[#dfff4f]'}`} />
      <div className="relative z-10 flex flex-col items-center text-center">
        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 border border-white/10 px-2 py-0.5 rounded-full">Net Position</span>
        <div className="flex items-baseline gap-1 my-2">
          <span className={`font-display text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-2xl ${isDebt ? 'text-[#ff4f99]' : 'text-[#dfff4f]'}`}>
            {Math.abs(myBalance).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
          </span>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-2 ${
          isDebt 
            ? 'border-[#ff4f99]/30 text-[#ff4f99] bg-[#ff4f99]/10' 
            : 'border-[#dfff4f]/30 text-[#dfff4f] bg-[#dfff4f]/10'
        }`}>
          {isDebt ? <><ArrowRight size={12} className="rotate-45"/> You Owe Total</> : isOwed ? <><ArrowRight size={12} className="-rotate-45"/> You are Owed</> : <><Check size={12}/> All Settled</>}
        </div>
      </div>
    </div>
  );
};

// 7. Settlement List (Unchanged)
const SettlementList = ({ balances, currentUser, activeUsers, onPayClick }) => {
  return (
    <div className="space-y-3 mb-24">
       <h3 className="text-[10px] font-mono uppercase text-gray-500 mb-4 px-2 tracking-widest">Settlements Needed</h3>
       {Object.entries(balances).map(([userId, amount]) => {
         if (userId === currentUser.id) return null;
         if (Math.abs(amount) < 1) return null;
         const userObj = activeUsers.find(u => u.id === userId);
         if (!userObj) return null;

         const myNet = balances[currentUser.id];
         const isMeDebtor = myNet < -1;
         const isTheyCreditor = amount > 1;
         
         if (isMeDebtor && isTheyCreditor) {
            return (
              <div key={userId} className="flex items-center justify-between p-4 rounded-2xl bg-[#131316] border border-white/5 hover:border-white/20 transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${userObj.color} flex items-center justify-center text-black font-bold text-lg shadow-lg`}>
                    {userObj.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-[#dfff4f] transition-colors">Pay {userObj.name}</p>
                    <p className="text-xs text-gray-500 font-mono">Tap to view QR</p>
                  </div>
                </div>
                <button 
                  onClick={() => onPayClick(userId, Math.min(Math.abs(myNet), amount))}
                  className="bg-[#dfff4f] text-black px-5 py-2.5 rounded-xl text-xs font-bold font-mono hover:bg-[#ccee3e] transition-colors acid-border shadow-[0_0_15px_rgba(223,255,79,0.2)]"
                >
                  PAY NOW
                </button>
              </div>
            );
         } else if (myNet > 1 && amount < -1) {
            return (
               <div key={userId} className="flex items-center justify-between p-4 rounded-2xl bg-[#131316] border border-white/5 opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full ${userObj.color} flex items-center justify-center text-black font-bold text-sm opacity-80`}>
                    {userObj.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">{userObj.name} owes you</p>
                  </div>
                </div>
                <button className="text-[#ff4f99] text-[10px] font-bold font-mono px-3 py-1.5 rounded border border-[#ff4f99]/30 hover:bg-[#ff4f99]/10 transition-colors uppercase tracking-wider">
                  Nudge
                </button>
              </div>
            )
         }
         return null;
       })}
       {Math.abs(balances[currentUser.id] || 0) < 1 && (
         <div className="text-center py-12 opacity-30 flex flex-col items-center">
            <Smartphone size={48} className="mb-4 text-gray-500" />
            <p className="text-sm font-mono">No active debts.</p>
         </div>
       )}
    </div>
  )
}

// 8. Expense Item (Unchanged)
const ExpenseItem = ({ expense, currentUser, activeUsers, onDelete }) => {
  const isPayer = expense.payerId === currentUser.id;
  const isTransfer = expense.type === 'transfer';
  const myShare = expense.splits[currentUser.id] || 0;
  const payer = activeUsers.find(u => u.id === expense.payerId) || { name: 'Unknown' };

  return (
    <div className="group relative pl-6 pb-8 border-l border-white/10 last:border-0 last:pb-0">
      <div className={`absolute -left-[5px] top-0 w-[9px] h-[9px] rounded-full border-2 border-[#0a0a0c] ${isPayer ? 'bg-[#dfff4f]' : isTransfer ? 'bg-[#ff4f99]' : 'bg-[#1c1c21]'}`} />
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-2">
             <h4 className={`font-bold text-base ${isTransfer ? 'text-[#ff4f99]' : 'text-white'}`}>{expense.title}</h4>
             {isTransfer && <span className="text-[9px] bg-[#ff4f99]/20 text-[#ff4f99] px-1.5 rounded border border-[#ff4f99]/30">TRANSFER</span>}
          </div>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
             {isPayer ? 'You paid ' : `${payer.name} paid `} 
             <span className="text-white font-bold">{parseFloat(expense.amount).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</span>
          </p>
        </div>
        <div className="text-right">
           {isPayer && (
             <button onClick={() => onDelete(expense.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-500 hover:bg-white/5 rounded-full">
                <Trash2 size={14} />
             </button>
           )}
        </div>
      </div>
      {!isPayer && myShare > 0 && !isTransfer && (
        <div className="inline-block px-2 py-1 rounded bg-[#ff4f99]/10 border border-[#ff4f99]/20">
          <p className="text-[10px] text-[#ff4f99] font-mono font-bold">
            YOU OWE {myShare.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
          </p>
        </div>
      )}
      {isTransfer && !isPayer && myShare > 0 && (
          <div className="inline-block px-2 py-1 rounded bg-[#dfff4f]/10 border border-[#dfff4f]/20">
            <p className="text-[10px] text-[#dfff4f] font-mono font-bold">
               RECEIVED {myShare.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
            </p>
          </div>
      )}
      {isPayer && !isTransfer && (
         <div className="flex -space-x-2 mt-2 pl-1">
            {Object.keys(expense.splits).map(uid => {
               const u = activeUsers.find(usr => usr.id === uid);
               if (!u) return null;
               return (
                  <div key={uid} className={`w-5 h-5 rounded-full border border-[#0a0a0c] ${u.color} flex items-center justify-center text-[8px] text-black font-bold`} title={u.name}>
                     {u.avatar}
                  </div>
               )
            })}
         </div>
      )}
    </div>
  );
};

// 9. Add Expense Modal (Modified for Name Color & Focus)
const AddExpenseModal = ({ isOpen, onClose, currentUser, activeUsers, onAdd, initialMode = 'expense' }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('equal'); 
  const [splits, setSplits] = useState({}); 
  const [transactionType, setTransactionType] = useState('expense');
  const [transferReceiver, setTransferReceiver] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setAmount('');
      setMode('equal');
      setTransactionType(initialMode);
      const others = activeUsers.filter(u => u.id !== currentUser.id);
      setTransferReceiver(others[0]?.id || null);
      const initialSplits = {};
      activeUsers.forEach(u => initialSplits[u.id] = 0);
      setSplits(initialSplits);
    }
  }, [isOpen, initialMode, currentUser, activeUsers]);

  const handleItemizedChange = (uid, val) => {
    const valFloat = parseFloat(val) || 0;
    const newSplits = { ...splits, [uid]: valFloat };
    setSplits(newSplits);

    // Auto-update Total Amount Logic
    const newTotal = Object.values(newSplits).reduce((a, b) => a + b, 0);
    const oldSplitTotal = Object.values(splits).reduce((a, b) => a + b, 0);
    
    // Update main amount if it was zero or matched previous sum
    if (!amount || parseFloat(amount) === 0 || Math.abs(parseFloat(amount) - oldSplitTotal) < 0.01) {
       setAmount(newTotal > 0 ? newTotal.toString() : '');
    }
  };

  const totalItemized = Object.values(splits).reduce((a, b) => a + b, 0);
  const remainder = (parseFloat(amount) || 0) - totalItemized;
  
  const handleSubmit = () => {
    let finalSplits = {};
    const totalAmt = parseFloat(amount);
    
    if (transactionType === 'transfer') {
      if (!transferReceiver) return;
      finalSplits[transferReceiver] = totalAmt;
    } else {
      if (mode === 'equal') {
        const splitAmount = totalAmt / activeUsers.length;
        activeUsers.forEach(u => finalSplits[u.id] = splitAmount);
      } else {
        const remainderPerPerson = remainder > 0 ? remainder / activeUsers.length : 0;
        activeUsers.forEach(u => {
          finalSplits[u.id] = (splits[u.id] || 0) + remainderPerPerson;
        });
      }
    }

    onAdd({
      title: transactionType === 'transfer' ? 'Cash Transfer' : title,
      amount: totalAmt,
      payerId: currentUser.id,
      mode: transactionType === 'transfer' ? 'transfer' : mode,
      type: transactionType,
      splits: finalSplits,
      createdAt: serverTimestamp()
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#131316] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1c1c21]">
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
             {transactionType === 'transfer' ? <><ArrowLeftRight className="text-[#ff4f99]" /> Record Transfer</> : 'Add Expense'}
          </h2>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto no-scrollbar space-y-8 flex-1">
           <div className="space-y-6">
              {transactionType === 'expense' && (
                <div>
                  <label className="text-[10px] uppercase text-gray-500 font-mono mb-2 block tracking-wider">Description</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g., Jollibee, Gas"
                    className="w-full bg-transparent border-b border-white/10 py-2 text-xl font-bold text-white focus:outline-none focus:border-[#dfff4f] placeholder-white/10 transition-colors"
                  />
                </div>
              )}
              {transactionType === 'transfer' && (
                 <div>
                    <label className="text-[10px] uppercase text-gray-500 font-mono mb-2 block tracking-wider">Receiver</label>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                       {activeUsers.filter(u => u.id !== currentUser.id).map(u => (
                          <button 
                             key={u.id}
                             onClick={() => setTransferReceiver(u.id)}
                             className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${transferReceiver === u.id ? 'bg-[#ff4f99] text-white border-[#ff4f99]' : 'bg-transparent border-white/20 text-gray-400'}`}
                          >
                             <div className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[8px]">{u.avatar}</div>
                             <span className="text-xs font-bold">{u.name}</span>
                          </button>
                       ))}
                    </div>
                 </div>
              )}
              <div>
                <label className="text-[10px] uppercase text-gray-500 font-mono mb-2 block tracking-wider">
                   {mode === 'itemized' ? 'Total Amount (Auto-Calculated)' : 'Amount'}
                </label>
                <div className="relative group">
                   <span className={`absolute left-0 top-2 text-2xl font-mono transition-colors ${amount ? (transactionType === 'transfer' ? 'text-[#ff4f99]' : 'text-[#dfff4f]') : 'text-gray-600'}`}>₱</span>
                   <input 
                    type="number" 
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    // Dim the input in itemized mode
                    className={`w-full bg-transparent border-b border-white/10 py-2 pl-8 text-4xl font-mono font-bold focus:outline-none placeholder-white/5 transition-colors ${
                       transactionType === 'transfer' ? 'text-[#ff4f99] focus:border-[#ff4f99]' : 
                       mode === 'itemized' ? 'text-white/30 focus:border-[#dfff4f] focus:text-white' : 'text-[#dfff4f] focus:border-[#dfff4f]'
                    }`}
                  />
                </div>
              </div>
           </div>
           {transactionType === 'expense' && (
             <div className="space-y-4">
               <div className="bg-[#0a0a0c] p-1.5 rounded-xl flex gap-1 border border-white/5">
                  <button 
                    onClick={() => setMode('equal')}
                    className={`flex-1 py-3 rounded-lg text-[10px] font-bold font-mono transition-all uppercase tracking-wide ${mode === 'equal' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
                  >
                    Split Equally
                  </button>
                  <button 
                     onClick={() => setMode('itemized')}
                     className={`flex-1 py-3 rounded-lg text-[10px] font-bold font-mono transition-all uppercase tracking-wide ${mode === 'itemized' ? 'bg-[#dfff4f] text-black shadow-sm' : 'text-gray-500 hover:text-white'}`}
                  >
                    Hybrid Split
                  </button>
               </div>
               {mode === 'itemized' && (
                 <div className="space-y-3 animate-slide-up bg-[#0a0a0c] p-4 rounded-xl border border-white/10 shadow-inner">
                    <p className="text-[10px] text-[#dfff4f] mb-2 font-mono uppercase font-bold tracking-wider">Assign Individual Costs</p>
                    {activeUsers.map(u => {
                      const isActive = (splits[u.id] || 0) > 0;
                      return (
                        <div key={u.id} className="flex items-center gap-3 py-1">
                          <div className={`w-8 h-8 rounded-full ${u.color} flex items-center justify-center text-xs font-bold text-black shadow-sm transition-all ${isActive ? 'ring-2 ring-[#dfff4f] scale-110' : 'opacity-70'}`}>
                            {u.avatar}
                          </div>
                          {/* UPDATED: Name Color is now explicitly text-white or text-[#dfff4f] if active */}
                          <span className={`flex-1 text-sm font-medium transition-colors ${isActive ? 'text-[#dfff4f]' : 'text-white'}`}>
                             {u.name}
                          </span>
                          <input 
                            type="number"
                            placeholder="0"
                            value={splits[u.id] === 0 ? '' : splits[u.id]}
                            onChange={(e) => handleItemizedChange(u.id, e.target.value)}
                            className={`w-28 bg-[#1c1c21] border rounded-lg px-3 py-2 text-right font-mono text-lg text-white focus:outline-none transition-all placeholder-white/10 ${isActive ? 'border-[#dfff4f] bg-[#dfff4f]/10' : 'border-white/20 focus:border-[#dfff4f]'}`}
                          />
                        </div>
                      )
                    })}
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Shared Remainder</span>
                      <span className={`font-mono font-bold ${remainder < 0 ? 'text-red-500' : 'text-white'}`}>
                        {remainder.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                      </span>
                    </div>
                 </div>
               )}
             </div>
           )}
        </div>
        <div className="p-6 border-t border-white/5 bg-[#1c1c21]">
          <button 
            onClick={handleSubmit}
            disabled={(!title && transactionType === 'expense') || !amount}
            className={`w-full text-black font-bold font-mono py-4 rounded-xl text-lg transition-all flex items-center justify-center gap-2 acid-border shadow-lg ${transactionType === 'transfer' ? 'bg-[#ff4f99] hover:bg-[#ff7eb6]' : 'bg-[#dfff4f] hover:bg-[#ccee3e]' } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {transactionType === 'transfer' ? 'RECORD TRANSFER' : 'CONFIRM EXPENSE'} <ArrowRight size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

// 10. Payment/QR Modal (Unchanged)
const PaymentModal = ({ isOpen, onClose, payeeId, amount, currentUser, activeUsers, onSubmitPayment }) => {
  const [status, setStatus] = useState('scan');
  const payee = activeUsers.find(u => u.id === payeeId);

  useEffect(() => {
     if(isOpen) setStatus('scan');
  }, [isOpen]);

  if (!isOpen || !payee) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity" onClick={onClose} />
       <div className="relative w-full max-w-xs bg-[#131316] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
         {status === 'scan' && (
           <div className="p-8 flex flex-col items-center text-center">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#dfff4f] to-[#ff4f99]" />
             <div className={`w-16 h-16 rounded-full ${payee.color} flex items-center justify-center text-2xl font-bold text-black mb-4 shadow-xl border-4 border-[#131316] relative z-10`}>
               {payee.avatar}
             </div>
             <h3 className="font-display text-2xl font-bold text-white mb-1">Pay {payee.name}</h3>
             <p className="font-mono text-[#dfff4f] text-3xl font-bold mb-6 tracking-tight">
                {amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
             </p>
             <div className="bg-white p-4 rounded-2xl mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] transform transition-transform hover:scale-105 duration-300">
               <img src={payee.qr} alt="QR Code" className="w-48 h-48 mix-blend-multiply" />
             </div>
             <p className="text-[10px] text-gray-500 mb-6 max-w-[200px] uppercase tracking-wider">
               Scan with GCash • Upload Proof
             </p>
             <button 
               onClick={() => setStatus('upload')}
               className="w-full bg-[#3b82f6] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
             >
               <Camera size={18} /> I Have Paid
             </button>
           </div>
         )}
         {status === 'upload' && (
            <div className="p-8 flex flex-col items-center text-center h-[520px] justify-center relative">
              <button onClick={() => setStatus('scan')} className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors">
                  <ArrowRight className="rotate-180" size={20} />
              </button>
              <div className="w-full h-56 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center mb-6 hover:border-[#dfff4f] hover:bg-white/5 transition-all cursor-pointer group">
                 <div className="w-16 h-16 rounded-full bg-[#1c1c21] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Receipt className="text-gray-500 group-hover:text-[#dfff4f]" size={28} />
                 </div>
                 <span className="text-sm text-gray-500 font-mono">Tap to upload receipt</span>
              </div>
              <button 
               onClick={() => {
                 setStatus('verifying');
                 onSubmitPayment(payeeId, amount);
                 setTimeout(onClose, 2500); 
               }}
               className="w-full bg-[#dfff4f] text-black font-bold py-4 rounded-xl acid-border shadow-[0_0_20px_rgba(223,255,79,0.2)]"
             >
               SUBMIT PROOF
             </button>
            </div>
         )}
         {status === 'verifying' && (
           <div className="p-8 flex flex-col items-center text-center h-[520px] justify-center bg-[#dfff4f] relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
             <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mb-6 animate-bounce shadow-2xl relative z-10">
                <Check size={40} className="text-[#dfff4f]" strokeWidth={4} />
             </div>
             <h3 className="font-display text-3xl font-bold text-black relative z-10">Sent!</h3>
             <p className="text-black/70 mt-2 font-mono text-sm max-w-[200px] leading-tight relative z-10">
               Wait for {payee.name} to confirm receipt.
             </p>
           </div>
         )}
       </div>
    </div>
  );
};

// 11. Members List Modal (Unchanged)
const MembersModal = ({ isOpen, onClose, activeUsers, balances }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#131316] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[70vh]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1c1c21]">
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
             <Users className="text-[#dfff4f]" /> Group Members
          </h2>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto no-scrollbar space-y-4">
           {activeUsers.map(user => {
             const bal = balances[user.id] || 0;
             const isPositive = bal > 0;
             const isNegative = bal < 0;
             return (
               <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0a0a0c] border border-white/5">
                  <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-full ${user.color} flex items-center justify-center text-black font-bold`}>
                        {user.avatar}
                     </div>
                     <span className="font-bold text-white">{user.name}</span>
                  </div>
                  <div className={`text-right ${isPositive ? 'text-[#dfff4f]' : isNegative ? 'text-[#ff4f99]' : 'text-gray-500'}`}>
                     <span className="text-xs font-mono block uppercase opacity-70">
                        {isPositive ? 'Is Owed' : isNegative ? 'Owes' : 'Settled'}
                     </span>
                     <span className="font-mono font-bold">
                        {Math.abs(bal).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                     </span>
                  </div>
               </div>
             )
           })}
        </div>
      </div>
    </div>
  )
}

// 12. My QR Modal (Unchanged)
const MyQrModal = ({ isOpen, onClose, currentUser }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#dfff4f] rounded-[2rem] overflow-hidden shadow-2xl animate-slide-up p-8 text-center text-black">
         <div className="absolute top-4 right-4">
            <button onClick={onClose} className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors">
               <X size={20} />
            </button>
         </div>
         
         <div className="w-20 h-20 bg-black rounded-full mx-auto flex items-center justify-center mb-4 shadow-xl text-[#dfff4f] font-bold text-3xl border-4 border-white/20">
            {currentUser.avatar}
         </div>
         
         <h2 className="font-display text-2xl font-bold mb-1">@{currentUser.name}</h2>
         <p className="font-mono text-sm opacity-70 mb-8 uppercase tracking-widest">Scan to Pay Me</p>
         
         <div className="bg-white p-4 rounded-2xl shadow-xl rotate-1 hover:rotate-0 transition-transform duration-300">
            <img src={currentUser.qr} className="w-full mix-blend-multiply" alt="QR" />
         </div>
         
         <div className="mt-8 flex justify-center gap-4">
            <div className="flex items-center gap-2 opacity-60">
               <Smartphone size={16} /> <span>GCash</span>
            </div>
            <div className="flex items-center gap-2 opacity-60">
               <div className="w-4 h-4 rounded-full bg-black"></div> <span>Maya</span>
            </div>
         </div>
      </div>
    </div>
  )
}

// --- MAIN APP COMPONENT ---
export default function PayUpApp() {
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(ALL_USERS[0]); 
  
  // Group State
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);

  // Data State
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [balances, setBalances] = useState({});
  
  // UI State
  const [activeTab, setActiveTab] = useState('wallet'); 
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalMode, setAddModalMode] = useState('expense');
  const [payModal, setPayModal] = useState({ open: false, payeeId: null, amount: 0 });
  const [isProfileOpen, setIsProfileOpen] = useState(false); 
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  
  // NEW STATES
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isMyQrModalOpen, setIsMyQrModalOpen] = useState(false);

  // 1. Auth & Initial Load
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Fetch Groups
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'groups'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(data);
      if (data.length > 0 && !currentGroup) {
         setCurrentGroup(data[0]);
      } else if (data.length === 0) {
         addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'groups'), {
            name: 'Baguio Trip 2025',
            members: ALL_USERS.map(u => u.id),
            createdAt: serverTimestamp()
         });
      }
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Fetch Data for Current Group (Expenses + Payments)
  useEffect(() => {
    if (!user || !currentGroup) return;
    
    // Subscribe to Expenses
    const expensesCollection = `expenses_${currentGroup.id}`;
    const qExp = query(
      collection(db, 'artifacts', appId, 'public', 'data', expensesCollection),
      orderBy('createdAt', 'desc')
    );
    const unsubExp = onSnapshot(qExp, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Subscribe to Payments (Notifications)
    const paymentsCollection = `payments_${currentGroup.id}`;
    const qPay = query(
       collection(db, 'artifacts', appId, 'public', 'data', paymentsCollection),
       orderBy('createdAt', 'desc')
    );
    const unsubPay = onSnapshot(qPay, (snapshot) => {
       setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubExp(); unsubPay(); };
  }, [user, currentGroup]);

  // Recalculate balances
  useEffect(() => {
     if(currentGroup) calculateBalances(expenses);
  }, [expenses, currentGroup]);

  // 4. Group Logic
  const handleCreateGroup = async (name, memberIds) => {
     if (!user) return;
     try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'groups'), {
           name: name,
           members: memberIds,
           createdAt: serverTimestamp()
        });
        setIsCreateGroupOpen(false);
     } catch (e) {
        console.error("Create group failed", e);
     }
  }

  const activeUsers = useMemo(() => {
     if (!currentGroup || !currentGroup.members) return ALL_USERS;
     return ALL_USERS.filter(u => currentGroup.members.includes(u.id));
  }, [currentGroup]);

  // 5. Calculation Logic
  const calculateBalances = (expenseList) => {
    const newBalances = {};
    if (!currentGroup) return;

    currentGroup.members.forEach(uid => newBalances[uid] = 0);

    expenseList.forEach(exp => {
      if (newBalances[exp.payerId] !== undefined) {
         newBalances[exp.payerId] += parseFloat(exp.amount);
      }
      Object.entries(exp.splits).forEach(([uid, share]) => {
        if (newBalances[uid] !== undefined) {
          newBalances[uid] -= parseFloat(share);
        }
      });
    });

    setBalances(newBalances);
  };

  // 6. Handlers
  const handleAddExpense = async (expenseData) => {
    if (!user || !currentGroup) return;
    const collectionName = `expenses_${currentGroup.id}`;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', collectionName), expenseData);
    } catch (e) { console.error(e); }
  };

  const handleDeleteExpense = async (id) => {
    if (!user || !currentGroup) return;
    if (confirm("Delete this? Balances will be recalculated.")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', `expenses_${currentGroup.id}`, id));
      } catch (e) { console.error(e); }
    }
  }

  const handlePaymentSubmit = async (payeeId, amount) => {
     if (!user || !currentGroup) return;
     const collectionName = `payments_${currentGroup.id}`;
     try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', collectionName), {
           senderId: currentUser.id,
           receiverId: payeeId,
           amount: amount,
           status: 'pending', // pending, approved, rejected
           createdAt: serverTimestamp()
        });
     } catch(e) { console.error(e); }
  };

  const handleReviewPayment = async (paymentId, status, paymentData) => {
     if (!user || !currentGroup) return;
     const collectionName = `payments_${currentGroup.id}`;
     try {
        // 1. Update Payment Status
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, paymentId), {
           status: status
        });

        // 2. If Approved, Automatically create a Transfer Expense to update balances
        if (status === 'approved') {
           const splits = {};
           splits[paymentData.receiverId] = parseFloat(paymentData.amount);
           
           await addDoc(collection(db, 'artifacts', appId, 'public', 'data', `expenses_${currentGroup.id}`), {
              title: 'Settlement Verified',
              amount: parseFloat(paymentData.amount),
              payerId: paymentData.senderId, // Sender paid money
              mode: 'transfer',
              type: 'transfer',
              splits: splits,
              createdAt: serverTimestamp()
           });
        }
     } catch(e) { console.error(e); }
  }
  
  const handleUpdateProfile = (updatedUser) => {
     setCurrentUser(updatedUser);
  }

  const openAddModal = (mode) => {
     setAddModalMode(mode);
     setIsAddModalOpen(true);
  }

  const pendingCount = payments.filter(p => p.receiverId === currentUser.id && p.status === 'pending').length;

  return (
    <>
      <Fonts />
      <AppShell 
         currentUser={currentUser} 
         onSwitchUser={setCurrentUser}
         onMenuClick={() => setIsMenuOpen(true)}
         currentGroup={currentGroup}
         activeTab={activeTab}
         onTabChange={setActiveTab}
         notificationCount={pendingCount}
         onCentralAdd={() => openAddModal('expense')}
         onOpenMembers={() => setIsMembersModalOpen(true)}
         onOpenMyQr={() => setIsMyQrModalOpen(true)}
      >
        
        {activeTab === 'wallet' && (
          <>
            <section className="mt-4">
               <BalanceCard balances={balances} currentUser={currentUser} />
            </section>

            <SettlementList 
               balances={balances} 
               currentUser={currentUser} 
               activeUsers={activeUsers}
               onPayClick={(uid, amt) => setPayModal({ open: true, payeeId: uid, amount: amt })} 
            />

            <section>
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-[10px] font-mono uppercase text-gray-500 tracking-widest">
                   {currentGroup?.name} Feed
                </h3>
                <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-400 font-mono">
                   {expenses.length}
                </span>
              </div>
              
              <div className="space-y-4 border-l border-white/5 ml-2 pl-2">
                 {expenses.map(exp => (
                   <ExpenseItem 
                     key={exp.id} 
                     expense={exp} 
                     currentUser={currentUser}
                     activeUsers={activeUsers}
                     onDelete={handleDeleteExpense}
                   />
                 ))}
                 
                 {expenses.length === 0 && (
                   <div className="py-12 px-6 rounded-2xl border border-dashed border-white/10 text-center text-gray-600 italic text-sm font-mono">
                     No expenses yet.<br/>Tap the + button to add one!
                   </div>
                 )}
              </div>
            </section>
          </>
        )}

        {activeTab === 'notifications' && (
           <NotificationView 
              payments={payments}
              currentUser={currentUser}
              activeUsers={activeUsers}
              onReviewPayment={handleReviewPayment}
           />
        )}

      </AppShell>

      {/* Modals & Overlays */}
      <SideMenu 
         isOpen={isMenuOpen}
         onClose={() => setIsMenuOpen(false)}
         groups={groups}
         currentGroupId={currentGroup?.id}
         onSelectGroup={setCurrentGroup}
         onCreateGroup={() => setIsCreateGroupOpen(true)}
         onOpenProfile={() => setIsProfileOpen(true)}
      />

      <CreateGroupModal 
         isOpen={isCreateGroupOpen}
         onClose={() => setIsCreateGroupOpen(false)}
         onConfirm={handleCreateGroup}
      />
      
      <ProfileModal 
         isOpen={isProfileOpen}
         onClose={() => setIsProfileOpen(false)}
         currentUser={currentUser}
         onUpdateProfile={handleUpdateProfile}
      />

      <AddExpenseModal 
        isOpen={isAddModalOpen} 
        initialMode={addModalMode}
        onClose={() => setIsAddModalOpen(false)} 
        currentUser={currentUser}
        activeUsers={activeUsers}
        onAdd={handleAddExpense}
      />
      
      <PaymentModal 
        isOpen={payModal.open}
        onClose={() => setPayModal({ ...payModal, open: false })}
        payeeId={payModal.payeeId}
        amount={payModal.amount}
        currentUser={currentUser}
        activeUsers={activeUsers}
        onSubmitPayment={handlePaymentSubmit}
      />

      <MembersModal 
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        activeUsers={activeUsers}
        balances={balances}
      />

      <MyQrModal 
        isOpen={isMyQrModalOpen}
        onClose={() => setIsMyQrModalOpen(false)}
        currentUser={currentUser}
      />
    </>
  );
}