import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import SignatureCanvas from 'react-signature-canvas';
import {
    FaFileInvoice, FaDroplet,
    FaRotateLeft, FaScrewdriverWrench, FaBan, FaPen,
    FaPrint, FaEnvelope, FaFingerprint, FaCamera,
    FaBatteryFull, FaMobileScreen, FaCube, FaVial, FaXmark, FaCheck, FaPaperPlane, FaSpinner
} from 'react-icons/fa6';
import { FaEuroSign, FaBarcode } from 'react-icons/fa';

interface IntakeFormProps {
    onShowToast: (msg: string) => void;
}

type QCMStatus = 'ok' | 'hs' | 'nt';

interface QCMItem {
    id: string;
    label: string;
    icon: React.ElementType;
    status: QCMStatus;
    comment: string;
    isCommentVisible: boolean;
}

export const IntakeForm: React.FC<IntakeFormProps> = ({ onShowToast }) => {
    // 1. Intervention Block
    const [deviceDesc, setDeviceDesc] = useState('');
    const [price, setPrice] = useState('');
    const [testCode, setTestCode] = useState('');

    // 2. Alertes (Red Flags)
    const [isOpened, setIsOpened] = useState(false);
    const [isWaterDamage, setIsWaterDamage] = useState(false);
    const [isBootloop, setIsBootloop] = useState(false);

    // Master Switch
    const [noTestPossible, setNoTestPossible] = useState(false);

    // Email Modal State
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [clientEmail, setClientEmail] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    // 3. QCM
    const initialQCM: QCMItem[] = [
        { id: 'esthetique', label: 'État général esthétique', icon: FaMobileScreen, status: 'nt', comment: '', isCommentVisible: false },
        { id: 'boutons', label: 'Boutons', icon: FaCube, status: 'nt', comment: '', isCommentVisible: false },
        { id: 'face_id', label: 'Face ID / Touch ID', icon: FaFingerprint, status: 'nt', comment: '', isCommentVisible: false },
        { id: 'cameras', label: 'Appareils photo (Av/Ar)', icon: FaCamera, status: 'nt', comment: '', isCommentVisible: false },
        { id: 'charge', label: 'Charge', icon: FaBatteryFull, status: 'nt', comment: '', isCommentVisible: false },
    ];
    const [qcm, setQcm] = useState<QCMItem[]>(initialQCM);

    // Signature
    const sigCanvas = useRef<SignatureCanvas>(null);

    const resizeCanvas = () => {
        if (sigCanvas.current) {
            const canvas = sigCanvas.current.getCanvas();
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            const parent = canvas.parentElement;
            if (parent) {
                const data = sigCanvas.current.toData();
                canvas.width = parent.offsetWidth * ratio;
                canvas.height = parent.offsetHeight * ratio;
                canvas.getContext("2d")?.scale(ratio, ratio);
                sigCanvas.current.clear();
                if (data && data.length > 0) {
                    sigCanvas.current.fromData(data);
                }
            }
        }
    };

    useEffect(() => {
        const timer = setTimeout(resizeCanvas, 100);
        window.addEventListener("resize", resizeCanvas);
        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", resizeCanvas);
        };
    }, []);

    const updateQcmStatus = (id: string, status: QCMStatus) => {
        if (noTestPossible) return;
        setQcm(prev => prev.map(item => item.id === id ? { ...item, status } : item));
    };

    const toggleComment = (id: string) => {
        if (noTestPossible) return;
        setQcm(prev => prev.map(item => item.id === id ? { ...item, isCommentVisible: !item.isCommentVisible } : item));
    };

    const updateComment = (id: string, comment: string) => {
        setQcm(prev => prev.map(item => item.id === id ? { ...item, comment } : item));
    };

    const handleClearCanvas = () => {
        sigCanvas.current?.clear();
    };

    const handlePrint = () => {
        if (sigCanvas.current?.isEmpty()) {
            onShowToast("Attention : Aucune signature détectée.");
        }
        // Allow printing regardless of signature status
        window.print();
    };

    const handleSendMail = () => {
        if (sigCanvas.current?.isEmpty()) {
            onShowToast("Veuillez signer le document avant envoi.");
            return;
        }
        setShowEmailModal(true);
    };

    const confirmSendEmail = async () => {
        if (!clientEmail || !clientEmail.includes('@')) {
            onShowToast("Veuillez entrer une adresse e-mail valide.");
            return;
        }

        setIsSendingEmail(true);
        const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzMcpeYUjqMvUJzy0-DMXYORvnvw_cQgk8CexEVavbkiv_54jQ6VBWJmaUTNP3J0yfD/exec";

        let signatureBase64 = "";
        if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
            signatureBase64 = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png').split(',')[1];
        }

        let qcmHtml = "<ul>";
        qcm.forEach(item => {
            qcmHtml += `<li><b>${item.label}</b> : ${item.status.toUpperCase()} ${item.comment ? `(<i>${item.comment}</i>)` : ''}</li>`;
        });
        qcmHtml += "</ul>";

        const htmlBody = `
            <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.6; max-w-2xl mx-auto;">
                <h2 style="color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 10px;">Bon de Prise en Charge - iSERVICES</h2>
                <p>Bonjour,</p>
                <p>Veuillez trouver ci-dessous le récapitulatif de votre prise en charge :</p>
                
                <h3 style="background-color: #f3f4f6; padding: 10px; border-radius: 5px;">Détails de l'intervention</h3>
                <p><b>Appareil / Changement :</b> ${deviceDesc || 'Non renseigné'}</p>
                <p><b>Prix convenu :</b> ${price ? price : 'Non renseigné'}</p>
                
                <h3 style="background-color: #f3f4f6; padding: 10px; border-radius: 5px;">Alertes & Risques</h3>
                <p><b>Déjà Ouvert :</b> ${isOpened ? 'OUI' : 'NON'}</p>
                <p><b>Contact avec l'eau :</b> ${isWaterDamage ? 'OUI' : 'NON'}</p>
                <p><b>Bootloop :</b> ${isBootloop ? 'OUI' : 'NON'}</p>
                
                <h3 style="background-color: #f3f4f6; padding: 10px; border-radius: 5px;">Check-Up Appareil</h3>
                ${noTestPossible ? '<p style="color: red; font-weight: bold;">AUCUN TEST POSSIBLE AVANT RÉPARATION</p>' : qcmHtml}
                
                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                    <i>Je soussigné(e) déclare avoir pris connaissance des conditions générales de réparation. En cas "d'Aucun Test Possible" ou d'appareils "Déjà Ouvert / Eau", les garanties post-réparation peuvent être limitées.</i>
                </p>
                <p>Cordialement,<br/>L'équipe iServices</p>
            </div>
        `;

        const payload: any = {
            to_email: clientEmail,
            cc_email: "",
            subject: `Votre Prise en Charge - iSERVICES`,
            message: "Veuillez consulter la version HTML de ce message.",
            body: "Veuillez consulter la version HTML de ce message.",
            htmlBody: htmlBody,
            timestamp: new Date().toISOString()
        };

        if (signatureBase64) {
            payload.attachments = [{
                fileName: "Signature_Client.png",
                mimeType: "image/png",
                content: signatureBase64
            }];
        }

        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            onShowToast("E-mail envoyé avec succès !");
            setShowEmailModal(false);
            setClientEmail('');
        } catch (error) {
            console.error('FAILED...', error);
            onShowToast("Erreur lors de l'envoi de l'e-mail. (Délai dépassé ou erreur réseau)");
        } finally {
            setIsSendingEmail(false);
        }
    };

    const SegmentedControl = ({ item }: { item: QCMItem }) => (
        <div className={`relative flex gap-7 flex-1 md:w-auto bg-white/40 dark:bg-black/40 border border-neutral-300 dark:border-white/10 p-1 md:rounded-xl rounded-[16px] transition-opacity ${noTestPossible ? 'opacity-50 pointer-events-none' : ''} shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_2px_10px_rgba(0,0,0,0.05)] print:shadow-none print:bg-transparent print:border-none`}>
            {['ok', 'hs', 'nt'].map((status) => {
                const isActive = item.status === status;
                let activeColorClass = '';
                if (status === 'ok') activeColorClass = 'bg-green-500 shadow-md';
                else if (status === 'hs') activeColorClass = 'bg-red-500 shadow-md';
                else activeColorClass = 'bg-neutral-500 dark:bg-neutral-600 shadow-md';

                return (
                    <button
                        key={status}
                        onClick={() => updateQcmStatus(item.id, status as QCMStatus)}
                        className={`relative flex-1 md:w-16 py-1.5 text-xs font-bold rounded-lg transition-colors z-10 ${isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                    >
                        {isActive && (
                            <motion.div
                                layoutId={`segment-bg-${item.id}`}
                                className={`absolute inset-0 rounded-lg -z-10 ${activeColorClass}`}
                                transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                            />
                        )}
                        {status.toUpperCase()}
                    </button>
                );
            })}
        </div>
    );

    const CustomToggle = ({ label, icon: Icon, active, onChange, colorClass }: { label: string, icon: any, active: boolean, onChange: () => void, colorClass: string }) => (
        <button
            onClick={onChange}
            className={`flex items-center justify-between p-4 w-full rounded-[20px] transition-all border shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_2px_10px_rgba(0,0,0,0.05)] print:shadow-none print:bg-transparent print:border-none ${active ? `bg-white/80 dark:bg-black/80 ${colorClass}` : 'bg-white/40 dark:bg-black/40 border-neutral-300 dark:border-white/10 text-neutral-500 hover:bg-white/60 dark:hover:bg-black/60'}`}
        >
            <div className="flex items-center gap-3">
                <Icon className={`text-lg transition-colors ${active ? '' : 'text-neutral-400'}`} />
                <span className="font-bold text-sm tracking-wide">{label}</span>
            </div>
            <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 shrink-0 ${active ? colorClass.includes('red') ? 'bg-red-500' : colorClass.includes('blue') ? 'bg-blue-500' : 'bg-orange-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 transform ${active ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
        </button>
    );

    return (
        <div className="flex flex-col h-full overflow-y-auto scrollbar-thin px-4 pb-12 print:p-0 print:overflow-visible print:block print:h-auto">

            {/* --- WEB UI HEADER --- */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600 text-white rounded-[16px] shadow-lg">
                        <FaFileInvoice className="text-xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-tech font-bold uppercase tracking-widest text-black dark:text-white">Prise en Charge</h1>
                        <p className="text-sm font-sans text-neutral-500">Génération du bon d'intervention</p>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={handlePrint} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white/40 dark:bg-black/40 backdrop-blur-md rounded-[20px] text-sm font-bold text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-white/10 hover:border-orange-500 hover:bg-white/60 dark:hover:bg-black/60 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_2px_10px_rgba(0,0,0,0.05)]">
                        <FaPrint /> Imprimer (80mm)
                    </button>
                </div>
            </div>

            {/* --- MAIN FORM & PRINT WRAPPER (80mm Target) --- */}
            <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto print:max-w-full print:block print:gap-2 print:space-y-2 print:text-[12px] print:leading-tight">

                {/* IMPRESSION HEADER (ONLY ON PRINT) */}
                <div className="hidden print:flex flex-col items-center justify-center mb-2 border-b border-black border-dashed pb-2 text-center text-black">
                    <h1 className="text-2xl font-tech font-bold uppercase tracking-widest leading-none mb-1">iServices</h1>
                    <p className="text-[10px] font-sans font-bold uppercase tracking-wide">Prise en Charge</p>
                    <div className="text-[9px] mt-1 flex justify-between w-full px-2">
                        <span>{new Date().toLocaleDateString('fr-FR')}</span>
                        <span>{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>

                {/* 1. Bloc Intervention */}
                <div className="bg-white/40 dark:bg-[#1a1a1a]/40 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[32px] p-6 md:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] print:shadow-none print:border print:border-black print:rounded-none print:backdrop-blur-none print:bg-transparent text-black dark:text-white print:text-black print:p-2 print:mb-2 text-xs">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-6 flex items-center gap-2 print:text-black print:mb-2 print:text-[10px] print:border-b print:border-black print:pb-1 print:justify-center print:border-dashed">
                        <FaScrewdriverWrench className="print:hidden" /> Intervention
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 print:grid-cols-1 print:gap-1">
                        <div className="flex flex-col gap-2 col-span-2 md:col-span-1 print:flex-row print:justify-between print:gap-1 print:border-b print:border-dashed print:border-black/30 print:pb-1 print:items-center">
                            <label className="text-xs font-bold uppercase ml-2 text-neutral-500 print:text-[10px] print:m-0 print:text-black">Appareil :</label>
                            <span className="hidden print:block text-[10px] font-bold text-right truncate w-2/3">{deviceDesc || '-'}</span>
                            <div className="print:hidden">
                                <input type="text" value={deviceDesc} onChange={e => setDeviceDesc(e.target.value)} placeholder="Ex: iPhone 13 Pro - Écran" className="w-full bg-white/60 dark:bg-black/60 border border-black/10 dark:border-white/10 rounded-[16px] px-4 py-3 text-sm focus:border-orange-500 outline-none" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 col-span-1 print:flex-row print:justify-between print:gap-1 print:border-b print:border-dashed print:border-black/30 print:pb-1 print:items-center">
                            <label className="text-xs font-bold uppercase ml-2 text-neutral-500 print:text-[10px] print:m-0 print:text-black">Prix :</label>
                            <span className="hidden print:block text-[10px] font-bold text-right">{price || '-'}</span>
                            <div className="relative print:hidden">
                                <FaEuroSign className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    value={price}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                                        setPrice(val ? `${val} €` : '');
                                    }}
                                    placeholder="0.00 €"
                                    className="w-full bg-white/60 dark:bg-black/60 border border-black/10 dark:border-white/10 rounded-[16px] pl-10 pr-4 py-3 text-sm focus:border-orange-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 col-span-1 print:hidden">
                            <label className="text-xs font-bold uppercase ml-2 text-neutral-500">Code de test</label>
                            <div className="relative">
                                <FaBarcode className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input type="text" value={testCode} onChange={e => setTestCode(e.target.value)} placeholder="000000" className="w-full bg-white/60 dark:bg-black/60 border border-black/10 dark:border-white/10 rounded-[16px] pl-10 pr-4 py-3 text-sm focus:border-orange-500 outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Alertes (Red Flags) */}
                <div className="bg-white/40 dark:bg-[#1a1a1a]/40 border border-black/10 dark:border-white/10 rounded-[32px] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] print:shadow-none print:bg-transparent print:border print:border-black print:rounded-none text-black dark:text-white print:text-black mt-4 print:mt-0 print:p-2 text-xs">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-6 flex items-center gap-2 print:text-black print:mb-2 print:justify-center print:border-b print:border-dashed print:border-black print:pb-1 print:text-[10px]">
                        Alertes (Risques)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-1 print:gap-1">
                        <div className="print:hidden">
                            <CustomToggle label="Déjà Ouvert" icon={FaScrewdriverWrench} active={isOpened} onChange={() => setIsOpened(!isOpened)} colorClass="border-orange-500/50 text-orange-600" />
                        </div>
                        <div className="hidden print:flex justify-between items-center text-[10px] print:border-b print:border-dashed print:border-black/30 print:pb-1">
                            <span className="font-bold print:text-[10px]">Déjà Ouvert:</span>
                            <span className="font-bold">{isOpened ? 'OUI' : 'NON'}</span>
                        </div>

                        <div className="print:hidden">
                            <CustomToggle label="Contact Eau" icon={FaDroplet} active={isWaterDamage} onChange={() => setIsWaterDamage(!isWaterDamage)} colorClass="border-blue-500/50 text-blue-600" />
                        </div>
                        <div className="hidden print:flex justify-between items-center text-[10px] print:border-b print:border-dashed print:border-black/30 print:pb-1">
                            <span className="font-bold print:text-[10px]">Cx. Eau / Oxydé:</span>
                            <span className="font-bold">{isWaterDamage ? 'OUI' : 'NON'}</span>
                        </div>

                        <div className="print:hidden">
                            <CustomToggle label="Bootloop" icon={FaRotateLeft} active={isBootloop} onChange={() => setIsBootloop(!isBootloop)} colorClass="border-red-500/50 text-red-600" />
                        </div>
                        <div className="hidden print:flex justify-between items-center text-[10px] print:border-b print:border-dashed print:border-black/30 print:pb-1">
                            <span className="font-bold print:text-[10px]">Bootloop:</span>
                            <span className="font-bold">{isBootloop ? 'OUI' : 'NON'}</span>
                        </div>
                    </div>
                </div>

                {/* 3. Check-up (QCM) */}
                <div className="bg-white/40 dark:bg-[#1a1a1a]/40 border border-black/10 dark:border-white/10 rounded-[32px] p-6 md:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] print:shadow-none print:border print:border-black print:rounded-none print:bg-transparent text-black dark:text-white print:text-black mt-4 print:mt-0 print:p-2 text-xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:mb-2 print:pb-0">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2 print:text-black print:text-[10px] print:w-full print:justify-center print:border-b print:border-dashed print:border-black print:pb-1">
                            Check-Up Appareil
                        </h3>
                        <div className="print:hidden w-full md:w-auto">
                            <button
                                onClick={() => setNoTestPossible(!noTestPossible)}
                                className={`flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2 rounded-full border transition-all text-xs font-bold uppercase ${noTestPossible ? 'bg-red-500 text-white border-red-500' : 'bg-black/5 dark:bg-white/5 border-transparent text-neutral-500 hover:bg-black/10'}`}
                            >
                                <FaBan /> Aucun Test Possible
                            </button>
                        </div>
                        {noTestPossible && (
                            <div className="hidden print:block text-black font-bold border border-black p-1 text-center text-[10px] uppercase">
                                AUCUN TEST POSSIBLE AVANT RÉPARATION
                            </div>
                        )}
                    </div>

                    <div className={`grid grid-cols-1 gap-4 print:gap-1 ${noTestPossible ? 'opacity-50 pointer-events-none print:hidden' : ''}`}>
                        {qcm.map((item) => (
                            <div key={item.id} className="print:break-inside-avoid flex flex-col bg-white/60 dark:bg-black/40 print:bg-transparent rounded-[20px] p-3 md:p-4 print:p-0 print:py-0 border border-black/5 dark:border-white/5 print:border-none print:rounded-none">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:flex-row print:justify-between print:gap-0 print:border-b print:border-dashed print:border-black/30 print:pb-[2px]">
                                    <div className="flex items-center gap-3 w-full md:w-1/3 print:w-auto">
                                        <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center print:hidden"><item.icon className="text-neutral-500" /></div>
                                        <span className="font-bold text-sm print:text-[10px]">{item.label}</span>
                                    </div>

                                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide print:pb-0 print:overflow-hidden print:w-auto">
                                        <div className="print:hidden">
                                            <SegmentedControl item={item} />
                                        </div>
                                        <div className="hidden print:block text-[10px] font-bold px-1 text-right min-w-[30px]">
                                            {item.status.toUpperCase()}
                                        </div>

                                        <button
                                            onClick={() => toggleComment(item.id)}
                                            className={`print:hidden p-2 rounded-full transition-colors shrink-0 ${item.comment || item.isCommentVisible ? 'bg-orange-500 text-white' : 'bg-black/5 dark:bg-white/5 text-neutral-500 hover:bg-black/10 dark:hover:bg-white/10'}`}
                                        >
                                            <FaPen className="text-xs" />
                                        </button>
                                    </div>
                                </div>
                                <AnimatePresence>
                                    {(item.isCommentVisible || (item.comment && window.matchMedia("print").matches)) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden mt-3 print:mt-0 print:h-auto print:opacity-100"
                                        >
                                            <div className="hidden print:block text-[9px] italic ml-2 mt-[2px] leading-tight">- {item.comment}</div>
                                            <input
                                                type="text"
                                                value={item.comment}
                                                onChange={(e) => updateComment(item.id, e.target.value)}
                                                placeholder="Note (ex: Rayure profonde)"
                                                className="print:hidden w-full text-sm p-3 bg-black/5 dark:bg-white/5 rounded-xl outline-none focus:border-orange-500 border border-transparent"
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Validation & Signature */}
                <div className="bg-white/40 dark:bg-[#1a1a1a]/40 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[32px] p-6 md:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] print:shadow-none print:border-none print:rounded-none print:backdrop-blur-none print:bg-transparent text-black dark:text-white print:text-black mt-4 print:mt-2 mb-8 print:mb-0 print:break-inside-avoid print:p-0 text-xs text-center">
                    <p className="text-xs text-neutral-500 mb-4 print:mb-2 leading-tight max-w-2xl print:text-black print:font-sans print:text-[8px] print:text-justify mx-auto">
                        Je soussigné(e) déclare avoir pris connaissance des conditions générales de réparation. En cas "d'Aucun Test Possible" ou d'appareils "Déjà Ouvert / Eau", les garanties post-réparation peuvent être limitées.
                    </p>
                    <div className="relative w-full h-48 md:h-64 border-2 dark:border-[#333] border-neutral-300 border-dashed rounded-[20px] bg-white dark:bg-[#111] overflow-hidden group print:border print:border-black print:rounded-none print:bg-transparent print:h-20 print:flex print:items-center print:justify-center mx-auto">
                        <SignatureCanvas
                            ref={sigCanvas}
                            penColor={document.documentElement.classList.contains('dark') ? 'white' : 'black'}
                            canvasProps={{ className: 'w-full h-full cursor-crosshair print:invert-0 dark:print:invert touch-none' }}
                            onEnd={() => { }}
                        />
                        <button
                            onClick={handleClearCanvas}
                            className="absolute top-4 right-4 p-2 bg-neutral-100 dark:bg-[#222] text-neutral-500 hover:text-red-500 rounded-full transition-colors print:hidden opacity-0 group-hover:opacity-100"
                            title="Effacer"
                        >
                            <FaRotateLeft />
                        </button>
                        <div className="absolute inset-x-0 bottom-4 text-center pointer-events-none print:hidden">
                            <span className="text-neutral-300 dark:text-[#333] text-sm font-tech tracking-widest uppercase">Signer ici</span>
                        </div>
                        <div className="hidden print:block absolute top-1 left-1 text-[8px] text-black">Sign. Client</div>
                    </div>

                    <div className="hidden print:block text-center mt-4 text-[9px] italic border-t border-black border-dashed pt-2">
                        Merci de votre confiance - iServices
                    </div>
                </div>
            </div>

            {/* Email Modal */}
            <AnimatePresence>
                {showEmailModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => !isSendingEmail && setShowEmailModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-white dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-tech font-bold uppercase tracking-widest text-black dark:text-white flex items-center gap-2">
                                    <FaEnvelope className="text-orange-500" /> Envoyer par E-mail
                                </h2>
                                <button
                                    onClick={() => !isSendingEmail && setShowEmailModal(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-neutral-500 transition-colors"
                                >
                                    <FaXmark />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex flex-col gap-2 mb-6">
                                <label className="text-xs font-bold uppercase ml-2 text-neutral-500">Adresse e-mail du client</label>
                                <input
                                    type="email"
                                    value={clientEmail}
                                    onChange={e => setClientEmail(e.target.value)}
                                    placeholder="client@example.com"
                                    autoFocus
                                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-[16px] px-4 py-3 text-sm focus:border-orange-500 outline-none text-black dark:text-white"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') confirmSendEmail();
                                    }}
                                />
                            </div>

                            {/* Footer */}
                            <button
                                onClick={confirmSendEmail}
                                disabled={isSendingEmail || !clientEmail.trim()}
                                className="w-full py-4 h-14 font-bold font-tech text-sm rounded-[20px] transition-all flex items-center justify-center gap-3 uppercase tracking-widest group border bg-white/40 dark:bg-black/40 backdrop-blur-xl border-neutral-300 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/60 dark:hover:bg-black/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_2px_10px_rgba(0,0,0,0.05)]"
                            >
                                {isSendingEmail ? (
                                    <><FaSpinner className="animate-spin text-neutral-500" /> <span className="text-neutral-500">ENVOI...</span></>
                                ) : (
                                    <><span className="text-neutral-500">ENVOYER</span> <FaPaperPlane className="text-orange-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></>
                                )}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default IntakeForm;
