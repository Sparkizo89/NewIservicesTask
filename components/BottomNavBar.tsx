import React from 'react';
import { FaLayerGroup, FaAddressBook, FaEnvelope, FaFileSignature, FaClipboardList } from 'react-icons/fa6';
import { motion } from 'motion/react';
import { ProcedureCategory } from '../types';

interface BottomNavBarProps {
    activeCategory: ProcedureCategory;
    onSelectCategory: (category: ProcedureCategory) => void;
}

const navItems = [
    { id: 'all', label: 'Procédures', icon: FaLayerGroup },
    { id: 'qualirepar', label: 'QualiRépar', icon: FaFileSignature },
    { id: 'intake', label: 'Prise en Charge', icon: FaClipboardList },
    { id: 'contacts', label: 'Contacts', icon: FaAddressBook },
    { id: 'mailbox', label: 'Messagerie', icon: FaEnvelope },
] as const;

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeCategory, onSelectCategory }) => {
    return (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none print:hidden">
            <nav className="elastic-group flex items-center justify-between w-full max-w-md rounded-[24px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.1)] border dark:border-white/10 border-black/10 p-2 relative overflow-visible backdrop-blur-xl dark:bg-[#1a1a1a]/80 bg-white/80 pointer-events-auto">
                {navItems.map((item) => {
                    const isActive = activeCategory === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onSelectCategory(item.id as ProcedureCategory)}
                            className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl text-[10px] font-tech uppercase tracking-widest transition-colors z-10 ${isActive
                                ? 'text-white font-bold drop-shadow-md'
                                : 'text-neutral-500 hover:text-black dark:hover:text-white font-medium'
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeBubbleMobile"
                                    className="absolute inset-0 bg-gradient-to-tr from-orange-600 to-orange-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_2px_15px_rgba(234,88,12,0.6)] rounded-2xl -z-10"
                                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                                />
                            )}
                            <motion.div animate={{ scale: isActive ? 1.15 : 1 }} transition={{ type: "spring", bounce: 0.4 }}>
                                <item.icon className="text-xl" />
                            </motion.div>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default BottomNavBar;
