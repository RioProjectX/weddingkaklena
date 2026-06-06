/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { defaultInvitation } from './data';
import { InvitationData } from './types';
import WelcomeCover from './components/WelcomeCover';
import InvitationMain from './components/InvitationMain';
import MusicPlayer from './components/MusicPlayer';
import AdminPanel from './components/AdminPanel';
import { Heart, RefreshCw } from 'lucide-react';

export default function App() {
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpened, setIsOpened] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [guestName, setGuestName] = useState('Tamu Undangan');

  // Load guest name from URL parameters (e.g. ?to=Nama+Tamu)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toParam = params.get('to');
    if (toParam) {
      setGuestName(toParam);
    }
  }, []);

  // Validate Firestore connection and synchronize real-time updates of the digital invitation
  useEffect(() => {
    const docId = 'justin_magdalena';
    const docRef = doc(db, 'invitations', docId);

    const checkAndSubscribe = async () => {
      try {
        // Test connection as mandated by skill guidelines
        try {
          await getDocFromServer(doc(db, 'test', 'connection'));
        } catch (connectionErr) {
          console.warn("Connection test bypass or offline mode:", connectionErr);
        }

        // Retrieve invitation document metadata
        const initialSnap = await getDoc(docRef);
        
        // Seed default template data if missing on initial boot
        if (!initialSnap.exists()) {
          await setDoc(docRef, defaultInvitation);
          setInvitationData(defaultInvitation);
        } else {
          setInvitationData({ id: initialSnap.id, ...initialSnap.data() } as InvitationData);
        }

        // Live subscribe to any administrative database updates
        const unsubscribe = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            setInvitationData({ id: snapshot.id, ...snapshot.data() } as InvitationData);
          }
          setLoading(false);
        }, (snapErr) => {
          handleFirestoreError(snapErr, OperationType.GET, `invitations/${docId}`);
        });

        return unsubscribe;
      } catch (err) {
        console.error("Critical error during loading:", err);
        setInvitationData(defaultInvitation); // fallback to offline design
        setLoading(false);
      }
    };

    let unsub: (() => void) | undefined;
    checkAndSubscribe().then((unsubFn) => {
      if (unsubFn) unsub = unsubFn;
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  if (loading || !invitationData) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="relative flex items-center justify-center">
          <Heart className="w-12 h-12 text-pink-500 fill-pink-500/10 animate-[pulse_1.5s_infinite]" />
          <Heart className="w-6 h-6 text-pink-400 absolute fill-pink-400/20 animate-ping" />
        </div>
        <h3 className="font-serif text-lg tracking-widest text-stone-850 mt-6 uppercase">Undangan Digital</h3>
        <p className="text-stone-400 text-xs mt-1 italic">Mempersiapkan rincian janji suci...</p>
        <div className="flex items-center gap-1.5 text-[10px] text-pink-500/70 font-semibold mt-10">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Mengubungi Cloud Firestore</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen font-sans bg-stone-50">
      {/* 1. Show opening cover page initially */}
      {!isOpened ? (
        <WelcomeCover
          groomNick={invitationData.groomNick}
          brideNick={invitationData.brideNick}
          coverPhoto={invitationData.coverPhoto}
          coverBackgroundPhoto={invitationData.coverBackgroundPhoto}
          guestName={guestName}
          onOpen={() => {
            setIsOpened(true);
            setIsPlaying(true);
          }}
        />
      ) : (
        /* 2. Main digital wedding invitation content */
        <>
          <InvitationMain
            data={invitationData}
            onOpenAdmin={() => setIsAdminOpen(true)}
            guestName={guestName}
            isPlaying={isPlaying}
            onToggleMusic={() => setIsPlaying(!isPlaying)}
          />
          
          <MusicPlayer
            url={invitationData.musicUrl}
            isPlaying={isPlaying}
            onToggle={() => setIsPlaying(!isPlaying)}
            title={invitationData.musicTitle}
          />
        </>
      )}

      {/* 3. Sliding / Modal Admin Panel Dashboard Overlay */}
      {isAdminOpen && (
        <AdminPanel
          data={invitationData}
          onUpdateData={(updated) => setInvitationData(updated)}
          onClose={() => setIsAdminOpen(false)}
        />
      )}
    </div>
  );
}
