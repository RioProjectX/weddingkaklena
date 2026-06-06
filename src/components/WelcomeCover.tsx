/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { MailOpen } from 'lucide-react';

interface WelcomeCoverProps {
  groomNick: string;
  brideNick: string;
  coverPhoto: string;
  coverBackgroundPhoto?: string;
  onOpen: () => void;
  guestName: string;
}

export default function WelcomeCover({ groomNick, brideNick, coverPhoto, coverBackgroundPhoto, onOpen, guestName }: WelcomeCoverProps) {
  return (
    <div
      id="welcome-cover"
      className="relative min-h-screen flex flex-col justify-between p-8 sm:p-16 bg-[#FAF9F6] text-[#1A1A1A] overflow-hidden select-none"
      style={{ fontFamily: 'Georgia, serif' }}
    >
      {/* Background Image of Bride & Groom with Soft Premium Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 select-none pointer-events-none"
        style={{ backgroundImage: `url(${coverBackgroundPhoto || coverPhoto})` }}
      />
      <div className="absolute inset-0 bg-[#FAF9F6]/92 backdrop-blur-[2px] z-0 pointer-events-none" />

      {/* Decorative Inner Gold Border */}
      <div className="absolute inset-4 sm:inset-8 border border-[#D4AF37] opacity-25 pointer-events-none z-10"></div>

      {/* Top Header Information */}
      <div className="z-10 flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 text-center sm:text-left">
        <div>
          <span className="text-[9px] font-sans text-[#A0A0A0] tracking-[0.25em] uppercase block">Pernikahan Kudus Pasangan Kasih</span>
          <span className="text-[10px] sm:text-[11px] font-sans text-[#1A1A1A] tracking-[0.15em] uppercase font-bold mt-1 block">The Union of Two Souls</span>
        </div>
        
        <div className="text-center sm:text-right">
          <p className="text-[10px] sm:text-[11px] tracking-[0.25em] font-sans uppercase font-medium text-[#1A1A1A]">Justin &amp; Magdalena</p>
          <p className="text-[9px] text-[#A0A0A0] font-sans uppercase mt-0.5 tracking-wider">Jakarta, Indonesia</p>
        </div>
      </div>

      {/* Main Hero & Typography */}
      <div className="z-10 flex-1 flex flex-col items-center justify-center text-center my-8 sm:my-0">
        <motion.span 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-[11px] sm:text-[13px] tracking-[0.35em] uppercase mb-6 sm:mb-8 text-[#AA8236] font-sans font-semibold"
        >
          You are invited to the wedding of
        </motion.span>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="relative max-w-2xl"
        >
          <h1 className="text-[52px] sm:text-[76px] md:text-[90px] leading-[1] italic font-normal mb-2 text-[#1A1A1A] tracking-tight">
            {groomNick === 'Justin' ? 'Justin Bieber' : groomNick}
          </h1>
          <div className="flex items-center justify-center my-3 sm:my-5">
            <div className="h-[1px] w-12 sm:w-20 bg-[#D4AF37]/50"></div>
            <span className="mx-4 sm:mx-6 text-[18px] sm:text-[24px] font-sans font-light text-[#AA8236]">&amp;</span>
            <div className="h-[1px] w-12 sm:w-20 bg-[#D4AF37]/50"></div>
          </div>
          <h1 className="text-[44px] sm:text-[66px] md:text-[78px] leading-[1] italic font-normal text-[#1A1A1A] tracking-tight">
            {brideNick === 'Magdalena' ? 'Magdalena br Hutabarat' : brideNick}
          </h1>
        </motion.div>

        {/* Guest Information Box - Replicating classic modern card alignment */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-8 sm:mt-10 bg-white border border-[#E5E5E5] p-5 sm:p-6 shadow-sm max-w-sm sm:max-w-md w-full relative"
          id="guest-card"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#D4AF37]/60" />
          <p className="text-[10px] font-sans tracking-[0.2em] uppercase text-[#A0A0A0] mb-2 font-semibold">Kepada Yth. Sdr/i Bapak/Ibu/Kerabat:</p>
          <h3 id="guestName" className="font-serif text-lg sm:text-xl font-medium text-[#1A1A1A] tracking-wide mb-1 select-all border-b border-[#D4AF37]/20 pb-2 px-1 inline-block max-w-full truncate">
            {guestName || "Tamu Undangan"}
          </h3>
          <p className="text-[#A0A0A0] font-sans text-[10px] tracking-wide uppercase mt-2">
            Kami mengundang Anda untuk merayakan kesatuan kudus pernikahan kami.
          </p>
        </motion.div>

        {/* Enter Button (Save the Date Action) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-10"
        >
          <button
            onClick={onOpen}
            className="group relative inline-flex items-center gap-3 px-8 py-3.5 bg-[#1A1A1A] hover:bg-[#2C2C2C] text-white text-[11px] tracking-[0.25em] font-sans uppercase font-semibold transition-all duration-300 shadow-lg hover:shadow-[#1a1a1a]/15 transform hover:-translate-y-0.5"
            id="btn-open-invitation"
          >
            <MailOpen className="w-4 h-4 text-[#D4AF37]" />
            <span>Buka Undangan</span>
          </button>
        </motion.div>
      </div>

      {/* Footer Meta & Date */}
      <div className="z-10 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 mt-4 sm:mt-0 pt-4 border-t border-[#1A1A1A]/5">
        <div className="max-w-xs text-center sm:text-left">
          <p className="text-[10px] leading-relaxed tracking-wider font-sans uppercase text-[#888]">
            The Ritz-Carlton Jakarta &amp;<br/>
            Gereja HKBP Kebayoran Baru
          </p>
        </div>

        <div className="text-center sm:text-right">
          <p className="text-[12px] tracking-[0.15em] font-sans uppercase font-bold text-[#1A1A1A]">Sabtu, 18 Juli 2026</p>
          <p className="text-[10px] tracking-wide italic text-[#888] mt-0.5">Pukul Sembilan Pagi Hari</p>
        </div>
      </div>

      {/* Elegant Large Monogram Background Motif */}
      <div className="absolute -bottom-16 -left-16 opacity-[0.03] select-none pointer-events-none z-0 hidden sm:block">
        <span className="text-[320px] font-serif italic font-extralight text-[#1A1A1A] tracking-tighter">M&amp;J</span>
      </div>
    </div>
  );
}
