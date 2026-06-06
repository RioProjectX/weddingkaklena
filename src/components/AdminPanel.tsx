/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Lock, Save, Trash2, Edit, Upload, Play, Check, AlertTriangle,
  LogOut, Plus, LogIn, ChevronRight, Sparkles, Heart, RefreshCw, Calendar
} from 'lucide-react';
import { InvitationData, GuestWish, StoryEvent } from '../types';
import { defaultStories } from '../data';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

interface AdminPanelProps {
  data: InvitationData;
  onUpdateData: (newData: InvitationData) => void;
  onClose: () => void;
}

export default function AdminPanel({ data, onUpdateData, onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'pengantin' | 'acara' | 'cerita' | 'galeri' | 'kado' | 'media' | 'rsvp' | 'alkitab'>('pengantin');
  const [isJoinedAdmin, setIsJoinedAdmin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [wishes, setWishes] = useState<GuestWish[]>([]);
  const [loadingWishes, setLoadingWishes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Audio uploading states
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioUploadError, setAudioUploadError] = useState('');
  const [audioUploadSuccess, setAudioUploadSuccess] = useState('');

  // Form states matching InvitationData
  const [form, setForm] = useState<InvitationData>({ ...data });
  const [stories, setStories] = useState<StoryEvent[]>([]);

  // Gallery states
  const [gallery, setGallery] = useState<string[]>([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [galleryUploadError, setGalleryUploadError] = useState('');
  const [customImageUrlInput, setCustomImageUrlInput] = useState('');

  // Story event editing items
  const [tempStoryYear, setTempStoryYear] = useState('');
  const [tempStoryTitle, setTempStoryTitle] = useState('');
  const [tempStoryDesc, setTempStoryDesc] = useState('');

  // Handle upload of MP3 files
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reject files larger than 15MB to keep it safe
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setAudioUploadError('Ukuran berkas audio maksimal adalah 15MB.');
      setAudioUploadSuccess('');
      return;
    }

    setIsUploadingAudio(true);
    setAudioUploadError('');
    setAudioUploadSuccess('');

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        setForm(prev => ({
          ...prev,
          musicUrl: result.url,
          musicTitle: result.title
        }));
        setAudioUploadSuccess(`Berhasil mengunggah: ${file.name}`);
      } else {
        setAudioUploadError(result.message || 'Gagal mengunggah berkas audio.');
      }
    } catch (err: any) {
      console.error(err);
      setAudioUploadError('Terjadi kesalahan jaringan saat mengunggah.');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // Handle load of stories from data
  useEffect(() => {
    try {
      const parsed = JSON.parse(data.storiesJson || '[]');
      setStories(parsed);
    } catch (e) {
      setStories([...defaultStories]);
    }
  }, [data.storiesJson]);

  // Handle load of gallery photos
  useEffect(() => {
    try {
      if (data.galleryJson) {
        const parsed = JSON.parse(data.galleryJson);
        if (Array.isArray(parsed)) {
          setGallery(parsed);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to parse galleryJson in Admin:", e);
    }
    setGallery([]);
  }, [data.galleryJson]);

  // Synchronize story edits with the master form state
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      storiesJson: JSON.stringify(stories)
    }));
  }, [stories]);

  // Synchronize gallery edits with the master form state
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      galleryJson: JSON.stringify(gallery)
    }));
  }, [gallery]);

  // Load guestbook wishes if authenticated to manage
  useEffect(() => {
    if (isJoinedAdmin) {
      loadWishes();
    }
  }, [isJoinedAdmin]);

  const loadWishes = async () => {
    setLoadingWishes(true);
    try {
      const wishesCol = collection(db, 'wishes');
      const snap = await getDocs(wishesCol);
      const list: GuestWish[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as GuestWish);
      });
      // Sort wishes by timestamp if available
      list.sort((a,b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setWishes(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWishes(false);
    }
  };

  // Image compressor utility to store inline Base64 safely under 100KB
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'groomPhoto' | 'bridePhoto' | 'coverPhoto' | 'coverBackgroundPhoto' | 'mainBackgroundPhoto') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const base64Url = canvas.toDataURL('image/jpeg', 0.6); // Compress output to ~60% JPEG
        setForm(prev => ({ ...prev, [fieldName]: base64Url }));
        setErrorMsg('');
      };
      img.onerror = () => {
        setErrorMsg('Gagal memproses file foto pengantin.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle upload of gallery images
  const handleGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingGallery(true);
    setGalleryUploadError('');

    try {
      const file = files[0];
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_SIZE) {
        setGalleryUploadError('Ukuran berkas gambar maksimal adalah 10MB.');
        return;
      }

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        setGallery(prev => [...prev, result.url]);
      } else {
        setGalleryUploadError(result.message || 'Gagal mengunggah berkas gambar.');
      }
    } catch (err) {
      console.error(err);
      setGalleryUploadError('Terjadi kesalahan jaringan saat mengunggah.');
    } finally {
      setIsUploadingGallery(false);
      e.target.value = '';
    }
  };

  const handleDeleteGalleryImage = (indexToDelete: number) => {
    setGallery(prev => prev.filter((_, idx) => idx !== indexToDelete));
  };

  const moveGalleryImage = (index: number, direction: 'up' | 'down') => {
    setGallery(prev => {
      const next = [...prev];
      if (direction === 'up' && index > 0) {
        const temp = next[index];
        next[index] = next[index - 1];
        next[index - 1] = temp;
      } else if (direction === 'down' && index < next.length - 1) {
        const temp = next[index];
        next[index] = next[index + 1];
        next[index + 1] = temp;
      }
      return next;
    });
  };

  // Login handler
  const handlePasswordLogin = () => {
    setErrorMsg('');
    if (passwordInput === form.adminPassword || passwordInput === 'admin123') {
      setIsJoinedAdmin(true);
      setSuccessMsg('Akses editor admin dibuka!');
    } else {
      setErrorMsg('Kata sandi admin tidak sah.');
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user && user.email === 'sandrionainggolan43@gmail.com') {
        setIsJoinedAdmin(true);
        setSuccessMsg(`Selamat datang Admin: ${user.email}`);
      } else {
        await signOut(auth);
        setErrorMsg('Hanya email admin sandrionainggolan43@gmail.com yang dizinkan.');
      }
    } catch (e) {
      setErrorMsg('Login Google gagal diarahkan atau dibatalkan.');
    }
  };

  // Submit edits to Firestore
  const handleSaveData = async () => {
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const docRef = doc(db, 'invitations', data.id);
      form.updatedAt = new Date().toISOString();
      await updateDoc(docRef, { ...form });
      onUpdateData(form);
      setSuccessMsg('Semua perubahan undangan digital berhasil disimpan ke Cloud Database!');
    } catch (err) {
      setErrorMsg('Gagal menyimpan ke database. Periksa koneksi Anda.');
      try {
        handleFirestoreError(err, OperationType.UPDATE, `invitations/${data.id}`);
      } catch (e) {
        console.error(e);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Wishes management
  const handleDeleteWish = async (wishId: string) => {
    if (!window.confirm("Hapus ucapan sakral dari tamu ini?")) return;
    try {
      await deleteDoc(doc(db, 'wishes', wishId));
      setWishes(prev => prev.filter(w => w.id !== wishId));
      setSuccessMsg('Ucapan berhasil dihapus.');
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal menghapus ucapan dari database.');
    }
  };

  // Stories events addition
  const addStoryEvent = () => {
    if (!tempStoryYear || !tempStoryTitle || !tempStoryDesc) {
      alert("Harap lengkapi tahun, judul, dan isi cerita.");
      return;
    }
    const newEvent: StoryEvent = {
      id: String(Date.now()),
      year: tempStoryYear,
      title: tempStoryTitle,
      description: tempStoryDesc
    };
    setStories([...stories, newEvent]);
    setTempStoryYear('');
    setTempStoryTitle('');
    setTempStoryDesc('');
  };

  const deleteStoryEvent = (id: string) => {
    setStories(stories.filter(s => s.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl md:w-[94vw] max-h-[94vh] h-[90vh] flex flex-col overflow-hidden text-gray-800"
        id="admin-dashboard-container"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-neutral-800 to-neutral-900 px-6 py-4 flex items-center justify-between border-b border-neutral-700 text-white">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-pink-400" />
            <span className="font-serif text-lg tracking-wider">Akses Kontrol Admin Undangan</span>
          </div>
          <button
            id="btn-admin-close"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Access barrier / login portal */}
        {!isJoinedAdmin ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <Heart className="w-12 h-12 text-pink-500 fill-pink-500/20 mb-3" />
            <h3 className="text-2xl font-serif tracking-wide text-neutral-800">Verifikasi Hak Akses</h3>
            <p className="text-gray-500 text-xs mt-1 mb-6 leading-relaxed">
              Silakan masuk menggunakan kredensial admin untuk mengedit konten undangan digital ini secara permanen.
            </p>

            <button
              id="btn-admin-google-login"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl shadow-md font-semibold text-gray-700 transition-all text-sm mb-4"
            >
              <LogIn className="w-5 h-5 text-red-500" />
              <span>Masuk via Google Admin</span>
            </button>

            <div className="flex items-center gap-3 w-full my-3 text-gray-400 text-xs">
              <span className="h-[1px] bg-gray-200 flex-1"></span>
              <span>atau gunakan kata sandi</span>
              <span className="h-[1px] bg-gray-200 flex-1"></span>
            </div>

            <div className="w-full space-y-3">
              <input
                id="input-admin-password"
                type="password"
                placeholder="Masukkan kata sandi admin (default: admin123)"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:border-neutral-800 focus:bg-white text-sm focus:outline-none transition-all"
              />
              <button
                id="btn-admin-password-login"
                onClick={handlePasswordLogin}
                className="w-full py-3 bg-neutral-800 hover:bg-neutral-900 text-white font-semibold rounded-xl text-sm transition-all"
              >
                Masuk Akses Teks & Foto
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2 text-left" id="admin-login-error">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            
            <p className="mt-6 text-[11px] text-gray-400">
              Admin utama: <b className="text-gray-600">sandrionainggolan43@gmail.com</b>
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar menu */}
            <div className="w-full md:w-56 bg-gray-50 border-r border-gray-200 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible shrink-0">
              {[
                { id: 'pengantin', name: '✏️ Pengantin' },
                { id: 'alkitab', name: '✝️ Ayat & Ucapan' },
                { id: 'acara', name: '📅 Acara & Lokasi' },
                { id: 'cerita', name: '📖 Kisah Cinta' },
                { id: 'galeri', name: '🖼️ Galeri Foto' },
                { id: 'kado', name: '💳 Kado Digital' },
                { id: 'media', name: '🎵 Musik & Cover' },
                { id: 'rsvp', name: '💬 Guestbook & RSVP' },
              ].map((tab) => (
                <button
                  id={`tab-button-${tab.id}`}
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`flex-1 md:flex-initial text-left px-5 py-3.5 border-b md:border-b-0 md:border-l-4 text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-pink-50 border-pink-500 text-pink-600'
                      : 'border-transparent text-gray-650 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
              <div className="hidden md:block flex-1"></div>
              <button
                id="btn-admin-logout"
                onClick={() => {
                  setIsJoinedAdmin(false);
                  signOut(auth);
                }}
                className="hidden md:flex items-center gap-2 p-4 text-xs font-semibold text-red-500 hover:bg-red-50 border-t border-gray-100 transition-all text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>

            {/* Editing workspace content */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Alert boxes */}
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* TABS EDITING CONTENT */}
              {activeTab === 'pengantin' && (
                <div className="space-y-4" id="tab-pengantin-form">
                  <h4 className="text-sm font-bold text-gray-800 border-b pb-1">Detail Mempelai Pria (Groom)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-650 mb-1">Nama Lengkap Pria</label>
                      <input
                        type="text"
                        value={form.groomName}
                        onChange={(e) => setForm({ ...form, groomName: e.target.value })}
                        className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-650 mb-1">Nama Panggilan</label>
                      <input
                        type="text"
                        value={form.groomNick}
                        onChange={(e) => setForm({ ...form, groomNick: e.target.value })}
                        className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-650 mb-1">Silsilah Orang Tua Pria</label>
                    <input
                      type="text"
                      value={form.groomParents}
                      onChange={(e) => setForm({ ...form, groomParents: e.target.value })}
                      placeholder="Anak pertama dari Bapak ... & Ibu ..."
                      className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="md:col-span-2">
                       <label className="block text-xs font-semibold text-gray-650 mb-1">Bio Singkat Pria</label>
                      <textarea
                        value={form.groomBio}
                        onChange={(e) => setForm({ ...form, groomBio: e.target.value })}
                        rows={2}
                        className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-650 mb-1">Groom Photo</label>
                      <div className="flex items-center gap-2">
                        {form.groomPhoto && <img src={form.groomPhoto} className="w-10 h-10 object-cover rounded-lg border" />}
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-pink-50 text-[10px] font-bold text-gray-600 transition-all">
                          <Upload className="w-3.5 h-3.5 text-pink-500" />
                          <span>Pilih Foto</span>
                          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'groomPhoto')} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-650 mb-1">URL Instagram Pria</label>
                    <input
                      type="text"
                      value={form.groomInstagram || ''}
                      onChange={(e) => setForm({ ...form, groomInstagram: e.target.value })}
                      placeholder="e.g. https://instagram.com/justinbieber"
                      className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <h4 className="text-sm font-bold text-gray-800 border-b pb-1 mt-8">Detail Mempelai Wanita (Bride)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-650 mb-1">Nama Lengkap Wanita</label>
                      <input
                        type="text"
                        value={form.brideName}
                        onChange={(e) => setForm({ ...form, brideName: e.target.value })}
                        className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-650 mb-1">Nama Panggilan</label>
                      <input
                        type="text"
                        value={form.brideNick}
                        onChange={(e) => setForm({ ...form, brideNick: e.target.value })}
                        className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-650 mb-1">Silsilah Orang Tua Wanita</label>
                    <input
                      type="text"
                      value={form.brideParents}
                      onChange={(e) => setForm({ ...form, brideParents: e.target.value })}
                      placeholder="Anak kedua dari Bapak ... & Ibu ..."
                      className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-650 mb-1">Bio Singkat Wanita</label>
                      <textarea
                        value={form.brideBio}
                        onChange={(e) => setForm({ ...form, brideBio: e.target.value })}
                        rows={2}
                        className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-650 mb-1">Bride Photo</label>
                      <div className="flex items-center gap-2">
                        {form.bridePhoto && <img src={form.bridePhoto} className="w-10 h-10 object-cover rounded-lg border" />}
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-pink-50 text-[10px] font-bold text-gray-600 transition-all">
                          <Upload className="w-3.5 h-3.5 text-pink-500" />
                          <span>Pilih Foto</span>
                          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'bridePhoto')} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-650 mb-1">URL Instagram Wanita</label>
                    <input
                      type="text"
                      value={form.brideInstagram || ''}
                      onChange={(e) => setForm({ ...form, brideInstagram: e.target.value })}
                      placeholder="e.g. https://instagram.com/haileybieber"
                      className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'acara' && (
                <div className="space-y-6" id="tab-acara-form">
                  {/* Holy Matrimony */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-800 border-b pb-1">I. Pemberkatan Pernikahan (Holy Matrimony)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-650 mb-1">Hari & Tanggal</label>
                        <input
                          type="text"
                          value={form.holyMatrimonyDate}
                          onChange={(e) => setForm({ ...form, holyMatrimonyDate: e.target.value })}
                          placeholder="e.g. Sabtu, 18 Juli 2026"
                          className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-650 mb-1">Waktu Pelaksanaan</label>
                        <input
                          type="text"
                          value={form.holyMatrimonyTime}
                          onChange={(e) => setForm({ ...form, holyMatrimonyTime: e.target.value })}
                          placeholder="e.g. 09:00 WIB - 12:00 WIB"
                          className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-650 mb-1">Nama Tempat/Gereja</label>
                      <input
                        type="text"
                        value={form.holyMatrimonyVenue}
                        onChange={(e) => setForm({ ...form, holyMatrimonyVenue: e.target.value })}
                        className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-650 mb-1">Alamat Lokasi</label>
                      <input
                        type="text"
                        value={form.holyMatrimonyAddress}
                        onChange={(e) => setForm({ ...form, holyMatrimonyAddress: e.target.value })}
                        className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-650 mb-1">Iframe Link Embed Map Google (src="..." dari Share Embed Map)</label>
                      <input
                        type="text"
                        value={form.holyMatrimonyMap}
                        onChange={(e) => setForm({ ...form, holyMatrimonyMap: e.target.value })}
                        placeholder="https://www.google.com/maps/embed?pb=..."
                        className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500 font-mono text-neutral-600"
                      />
                    </div>
                  </div>

                  {/* Reception */}
                  <div className="space-y-3 pt-4">
                    <h4 className="text-sm font-bold text-gray-800 border-b pb-1">II. Resepsi Pernikahan (Reception)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-650 mb-1">Hari & Tanggal</label>
                        <input
                          type="text"
                          value={form.receptionDate}
                          onChange={(e) => setForm({ ...form, receptionDate: e.target.value })}
                          className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-650 mb-1">Waktu Resepsi</label>
                        <input
                          type="text"
                          value={form.receptionTime}
                          onChange={(e) => setForm({ ...form, receptionTime: e.target.value })}
                          className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-650 mb-1">Nama Gedung/Hotel</label>
                      <input
                        type="text"
                        value={form.receptionVenue}
                        onChange={(e) => setForm({ ...form, receptionVenue: e.target.value })}
                        className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-650 mb-1">Alamat Gedung</label>
                      <input
                        type="text"
                        value={form.receptionAddress}
                        onChange={(e) => setForm({ ...form, receptionAddress: e.target.value })}
                        className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-650 mb-1">Iframe Link Embed Map Google</label>
                      <input
                        type="text"
                        value={form.receptionMap}
                        onChange={(e) => setForm({ ...form, receptionMap: e.target.value })}
                        placeholder="https://www.google.com/maps/embed?pb=..."
                        className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500 font-mono text-neutral-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'cerita' && (
                <div className="space-y-4" id="tab-cerita-form">
                  <h4 className="text-sm font-bold text-gray-800 border-b pb-1">Kisah Cinta Kami (Timeline)</h4>
                  <div className="space-y-3">
                    {stories.map((st, idx) => (
                      <div key={st.id} className="flex gap-3 items-start border p-3.5 rounded-xl bg-gray-50/70" id={`story-editor-${st.id}`}>
                        <div className="shrink-0 bg-pink-100 text-pink-600 px-2 py-0.5 rounded text-xs font-bold font-serif">{st.year}</div>
                        <div className="flex-1">
                          <h5 className="text-xs font-bold text-gray-800">{st.title}</h5>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{st.description}</p>
                        </div>
                        <button
                          id={`btn-story-delete-${st.id}`}
                          onClick={() => deleteStoryEvent(st.id)}
                          className="text-red-500 hover:bg-red-550/10 p-1.5 rounded-lg transition-all"
                          title="Hapus Momen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Story Panel */}
                  <div className="border border-pink-100 bg-pink-50/30 rounded-2xl p-4 mt-6">
                    <span className="flex items-center gap-1.5 font-serif text-pink-700 text-xs font-bold mb-3">
                      <Plus className="w-4 h-4" /> Tambah Momen Kisah Cinta
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-pink-600 mb-1">Tahun</label>
                        <input
                          type="text"
                          value={tempStoryYear}
                          onChange={(e) => setTempStoryYear(e.target.value)}
                          placeholder="e.g. 2024"
                          className="w-full text-xs px-3 py-2 border bg-white rounded-lg focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[10px] uppercase font-bold text-pink-600 mb-1">Judul Momen</label>
                        <input
                          type="text"
                          value={tempStoryTitle}
                          onChange={(e) => setTempStoryTitle(e.target.value)}
                          placeholder="e.g. Hari Pertama Menyapa"
                          className="w-full text-xs px-3 py-2 border bg-white rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-[10px] uppercase font-bold text-pink-600 mb-1">Rincian Cerita</label>
                      <textarea
                        value={tempStoryDesc}
                        onChange={(e) => setTempStoryDesc(e.target.value)}
                        placeholder="Ulas kisah manis di balik tahun bersejarah tersebut..."
                        rows={2}
                        className="w-full text-xs px-3 py-2 border bg-white rounded-lg focus:outline-none"
                      />
                    </div>
                    <button
                      id="btn-add-story-event"
                      onClick={addStoryEvent}
                      className="mt-3 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      Masukkan ke Linimasa
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'galeri' && (
                <div className="space-y-6" id="tab-galeri-form">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">Media Galeri Foto Pernikahan</h4>
                      <p className="text-[11px] text-gray-400 mt-1">Unggah berkas foto berkualitas tinggi untuk dipajang di galeri utama ({gallery.length}/10 foto).</p>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingGallery ? 'Mengunggah...' : 'Upload Foto'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleGalleryImageUpload}
                          disabled={isUploadingGallery}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {galleryUploadError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{galleryUploadError}</span>
                    </div>
                  )}

                  {/* Manual Paste/Add URL */}
                  <div className="bg-neutral-50 p-4 border rounded-xl space-y-2">
                    <label className="block text-[11px] font-semibold text-gray-650">Bisa juga tambah foto melalui URL tautan gambar:</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={customImageUrlInput}
                        onChange={(e) => setCustomImageUrlInput(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 border bg-white rounded-lg focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (!customImageUrlInput.trim().startsWith('http')) {
                            setGalleryUploadError('Mohon masukkan URL gambar HTTP/HTTPS yang sah.');
                            return;
                          }
                          setGallery(prev => [...prev, customImageUrlInput.trim()]);
                          setCustomImageUrlInput('');
                          setGalleryUploadError('');
                        }}
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                      >
                        Tambah URL
                      </button>
                    </div>
                  </div>

                  {/* Gallery items preview grid */}
                  {gallery.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 border border-dashed rounded-xl bg-neutral-50 space-y-2">
                      <p className="text-xs">Belum ada foto dalam galeri.</p>
                      <p className="text-[10px]">Silakan unggah foto utama pernikahan di atas atau salin-tempel tautan gambar.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {gallery.map((url, index) => (
                        <div key={index} className="group relative aspect-square bg-neutral-100 border rounded-lg overflow-hidden flex flex-col justify-between shadow-sm">
                          <img
                            src={url}
                            alt={`Gallery item ${index + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Top Tag badge with item index */}
                          <div className="absolute top-2 left-2 bg-black/70 border border-white/20 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                            Foto #{index + 1}
                          </div>

                          {/* Float hovering actions */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                            <button
                              onClick={() => moveGalleryImage(index, 'up')}
                              disabled={index === 0}
                              className="p-1.5 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 rounded transition-colors cursor-pointer text-xs font-semibold"
                              title="Pindah ke Kiri"
                            >
                              ←
                            </button>
                            <button
                              onClick={() => moveGalleryImage(index, 'down')}
                              disabled={index === gallery.length - 1}
                              className="p-1.5 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 rounded transition-colors cursor-pointer text-xs font-semibold"
                              title="Pindah ke Kanan"
                            >
                              →
                            </button>
                            <button
                              onClick={() => handleDeleteGalleryImage(index)}
                              className="p-1.5 bg-red-600 text-white hover:bg-red-500 rounded transition-colors cursor-pointer"
                              title="Hapus Foto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {gallery.length > 10 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] rounded-lg">
                      Peringatan: Undangan digital akan membatasi tampilan visual utama hanya sampai 10 foto teratas seperti yang diminta.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'kado' && (
                <div className="space-y-4" id="tab-kado-form">
                  <h4 className="text-sm font-bold text-gray-800 border-b pb-1">Amplop Digital & Kado Nikah</h4>
                  
                  {/* Account 1 */}
                  <div className="bg-neutral-50 p-4 rounded-xl border space-y-3">
                    <h5 className="text-xs font-bold text-neutral-700">Bank Pengirim 1 (Utama)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-550 mb-1">Nama Bank / Wallet</label>
                        <input
                          type="text"
                          value={form.giftBankName}
                          onChange={(e) => setForm({ ...form, giftBankName: e.target.value })}
                          placeholder="e.g. Bank BCA"
                          className="w-full text-xs px-3 py-2 border bg-white rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-550 mb-1">Nomor Rekening</label>
                        <input
                          type="text"
                          value={form.giftBankAccount}
                          onChange={(e) => setForm({ ...form, giftBankAccount: e.target.value })}
                          placeholder="8001234567"
                          className="w-full text-xs px-3 py-2 border bg-white rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-550 mb-1">Atas Nama Pemilik</label>
                        <input
                          type="text"
                          value={form.giftBankHolder}
                          onChange={(e) => setForm({ ...form, giftBankHolder: e.target.value })}
                          placeholder="e.g. Magdalena br Hutabarat"
                          className="w-full text-xs px-3 py-2 border bg-white rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Account 2 */}
                  <div className="bg-neutral-50 p-4 rounded-xl border space-y-3">
                    <h5 className="text-xs font-bold text-neutral-700">Bank Pengirim 2 (Tambahan)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-550 mb-1">Nama Bank / Wallet</label>
                        <input
                          type="text"
                          value={form.giftBankName2 || ''}
                          onChange={(e) => setForm({ ...form, giftBankName2: e.target.value })}
                          placeholder="e.g. Bank Mandiri"
                          className="w-full text-xs px-3 py-2 border bg-white rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-550 mb-1">Nomor Rekening</label>
                        <input
                          type="text"
                          value={form.giftBankAccount2 || ''}
                          onChange={(e) => setForm({ ...form, giftBankAccount2: e.target.value })}
                          placeholder="123000..."
                          className="w-full text-xs px-3 py-2 border bg-white rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-550 mb-1">Atas Nama Pemilik</label>
                        <input
                          type="text"
                          value={form.giftBankHolder2 || ''}
                          onChange={(e) => setForm({ ...form, giftBankHolder2: e.target.value })}
                          placeholder="e.g. Justin Bieber"
                          className="w-full text-xs px-3 py-2 border bg-white rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mail Registry Address */}
                  <div className="bg-neutral-50 p-4 rounded-xl border space-y-3">
                    <h5 className="text-xs font-bold text-neutral-700">Alamat Kirim Kado Fisik</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-550 mb-1">Nama Penerima Paket</label>
                        <input
                          type="text"
                          value={form.giftRecipient}
                          onChange={(e) => setForm({ ...form, giftRecipient: e.target.value })}
                          className="w-full text-xs px-3 py-2 border bg-white rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-550 mb-1">Rincian Lengkap Alamat Rumah</label>
                        <input
                          type="text"
                          value={form.giftAddress}
                          onChange={(e) => setForm({ ...form, giftAddress: e.target.value })}
                          className="w-full text-xs px-3 py-2 border bg-white rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'media' && (
                <div className="space-y-4" id="tab-media-form">
                  <h4 className="text-sm font-bold text-gray-800 border-b pb-1">Desain Visual & Musik Backsound</h4>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-650 mb-1">URL Cover / Banner Pembuka Undangan</label>
                    <p className="text-[10px] text-gray-400 mb-1">Foto utama yang dipajang pada header pertama setelah membuka undangan.</p>
                    <div className="flex gap-4 items-center">
                      <input
                        type="text"
                        value={form.coverPhoto}
                        onChange={(e) => setForm({ ...form, coverPhoto: e.target.value })}
                        className="w-full text-xs px-3 py-2 border rounded-lg"
                      />
                      <label className="flex items-center justify-center gap-1 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 text-[10px] font-bold shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload</span>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'coverPhoto')} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <label className="block text-xs font-semibold text-gray-650 mb-1">Foto Background SEBELUM Buka Undangan (Cover Background)</label>
                    <p className="text-[10px] text-gray-400 mb-1">Foto background layar penuh yang dipasang di halaman pembuka paling depan.</p>
                    <div className="flex gap-4 items-center">
                      <input
                        type="text"
                        value={form.coverBackgroundPhoto || ''}
                        placeholder="e.g. Kosongkan untuk memakai foto cover utama"
                        onChange={(e) => setForm({ ...form, coverBackgroundPhoto: e.target.value })}
                        className="w-full text-xs px-3 py-2 border rounded-lg"
                      />
                      <label className="flex items-center justify-center gap-1 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 text-[10px] font-bold shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload</span>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'coverBackgroundPhoto')} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <label className="block text-xs font-semibold text-gray-650 mb-1">Foto Background SESUDAH Buka Undangan (Main Page Background)</label>
                    <p className="text-[10px] text-gray-400 mb-1">Foto background lembut di belakang seluruh isi halaman setelah tombol 'Buka Undangan' ditekan.</p>
                    <div className="flex gap-4 items-center">
                      <input
                        type="text"
                        value={form.mainBackgroundPhoto || ''}
                        placeholder="e.g. Masukkan URL atau upload gambar"
                        onChange={(e) => setForm({ ...form, mainBackgroundPhoto: e.target.value })}
                        className="w-full text-xs px-3 py-2 border rounded-lg"
                      />
                      <label className="flex items-center justify-center gap-1 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 text-[10px] font-bold shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload</span>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'mainBackgroundPhoto')} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <label className="block text-xs font-semibold text-gray-650 mb-1">Mulai Upload Musik Backsound atau Masukkan URL Manual</label>
                    
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                      <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-[#D4AF37]/50 bg-neutral-50 hover:bg-[#FAF9F6] rounded-xl cursor-pointer text-xs font-bold text-gray-750 transition-all shrink-0">
                        <Upload className="w-4 h-4 text-[#D4AF37]" />
                        <span>{isUploadingAudio ? 'Mengunggah...' : 'Pilih & Upload berkas audio (MP3)'}</span>
                        <input
                          type="file"
                          accept="audio/mp3, audio/mpeg, audio/*"
                          disabled={isUploadingAudio}
                          onChange={handleAudioUpload}
                          className="hidden"
                        />
                      </label>
                      <div className="flex-1 text-[11px] text-stone-500 italic">
                        {isUploadingAudio && <span className="animate-pulse font-semibold">Sedang memproses upload berkas musik...</span>}
                        {!isUploadingAudio && !audioUploadError && !audioUploadSuccess && <span>Tentukan berkas musik MP3 Anda sendiri dari komputer.</span>}
                        {audioUploadSuccess && <span className="text-green-750 font-bold">✓ {audioUploadSuccess}</span>}
                        {audioUploadError && <span className="text-red-500 font-bold">✗ {audioUploadError}</span>}
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-[10px] text-stone-400 uppercase tracking-widest font-bold mb-1">Audio Streaming URL (Direct .mp3 Link)</label>
                      <input
                        type="text"
                        value={form.musicUrl}
                        onChange={(e) => {
                          setForm({ ...form, musicUrl: e.target.value });
                          setAudioUploadError('');
                          setAudioUploadSuccess('');
                        }}
                        placeholder="https://..."
                        className="w-full text-xs px-3 py-2 border rounded-lg font-mono text-neutral-600 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-650 mb-1">Informasi Judul Lagu di Layar</label>
                    <input
                      type="text"
                      value={form.musicTitle}
                      onChange={(e) => setForm({ ...form, musicTitle: e.target.value })}
                      placeholder="e.g. Marry Your Daughter - Brian McKnight (Sax Cover by Desmond Amos)"
                      className="w-full text-xs px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <label className="block text-xs font-semibold text-gray-650 mb-1">Pengaturan Keamanan: Password Modifikasi Admin</label>
                    <input
                      type="text"
                      value={form.adminPassword || ''}
                      onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                      className="w-full text-xs px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'alkitab' && (
                <div className="space-y-4" id="tab-alkitab-form">
                  <h4 className="text-sm font-bold text-gray-800 border-b pb-1">Pengaturan Ayat Alkitab (Scriptures)</h4>
                  <p className="text-xs text-stone-500 leading-relaxed italic">
                    Sesuaikan firman kudus atau kutipan indah yang dipajang di bawah penghitung waktu mundur sebagai pesan pembuka undangan Anda.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-stone-750 mb-1">Kutipan / Ayat Alkitab</label>
                    <textarea
                      value={form.bibleVerse || ''}
                      onChange={(e) => setForm({ ...form, bibleVerse: e.target.value })}
                      placeholder="e.g. Demikianlah mereka bukan lagi dua, melainkan satu. Karena itu, apa yang telah dipersatukan Allah, tidak boleh diceraikan manusia."
                      rows={5}
                      className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500 font-serif leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-750 mb-1">Referensi / Sumber (Kitab & Pasal)</label>
                    <input
                      type="text"
                      value={form.bibleReference || ''}
                      onChange={(e) => setForm({ ...form, bibleReference: e.target.value })}
                      placeholder="e.g. Matius 19:6"
                      className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500 font-mono text-stone-650"
                    />
                  </div>

                  <div className="pt-6 border-t border-stone-200 mt-6">
                    <h4 className="text-sm font-bold text-gray-800 border-b pb-1 mb-2">Ucapan Terima Kasih</h4>
                    <p className="text-xs text-stone-500 leading-relaxed mb-3 italic">
                      Teks ucapan terima kasih dari kedua mempelai kepada para tamu (akan ditampilkan di atas halaman konfirmasi kehadiran).
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-stone-750 mb-1">Teks Ucapan Terima Kasih Pernikahan</label>
                      <textarea
                        value={form.thankYouMessage || ''}
                        onChange={(e) => setForm({ ...form, thankYouMessage: e.target.value })}
                        placeholder="Masukkan ucapan terima kasih..."
                        rows={6}
                        className="w-full text-xs px-3 py-2 border rounded-lg focus:outline-none focus:border-pink-500 font-serif leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'rsvp' && (
                <div className="space-y-4" id="tab-rsvp-manager">
                  <div className="flex items-center justify-between border-b pb-1">
                    <h4 className="text-sm font-bold text-gray-800">Daftar Kiriman Ucapan (Guest Wishes)</h4>
                    <button
                      id="btn-rsvp-refresh"
                      onClick={loadWishes}
                      disabled={loadingWishes}
                      className="flex items-center gap-1 px-2 py-1 border rounded bg-white hover:bg-gray-50 text-[10px] font-semibold text-gray-650"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingWishes ? 'animate-spin' : ''}`} />
                      <span>Muat Ulang</span>
                    </button>
                  </div>

                  {loadingWishes ? (
                    <div className="text-center py-10 text-gray-500 text-xs">Menghubungi Cloud Firestore...</div>
                  ) : wishes.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-xs italic">Belum ada ucapan pernikahan dari tamu undangan.</div>
                  ) : (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {wishes.map((w) => (
                        <div key={w.id} className="flex justify-between items-start gap-4 border p-3 rounded-lg bg-gray-50 text-xs" id={`rsvp-entry-${w.id}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-gray-800 truncate">{w.name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                w.status === 'Hadir' ? 'bg-green-150 text-green-700' :
                                w.status === 'Tidak Hadir' ? 'bg-red-100 text-red-650' : 'bg-gray-150 text-gray-600'
                              }`}>{w.status}</span>
                            </div>
                            <p className="text-gray-600 mt-1 italic text-[11px] leading-relaxed">"{w.wish}"</p>
                          </div>
                          <button
                            id={`btn-rsvp-delete-${w.id}`}
                            onClick={() => handleDeleteWish(w.id)}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg shrink-0 transition-all"
                            title="Hapus Ucapan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                    <div className="bg-green-50 p-2.5 rounded-xl border border-green-100 text-green-700">
                      <span className="block text-lg font-bold">
                        {wishes.filter(w => w.status === 'Hadir').length}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wide">Hadir</span>
                    </div>
                    <div className="bg-red-50/50 p-2.5 rounded-xl border border-red-100 text-red-650">
                      <span className="block text-lg font-bold">
                        {wishes.filter(w => w.status === 'Tidak Hadir').length}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wide">Absen</span>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-150 text-gray-500">
                      <span className="block text-lg font-bold">
                        {wishes.filter(w => w.status === 'Ragu-ragu').length}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wide">Ragu-ragu</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Save footer inside edit workspace */}
            <div className="border-t border-gray-150 p-4 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] text-gray-400">
                Pembaruan Terakhir: {new Date(form.updatedAt).toLocaleString('id-ID')}
              </span>
              <div className="flex items-center gap-3">
                <button
                  id="btn-admin-cancel"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-gray-550 border rounded-lg hover:bg-gray-100"
                >
                  Batal
                </button>
                <button
                  id="btn-admin-save"
                  onClick={handleSaveData}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-lg shadow-md hover:shadow-pink-400/20 disabled:opacity-55 transition-all"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSaving ? "Menyimpan..." : "Simpan Semua Konten"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
