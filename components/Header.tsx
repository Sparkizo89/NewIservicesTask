import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';

import { FaBolt, FaMoon, FaSun, FaLayerGroup, FaAddressBook, FaBookOpen, FaEnvelope, FaFileSignature, FaMagnifyingGlass, FaXmark, FaWandMagicSparkles, FaRotate, FaClipboardList, FaBoxOpen, FaArrowRightFromBracket, FaGoogle, FaBox } from 'react-icons/fa6';
import { motion, AnimatePresence } from 'motion/react';
import ScrambleText from './ScrambleText';
import { ProcedureCategory } from '../types';

interface HeaderProps {
    isDarkMode: boolean;
    toggleTheme: (e?: React.MouseEvent) => void;
    activeCategory: ProcedureCategory;
    onSelectCategory: (category: ProcedureCategory) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isScrolled: boolean;
    onAskGemini: (e?: React.FormEvent) => void;
    guideResponse: string | null;
    isThinking: boolean;
    renderFormattedResponse: (text: string) => React.ReactNode;
    user: User | null;
    onLogin: () => void;
    onLogout: () => void;
    onSwitchAccount: () => void;
}

const navItems = [
    { id: 'all', label: 'Procédures', icon: FaLayerGroup },
    { id: 'stock', label: 'Stock', icon: FaBoxOpen },
    { id: 'colis', label: 'Colis', icon: FaBox },
    { id: 'qualirepar', label: 'QualiRépar', icon: FaFileSignature },
    { id: 'intake', label: 'Tickets', icon: FaClipboardList },
    { id: 'contacts', label: 'Contacts', icon: FaAddressBook },
    { id: 'mailbox', label: 'Messagerie', icon: FaEnvelope },
] as const;

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleTheme, activeCategory, onSelectCategory, searchQuery, setSearchQuery, isScrolled, onAskGemini, guideResponse, isThinking, renderFormattedResponse, user, onLogin, onLogout, onSwitchAccount }) => {
    const [scrambleTitle, setScrambleTitle] = useState(false);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const mobileSearchRef = useRef<HTMLInputElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Randomly trigger the scramble effect
        const scheduleScramble = () => {
            const randomDelay = Math.random() * 5000 + 3000;
            return setTimeout(() => {
                setScrambleTitle(true);
                setTimeout(() => {
                    setScrambleTitle(false);
                    timerRef.current = scheduleScramble();
                }, 1000);
            }, randomDelay);
        };

        let timerRef = { current: scheduleScramble() };
        return () => clearTimeout(timerRef.current);
    }, []);

    // Auto-close search when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isSearchExpanded &&
                headerRef.current &&
                !headerRef.current.contains(event.target as Node)
            ) {
                setIsSearchExpanded(false);
                setSearchQuery('');
            }
            if (mobileSearchOpen && headerRef.current && !headerRef.current.contains(event.target as Node)) {
                setMobileSearchOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSearchExpanded, mobileSearchOpen, setSearchQuery]);

    const openMobileSearch = () => {
        setMobileSearchOpen(true);
        setTimeout(() => mobileSearchRef.current?.focus(), 50);
    };

    const closeMobileSearch = () => {
        setMobileSearchOpen(false);
        setSearchQuery('');
    };

    return (
        <>
            {/* ========================================================
                DESKTOP HEADER (md and up) — unchanged
            ======================================================== */}
            <header
                ref={headerRef}
                className="hidden md:flex fixed top-0 left-0 w-full h-auto md:h-24 z-50 px-4 md:px-6 py-4 md:py-0 items-center md:items-end pb-3 md:pb-4 transition-colors pointer-events-none"
            >
                <div className="max-w-[1600px] mx-auto w-full flex flex-row items-center justify-between gap-4 md:gap-0">

                    {/* LEFT COLUMN: LOGO */}
                    <div className={`flex items-center gap-2 md:gap-3 group cursor-default w-[160px] md:w-auto md:flex-[0.5] justify-start transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-auto ${isScrolled ? '-translate-y-20 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
                        <div className="relative">
                            <div className="w-10 h-10 md:w-12 md:h-12 border dark:border-[#333] border-neutral-300 dark:bg-[#0a0a0a] bg-neutral-100 flex items-center justify-center text-orange-600 rounded-full group-hover:bg-orange-600 group-hover:text-black transition-colors duration-300">
                                <FaBolt className="text-lg md:text-xl" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 dark:bg-white bg-black rounded-full border-2 dark:border-black border-white"></div>
                        </div>
                        <div className="flex flex-col justify-center h-full min-w-[120px] md:min-w-[140px]">
                            <h1 className="text-lg md:text-xl lg:text-2xl font-tech dark:text-white text-black tracking-tighter uppercase leading-none transition-colors whitespace-nowrap">
                                <ScrambleText text="iServices" trigger={scrambleTitle} />
                                <span className="text-neutral-500">
                                    <ScrambleText text=".task" trigger={scrambleTitle} />
                                </span>
                            </h1>
                            <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                                <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-pulse shrink-0"></span>
                                <p className="text-[9px] md:text-[10px] text-neutral-500 font-tech uppercase tracking-[0.2em] truncate">OS v3.0</p>
                            </div>
                        </div>
                    </div>

                    {/* CENTER COLUMN: NAVBAR & SEARCH */}
                    <div className="hidden md:flex items-center gap-2 md:static md:flex-1 md:justify-center md:gap-3 md:translate-y-1 lg:translate-y-1.5 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-auto">
                        {/* Liquid Glass Navbar */}
                        <nav className={`elastic-group flex items-center rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] border p-1 relative overflow-visible transition-all duration-500 ${isScrolled ? 'backdrop-blur-sm dark:bg-[#1a1a1a]/40 bg-white/40 dark:border-white/10 border-black/10 shadow-md' : 'backdrop-blur-xl dark:bg-[#1a1a1a]/40 bg-white/40 dark:border-[#333]/50 border-white/60'} ${isSearchExpanded ? 'hidden md:flex' : 'flex'}`}>
                            {navItems.map((item) => {
                                const isActive = activeCategory === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            onSelectCategory(item.id as ProcedureCategory);
                                        }}
                                        className={`relative flex items-center justify-center gap-1.5 px-2 lg:px-2.5 xl:px-2 py-1.5 lg:py-2 text-[10px] lg:text-[11px] xl:text-[11px] font-tech uppercase tracking-widest transition-colors z-10 pointer-events-auto ${isActive
                                            ? 'text-white font-bold drop-shadow-md'
                                            : 'text-neutral-500 hover:text-black dark:hover:text-white font-medium'
                                            }`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeBubble"
                                                className="absolute inset-0 bg-gradient-to-tr from-orange-600 to-orange-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_2px_15px_rgba(234,88,12,0.6)] liquid-morph -z-10 animate-water-drop"
                                                transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                                            />
                                        )}
                                        <motion.div animate={{ scale: isActive ? 1.15 : 1 }} transition={{ type: "spring", bounce: 0.4 }}>
                                            <item.icon className="text-lg lg:text-[15px] mb-0.5" />
                                        </motion.div>
                                        <span className="hidden lg:block whitespace-nowrap">{item.label}</span>
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Expandable Search Bubble */}
                        <div className="relative flex items-start justify-end h-12 lg:h-12 w-12 lg:w-[48px] shrink-0 z-50 pointer-events-auto">
                            <div
                                style={{
                                    width: isSearchExpanded ? ((guideResponse || isThinking) ? 500 : 250) : 48,
                                    maxHeight: isSearchExpanded && (guideResponse || isThinking) ? '60vh' : '48px',
                                    backgroundColor: isSearchExpanded ? (isDarkMode ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.9)') : (isDarkMode ? 'rgba(26,26,26,0.4)' : 'rgba(255,255,255,0.4)'),
                                    borderColor: isDarkMode ? (isScrolled ? 'rgba(255,255,255,0.1)' : 'rgba(51,51,51,0.5)') : (isScrolled ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.6)')
                                }}
                                className={`elastic-group absolute top-0 left-0 flex flex-col overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] border rounded-[24px] transition-all duration-500 will-change-transform ${isScrolled ? 'backdrop-blur-sm shadow-md' : 'backdrop-blur-xl'}`}
                            >
                                {/* Input Row */}
                                <div className="flex items-center w-full h-12 shrink-0 relative">
                                    <button
                                        onClick={() => {
                                            if (!isSearchExpanded) {
                                                setIsSearchExpanded(true);
                                                setTimeout(() => searchInputRef.current?.focus(), 50);
                                            }
                                        }}
                                        className={`absolute left-0 w-12 h-12 flex items-center justify-center transition-colors z-20 pointer-events-auto ${!isSearchExpanded ? 'cursor-pointer hover:bg-white/20 dark:hover:bg-[#222]/20' : 'cursor-default'}`}
                                        aria-label="Search"
                                    >
                                        <FaMagnifyingGlass className={`text-xl lg:text-lg transition-colors duration-300 ${isSearchExpanded ? 'text-orange-600' : 'text-neutral-500 hover:text-orange-600'}`} />
                                    </button>

                                    <form onSubmit={(e) => { e.preventDefault(); if (isSearchExpanded && searchQuery.trim()) onAskGemini(e); }} className="w-full h-full relative flex items-center">
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Recherche & IA..."
                                            className={`w-full h-full pl-12 pr-20 bg-transparent outline-none text-[15px] dark:text-white font-tech tracking-wider placeholder:text-neutral-400 absolute left-0 flex items-center pt-[2px] pointer-events-auto transition-opacity duration-300 ${isSearchExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                                        />
                                        <button
                                            type="submit"
                                            disabled={isThinking || !searchQuery.trim()}
                                            className={`absolute right-10 p-2 rounded-full text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-50 transition-all duration-300 z-20 flex items-center justify-center ${isSearchExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'}`}
                                            title="Assistant IA"
                                        >
                                            <FaWandMagicSparkles className="text-[14px]" />
                                        </button>
                                    </form>

                                    <button
                                        onClick={() => {
                                            setIsSearchExpanded(false);
                                            setSearchQuery('');
                                        }}
                                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full pointer-events-auto dark:hover:bg-neutral-800 hover:bg-neutral-200 transition-all duration-300 z-20 flex items-center justify-center ${isSearchExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'}`}
                                    >
                                        <FaXmark className="text-neutral-500 text-[18px]" />
                                    </button>
                                </div>

                                {/* Dropdown Answer Section */}
                                <div className={`w-full overflow-y-auto custom-scrollbar transition-opacity duration-500 delay-100 ${isThinking || guideResponse ? 'opacity-100' : 'opacity-0 hidden'}`}>
                                    <div className="p-4 pt-0">
                                        {isThinking ? (
                                            <div className="flex flex-col items-center justify-center p-6 gap-3 opacity-60">
                                                <div className="w-6 h-6 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                                                <span className="font-tech text-xs tracking-widest text-orange-500 uppercase">Analyse Neurale...</span>
                                            </div>
                                        ) : guideResponse ? (
                                            <div className="dark:bg-[#111]/80 bg-neutral-50/80 p-4 rounded-xl border dark:border-[#222] border-neutral-200 mt-2 font-sans overflow-hidden shadow-inner">
                                                {renderFormattedResponse(guideResponse)}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: CONTROLS */}
                    <div className={`hidden md:flex items-center gap-2 md:gap-3 w-auto md:flex-[0.5] justify-end transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-auto ${isScrolled ? '-translate-y-20 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>

                        {/* Auth Section */}
                        {user ? (
                            <div className="relative group/auth">
                                <div className="flex items-center gap-2.5 bg-white/5 dark:bg-black/20 backdrop-blur-md rounded-full border dark:border-white/10 border-black/5 px-2 py-1.5 cursor-pointer hover:border-orange-500/40 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                    <div className="relative">
                                        <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-orange-500/60" />
                                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 dark:border-black border-neutral-100"></span>
                                    </div>
                                    <div className="hidden lg:flex flex-col leading-tight">
                                        <span className="text-[9px] dark:text-neutral-500 text-neutral-400 font-tech uppercase tracking-widest">Connecté</span>
                                        <span className="text-[11px] lg:text-[12px] dark:text-white text-black font-bold font-tech truncate max-w-[70px]">{user.displayName?.split(' ')[0]}</span>
                                    </div>
                                    <svg className="w-3 h-3 dark:text-neutral-500 text-neutral-400 ml-0.5 hidden lg:block transition-transform duration-300 group-hover/auth:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                </div>

                                {/* Dropdown Card */}
                                <div className="absolute right-0 top-full mt-3 w-64 opacity-0 invisible group-hover/auth:opacity-100 group-hover/auth:visible translate-y-2 group-hover/auth:translate-y-0 transition-all duration-300 z-50">
                                    <div className="dark:bg-[#111] bg-white rounded-2xl border dark:border-[#222] border-neutral-200 shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden">
                                        <div className="p-4 bg-gradient-to-br from-orange-600/10 to-transparent border-b dark:border-[#222] border-neutral-100 flex items-center gap-3">
                                            <div className="relative shrink-0">
                                                <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-12 h-12 rounded-full border-2 border-orange-500/50 shadow-[0_0_15px_rgba(234,88,12,0.3)]" />
                                                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 dark:border-[#111] border-white shadow"></span>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-bold dark:text-white text-black font-tech truncate">{user.displayName}</span>
                                                <span className="text-[10px] dark:text-neutral-500 text-neutral-400 truncate">{user.email}</span>
                                                <span className="text-[9px] text-orange-500 font-tech uppercase tracking-widest mt-0.5">● Accès autorisé</span>
                                            </div>
                                        </div>
                                        <div className="p-2 flex flex-col gap-1">
                                            <button
                                                onClick={onSwitchAccount}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl dark:hover:bg-white/5 hover:bg-neutral-50 transition-colors text-left group/btn">
                                                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                                    <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-tech dark:text-neutral-300 text-neutral-700 font-medium">Changer de compte</span>
                                                    <span className="text-[9px] dark:text-neutral-600 text-neutral-400">Se connecter avec un autre compte Google</span>
                                                </div>
                                            </button>
                                            <div className="h-px dark:bg-[#222] bg-neutral-100 mx-2"></div>
                                            <button
                                                onClick={onLogout}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/5 transition-colors text-left group/btn"
                                            >
                                                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                                                    <FaArrowRightFromBracket className="text-[13px] text-red-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-tech text-red-400 font-medium">Déconnexion</span>
                                                    <span className="text-[9px] dark:text-neutral-600 text-neutral-400">Quitter votre session</span>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={onLogin}
                                className="flex items-center gap-2 px-4 py-2 rounded-full border border-orange-500/30 dark:bg-orange-500/10 bg-orange-500/5 hover:bg-orange-500 hover:text-white dark:text-orange-500 text-orange-600 font-tech uppercase tracking-widest text-[10px] md:text-xs transition-all duration-300 shadow-[0_0_15px_rgba(234,88,12,0.1)]"
                            >
                                <FaGoogle className="text-sm" />
                                <span className="hidden sm:block">Google Connexion</span>
                            </button>
                        )}

                        {/* Liquid Glass Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="relative flex items-center h-10 md:h-12 w-24 md:w-28 rounded-full border dark:border-white/10 border-black/5 dark:bg-white/10 bg-black/5 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] transition-colors cursor-pointer overflow-hidden p-1 group"
                            aria-label="Toggle Dark Mode"
                        >
                            <motion.div
                                layout
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                className={`absolute top-1 bottom-1 w-10 md:w-12 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15),_inset_0_1px_1px_rgba(255,255,255,0.8)] flex items-center justify-center ${isDarkMode ? 'bg-[#1a1a1a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-[#333]' : 'bg-white'}`}
                                style={{
                                    left: isDarkMode ? 'calc(100% - 2.5rem - 4px)' : '4px',
                                }}
                            >
                                <motion.div
                                    initial={false}
                                    animate={{ rotate: isDarkMode ? 360 : 0 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                    className={isDarkMode ? 'text-white' : 'text-orange-500'}
                                >
                                    {isDarkMode ? <FaMoon className="text-xs md:text-sm" /> : <FaSun className="text-xs md:text-sm" />}
                                </motion.div>
                            </motion.div>

                            <div className="flex w-full px-2">
                                <span className={`flex-1 text-center font-tech uppercase font-bold text-[9px] md:text-[10px] tracking-widest transition-colors duration-300 ${!isDarkMode ? 'text-black opacity-100 ml-8 md:ml-10' : 'opacity-0'}`}>Jour</span>
                                <span className={`absolute inset-0 flex items-center font-tech uppercase font-bold text-[9px] md:text-[10px] tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-white opacity-100 pr-10 md:pr-12 justify-center' : 'opacity-0 pointer-events-none'}`}>Nuit</span>
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* ========================================================
                MOBILE HEADER (visible only on < md)
                Compact top bar: Logo | AI Search | Auth + Theme
            ======================================================== */}
            <header
                ref={headerRef}
                className="md:hidden fixed top-0 left-0 right-0 z-50 pointer-events-none"
            >
                {/* Main bar */}
                <div className={`flex items-center justify-between px-4 py-3 pointer-events-auto transition-all duration-300 ${isScrolled
                    ? 'dark:bg-[#0a0a0a]/90 bg-white/90 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.08)] dark:shadow-[0_1px_0_rgba(255,255,255,0.05)]'
                    : 'dark:bg-transparent bg-transparent'
                    }`}>

                    {/* LEFT: Logo */}
                    <div className="flex items-center gap-2.5 group">
                        <div className="relative">
                            <div className="w-9 h-9 border dark:border-[#333] border-neutral-300 dark:bg-[#0a0a0a] bg-neutral-100 flex items-center justify-center text-orange-600 rounded-full">
                                <FaBolt className="text-sm" />
                            </div>
                            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 dark:bg-white bg-black rounded-full border-2 dark:border-black border-white"></div>
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-base font-tech dark:text-white text-black tracking-tighter uppercase leading-none">
                                <ScrambleText text="iServices" trigger={scrambleTitle} />
                                <span className="text-neutral-500">
                                    <ScrambleText text=".task" trigger={scrambleTitle} />
                                </span>
                            </h1>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-1 h-1 bg-orange-600 rounded-full animate-pulse shrink-0"></span>
                                <p className="text-[8px] text-neutral-500 font-tech uppercase tracking-[0.15em]">OS v3.0</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Controls */}
                    <div className="flex items-center gap-2">
                        {/* AI Search Button */}
                        <button
                            onClick={openMobileSearch}
                            className="w-9 h-9 flex items-center justify-center rounded-full border dark:border-white/10 border-black/10 dark:bg-white/5 bg-black/5 backdrop-blur-md text-neutral-500 hover:text-orange-600 transition-colors"
                            aria-label="Recherche IA"
                        >
                            <FaMagnifyingGlass className="text-sm" />
                        </button>

                        {/* Theme toggle — compact icon only */}
                        <button
                            onClick={toggleTheme}
                            className="w-9 h-9 flex items-center justify-center rounded-full border dark:border-white/10 border-black/10 dark:bg-white/5 bg-black/5 backdrop-blur-md transition-colors"
                            aria-label="Toggle Dark Mode"
                        >
                            <motion.div
                                initial={false}
                                animate={{ rotate: isDarkMode ? 360 : 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                className={isDarkMode ? 'text-white' : 'text-orange-500'}
                            >
                                {isDarkMode ? <FaMoon className="text-sm" /> : <FaSun className="text-sm" />}
                            </motion.div>
                        </button>

                        {/* Auth — avatar or login icon */}
                        {user ? (
                            <div className="relative group/mobileauth">
                                <div className="w-9 h-9 rounded-full cursor-pointer relative">
                                    <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-9 h-9 rounded-full border-2 border-orange-500/60 object-cover" />
                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 dark:border-[#0a0a0a] border-white"></span>
                                </div>
                                {/* Dropdown */}
                                <div className="absolute right-0 top-full mt-3 w-56 opacity-0 invisible group-hover/mobileauth:opacity-100 group-hover/mobileauth:visible translate-y-2 group-hover/mobileauth:translate-y-0 transition-all duration-300 z-50">
                                    <div className="dark:bg-[#111] bg-white rounded-2xl border dark:border-[#222] border-neutral-200 shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden">
                                        <div className="p-3 bg-gradient-to-br from-orange-600/10 to-transparent border-b dark:border-[#222] border-neutral-100 flex items-center gap-2.5">
                                            <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border-2 border-orange-500/50" />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold dark:text-white text-black font-tech truncate">{user.displayName}</span>
                                                <span className="text-[9px] dark:text-neutral-500 text-neutral-400 truncate">{user.email}</span>
                                            </div>
                                        </div>
                                        <div className="p-2 flex flex-col gap-1">
                                            <button onClick={onSwitchAccount} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl dark:hover:bg-white/5 hover:bg-neutral-50 transition-colors">
                                                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                                    <svg className="w-3 h-3 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                                                </div>
                                                <span className="text-xs font-tech dark:text-neutral-300 text-neutral-700">Changer de compte</span>
                                            </button>
                                            <div className="h-px dark:bg-[#222] bg-neutral-100 mx-2"></div>
                                            <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-red-500/5 transition-colors">
                                                <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                                                    <FaArrowRightFromBracket className="text-[11px] text-red-400" />
                                                </div>
                                                <span className="text-xs font-tech text-red-400">Déconnexion</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={onLogin}
                                className="w-9 h-9 flex items-center justify-center rounded-full border border-orange-500/30 dark:bg-orange-500/10 bg-orange-500/5 text-orange-600 dark:text-orange-500 transition-all"
                                aria-label="Connexion"
                            >
                                <FaGoogle className="text-sm" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile AI Search Overlay */}
                <AnimatePresence>
                    {mobileSearchOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="absolute top-0 left-0 right-0 z-50 pointer-events-auto"
                        >
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 bg-black/40 backdrop-blur-sm -z-10"
                                onClick={closeMobileSearch}
                            />

                            <div className={`mx-3 mt-3 rounded-[24px] overflow-hidden border shadow-[0_20px_60px_rgba(0,0,0,0.3)] ${isDarkMode
                                ? 'bg-[#111]/95 border-white/10'
                                : 'bg-white/95 border-black/10'
                                } backdrop-blur-2xl`}
                                style={{ maxHeight: '70vh' }}
                            >
                                {/* Search Input Row */}
                                <div className="flex items-center gap-3 px-4 h-14 border-b dark:border-white/10 border-black/5">
                                    <FaMagnifyingGlass className="text-orange-600 text-base shrink-0" />
                                    <form
                                        onSubmit={(e) => { e.preventDefault(); if (searchQuery.trim()) onAskGemini(e); }}
                                        className="flex-1 flex items-center gap-2"
                                    >
                                        <input
                                            ref={mobileSearchRef}
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Recherche & IA..."
                                            className="flex-1 bg-transparent outline-none text-[15px] dark:text-white text-black font-tech tracking-wide placeholder:text-neutral-400"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isThinking || !searchQuery.trim()}
                                            className="p-2 rounded-full text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-40 transition-all flex items-center justify-center"
                                        >
                                            <FaWandMagicSparkles className="text-xs" />
                                        </button>
                                    </form>
                                    <button
                                        onClick={closeMobileSearch}
                                        className="p-2 rounded-full dark:hover:bg-neutral-800 hover:bg-neutral-100 transition-colors"
                                    >
                                        <FaXmark className="text-neutral-500 text-base" />
                                    </button>
                                </div>

                                {/* AI Response */}
                                <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 56px)' }}>
                                    {isThinking ? (
                                        <div className="flex flex-col items-center justify-center p-8 gap-3 opacity-60">
                                            <div className="w-6 h-6 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                                            <span className="font-tech text-xs tracking-widest text-orange-500 uppercase">Analyse Neurale...</span>
                                        </div>
                                    ) : guideResponse ? (
                                        <div className="p-4">
                                            <div className="dark:bg-[#1a1a1a] bg-neutral-50 p-4 rounded-2xl border dark:border-[#222] border-neutral-200 font-sans overflow-hidden">
                                                {renderFormattedResponse(guideResponse)}
                                            </div>
                                        </div>
                                    ) : searchQuery.length === 0 ? (
                                        <div className="p-6 text-center">
                                            <div className="w-12 h-12 mx-auto rounded-full bg-orange-600/10 flex items-center justify-center mb-3">
                                                <FaWandMagicSparkles className="text-orange-600" />
                                            </div>
                                            <p className="text-sm font-tech dark:text-neutral-400 text-neutral-500 uppercase tracking-widest">Assistant IA</p>
                                            <p className="text-xs dark:text-neutral-600 text-neutral-400 mt-1">Posez une question sur les procédures</p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>
        </>
    );
};

export default Header;