import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import SignatureCanvas from 'react-signature-canvas';
import {
    FaFileInvoice, FaDroplet,
    FaRotateLeft, FaScrewdriverWrench, FaBan, FaPen,
    FaPrint, FaEnvelope, FaFingerprint, FaCamera,
    FaBatteryFull, FaMobileScreen, FaCube, FaVial, FaXmark, FaCheck, FaPaperPlane, FaSpinner,
    FaFloppyDisk, FaListUl, FaTrash, FaPhone
} from 'react-icons/fa6';
import { FaEuroSign, FaBarcode, FaUser } from 'react-icons/fa';

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
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmailInput, setClientEmailInput] = useState('');
    const [deviceDesc, setDeviceDesc] = useState('');
    const [price, setPrice] = useState('');
    const [testCode, setTestCode] = useState('');

    // Saved Forms State
    const [currentFormId, setCurrentFormId] = useState<string | null>(null);
    const [showSavedForms, setShowSavedForms] = useState(false);
    const [savedFormsList, setSavedFormsList] = useState<any[]>([]);

    useEffect(() => {
        const loadList = () => {
            const savedListStr = localStorage.getItem('intake_forms_list');
            if (savedListStr) {
                try {
                    setSavedFormsList(JSON.parse(savedListStr));
                } catch (e) { }
            }
        };
        loadList();
    }, []);

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

    const handleSave = () => {
        // Collect current data
        const dataToSave = {
            id: currentFormId || Date.now().toString(),
            clientName,
            clientPhone,
            clientEmailInput,
            deviceDesc,
            price,
            testCode,
            isOpened,
            isWaterDamage,
            isBootloop,
            noTestPossible,
            qcm,
            signatureData: sigCanvas.current && !sigCanvas.current.isEmpty() ? sigCanvas.current.toDataURL() : '',
            savedAt: Date.now()
        };

        try {
            const savedListStr = localStorage.getItem('intake_forms_list');
            let savedList: any[] = savedListStr ? JSON.parse(savedListStr) : [];

            if (currentFormId) {
                // Update existing
                const index = savedList.findIndex(item => item.id === currentFormId);
                if (index !== -1) {
                    savedList[index] = dataToSave;
                } else {
                    savedList.unshift(dataToSave);
                }
            } else {
                // Create new
                setCurrentFormId(dataToSave.id);
                savedList.unshift(dataToSave);
            }

            localStorage.setItem('intake_forms_list', JSON.stringify(savedList));
            setSavedFormsList(savedList);
            onShowToast(currentFormId ? "Prise en charge mise à jour !" : "Prise en charge sauvegardée en mémoire locale !");
        } catch (error) {
            console.error("Error saving intake form:", error);
            onShowToast("Erreur lors de la sauvegarde.");
        }
    };

    const loadSavedForm = (formItem: any) => {
        setCurrentFormId(formItem.id);
        setClientName(formItem.clientName || '');
        setClientPhone(formItem.clientPhone || '');
        setClientEmailInput(formItem.clientEmailInput || '');
        setDeviceDesc(formItem.deviceDesc || '');
        setPrice(formItem.price || '');
        setTestCode(formItem.testCode || '');
        setIsOpened(formItem.isOpened || false);
        setIsWaterDamage(formItem.isWaterDamage || false);
        setIsBootloop(formItem.isBootloop || false);
        setNoTestPossible(formItem.noTestPossible || false);

        // Safely load QCM to avoid crashes if properties are missing in older saves
        if (formItem.qcm && Array.isArray(formItem.qcm)) {
            const safeQcm = formItem.qcm.map((item: any) => {
                const initialItem = initialQCM.find(iqcm => iqcm.id === item.id);
                return {
                    ...item,
                    icon: initialItem?.icon || FaCube,
                    status: item.status || 'nt',
                    comment: item.comment || '',
                    isCommentVisible: item.isCommentVisible || false
                };
            });
            setQcm(safeQcm);
        } else {
            setQcm(initialQCM);
        }

        setTimeout(() => {
            if (sigCanvas.current) {
                sigCanvas.current.clear();
                if (formItem.signatureData) {
                    sigCanvas.current.fromDataURL(formItem.signatureData);
                }
            }
        }, 100);

        setShowSavedForms(false);
        onShowToast("Prise en charge chargée !");
    };

    const deleteSavedForm = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newList = savedFormsList.filter(item => item.id !== id);
        setSavedFormsList(newList);
        localStorage.setItem('intake_forms_list', JSON.stringify(newList));
        onShowToast("Prise en charge supprimée !");
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
                    <button onClick={() => setShowSavedForms(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 dark:bg-white/5 bg-black/5 backdrop-blur-md dark:text-neutral-400 text-neutral-600 rounded-full font-tech text-xs uppercase tracking-widest font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-all border dark:border-white/10 border-black/5 hover:border-black/20 dark:hover:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative">
                        <FaListUl /> <span className="hidden md:inline">Mes tickets</span>
                        {savedFormsList.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold bg-orange-500 text-white shadow-md">
                                {savedFormsList.length}
                            </span>
                        )}
                    </button>
                    <button onClick={handleSave} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 dark:bg-white/5 bg-black/5 backdrop-blur-md dark:text-neutral-400 text-neutral-600 rounded-full font-tech text-xs uppercase tracking-widest font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-all border dark:border-white/10 border-black/5 hover:border-black/20 dark:hover:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                        <FaFloppyDisk /> <span className="hidden md:inline">Sauvegarder</span>
                    </button>
                    <button onClick={handlePrint} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white/40 dark:bg-black/40 backdrop-blur-md rounded-full text-sm font-tech font-bold uppercase tracking-widest text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-white/10 hover:border-orange-500 hover:bg-white/60 dark:hover:bg-black/60 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_2px_10px_rgba(0,0,0,0.05)]">
                        <FaPrint /> Imprimer (A4)
                    </button>
                </div>
            </div>

            {/* --- IMPRESSION HEADER --- */}
            <div className="hidden print:flex justify-between items-start mb-8 print:mb-2 border-b-2 border-black pb-4 print:pb-2">
                <div>
                    <h1 className="text-4xl print:text-2xl font-tech font-bold uppercase tracking-widest text-black">iServices</h1>
                    <p className="text-xl print:text-sm font-sans text-neutral-800 tracking-wide mt-2 print:mt-1">Bon de Prise en Charge</p>
                </div>
                <div className="text-right text-sm print:text-xs">
                    <p>Date : {new Date().toLocaleDateString('fr-FR')}</p>
                    <p className="font-mono mt-1 text-xs">Heure : {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            </div>

            {/* --- MAIN FORM CONTENT --- */}
            <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto print:max-w-full print:block print:gap-1 print:space-y-2">

                {/* 1. Bloc Intervention */}
                <div className="bg-white/40 dark:bg-[#1a1a1a]/40 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[32px] p-6 md:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] print:shadow-none print:border print:border-black print:rounded-lg print:backdrop-blur-none print:bg-transparent text-black dark:text-white print:text-black print:p-2">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-6 flex items-center gap-2 print:text-black print:mb-2 print:text-[10px]">
                        <FaScrewdriverWrench /> Détails Intervention
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-8 print:gap-4">
                        <div className="flex flex-col gap-2 print:col-span-3">
                            <label className="text-xs font-bold uppercase ml-2 text-neutral-500">Nom et Prénom</label>
                            <div className="relative">
                                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 print:hidden" />
                                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nom du client" className="w-full bg-white/60 dark:bg-black/60 border border-black/10 dark:border-white/10 rounded-[16px] pl-10 print:pl-4 pr-4 py-3 text-sm focus:border-orange-500 outline-none print:bg-transparent print:border print:border-neutral-300 print:rounded-lg" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 print:col-span-2">
                            <label className="text-xs font-bold uppercase ml-2 text-neutral-500">Téléphone</label>
                            <div className="relative">
                                <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 print:hidden" />
                                <input type="text" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="06 00 00 00 00" className="w-full bg-white/60 dark:bg-black/60 border border-black/10 dark:border-white/10 rounded-[16px] pl-10 print:pl-4 pr-4 py-3 text-sm focus:border-orange-500 outline-none print:bg-transparent print:border print:border-neutral-300 print:rounded-lg" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 print:col-span-3">
                            <label className="text-xs font-bold uppercase ml-2 text-neutral-500">E-mail</label>
                            <div className="relative">
                                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 print:hidden" />
                                <input type="email" value={clientEmailInput} onChange={e => setClientEmailInput(e.target.value)} placeholder="client@email.com" className="w-full bg-white/60 dark:bg-black/60 border border-black/10 dark:border-white/10 rounded-[16px] pl-10 print:pl-4 pr-4 py-3 text-sm focus:border-orange-500 outline-none print:bg-transparent print:border print:border-neutral-300 print:rounded-lg print:text-xs" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-1 print:col-span-6">
                            <label className="text-xs font-bold uppercase ml-2 text-neutral-500">Changement de...</label>
                            <input type="text" value={deviceDesc} onChange={e => setDeviceDesc(e.target.value)} placeholder="Ex: iPhone 13 Pro - Écran" className="w-full bg-white/60 dark:bg-black/60 border border-black/10 dark:border-white/10 rounded-[16px] px-4 py-3 text-sm focus:border-orange-500 outline-none print:bg-transparent print:border print:border-neutral-300 print:rounded-lg" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold uppercase ml-2 text-neutral-500">Prix convenu</label>
                            <div className="relative">
                                <FaEuroSign className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 print:hidden" />
                                <input
                                    type="text"
                                    value={price}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                                        setPrice(val ? `${val} €` : '');
                                    }}
                                    placeholder="0.00 €"
                                    className="w-full bg-white/60 dark:bg-black/60 border border-black/10 dark:border-white/10 rounded-[16px] pl-10 print:pl-4 pr-4 py-3 text-sm focus:border-orange-500 outline-none print:bg-transparent print:border print:border-neutral-300 print:rounded-lg"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 print:hidden">
                            <label className="text-xs font-bold uppercase ml-2 text-neutral-500">Code de test</label>
                            <div className="relative">
                                <FaBarcode className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input type="text" value={testCode} onChange={e => setTestCode(e.target.value)} placeholder="000000" className="w-full bg-white/60 dark:bg-black/60 border border-black/10 dark:border-white/10 rounded-[16px] pl-10 pr-4 py-3 text-sm focus:border-orange-500 outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Alertes (Red Flags) */}
                <div className="bg-white/40 dark:bg-[#1a1a1a]/40 border border-black/10 dark:border-white/10 rounded-[32px] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] print:shadow-none print:bg-transparent print:border print:border-black print:rounded-lg text-black dark:text-white print:text-black mt-4 print:mt-0 print:p-2">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-6 flex items-center gap-2 print:text-black print:mb-2 print:text-[10px]">
                        Alertes (Risques)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
                        <div className="print:hidden">
                            <CustomToggle label="Déjà Ouvert" icon={FaScrewdriverWrench} active={isOpened} onChange={() => setIsOpened(!isOpened)} colorClass="border-orange-500/50 text-orange-600" />
                        </div>
                        <div className="hidden print:block text-sm border border-neutral-300 p-2 rounded">
                            Déjà Ouvert: <span className="font-bold">{isOpened ? 'OUI' : 'NON'}</span>
                        </div>

                        <div className="print:hidden">
                            <CustomToggle label="Contact Eau" icon={FaDroplet} active={isWaterDamage} onChange={() => setIsWaterDamage(!isWaterDamage)} colorClass="border-blue-500/50 text-blue-600" />
                        </div>
                        <div className="hidden print:block text-sm border border-neutral-300 p-2 rounded">
                            Oxydation: <span className="font-bold">{isWaterDamage ? 'OUI' : 'NON'}</span>
                        </div>

                        <div className="print:hidden">
                            <CustomToggle label="Bootloop" icon={FaRotateLeft} active={isBootloop} onChange={() => setIsBootloop(!isBootloop)} colorClass="border-red-500/50 text-red-600" />
                        </div>
                        <div className="hidden print:block text-sm border border-neutral-300 p-2 rounded">
                            Bootloop: <span className="font-bold">{isBootloop ? 'OUI' : 'NON'}</span>
                        </div>
                    </div>
                </div>

                {/* 3. Check-up (QCM) */}
                <div className="bg-white/40 dark:bg-[#1a1a1a]/40 border border-black/10 dark:border-white/10 rounded-[32px] p-6 md:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] print:shadow-none print:border print:border-black print:rounded-lg print:bg-transparent text-black dark:text-white print:text-black mt-4 print:mt-0 print:p-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:mb-2 print:pb-0">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2 print:text-black print:text-[10px]">
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
                            <div className="hidden print:block text-red-600 font-bold border-2 border-red-600 p-2 text-center uppercase">
                                AUCUN TEST POSSIBLE AVANT RÉPARATION
                            </div>
                        )}
                    </div>

                    <div className={`grid grid-cols-1 gap-4 print:gap-0 ${noTestPossible ? 'opacity-50 pointer-events-none print:hidden' : ''}`}>
                        {qcm.map((item) => (
                            <div key={item.id} className="print:break-inside-avoid flex flex-col bg-white/60 dark:bg-black/40 print:bg-transparent rounded-[20px] print:border-b p-3 md:p-4 print:p-0 print:py-0 border border-black/5 dark:border-white/5 print:border-black/20 print:border-none print:border-b print:rounded-none">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:gap-0">
                                    <div className="flex items-center gap-3 w-full md:w-1/3">
                                        <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center print:hidden"><item.icon className="text-neutral-500" /></div>
                                        <span className="font-bold text-sm print:text-[10px]">{item.label}</span>
                                    </div>

                                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                                        <div className="print:hidden">
                                            <SegmentedControl item={item} />
                                        </div>
                                        <div className="hidden print:block text-[10px] font-bold px-1">
                                            {item.status === 'ok' ? 'OK' : item.status === 'hs' ? 'HS' : 'NT'}
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
                                            className="overflow-hidden mt-3 print:mt-1 print:h-auto print:opacity-100"
                                        >
                                            <input
                                                type="text"
                                                value={item.comment}
                                                onChange={(e) => updateComment(item.id, e.target.value)}
                                                placeholder="Note (ex: Rayure profonde)"
                                                className="w-full text-sm p-3 print:py-0 print:px-0 bg-black/5 dark:bg-white/5 rounded-xl outline-none focus:border-orange-500 border border-transparent print:bg-transparent print:border-none print:text-[9px] print:italic"
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Validation & Signature */}
                <div className="bg-white/40 dark:bg-[#1a1a1a]/40 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[32px] p-6 md:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] print:shadow-none print:border print:border-black print:rounded-lg print:backdrop-blur-none print:bg-transparent text-black dark:text-white print:text-black mt-4 print:mt-0 mb-8 print:mb-0 print:break-inside-avoid print:p-2">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-4 print:mb-1 flex items-center gap-2 print:text-black print:text-[10px]">
                        Signature du Client
                    </h3>
                    <p className="text-xs text-neutral-500 mb-4 print:mb-1 leading-relaxed max-w-2xl print:text-black print:font-sans print:text-[9px]">
                        Je soussigné(e) déclare avoir pris connaissance des conditions générales de réparation. En cas "d'Aucun Test Possible" ou d'appareils "Déjà Ouvert / Eau", les garanties post-réparation peuvent être limitées.
                    </p>
                    <div className="relative w-full h-48 md:h-64 border-2 dark:border-[#333] border-neutral-300 border-dashed rounded-[20px] bg-white dark:bg-[#111] overflow-hidden group print:border-none print:bg-transparent print:h-20">
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

            {/* Saved Forms Modal */}
            <AnimatePresence>
                {showSavedForms && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowSavedForms(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-[32px] p-6 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-tech font-bold uppercase tracking-widest text-black dark:text-white flex items-center gap-2">
                                    <FaListUl className="text-orange-500" /> Mes Tickets Sauvegardés
                                </h2>
                                <button
                                    onClick={() => setShowSavedForms(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-neutral-500 transition-colors"
                                >
                                    <FaXmark />
                                </button>
                            </div>

                            <div className="overflow-y-auto scrollbar-thin pr-2 flex-grow space-y-3">
                                {savedFormsList.length === 0 ? (
                                    <div className="text-center py-10 text-neutral-500">
                                        <p>Aucun ticket sauvegardé.</p>
                                    </div>
                                ) : (
                                    savedFormsList.map((item, idx) => (
                                        <div key={item.id || idx} className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-transparent rounded-[20px] transition-colors group cursor-pointer" onClick={() => loadSavedForm(item)}>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 items-center">
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Client</div>
                                                    <div className="text-sm border-none font-bold text-black dark:text-white truncate">{item.clientName || '-'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Appareil</div>
                                                    <div className="text-sm border-none text-neutral-700 dark:text-neutral-300 truncate">{item.deviceDesc || '-'}</div>
                                                </div>
                                                <div className="hidden md:block">
                                                    <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Téléphone</div>
                                                    <div className="text-sm border-none text-neutral-700 dark:text-neutral-300 truncate">{item.clientPhone || '-'}</div>
                                                </div>
                                                <div className="text-right pr-4 col-span-2 md:col-span-1">
                                                    <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Date</div>
                                                    <div className="text-xs border-none font-mono text-neutral-500">
                                                        {new Date(item.savedAt).toLocaleDateString('fr-FR')} {new Date(item.savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => deleteSavedForm(item.id, e)}
                                                className="p-3 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors flex-shrink-0"
                                                title="Supprimer"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default IntakeForm;
