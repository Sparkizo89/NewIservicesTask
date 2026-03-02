import React, { useState, useEffect, useRef } from 'react';
import { FaBolt, FaMoon, FaSun, FaLayerGroup, FaAddressBook, FaBookOpen, FaEnvelope, FaFileSignature, FaMagnifyingGlass, FaXmark, FaWandMagicSparkles, FaRotate, FaClipboardList } from 'react-icons/fa6';
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
}

const navItems = [
    { id: 'all', label: 'Procédures', icon: FaLayerGroup },
    { id: 'qualirepar', label: 'QualiRépar', icon: FaFileSignature },
    { id: 'intake', label: 'Prise en Charge', icon: FaClipboardList },
    { id: 'contacts', label: 'Contacts', icon: FaAddressBook },
    { id: 'mailbox', label: 'Messagerie', icon: FaEnvelope },
] as const;

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleTheme, activeCategory, onSelectCategory, searchQuery, setSearchQuery, isScrolled, onAskGemini, guideResponse, isThinking, renderFormattedResponse }) => {
    const [scrambleTitle, setScrambleTitle] = useState(false);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Randomly trigger the scramble effect
        const scheduleScramble = () => {
            const randomDelay = Math.random() * 5000 + 3000; // Between 3s and 8s
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
    const headerRef = useRef<HTMLDivElement>(null);

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
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSearchExpanded, setSearchQuery]);

    return (
        <header ref={headerRef} className="fixed top-0 left-0 w-full h-auto md:h-24 z-50 px-4 md:px-6 py-4 md:py-0 flex items-center md:items-end pb-3 md:pb-4 transition-colors pointer-events-none">
            <div className="max-w-[1600px] mx-auto w-full flex flex-row items-center justify-between gap-4 md:gap-0">

                {/* LEFT COLUMN: LOGO */}
                <div className={`flex items-center gap-3 md:gap-4 group cursor-default w-auto md:w-[250px] justify-start shrink-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-auto ${isScrolled ? '-translate-y-20 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
                    <div className="relative">
                        <div className="w-10 h-10 md:w-12 md:h-12 border dark:border-[#333] border-neutral-300 dark:bg-[#0a0a0a] bg-neutral-100 flex items-center justify-center text-orange-600 rounded-full group-hover:bg-orange-600 group-hover:text-black transition-colors duration-300">
                            <FaBolt className="text-lg md:text-xl" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 dark:bg-white bg-black rounded-full border-2 dark:border-black border-white"></div>
                    </div>
                    <div className="flex flex-col justify-center h-full w-[150px] md:w-[200px]"> {/* Fixed width to prevent layout shift */}
                        <h1 className="text-xl md:text-3xl font-tech dark:text-white text-black tracking-tighter uppercase leading-none transition-colors whitespace-nowrap">
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

                {/* CENTER COLUMN: NAVBAR & SEARCH (BOTTOM BAR ON MOBILE) */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 md:static md:translate-x-0 md:flex-1 md:justify-center md:gap-4 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-auto">
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
                                    className={`relative flex items-center justify-center gap-2 px-4 lg:px-5 py-3 lg:py-3 text-[14px] lg:text-sm font-tech uppercase tracking-widest transition-colors z-10 pointer-events-auto ${isActive
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
                                        <item.icon className="text-xl lg:text-lg mb-0.5" />
                                    </motion.div>
                                    <span className="hidden xl:block">{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Expandable Search Bubble */}
                    <div className="relative flex items-start justify-end h-12 lg:h-12 w-12 lg:w-[48px] shrink-0 z-50 pointer-events-auto">
                        <div
                            style={{
                                width: isSearchExpanded ? ((guideResponse || isThinking) ? (window.innerWidth < 768 ? window.innerWidth - 24 : 500) : (window.innerWidth < 768 ? 300 : 250)) : 48,
                                maxHeight: isSearchExpanded && (guideResponse || isThinking) ? '60vh' : '48px',
                                backgroundColor: isSearchExpanded ? (isDarkMode ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.9)') : (isDarkMode ? (isScrolled ? 'rgba(26,26,26,0.4)' : 'rgba(26,26,26,0.4)') : (isScrolled ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.4)')),
                                borderColor: isDarkMode ? (isScrolled ? 'rgba(255,255,255,0.1)' : 'rgba(51,51,51,0.5)') : (isScrolled ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.6)')
                            }}
                            className={`elastic-group absolute md:top-0 md:left-0 bottom-0 left-1/2 -translate-x-1/2 md:translate-x-0 md:bottom-auto md:right-auto flex flex-col-reverse md:flex-col overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] border rounded-[24px] transition-all duration-500 will-change-transform ${isScrolled ? 'backdrop-blur-sm shadow-md' : 'backdrop-blur-xl'}`}
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
                                        <div className="dark:bg-[#111]/80 bg-neutral-50/80 p-4 rounded-xl border dark:border-[#222] border-neutral-200 mb-2 md:mb-0 md:mt-2 font-sans overflow-hidden shadow-inner">
                                            {renderFormattedResponse(guideResponse)}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: CONTROLS (THEME TOGGLE) */}
                <div className={`flex items-center gap-4 md:gap-6 w-auto md:w-[250px] justify-end shrink-0 absolute right-4 top-4 md:static md:inset-auto transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-auto ${isScrolled ? '-translate-y-20 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
                    {/* Liquid Glass Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="relative flex items-center h-10 md:h-12 w-28 md:w-32 rounded-full border dark:border-white/10 border-black/5 dark:bg-white/10 bg-black/5 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] transition-colors cursor-pointer overflow-hidden p-1 group"
                        aria-label="Toggle Dark Mode"
                    >
                        {/* Thumb Indicator */}
                        <motion.div
                            layout
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className={`absolute top-1 bottom-1 w-12 md:w-14 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15),_inset_0_1px_1px_rgba(255,255,255,0.8)] flex items-center justify-center ${isDarkMode ? 'bg-[#1a1a1a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-[#333]' : 'bg-white'
                                }`}
                            style={{
                                left: isDarkMode ? 'calc(100% - 3.5rem - 4px)' : '4px',
                            }}
                        >
                            <motion.div
                                initial={false}
                                animate={{ rotate: isDarkMode ? 360 : 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                className={isDarkMode ? 'text-white' : 'text-orange-500'}
                            >
                                {isDarkMode ? <FaMoon className="text-sm md:text-base" /> : <FaSun className="text-sm md:text-base" />}
                            </motion.div>
                        </motion.div>

                        {/* Text Labels */}
                        <div className="flex w-full px-2">
                            <span className={`flex-1 text-center font-tech uppercase font-bold text-xs md:text-sm tracking-widest transition-colors duration-300 ${!isDarkMode ? 'text-black opacity-100 ml-10' : 'opacity-0'}`}>Jour</span>
                            <span className={`absolute inset-0 flex items-center font-tech uppercase font-bold text-xs md:text-sm tracking-widest transition-colors duration-300 ${isDarkMode ? 'text-white opacity-100 pr-12 justify-center' : 'opacity-0 pointer-events-none'}`}>Nuit</span>
                        </div>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;