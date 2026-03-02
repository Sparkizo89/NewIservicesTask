import React, { useState } from 'react';
import * as Fa6Icons from 'react-icons/fa6';
import { Procedure } from '../types';
import ScrambleText from './ScrambleText';

interface ProcedureCardProps {
  procedure: Procedure;
  onClick: (procedure: Procedure) => void;
}

const ProcedureCard: React.FC<ProcedureCardProps> = ({ procedure, onClick }) => {
  const [isGlitching, setIsGlitching] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Dynamically get icon component
  // @ts-ignore
  const IconComponent = Fa6Icons[procedure.icon.replace('fa-', '')]
    // @ts-ignore
    || Fa6Icons[Object.keys(Fa6Icons).find(k => k.toLowerCase() === procedure.icon.replace('fa-', '').replace(/-/g, ''))]
    || Fa6Icons.FaBolt;

  let Icon = Fa6Icons.FaBolt;
  switch (procedure.icon) {
    case 'fa-mobile-retro': Icon = Fa6Icons.FaMobileRetro; break;
    case 'fa-box-tissue': Icon = Fa6Icons.FaBoxTissue; break;
    case 'fa-truck-fast': Icon = Fa6Icons.FaTruckFast; break;
    case 'fa-circle-plus': Icon = Fa6Icons.FaCirclePlus; break;
    case 'fa-circle-minus': Icon = Fa6Icons.FaCircleMinus; break;
    case 'fa-truck': Icon = Fa6Icons.FaTruck; break;
  }

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGlitching(true);

    // Duration matches the CSS animation (0.2s)
    setTimeout(() => {
      setIsGlitching(false);
      onClick(procedure);
    }, 200);
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative dark:bg-[#1a1a1a]/40 bg-white/40 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] rounded-[32px] p-7 cursor-pointer transition-all duration-300 group overflow-hidden border dark:border-[#333]/50 border-white/60 hover:border-orange-500/50 hover:dark:bg-[#222]/50 hover:bg-white/60 active:scale-[0.98] glow-hover ${isGlitching ? 'glitch-active' : ''}`}
    >
      {/* Glitch Overlay Effect */}
      {isGlitching && (
        <div className="absolute inset-0 bg-orange-600 mix-blend-color-dodge opacity-20 pointer-events-none z-50"></div>
      )}

      {/* Nothing Glitch Texture on Hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] transition-opacity duration-500 pointer-events-none"></div>

      {/* Header with Icon and Code */}
      <div className="flex justify-between items-start mb-10">
        <div className="w-16 h-16 rounded-2xl dark:bg-black/40 bg-white/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] border dark:border-white/10 border-black/5 dark:text-white text-black flex items-center justify-center text-3xl group-hover:bg-orange-600/90 group-hover:text-black group-hover:border-orange-500/50 group-hover:shadow-[0_0_15px_rgba(234,88,12,0.4),_inset_0_1px_1px_rgba(255,255,255,0.4)] transition-all duration-300">
          <Icon />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-4xl dark:text-[#222] text-neutral-200 group-hover:text-[#333] transition-colors font-tech font-bold leading-none select-none">
            0{Math.floor(Math.random() * 9)}
          </span>
          <span className="text-[10px] font-tech text-orange-600 border border-orange-600/30 px-2 py-0.5 rounded uppercase tracking-wider bg-orange-600/5 mt-1">
            <ScrambleText text={procedure.code} trigger={isHovered} />
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <h3 className="font-tech text-2xl dark:text-white text-black mb-3 uppercase tracking-tight leading-none group-hover:text-orange-500 transition-colors">
          {procedure.title}
        </h3>
        <p className="text-sm font-sans text-neutral-500 leading-relaxed border-l-2 dark:border-[#262626] border-neutral-300 pl-3 group-hover:border-orange-600/50 transition-colors">
          {procedure.desc}
        </p>
      </div>

      {/* Footer Dots */}
      <div className="absolute bottom-6 right-6 flex gap-1.5 opacity-30 group-hover:opacity-100 transition-opacity">
        <div className="w-1.5 h-1.5 rounded-full dark:bg-white bg-black"></div>
        <div className="w-1.5 h-1.5 rounded-full dark:bg-white bg-black"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-orange-600"></div>
      </div>
    </div>
  );
};

export default ProcedureCard;