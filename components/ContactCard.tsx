import React from 'react';
import * as Fa6Icons from 'react-icons/fa6';
import { ContactItem } from '../types';

interface ContactCardProps {
  contact: ContactItem;
}

const ContactCard: React.FC<ContactCardProps> = ({ contact }) => {
  // Dynamically get icon
  // @ts-ignore
  const IconComponent = Fa6Icons[contact.icon.replace('fa-', '')]
    // @ts-ignore
    || Fa6Icons[Object.keys(Fa6Icons).find(k => k.toLowerCase() === contact.icon.replace('fa-', '').replace(/-/g, ''))]
    || Fa6Icons.FaAddressCard;

  let Icon = Fa6Icons.FaAddressCard;
  switch (contact.icon) {
    case 'fa-shield-halved': Icon = Fa6Icons.FaShieldHalved; break;
    case 'fa-mobile-screen': Icon = Fa6Icons.FaMobileScreen; break;
    case 'fa-truck-ramp-box': Icon = Fa6Icons.FaTruckRampBox; break;
    case 'fa-users': Icon = Fa6Icons.FaUsers; break;
    case 'fa-rotate': Icon = Fa6Icons.FaRotate; break;
    case 'fa-box-open': Icon = Fa6Icons.FaBoxOpen; break;
    case 'fa-microchip': Icon = Fa6Icons.FaMicrochip; break;
    case 'fa-shapes': Icon = Fa6Icons.FaShapes; break;
    case 'fa-triangle-exclamation': Icon = Fa6Icons.FaTriangleExclamation; break;
  }

  return (
    <div className="dark:bg-[#1a1a1a]/40 bg-white/40 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] rounded-[32px] p-6 border dark:border-[#333]/50 border-white/60 flex flex-col h-full group hover:dark:bg-[#222]/50 hover:bg-white/60 hover:dark:border-white/10 hover:border-black/10 transition-all duration-300 relative overflow-hidden">

      {/* Decorative large icon in background */}
      <div className="absolute -right-6 -bottom-6 text-9xl dark:text-[#1a1a1a] text-neutral-100 group-hover:dark:text-[#222] group-hover:text-neutral-200 transition-colors rotate-12 pointer-events-none opacity-50">
        <Icon />
      </div>

      <div className="flex items-center gap-5 mb-8 relative z-10">
        <div className="w-14 h-14 rounded-full dark:bg-black/40 bg-white/40 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] border dark:border-white/10 border-black/5 dark:text-white text-black flex items-center justify-center text-xl shrink-0 group-hover:scale-110 group-hover:bg-black/60 group-hover:text-white dark:group-hover:bg-white/90 dark:group-hover:text-black transition-all duration-300">
          <Icon />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-tech text-xl dark:text-white text-black uppercase tracking-wider truncate">{contact.role}</h3>
          <div className="h-0.5 w-8 bg-orange-600 mt-2 group-hover:w-full transition-all duration-500"></div>
        </div>
      </div>

      <div className="space-y-6 flex-1 relative z-10">
        {contact.email && (
          <div className="group/item">
            <span className="text-[9px] font-tech text-neutral-500 uppercase tracking-widest block mb-1">Adresse_Email</span>
            <a href={`mailto:${contact.email}`} className="text-sm font-mono dark:text-neutral-300 text-neutral-700 hover:text-orange-500 break-all transition-colors flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-neutral-700 rounded-full group-hover/item:bg-orange-500 transition-colors"></span>
              {contact.email}
            </a>
          </div>
        )}

        {contact.phones && contact.phones.length > 0 && (
          <div className="space-y-3">
            <span className="text-[9px] font-tech text-neutral-500 uppercase tracking-widest block">Communications</span>
            {contact.phones.map((phone, idx) => (
              <div key={idx} className="flex flex-col dark:bg-black/30 bg-white/50 backdrop-blur-sm p-3 rounded-xl border dark:border-white/5 border-black/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                <span className="text-[10px] text-neutral-500 uppercase">{phone.label}</span>
                <span className="font-tech text-lg dark:text-white text-black tracking-wider">{phone.number}</span>
              </div>
            ))}
          </div>
        )}

        {contact.cc && (
          <div>
            <span className="text-[9px] font-tech text-neutral-500 uppercase tracking-widest block mb-1">Liste_CC</span>
            <div className="text-[10px] font-mono text-neutral-500 dark:bg-black/30 bg-white/50 backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] p-2 rounded border dark:border-white/5 border-black/5 truncate">
              {contact.cc}
            </div>
          </div>
        )}

        {contact.desc && (
          <div className="pt-4 border-t border-dashed dark:border-[#333] border-neutral-300 text-xs font-mono text-neutral-500">
                // {contact.desc}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactCard;