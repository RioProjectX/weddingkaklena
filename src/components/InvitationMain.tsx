/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Calendar, Clock, MapPin, Gift, Copy, Check, MessageSquare,
  Sparkles, Heart, ChevronRight, Map, ExternalLink, Settings, Users,
  Play, Pause, Instagram
} from 'lucide-react';
import { InvitationData, GuestWish, StoryEvent } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';

interface InvitationMainProps {
  data: InvitationData;
  onOpenAdmin: () => void;
  guestName: string;
  isPlaying?: boolean;
  onToggleMusic?: () => void;
}

export default function InvitationMain({ data, onOpenAdmin, guestName, isPlaying, onToggleMusic }: InvitationMainProps) {
  // Countdown Timer State
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // Guest wishes and guest form state
  const [wishes, setWishes] = useState<GuestWish[]>([]);
  const [guestForm, setGuestForm] = useState({ name: guestName || '', wish: '', status: 'Hadir' as 'Hadir' | 'Tidak Hadir' | 'Ragu-ragu' });
  const [submittingWish, setSubmittingWish] = useState(false);
  const [wishSuccess, setWishSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<'acc1' | 'acc2' | 'address' | null>(null);

  // Parse story events
  const [stories, setStories] = useState<StoryEvent[]>([]);

  // Parse gallery photos with state
  const [gallery, setGallery] = useState<string[]>([]);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  useEffect(() => {
    try {
      setStories(JSON.parse(data.storiesJson || '[]'));
    } catch (e) {
      setStories([]);
    }
  }, [data.storiesJson]);

  useEffect(() => {
    try {
      if (data.galleryJson) {
        const parsed = JSON.parse(data.galleryJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGallery(parsed);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to parse galleryJson:", e);
    }
    // Fallback default gallery if failed or not defined
    setGallery([
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1519225495810-7512c696505a?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1520854224410-fc0124e2db9a?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600'
    ]);
  }, [data.galleryJson]);

  // Audio Play Countdown setup - Wedding date is July 18, 2026 GMT+7
  useEffect(() => {
    const weddingDate = new Date("July 18, 2026 09:00:00 GMT+0700").getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = weddingDate - now;

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Listen to live guest wishes from Firestore
  useEffect(() => {
    const q = query(collection(db, 'wishes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: GuestWish[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as GuestWish);
      });
      setWishes(list);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'wishes');
      } catch (e) {
        console.error(e);
      }
    });

    return () => unsubscribe();
  }, []);

  // Clipboard copy handler
  const handleCopy = (text: string, field: 'acc1' | 'acc2' | 'address') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  // Submit wish handler
  const handleWishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestForm.name.trim() || !guestForm.wish.trim()) {
      alert("Harap isi nama dan ucapan Anda.");
      return;
    }

    setSubmittingWish(true);
    setWishSuccess(false);

    try {
      const wishRef = collection(db, 'wishes');
      await addDoc(wishRef, {
        name: guestForm.name,
        wish: guestForm.wish,
        status: guestForm.status,
        createdAt: serverTimestamp()
      });
      setGuestForm(prev => ({ ...prev, wish: '' })); // clear wish box
      setWishSuccess(true);
      setTimeout(() => setWishSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim ucapan pernikahan. Silakan coba lagi.");
    } finally {
      setSubmittingWish(false);
    }
  };

  return (
    <div className="bg-[#FAF9F6] min-h-screen text-[#1A1A1A] font-sans selection:bg-[#FAF9F6] selection:text-[#C5A059] relative" style={{ fontFamily: 'Georgia, serif' }}>
      
      {/* Fixed Main Page Custom Wedding Background (Fully Customizable by Admin) */}
      {data.mainBackgroundPhoto && (
        <div 
          className="fixed inset-0 bg-cover bg-center z-0 opacity-[0.11] pointer-events-none filter sepia-[15%]" 
          style={{ backgroundImage: `url(${data.mainBackgroundPhoto})` }}
        />
      )}

      {/* 1. Header Banner of Love (Hero with High-Grade Luxury Editorial Look) */}
      <section id="section-hero" className="relative min-h-[95vh] flex flex-col justify-end pb-16 bg-cover bg-center overflow-hidden" 
        style={{ backgroundImage: `linear-gradient(to bottom, rgba(250,249,246,0.15) 0%, rgba(250,249,246,0.82) 55%, rgba(250,249,246,1) 98%), url(${data.coverPhoto})` }}
      >
        {/* Double Gold Line Frame Accent */}
        <div className="absolute inset-4 sm:inset-8 border border-[#D4AF37]/20 pointer-events-none z-0"></div>

        <div className="max-w-4xl mx-auto w-full px-6 text-center text-[#1A1A1A] pb-6 z-10 relative">
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="tracking-[0.35em] text-[#AA8236] font-sans uppercase text-xs font-semibold mb-4"
          >
            Pemberkatan &amp; Resepsi Pernikahan Kudus
          </motion.p>
          
          <motion.h2 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="font-serif text-5xl sm:text-7xl md:text-8xl font-normal italic tracking-tight leading-tight text-[#1A1A1A] mb-2"
          >
            {data.groomNick} <span className="font-sans font-light text-[#AA8236] text-3xl sm:text-4xl md:text-5xl">&amp;</span> {data.brideNick}
          </motion.h2>

          <div className="flex items-center justify-center my-6">
            <div className="h-[1px] w-12 sm:w-16 bg-[#D4AF37]/50"></div>
            <Heart className="w-3 h-3 text-[#D4AF37] mx-3 fill-[#D4AF37]/20" />
            <div className="h-[1px] w-12 sm:w-16 bg-[#D4AF37]/50"></div>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-[#1A1A1A] text-sm sm:text-base font-sans font-medium tracking-[0.25em] uppercase"
          >
            {data.receptionDate}
          </motion.p>

          {/* Luxury White & Gold Minimalist Timer Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 45, delay: 0.4 }}
            className="grid grid-cols-4 gap-3 sm:gap-6 max-w-md mx-auto mt-10 bg-white border border-[#E5E5E5] p-5 sm:p-6 rounded-none shadow-sm"
            id="countdown-grid"
          >
            {[
              { val: timeLeft.days, label: "Hari" },
              { val: timeLeft.hours, label: "Jam" },
              { val: timeLeft.minutes, label: "Menit" },
              { val: timeLeft.seconds, label: "Detik" }
            ].map((timer, idx) => (
              <div key={idx} className="flex flex-col items-center border-r last:border-r-0 border-[#E5E5E5]/50">
                <span className="text-2xl sm:text-3.5xl font-serif font-light text-[#1A1A1A]">{timer.val}</span>
                <span className="text-[9px] text-[#A0A0A0] font-sans font-bold uppercase tracking-[0.15em] mt-1.5">{timer.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 2. Opening Bible Verses (Subtle Frame Line) */}
      <section id="section-verse" className="py-24 px-6 max-w-3xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-white border border-[#E5E5E5] p-10 sm:p-14 rounded-none shadow-sm relative overflow-hidden"
          id="verse-box"
        >
          {/* Top border trim accent */}
          <div className="absolute top-0 inset-x-0 h-1 bg-[#D4AF37]/70" />
          
          <div className="w-10 h-10 border border-[#D4AF37]/35 mx-auto flex items-center justify-center text-[#D4AF37] mb-6">
            <Heart className="w-4 h-4 fill-[#D4AF37]/10" />
          </div>
          
          <p className="font-serif text-base sm:text-lg italic text-[#1A1A1A] leading-relaxed px-2">
            "{data.bibleVerse || "Demikianlah mereka bukan lagi dua, melainkan satu. Karena itu, apa yang telah dipersatukan Allah, tidak boleh diceraikan manusia."}"
          </p>
          <p className="font-sans font-bold text-[#A0A0A0] text-[10px] sm:text-xs uppercase tracking-[0.25em] mt-6">
            — {data.bibleReference || "Matius 19:6"}
          </p>
        </motion.div>
      </section>

      {/* 3. The Bride and Groom Profiles (High Contrast Editorial Grid) */}
      <section id="section-couple" className="py-24 px-6 max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-16 sm:mb-24">
          <span className="font-sans text-[#AA8236] text-[11px] font-bold tracking-[0.3em] uppercase block mb-3">Mempelai Terkasih</span>
          <h3 className="font-serif text-4xl sm:text-5xl text-[#1A1A1A] italic tracking-tight font-normal">Kedua Mempelai</h3>
          <div className="w-16 h-[1px] bg-[#D4AF37]/50 mx-auto mt-4" />
        </div>

        <div className="space-y-24 sm:space-y-36">
          
          {/* Groom Section (Model Gambar 2: Left Photo, Right Text) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">
            {/* Groom Photo Column */}
            <motion.div
              initial={{ opacity: 0, x: -35 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9 }}
              className="col-span-12 md:col-span-5 order-1"
            >
              <div className="aspect-[4/5] w-full max-w-[290px] sm:max-w-[340px] md:max-w-none mx-auto md:mx-0 overflow-hidden relative rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-stone-200/40 bg-stone-50 group">
                <img 
                  src={data.groomPhoto} 
                  alt={data.groomName} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>

            {/* Groom Info Column */}
            <motion.div
              initial={{ opacity: 0, x: 35 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9 }}
              className="col-span-12 md:col-span-7 order-2 text-left space-y-4"
              id="groom-bio-info"
            >
              <h4 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] leading-tight font-light tracking-wide uppercase">
                {data.groomName}
              </h4>
              
              <div className="w-12 h-[1.5px] bg-[#D4AF37]/60 my-2" />
              
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest font-sans mb-1.5">Putra Dari :</p>
                <p className="text-sm sm:text-base text-stone-700 font-serif leading-relaxed italic">
                  {data.groomParents}
                </p>
              </div>

              {data.groomBio && (
                <p className="text-gray-500 font-sans text-xs sm:text-sm leading-relaxed font-light pt-2 max-w-xl">
                  {data.groomBio}
                </p>
              )}

              {data.groomInstagram && data.groomInstagram.trim() !== '' && data.groomInstagram.trim() !== 'https://instagram.com/' && (
                <div className="pt-4">
                  <a
                    href={data.groomInstagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#EAA835] hover:bg-[#D49320] text-white text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Instagram className="w-3.5 h-3.5 text-white" />
                    <span>Instagram</span>
                  </a>
                </div>
              )}
            </motion.div>
          </div>

          {/* Bride Section (Model Gambar 3: Left Text, Right Photo on MD+; stack on Mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">
            {/* Bride Info Column */}
            <motion.div
              initial={{ opacity: 0, x: -35 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9 }}
              className="col-span-12 md:col-span-7 order-2 md:order-1 text-left space-y-4"
              id="bride-bio-info"
            >
              <h4 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] leading-tight font-light tracking-wide uppercase">
                {data.brideName}
              </h4>
              
              <div className="w-12 h-[1.5px] bg-[#D4AF37]/60 my-2" />
              
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest font-sans mb-1.5">Putri Dari :</p>
                <p className="text-sm sm:text-base text-stone-700 font-serif leading-relaxed italic">
                  {data.brideParents}
                </p>
              </div>

              {data.brideBio && (
                <p className="text-gray-500 font-sans text-xs sm:text-sm leading-relaxed font-light pt-2 max-w-xl">
                  {data.brideBio}
                </p>
              )}

              {data.brideInstagram && data.brideInstagram.trim() !== '' && data.brideInstagram.trim() !== 'https://instagram.com/' && (
                <div className="pt-4">
                  <a
                    href={data.brideInstagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#EAA835] hover:bg-[#D49320] text-white text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Instagram className="w-3.5 h-3.5 text-white" />
                    <span>Instagram</span>
                  </a>
                </div>
              )}
            </motion.div>

            {/* Bride Photo Column */}
            <motion.div
              initial={{ opacity: 0, x: 35 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9 }}
              className="col-span-12 md:col-span-5 order-1 md:order-2"
            >
              <div className="aspect-[4/5] w-full max-w-[290px] sm:max-w-[340px] md:max-w-none mx-auto md:mx-0 overflow-hidden relative rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-stone-200/40 bg-stone-50 group">
                <img 
                  src={data.bridePhoto} 
                  alt={data.brideName} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* 5. Love Story Timeline (Magnificent Editorial Grid styling) */}
      {stories.length > 0 && (
        <section id="section-story" className="py-24 px-6 max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <span className="font-sans text-[#C5A059] text-[11px] font-bold tracking-[0.3em] uppercase block mb-3">Momen Berharga</span>
            <h3 className="font-serif text-4xl sm:text-5xl text-[#1A1A1A] italic tracking-tight font-normal">Kisah Kasih Kami</h3>
            <div className="w-16 h-[1px] bg-[#D4AF37]/50 mx-auto mt-4" />
          </div>

          <div className="relative border-l border-[#D4AF37]/35 pl-6 sm:pl-10 space-y-12 ml-2 sm:ml-10">
            {stories.map((step, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                key={step.id}
                className="relative"
              >
                {/* Visual marker dot (Gold Square Motif) */}
                <div className="absolute -left-[31px] sm:-left-[47px] top-1.5 bg-[#D4AF37] rotate-45 w-3 h-3 shadow-sm border border-white" />
                
                <div className="bg-white p-6 sm:p-8 border border-[#E5E5E5] rounded-none shadow-sm relative">
                  <div className="absolute top-0 right-0 p-3 text-3xl font-serif italic text-[#D4AF37]/20 select-none pointer-events-none mt-2 mr-4 font-black">
                    {idx + 1}
                  </div>
                  <span className="font-serif italic font-extralight text-[#C5A059] text-lg sm:text-xl leading-none block mb-2">{step.year}</span>
                  <h4 className="font-sans font-bold text-[#1A1A1A] text-sm sm:text-base mb-3 uppercase tracking-wider">{step.title}</h4>
                  <p className="text-xs text-stone-505 leading-relaxed font-normal font-sans pr-4">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Photo Gallery Section (10 Photos) */}
      <section id="section-gallery" className="py-24 bg-white border-t border-stone-200/50 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Elegant Left-Aligned Gallery Header with Underline precisely as shown in mockup */}
          <div className="text-left mb-16 border-b border-stone-200 pb-3" id="gallery-header-container">
            <h3 className="font-serif text-4xl sm:text-5xl text-stone-800 italic tracking-wide font-normal">
              Gallery Our Moment
            </h3>
          </div>

          {/* Ultra Modern Editorial Grid using portrait rounded elegant cards instead of flat squares */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {gallery.slice(0, 8).map((url, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: (index % 4) * 0.1 }}
                onClick={() => setActivePhoto(url)}
                className="aspect-[2/3] bg-stone-50 border border-stone-200/45 overflow-hidden cursor-pointer group relative rounded-[1.5rem] sm:rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-500 ease-out"
                id={`gallery-item-card-${index}`}
              >
                <img
                  src={url}
                  alt={`Wedding Gallery ${index + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                
                {/* Floating Subtle Light Glow Overlay */}
                <div className="absolute inset-0 bg-stone-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                  <span className="text-[10px] text-white tracking-[0.2em] font-medium uppercase bg-[#1A1A1A]/90 px-4 py-2 border border-white/10 rounded-full shadow-md backdrop-blur-xs transform translate-y-2 group-hover:translate-y-0 transition-transform duration-350 ease-out font-sans">
                    Lihat Foto
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Wedding Gift Registry and Money Envelope */}
      <section id="section-gift" className="py-24 bg-[#FAF9F6] border-t border-stone-200/55 px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="font-sans text-[#C5A059] text-[11px] font-bold tracking-[0.3em] uppercase block mb-3">Tanda Kasih</span>
            <h3 className="font-serif text-4xl sm:text-5xl text-[#1A1A1A] italic tracking-tight font-normal">Kado Pernikahan &amp; Digital</h3>
            <div className="w-16 h-[1px] bg-[#D4AF37]/50 mx-auto mt-4" />
            <p className="text-xs text-stone-500 max-w-md mx-auto mt-5 leading-relaxed font-sans font-normal">
              Kehadiran dan doa Anda adalah berkat paling sakral bagi kami. Namun jika Anda ingin mengirim kado digital bagi pernikahan kami, tersedia kanal resmi berikut:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Account Bank Card 1 */}
            {data.giftBankName && (
              <div
                id="gift-bank-card-1"
                className="bg-white p-8 rounded-none border border-[#E5E5E5] shadow-sm flex flex-col justify-between relative"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#D4AF37]/60" />
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#C5A059] block mb-4 font-sans">Amplop Digital I</span>
                  <div className="flex justify-between items-center bg-stone-50 border border-stone-100 p-3 rounded-none mb-6">
                    <span className="text-sm font-semibold text-[#1A1A1A] font-sans">{data.giftBankName}</span>
                    <Gift className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <div className="space-y-1 mt-4">
                    <p className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-wider font-sans">Nomor Rekening</p>
                    <p className="text-xl font-bold text-[#1A1A1A] tracking-wider font-mono">{data.giftBankAccount}</p>
                    <p className="text-[11px] text-stone-500 mt-2 font-sans">Atas Nama: <b className="text-[#1A1A1A]">{data.giftBankHolder}</b></p>
                  </div>
                </div>

                <button
                  id="btn-copy-bank-1"
                  onClick={() => handleCopy(data.giftBankAccount, 'acc1')}
                  className="mt-8 flex items-center justify-center gap-2 px-4 py-3 bg-[#1A1A1A] hover:bg-[#2E2E2E] text-white rounded-none text-xs font-semibold tracking-widest uppercase transition-all"
                >
                  {copiedField === 'acc1' ? <Check className="w-3.5 h-3.5 text-[#D4AF37]" /> : <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />}
                  <span>{copiedField === 'acc1' ? "Berhasil Disalin" : "Salin Rekening"}</span>
                </button>
              </div>
            )}

            {/* Account Bank Card 2 */}
            {data.giftBankName2 && (
              <div
                id="gift-bank-card-2"
                className="bg-white p-8 rounded-none border border-[#E5E5E5] shadow-sm flex flex-col justify-between relative"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#D4AF37]/60" />
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#C5A059] block mb-4 font-sans">Amplop Digital II</span>
                  <div className="flex justify-between items-center bg-stone-50 border border-stone-100 p-3 rounded-none mb-6">
                    <span className="text-sm font-semibold text-[#1A1A1A] font-sans">{data.giftBankName2}</span>
                    <Gift className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <div className="space-y-1 mt-4">
                    <p className="text-[9px] text-[#A0A0A0] font-bold uppercase tracking-wider font-sans">Nomor Rekening</p>
                    <p className="text-xl font-bold text-[#1A1A1A] tracking-wider font-mono">{data.giftBankAccount2}</p>
                    <p className="text-[11px] text-stone-500 mt-2 font-sans">Atas Nama: <b className="text-[#1A1A1A]">{data.giftBankHolder2}</b></p>
                  </div>
                </div>

                <button
                  id="btn-copy-bank-2"
                  onClick={() => handleCopy(data.giftBankAccount2 || '', 'acc2')}
                  className="mt-8 flex items-center justify-center gap-2 px-4 py-3 bg-[#1A1A1A] hover:bg-[#2E2E2E] text-white rounded-none text-xs font-semibold tracking-widest uppercase transition-all"
                >
                  {copiedField === 'acc2' ? <Check className="w-3.5 h-3.5 text-[#D4AF37]" /> : <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />}
                  <span>{copiedField === 'acc2' ? "Berhasil Disalin" : "Salin Rekening"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Physical package receiver */}
          {data.giftAddress && (
            <div
              id="gift-physical-address-card"
              className="bg-white p-8 rounded-none border border-[#E5E5E5] shadow-sm mt-8 text-center max-w-xl mx-auto relative"
            >
              <div className="absolute top-0 inset-x-0 h-[2px] bg-[#D4AF37]/50" />
              <div className="flex gap-2 items-center justify-center mb-3 text-[#C5A059]">
                <MapPin className="w-4 h-4" />
                <span className="text-[10px] font-bold tracking-[0.2em] font-sans uppercase">Kirim Kado / Paket Fisik</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed font-sans text-center mb-6 px-4">
                Penerima: <b className="text-[#1A1A1A]">{data.giftRecipient}</b> <br />
                <span className="mt-1 block text-[#888]">{data.giftAddress}</span>
              </p>
              <button
                id="btn-copy-address"
                onClick={() => handleCopy(`${data.giftRecipient}\n${data.giftAddress}`, 'address')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#FAF9F6] border border-[#E5E5E5] hover:bg-stone-50 hover:border-neutral-350 text-[#1A1A1A] rounded-none text-xs font-semibold uppercase tracking-wider transition-all"
              >
                {copiedField === 'address' ? <Check className="w-3.5 h-3.5 text-[#D4AF37]" /> : <Copy className="w-3.5 h-3.5 text-[#A0A0A0]" />}
                <span>{copiedField === 'address' ? "Alamat Berhasil Disalin" : "Salin Alamat Penerima"}</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 4. Event Date, Time and Venue Details (Moved below Wedding Gift) */}
      <section id="section-schedule" className="py-24 bg-[#FAF9F6] border-y border-stone-200/50 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <span className="font-sans text-[#C5A059] text-[11px] font-bold tracking-[0.3em] uppercase block mb-3 font-semibold">Agenda Kudus</span>
            <h3 className="font-serif text-4xl sm:text-5xl text-[#1A1A1A] italic tracking-tight font-normal">Waktu &amp; Tempat Acara</h3>
            <div className="w-16 h-[1px] bg-[#D4AF37]/55 mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            
            {/* Box Holy Matrimony */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-none p-10 shadow-sm border border-[#E5E5E5] flex flex-col justify-between relative overflow-hidden"
              id="holy-matrimony-calendar-card"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#D4AF37]/50" />
              <div className="space-y-6">
                <div className="flex gap-4 items-center border-b border-[#E5E5E5] pb-5">
                  <div className="w-10 h-10 border border-[#D4AF37] text-[#D4AF37] rounded-none flex items-center justify-center shrink-0">
                    <Heart className="w-4 h-4 fill-[#D4AF37]/15" />
                  </div>
                  <div>
                    <h4 className="font-serif text-xl font-normal text-[#1A1A1A]">Pemberkatan Pernikahan</h4>
                    <span className="text-[9px] text-[#A0A0A0] font-sans font-bold uppercase tracking-widest mt-0.5 block">Holy Matrimony</span>
                  </div>
                </div>

                <div className="space-y-5 text-stone-600 font-sans text-xs">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                    <span className="font-medium text-[#1A1A1A]">{data.holyMatrimonyDate}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                    <span className="font-medium text-[#1A1A1A]">{data.holyMatrimonyTime}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[#1A1A1A] font-bold text-sm block mb-1">{data.holyMatrimonyVenue}</p>
                      <p className="text-[11px] text-[#888] leading-relaxed font-normal">{data.holyMatrimonyAddress}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map embed and direct link */}
              <div className="mt-8 space-y-4">
                {data.holyMatrimonyMap && data.holyMatrimonyMap.startsWith('http') && (
                  <div className="w-full h-36 rounded-none overflow-hidden border border-neutral-200">
                    <iframe
                      src={data.holyMatrimonyMap}
                      width="100%"
                      height="100%"
                      style={{ border: 0, filter: 'grayscale(0.12)' }}
                      allowFullScreen={false}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <a
                  id="btn-holy-matrimony-map"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${data.holyMatrimonyVenue} ${data.holyMatrimonyAddress}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 px-5 py-3.5 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-none text-xs font-semibold tracking-wider uppercase transition-all shadow-sm"
                >
                  <Map className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Buka di Google Maps</span>
                  <ExternalLink className="w-3 h-3 text-[#A0A0A0]" />
                </a>
              </div>
            </motion.div>

            {/* Box Reception */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-none p-10 shadow-sm border border-[#E5E5E5] flex flex-col justify-between relative overflow-hidden"
              id="reception-calendar-card"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#D4AF37]/50" />
              <div className="space-y-6">
                <div className="flex gap-4 items-center border-b border-[#E5E5E5] pb-5">
                  <div className="w-10 h-10 border border-[#D4AF37] text-[#D4AF37] rounded-none flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-serif text-xl font-normal text-[#1A1A1A]">Resepsi Pernikahan</h4>
                    <span className="text-[9px] text-[#A0A0A0] font-sans font-bold uppercase tracking-widest mt-0.5 block">Wedding Reception</span>
                  </div>
                </div>

                <div className="space-y-5 text-stone-605 font-sans text-xs">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                    <span className="font-medium text-[#1A1A1A]">{data.receptionDate}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                    <span className="font-medium text-[#1A1A1A]">{data.receptionTime}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[#1A1A1A] font-bold text-sm block mb-1">{data.receptionVenue}</p>
                      <p className="text-[11px] text-[#888] leading-relaxed font-normal">{data.receptionAddress}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map embed and direct link */}
              <div className="mt-8 space-y-4">
                {data.receptionMap && data.receptionMap.startsWith('http') && (
                  <div className="w-full h-36 rounded-none overflow-hidden border border-neutral-200">
                    <iframe
                      src={data.receptionMap}
                      width="100%"
                      height="100%"
                      style={{ border: 0, filter: 'grayscale(0.12)' }}
                      allowFullScreen={false}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <a
                  id="btn-reception-map"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${data.receptionVenue} ${data.receptionAddress}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 px-5 py-3.5 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-none text-xs font-semibold tracking-wider uppercase transition-all shadow-sm"
                >
                  <Map className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Buka di Google Maps</span>
                  <ExternalLink className="w-3 h-3 text-[#A0A0A0]" />
                </a>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 6.5 Thank You Section (Ucapan Terima Kasih) */}
      <section id="section-thanks" className="py-20 px-6 max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-white p-8 sm:p-12 border border-[#E5E5E5] relative overflow-hidden shadow-sm"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#D4AF37]/55" />
          <div className="w-8 h-8 mx-auto border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] mb-6">
            <Heart className="w-3.5 h-3.5 fill-[#D4AF37]/10" />
          </div>
          <h3 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] italic tracking-tight font-normal mb-6">
            Terima Kasih
          </h3>
          <p className="text-stone-600 font-serif text-sm sm:text-base leading-relaxed max-w-2xl mx-auto italic">
            {data.thankYouMessage || 'Merupakan suatu kehormatan dan kebahagiaan yang tak bernilai bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu bagi pernikahan suci kami. Atas kehadiran serta untaian doa restu yang tulus, kami mengucapkan limpah terima kasih yang tak terhingga.'}
          </p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#AA8236] font-sans font-bold mt-8">
            {data.groomNick} &amp; {data.brideNick}
          </p>
        </motion.div>
      </section>

      {/* 7. RSVP and Live Guest Wishes Guestbook Board */}
      <section id="section-rsvp" className="py-24 px-6 max-w-4xl mx-auto relative z-10 font-sans">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          
          {/* Form guest inputs */}
          <div className="space-y-6">
            <div className="border-b border-[#E5E5E5] pb-4">
              <span className="font-sans text-[#C5A059] text-[11px] font-bold tracking-[0.3em] uppercase block mb-1">Konfirmasi Kehadiran</span>
              <h3 className="font-serif text-3xl text-[#1A1A1A] italic tracking-tight font-normal">RSVP &amp; Kirim Ucapan</h3>
              <p className="text-stone-500 font-sans text-xs mt-2 leading-relaxed">
                Silakan kabarkan rencana kedatangan Anda dan titipkan pesan hangat untuk kedua mempelai di lembar kehadiran.
              </p>
            </div>

            <form onSubmit={handleWishSubmit} className="space-y-5 bg-white p-6 border border-[#E5E5E5] rounded-none shadow-sm" id="rsvp-submit-form">
              <div>
                <label className="block text-[10px] font-bold text-[#A0A0A0] font-sans uppercase tracking-[0.15em] mb-2 font-sans">Nama Anda</label>
                <input
                  id="rsvp-input-name"
                  type="text"
                  required
                  placeholder="Masukkan nama lengkap"
                  value={guestForm.name}
                  onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                  className="w-full text-xs px-4 py-3 bg-[#FAF9F6] border border-[#E5E5E5] rounded-none focus:outline-none focus:border-[#D4AF37] focus:bg-white text-[#1A1A1A] font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#A0A0A0] font-sans uppercase tracking-[0.15em] mb-2 font-sans">Konfirmasi Kehadiran</label>
                <select
                  id="rsvp-select-status"
                  value={guestForm.status}
                  onChange={(e) => setGuestForm({ ...guestForm, status: e.target.value as any })}
                  className="w-full text-xs px-4 py-3 bg-[#FAF9F6] border border-[#E5E5E5] rounded-none focus:outline-none focus:border-[#D4AF37] focus:bg-white cursor-pointer font-medium text-stone-650 font-sans"
                >
                  <option value="Hadir">Saya Akan Hadir (Attending)</option>
                  <option value="Tidak Hadir">Mohon Maaf, Berhalangan Hadir (Absent)</option>
                  <option value="Ragu-ragu">Masih Ragu-ragu (Undecided)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#A0A0A0] font-sans uppercase tracking-[0.15em] mb-2 font-sans">Ucapan &amp; Doa Restu</label>
                <textarea
                  id="rsvp-textarea-wish"
                  required
                  placeholder="Tulis ucapan selamat dan doa tulus bagi mempelai..."
                  rows={4}
                  value={guestForm.wish}
                  onChange={(e) => setGuestForm({ ...guestForm, wish: e.target.value })}
                  className="w-full text-xs px-4 py-3 bg-[#FAF9F6] border border-[#E5E5E5] rounded-none focus:outline-none focus:border-[#D4AF37] focus:bg-white text-[#1A1A1A] font-sans"
                />
              </div>

              <button
                id="btn-rsvp-submit"
                type="submit"
                disabled={submittingWish}
                className="w-full py-4 bg-[#1A1A1A] hover:bg-[#2C2C2C] text-white rounded-none text-xs font-bold tracking-[0.25em] uppercase shadow-sm disabled:opacity-55 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submittingWish ? "Mengirim Ucapan..." : "Kirim Kartu Ucapan"}
              </button>

              {wishSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 bg-neutral-50 border border-[#D4AF37]/35 text-stone-750 text-[11px] text-center font-bold font-sans"
                  id="rsvp-submit-success-alert"
                >
                  Matur nuhun / Terima kasih atas doa restu indah Anda! Ucapan berhasil masuk ke papan pesan.
                </motion.div>
              )}
            </form>
          </div>

          {/* Scrolling messages feed (digital Guestbook Card Rows) */}
          <div className="space-y-6">
            <div className="border-b border-[#E5E5E5] pb-4 flex items-center justify-between">
              <div>
                <span className="font-sans text-[#C5A059] text-[11px] font-bold tracking-[0.3em] uppercase block mb-1">Untaian Doa</span>
                <h3 className="font-serif text-3xl text-[#1A1A1A] italic tracking-tight font-normal">Papan Ucapan Tamu</h3>
              </div>
              <span className="flex items-center gap-1 text-[10px] bg-white border border-[#E5E5E5] text-[#1A1A1A] font-bold px-3.5 py-1.5 rounded-none font-sans">
                <Users className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>{wishes.length} Tamu</span>
              </span>
            </div>

            <div className="space-y-4 max-h-[440px] overflow-y-auto pr-2" id="guestbook-scroll-panel">
              {wishes.length === 0 ? (
                <div className="py-20 text-center text-stone-400 text-xs italic bg-white border border-[#E5E5E5] rounded-none font-sans">
                  Belum ada ucapan pernikahan. Jadilah yang pertama menitipkan doa restu!
                </div>
              ) : (
                wishes.map((item) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={item.id}
                    className="p-5 bg-white border border-[#E5E5E5] rounded-none shadow-sm scroll-smooth relative"
                    id={`guest-wish-${item.id}`}
                  >
                    <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-[#D4AF37]/60" />
                    <div className="flex items-center justify-between gap-4 pl-1">
                      <h5 className="font-bold text-[#1A1A1A] text-xs font-sans truncate max-w-[65%]">{item.name}</h5>
                      <span className={`px-2 py-0.5 rounded-none text-[8px] font-bold uppercase tracking-wider font-sans border ${
                        item.status === 'Hadir' ? 'bg-[#FAF9F6] text-[#C5A059] border-[#D4AF37]/40' :
                        item.status === 'Tidak Hadir' ? 'bg-neutral-50 text-stone-400 border-neutral-200' : 'bg-neutral-50 text-stone-500 border-neutral-200'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-stone-600 text-[11px] leading-relaxed mt-3 pl-1 italic font-serif">"{item.wish}"</p>
                    {item.createdAt && (
                      <span className="block text-[8px] text-stone-450 mt-2 font-mono text-right font-light">
                        {(() => {
                          try {
                            if (item.createdAt && typeof item.createdAt.seconds === 'number') {
                              return new Date(item.createdAt.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
                            }
                            if (item.createdAt && typeof item.createdAt.toDate === 'function') {
                              return item.createdAt.toDate().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
                            }
                            const d = new Date(item.createdAt);
                            if (!isNaN(d.getTime())) {
                              return d.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
                            }
                          } catch (err) {
                            console.error("Format date error:", err);
                          }
                          return '';
                        })()}
                      </span>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>

        </div>
      </section>

      {/* 8. Footer decoration with Admin Toggle trigger */}
      <footer className="bg-[#1A1A1A] text-stone-400 py-16 px-6 text-center border-t border-[#D4AF37]/15 relative z-10">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="w-8 h-8 mx-auto border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
            <Heart className="w-3.5 h-3.5 fill-[#D4AF37]/10" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#C5A059] font-sans font-medium">{data.groomName} &amp; {data.brideName}</p>
          
          {/* SMALL ADMIN BUTTON AT BOTTOM AS REQUESTED (ONLY SETTINGS ICON) */}
          <div className="pt-6 border-t border-stone-800/60 max-w-xs mx-auto flex items-center justify-center gap-3">
            <button
              id="btn-admin-login-small"
              onClick={onOpenAdmin}
              className="inline-flex items-center justify-center w-9 h-9 bg-neutral-900/80 hover:bg-neutral-900 text-[#D4AF37] hover:text-white border border-stone-800 rounded-none transition-all cursor-pointer"
              title="Kontrol Admin"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {onToggleMusic && (
              <button
                id="btn-music-toggle"
                onClick={onToggleMusic}
                className="inline-flex items-center justify-center w-9 h-9 bg-neutral-900/80 hover:bg-neutral-900 text-stone-400 hover:text-white border border-stone-800 rounded-none transition-all cursor-pointer shrink-0"
                title={isPlaying ? "Matikan Musik" : "Putar Musik"}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 text-[#D4AF37]" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-[#D4AF37] translate-x-[0.5px]" />
                )}
              </button>
            )}
          </div>

          <div className="pt-4 text-center">
            <p className="text-[9px] uppercase tracking-[0.2em] text-stone-500 font-sans">
              © Copyright Sanrio Nainggolan. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Lightbox Modal */}
      {activePhoto && (
        <div 
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <img 
              src={activePhoto} 
              alt="Gallery Preview" 
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[85vh] object-contain border border-stone-800"
            />
            <button 
              onClick={() => setActivePhoto(null)}
              className="absolute top-top-12 sm:top-4 right-4 bg-black/60 hover:bg-black text-white w-10 h-10 flex items-center justify-center border border-white/10 text-lg transition-colors cursor-pointer rounded-full"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
