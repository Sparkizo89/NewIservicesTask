import React from 'react';
import { FaLayerGroup, FaAddressBook, FaEnvelope, FaFileSignature, FaClipboardList, FaBoxOpen, FaBox } from 'react-icons/fa6';
import { motion } from 'motion/react';
import { ProcedureCategory } from '../types';

interface BottomNavBarProps {
    activeCategory: ProcedureCategory;
    onSelectCategory: (category: ProcedureCategory) => void;
}

const navItems = [
    { id: 'all', label: 'Proc.', icon: FaLayerGroup },
    { id: 'stock', label: 'Stock', icon: FaBoxOpen },
    { id: 'colis', label: 'Colis', icon: FaBox },
    { id: 'qualirepar', label: 'Quali', icon: FaFileSignature },
    { id: 'intake', label: 'Tickets', icon: FaClipboardList },
    { id: 'contacts', label: 'Contacts', icon: FaAddressBook },
    { id: 'mailbox', label: 'Mail', icon: FaEnvelope },
] as const;

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeCategory, onSelectCategory }) => {
    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none print:hidden">
            {/* Glass blur background layer */}
            <div className="pointer-events-auto">
                {/* Safe area padding for iPhones with home bar */}
                <div
                    className="backdrop-blur-2xl dark:bg-[#0a0a0a]/80 bg-white/80 border-t dark:border-white/[0.07] border-black/[0.07] shadow-[0_-8px_40px_rgba(0,0,0,0.12)]"
                    style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
                >
                    <nav className="flex items-center justify-around px-1 pt-2 pb-1">
                        {navItems.map((item) => {
                            const isActive = activeCategory === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onSelectCategory(item.id as ProcedureCategory)}
                                    className="relative flex flex-col items-center justify-center gap-1 flex-1 h-14 rounded-2xl transition-colors z-10 group"
                                >
                                    {/* Active pill background */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activePillMobile"
                                            className="absolute inset-x-1 top-1 bottom-1 bg-gradient-to-b from-orange-500 to-orange-600 rounded-[14px] shadow-[0_4px_20px_rgba(234,88,12,0.45),_inset_0_1px_1px_rgba(255,255,255,0.35)] -z-10"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                                        />
                                    )}

                                    {/* Icon */}
                                    <motion.div
                                        animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }}
                                        transition={{ type: "spring", bounce: 0.45, duration: 0.35 }}
                                    >
                                        <item.icon
                                            className={`text-[18px] transition-colors duration-200 ${isActive
                                                ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
                                                : 'text-neutral-400 dark:text-neutral-500 group-active:text-orange-500'
                                                }`}
                                        />
                                    </motion.div>

                                    {/* Label */}
                                    <span
                                        className={`text-[9px] font-tech uppercase tracking-wider leading-none transition-colors duration-200 ${isActive
                                            ? 'text-white/90 font-bold'
                                            : 'text-neutral-400 dark:text-neutral-600'
                                            }`}
                                    >
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default BottomNavBar;
