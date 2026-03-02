import React, { useState, useEffect } from 'react';
import { FaXmark, FaPlus, FaTrashCan, FaPaperPlane, FaCopy, FaCircleExclamation, FaChevronDown, FaSpinner, FaFlask, FaLock, FaPaperclip, FaCheck, FaArrowLeft, FaBarcode } from 'react-icons/fa6';
import { Procedure } from '../types';
import { STORE_EMAILS } from '../data/procedures';
import BarcodeScanner from './BarcodeScanner';

// ==================================================================================
// CONFIGURATION GOOGLE SCRIPT (Le Plan B Ultime)
// URL publique fournie
// ==================================================================================
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzMcpeYUjqMvUJzy0-DMXYORvnvw_cQgk8CexEVavbkiv_54jQ6VBWJmaUTNP3J0yfD/exec";

// ==================================================================================
// ⚠️ CONFIGURATION EMAIL TEST ⚠️
// L'email qui recevra les tests quand le mode est activé via le bouton.
// ==================================================================================
const TEST_EMAIL_DESTINATION = "mathieu.geneste71@gmail.com";
const TEST_PASSWORD = "Franca2024"; // <--- MOT DE PASSE POUR ACTIVER LE MODE TEST
// ==================================================================================

interface ModalProps {
    procedure: Procedure | null;
    onClose: () => void;
    onShowToast: (msg: string) => void;
}

const Modal: React.FC<ModalProps> = ({ procedure, onClose, onShowToast }) => {
    const [staticData, setStaticData] = useState<Record<string, string>>({});
    const [rows, setRows] = useState<Record<string, string>[]>([]);
    const [usageMagasin, setUsageMagasin] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [showValidationAlert, setShowValidationAlert] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // État pour gérer le mode test
    const [isTestMode, setIsTestMode] = useState(false);
    // État pour gérer l'affichage de l'input mot de passe
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");

    // État pour la confirmation avant envoi
    const [isConfirming, setIsConfirming] = useState(false);

    // État pour le scanner de code-barres
    const [scanningField, setScanningField] = useState<{ rowIndex: number, fieldId: string } | null>(null);

    useEffect(() => {
        if (procedure) {
            const initialStatic: Record<string, string> = {};
            procedure.staticFields.forEach(f => {
                initialStatic[f.id] = f.default || '';
            });
            setStaticData(initialStatic);
            setRows([{}]);
            setUsageMagasin(false);
            setErrors([]);
            setShowValidationAlert(false);
            setIsSending(false);
            setIsConfirming(false); // Reset confirmation state

            // Reset états test
            setIsTestMode(false);
            setShowPasswordInput(false);
            setPasswordInput("");
        }
    }, [procedure]);

    const handleStaticChange = (id: string, value: string) => {
        setStaticData(prev => ({ ...prev, [id]: value }));
        if (errors.includes(id)) {
            setErrors(prev => prev.filter(e => e !== id));
        }
    };

    const handleRowChange = (index: number, fieldId: string, value: string) => {
        const newRows = [...rows];
        newRows[index] = { ...newRows[index], [fieldId]: value };
        setRows(newRows);
    };

    // Convertit un fichier en Base64
    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleFileSelect = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const base64 = await convertFileToBase64(file);
                // On stocke les infos fichiers dans des clés spéciales commençant par _ (pour ne pas les afficher dans le corps du mail texte)
                const newRows = [...rows];
                newRows[index] = {
                    ...newRows[index],
                    _fileName: file.name,
                    _mimeType: file.type,
                    _content: base64.split(',')[1] // On garde juste la partie après "base64,"
                };
                setRows(newRows);
                onShowToast("Fichier joint !");
            } catch (err) {
                console.error(err);
                onShowToast("Erreur fichier");
            }
        }
    };

    const addRow = () => {
        setRows([...rows, {}]);
    };

    const removeRow = (index: number) => {
        if (rows.length > 1) {
            setRows(rows.filter((_, i) => i !== index));
        }
    };

    const handleUsageMagasinToggle = (checked: boolean) => {
        setUsageMagasin(checked);
        if (checked) {
            handleStaticChange('reason', 'UTILISATION EN MAGASIN');
        } else {
            handleStaticChange('reason', '');
        }
    };

    // --- LOGIQUE MOT DE PASSE ---
    const handleTestButtonClick = () => {
        if (isTestMode) {
            setIsTestMode(false);
            onShowToast("MODE TEST DÉSACTIVÉ");
        } else {
            setShowPasswordInput(true);
            setPasswordInput("");
        }
    };

    const handlePasswordSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (passwordInput === TEST_PASSWORD) {
                setIsTestMode(true);
                setShowPasswordInput(false);
                onShowToast("MODE TEST ACTIVÉ");
            } else {
                onShowToast("MOT DE PASSE INCORRECT");
                setShowPasswordInput(false);
            }
        } else if (e.key === 'Escape') {
            setShowPasswordInput(false);
        }
    };
    // ----------------------------

    const validate = (): boolean => {
        const newErrors: string[] = [];
        Object.keys(staticData).forEach(key => {
            if ((key.includes('reason') || key.includes('justification')) && !staticData[key]) {
                newErrors.push(key);
            }
        });

        const reasonField = procedure?.staticFields.find(f => f.id === 'reason' || f.id === 'justification');
        if (reasonField && !staticData[reasonField.id]) {
            if (!newErrors.includes(reasonField.id)) newErrors.push(reasonField.id);
        }

        setErrors(newErrors);
        setShowValidationAlert(newErrors.length > 0);
        return newErrors.length === 0;
    };

    // Génère le corps du message SANS la signature
    const generateMessageContent = () => {
        if (!procedure) return '';
        let bodyText = "";

        if (procedure.id === 'reprise') {
            bodyText = `Bonjour,\n\nJe demande l'entrée de l'équipement suivant :\n\n`;
            rows.forEach(item => {
                bodyText += `iPhone : ${item.model || "-"}\n`;
                bodyText += `Stockage : ${item.storage || "-"}\n`;
                bodyText += `Couleur : ${item.color || "-"}\n`;
                bodyText += `Grade : ${item.grade || "-"}\n`;
                bodyText += `IMEI : ${item.imei || "-"}\n`;
                bodyText += `Valeur de Reprise : € ${item.val || "-"}\n`;
                if (item.info) bodyText += `Informations complémentaires : ${item.info}\n`;
                // Ajout mention fichier
                if (item._fileName) bodyText += `[Pièce jointe : ${item._fileName}]\n`;
                bodyText += `\n`;
            });
            bodyText += `Facture : [ ${staticData.facture || "N/A"} ]\n\n`;
            bodyText += `Merci,\n\n${staticData.magasin}`;
        } else if (procedure.id === 'conso') {
            bodyText = `Bonjour,\n\nDemande de consommables pour le magasin ${staticData.magasin} :\n\n`;
            rows.forEach(item => {
                const qtyStr = item.qty ? ` (Qté: ${item.qty})` : "";
                const fileStr = item._fileName ? ` [Pièce jointe : ${item._fileName}]` : "";
                bodyText += `- ${item.article || "-"}${qtyStr}${fileStr}\n`;
            });
            bodyText += `\nMerci d'avance.\nCordialement.`;
        } else if (procedure.id === 'trf') {
            bodyText = `Bonjour,\n\nVous pouvez effectuer le transfert :\n\n`;
            rows.forEach(item => {
                const qtyPart = item.qty ? ` (Qté: ${item.qty})` : "";
                const imeiPart = item.imei ? ` (IMEI: ${item.imei})` : "";
                const fileStr = item._fileName ? ` [Pièce jointe : ${item._fileName}]` : "";
                bodyText += `- ${item.ref || "-"}${qtyPart}${imeiPart}${fileStr}\n`;
            });
            bodyText += `\nDu magasin ${staticData.exp || "?"} ----> ${staticData.dest || "?"}.\n\nMerci`;
        } else if (procedure.id === 'dhl') {
            bodyText = `Bonjour,\n\nJe souhaite organiser un enlèvement DHL pour le magasin ${staticData.magasin_cc || "N/A"}.\n\n`;
            bodyText += `Type d'envoi : ${staticData.type_envoi || "-"}\n`;
            bodyText += `Poids estimé : ${staticData.poids || "-"} kg\n`;
            bodyText += `Dimensions : ${staticData.dimensions || "-"}\n\n`;
            bodyText += `Contenu du colis :\n`;
            rows.forEach(item => {
                const qtyStr = item.qty ? ` (Qté: ${item.qty})` : "";
                const fileStr = item._fileName ? ` [Pièce jointe : ${item._fileName}]` : "";
                bodyText += `- ${item.contenu || "-"}${qtyStr}${fileStr}\n`;
            });
            bodyText += `\nMerci d'avance.\nCordialement.`;
        } else {
            const actionTitle = (procedure.id === 'sort' && usageMagasin) ? 'USAGE INTERNE' : procedure.title;
            bodyText = `Bonjour,\n\nAction : ${actionTitle}\n\n`;
            rows.forEach(item => {
                Object.entries(item).forEach(([k, v]) => {
                    if (k.startsWith('_')) return;
                    const label = procedure.dynamicFields.find(f => f.id === k)?.label || k;
                    if (v) bodyText += `${label.toUpperCase()} : ${v}\n`;
                });
                if (item._fileName) bodyText += `[Pièce jointe : ${item._fileName}]\n`;
                bodyText += `\n`;
            });
            bodyText += `Justification : ${staticData.reason || "N/A"}\n\n`;
            bodyText += `Merci,\n\n${staticData.magasin}`;
        }

        return bodyText;
    };

    // Trigger verification view
    const handleVerifyBeforeSend = () => {
        if (!validate() || !procedure) return;
        if (GOOGLE_SCRIPT_URL.includes("VOTRE_SCRIPT")) {
            alert("CONFIGURATION MANQUANTE...");
            return;
        }
        setIsConfirming(true);
    };

    // Final Send Logic
    const handleFinalSendEmail = async () => {
        if (!procedure) return;
        setIsSending(true);

        let subject = procedure.customSubject || `${procedure.code} - ${procedure.title}`;
        if (usageMagasin) subject = "SAI";
        else if (procedure.id === 'sort') subject = "SORT";

        const storeName = staticData.magasin || staticData.exp || staticData.magasin_cc || "iServices";
        subject = `[${storeName}] ${subject}`;

        let finalTo = procedure.to;
        let finalCc = procedure.cc;

        // Ajout automatique des emails boutiques pour les transferts
        if (procedure.id === 'trf') {
            const expEmail = STORE_EMAILS[staticData.exp];
            const destEmail = STORE_EMAILS[staticData.dest];

            if (expEmail) {
                finalCc = finalCc ? `${finalCc}, ${expEmail}` : expEmail;
            }
            if (destEmail) {
                finalCc = finalCc ? `${finalCc}, ${destEmail}` : destEmail;
            }
        } else if (procedure.id === 'dhl') {
            const magEmail = STORE_EMAILS[staticData.magasin_cc];
            if (magEmail) {
                finalCc = finalCc ? `${finalCc}, ${magEmail}` : magEmail;
            }
        }

        if (isTestMode) {
            if (TEST_EMAIL_DESTINATION.includes("votre.email")) {
                alert("MODE TEST ACTIVÉ : Configuration email manquante.");
                setIsSending(false);
                return;
            }
            subject = `[TEST MODE] ${subject}`;
            finalTo = TEST_EMAIL_DESTINATION;
            finalCc = "";
        }

        const coreMessage = generateMessageContent();
        const plainBody = coreMessage;
        const htmlCore = coreMessage.replace(/\n/g, '<br/>');

        const htmlBody = `
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000; line-height: 1.5;">
            ${htmlCore}
        </div>
    `;

        const attachments = rows
            .filter(row => row._content && row._fileName && row._mimeType)
            .map(row => ({
                fileName: row._fileName,
                mimeType: row._mimeType,
                content: row._content
            }));

        const payload: any = {
            to_email: finalTo,
            cc_email: finalCc,
            subject: subject,
            message: plainBody,
            body: plainBody,
            htmlBody: htmlBody,
            timestamp: new Date().toISOString()
        };

        if (attachments.length > 0) {
            payload.attachments = attachments;
        }

        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(payload)
            });

            const successMsg = isTestMode ? "TEST ENVOYÉ" : "EMAIL ENVOYÉ";
            onShowToast(successMsg);
            setTimeout(onClose, 1500);

        } catch (error) {
            console.error('FAILED...', error);
            onShowToast("ERREUR RÉSEAU");

            if (confirm("Échec envoi auto. Ouvrir mail classique ?")) {
                const mailto = `mailto:${finalTo}?cc=${finalCc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`;
                window.open(mailto, '_blank');
            }
        } finally {
            setIsSending(false);
        }
    };

    const handleCopyTable = async () => {
        if (!validate() || !procedure) return;

        const tableHeaders = procedure.dynamicFields.map(f => `<th style="color: white; padding: 12px; text-align: left; border: 1px solid #e2e8f0; font-size: 12px; background-color: #ea580c;">${f.label}</th>`).join('');
        const tableRows = rows.map(item => `<tr>${procedure.dynamicFields.map(f => `<td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; background-color: white;">${item[f.id] || "-"}</td>`).join('')}</tr>`).join('');
        const content = `<div style="font-family: Arial, sans-serif;"><h2 style="color: #ea580c;">${procedure.title}</h2><p><b>Magasin:</b> ${staticData.magasin || staticData.exp || ''}</p><table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;"><thead><tr>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody></table></div>`;

        try {
            const blob = new Blob([content], { type: 'text/html' });
            const dataItem = new ClipboardItem({ 'text/html': blob });
            await navigator.clipboard.write([dataItem]);
            onShowToast("Données Copiées");
        } catch (err) {
            console.error(err);
            onShowToast("Erreur Copie");
        }
    };

    if (!procedure) return null;

    const displayedCode = (usageMagasin && procedure.id === 'sort') ? 'SAI' : (procedure.id === 'sort' ? 'SORT' : procedure.code);
    const codeColor = (usageMagasin && procedure.id === 'sort') ? 'text-orange-500 border-orange-500' : 'text-neutral-400 border-neutral-700';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4">
            <div className="absolute inset-0 dark:bg-black/60 bg-white/40 backdrop-blur-md transition-colors" onClick={onClose}></div>
            <div className="dark:bg-[#1a1a1a]/60 bg-white/60 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] border dark:border-[#333]/50 border-white/60 w-full max-w-6xl relative z-10 flex flex-col max-h-[95vh] md:max-h-[90vh] animate-[fadeIn_0.3s_ease-out] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.1)] transition-colors">

                {/* Error Banner */}
                {showValidationAlert && (
                    <div className="bg-red-900/10 border-b border-red-500 text-red-500 px-4 md:px-8 py-3 flex items-center justify-between font-tech tracking-wider uppercase animate-shake">
                        <div className="flex items-center gap-2 md:gap-3">
                            <FaCircleExclamation />
                            <span className="text-xs md:text-sm">Erreur : Champ Requis Manquant</span>
                        </div>
                        <button onClick={() => setShowValidationAlert(false)} className="hover:text-white"><FaXmark /></button>
                    </div>
                )}

                {/* Header */}
                <div className="p-5 md:p-8 border-b dark:border-white/10 border-black/5 flex justify-between items-center dark:bg-black/30 bg-white/40 shadow-[0_1px_0_rgba(255,255,255,0.1)_inset] transition-colors relative z-20">
                    <div className="flex items-center gap-3 md:gap-6">
                        <div>
                            <span className={`${codeColor} text-[9px] md:text-[10px] font-tech font-bold px-2 md:px-3 py-1 border rounded-full bg-transparent uppercase mb-1 md:mb-2 inline-block tracking-[0.2em]`}>{displayedCode}</span>
                            <h2 className="text-xl md:text-3xl font-tech font-bold dark:text-white text-black tracking-tighter uppercase transition-colors">{procedure.title}</h2>
                        </div>

                        <div className="flex items-center gap-3">
                            {!isConfirming && (
                                <>
                                    {showPasswordInput ? (
                                        <div className="flex items-center gap-2 animate-fadeIn">
                                            <FaLock className="text-orange-600 text-xs" />
                                            <input
                                                autoFocus
                                                type="password"
                                                value={passwordInput}
                                                onChange={(e) => setPasswordInput(e.target.value)}
                                                onKeyDown={handlePasswordSubmit}
                                                onBlur={() => setShowPasswordInput(false)}
                                                placeholder="Mot de passe..."
                                                className="w-28 bg-transparent border-b border-orange-600 text-xs font-mono dark:text-white text-black focus:outline-none py-1"
                                            />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleTestButtonClick}
                                            className={`flex items-center gap-2 border px-3 py-2 rounded-full backdrop-blur-md transition-all duration-300 ${isTestMode
                                                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3),_inset_0_1px_1px_rgba(255,255,255,0.2)]'
                                                : 'dark:bg-white/5 bg-black/5 dark:border-white/10 border-black/10 text-neutral-400 hover:text-black dark:hover:text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                                                }`}
                                            title={isTestMode ? "Cliquer pour désactiver le mode test" : "Cliquer pour activer le mode test (Mot de passe requis)"}
                                        >
                                            <FaFlask className={`text-xs ${isTestMode ? 'animate-pulse' : ''}`} />
                                            <span className="text-[10px] font-bold font-tech uppercase tracking-widest hidden md:inline">
                                                {isTestMode ? 'TEST MODE ON' : 'TEST OFF'}
                                            </span>
                                        </button>
                                    )}

                                    {procedure.id === 'sort' && (
                                        <div className="hidden md:flex items-center gap-3 dark:bg-white/5 bg-black/5 backdrop-blur-md px-5 py-2 rounded-full border dark:border-white/10 border-black/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={usageMagasin} onChange={(e) => handleUsageMagasinToggle(e.target.checked)} className="sr-only peer" />
                                                <div className="w-10 h-5 dark:bg-black/50 bg-white/50 border dark:border-white/10 border-black/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600/80 peer-checked:shadow-[0_0_10px_rgba(234,88,12,0.4)]"></div>
                                            </label>
                                            <span className="text-[10px] font-tech font-bold uppercase text-neutral-400 tracking-wider">Usage Interne</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 md:w-12 md:h-12 rounded-full dark:bg-white/5 bg-black/5 backdrop-blur-md border dark:border-white/10 border-black/10 flex items-center justify-center dark:text-white text-black hover:dark:bg-white/20 hover:bg-black/20 hover:scale-105 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all duration-300">
                        <FaXmark className="text-lg md:text-xl" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 md:p-8 overflow-y-auto space-y-6 md:space-y-10 scrollbar-thin relative z-10">

                    {isConfirming ? (
                        // ==========================
                        // VUE DE VÉRIFICATION
                        // ==========================
                        <div className="animate-[fadeIn_0.3s_ease-out] space-y-6 md:space-y-8 max-w-4xl mx-auto">

                            {/* Banner Warning */}
                            <div className="flex items-center justify-center mb-6">
                                <div className="bg-orange-600/10 border border-orange-600 text-orange-600 px-6 py-3 rounded-full flex items-center gap-3 animate-pulse shadow-[0_0_15px_rgba(234,88,12,0.2)]">
                                    <FaCircleExclamation />
                                    <span className="font-tech font-bold uppercase tracking-widest text-sm">Vérification Avant Envoi</span>
                                </div>
                            </div>

                            {/* Static Fields Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {procedure.staticFields.map(f => (
                                    <div key={f.id} className="dark:bg-black/40 bg-white/40 backdrop-blur-md p-4 rounded-2xl border dark:border-white/10 border-black/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                        <span className="text-[10px] font-tech text-neutral-500 uppercase tracking-widest block mb-1">{f.label}</span>
                                        <span className="font-mono text-base dark:text-white text-black font-bold break-words">
                                            {staticData[f.id] || <span className="text-neutral-400 italic text-xs font-normal">// Non renseigné</span>}
                                        </span>
                                    </div>
                                ))}
                                {usageMagasin && (
                                    <div className="dark:bg-black/40 bg-white/40 backdrop-blur-md p-4 rounded-2xl border dark:border-white/10 border-black/5 border-l-4 border-l-orange-500/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                        <span className="text-[10px] font-tech text-neutral-500 uppercase tracking-widest block mb-1">Mode</span>
                                        <span className="font-mono text-base dark:text-white text-black font-bold">USAGE INTERNE (MAGASIN)</span>
                                    </div>
                                )}
                            </div>

                            {/* Items Summary */}
                            <div className="dark:bg-black/40 bg-white/40 backdrop-blur-md rounded-2xl border dark:border-white/10 border-black/5 overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                <div className="p-4 dark:bg-white/5 bg-black/5 border-b dark:border-white/10 border-black/5 flex justify-between items-center">
                                    <h4 className="font-tech font-bold text-sm uppercase dark:text-white text-black tracking-widest flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span>
                                        Éléments Saisis ({rows.length})
                                    </h4>
                                </div>
                                <div className="divide-y dark:divide-white/10 divide-black/5">
                                    {rows.map((row, i) => (
                                        <div key={i} className="p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors relative group">
                                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-transparent group-hover:bg-orange-500/80 transition-colors"></div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6">
                                                {procedure.dynamicFields.map(f => (
                                                    <div key={f.id} className="flex flex-col">
                                                        <span className="text-[9px] text-neutral-400 uppercase font-bold mb-0.5">{f.label}</span>
                                                        <span className="text-sm font-mono dark:text-neutral-200 text-neutral-800 font-medium truncate">
                                                            {row[f.id] || <span className="text-neutral-600 dark:text-neutral-600">-</span>}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            {row._fileName && (
                                                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-orange-600/10 text-orange-600 rounded-lg text-xs font-bold border border-orange-600/20">
                                                    <FaPaperclip /> {row._fileName}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Destinataire */}
                            <div className="flex justify-center pt-2">
                                <div className="text-center dark:bg-black/40 bg-white/40 backdrop-blur-md px-6 py-3 rounded-xl border dark:border-white/10 border-black/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                    <p className="text-[10px] font-tech text-neutral-500 uppercase tracking-widest mb-1">Destinataire {isTestMode && <span className="text-yellow-500 font-bold">(MODE TEST)</span>}</p>
                                    <p className="font-mono text-sm dark:text-white text-black font-bold">
                                        {isTestMode ? TEST_EMAIL_DESTINATION : procedure.to}
                                    </p>
                                </div>
                            </div>

                        </div>
                    ) : (
                        // ==========================
                        // VUE FORMULAIRE CLASSIQUE
                        // ==========================
                        <>
                            {/* Mobile Internal Use Toggle */}
                            {procedure.id === 'sort' && (
                                <div className="md:hidden flex items-center justify-between dark:bg-[#111] bg-white p-3 rounded-xl border dark:border-[#262626] border-neutral-300 mb-2">
                                    <span className="text-xs font-tech font-bold uppercase text-neutral-500 tracking-wider">Usage Interne</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={usageMagasin} onChange={(e) => handleUsageMagasinToggle(e.target.checked)} className="sr-only peer" />
                                        <div className="w-10 h-5 dark:bg-[#333] bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                                    </label>
                                </div>
                            )}

                            {/* Static Fields */}
                            <div className="grid grid-cols-2 gap-x-6 md:gap-x-8 gap-y-4 md:gap-y-6">
                                {procedure.staticFields.map(f => (
                                    <div key={f.id} className="col-span-2 md:col-span-1 group">
                                        <label className="block text-[9px] md:text-[10px] font-tech font-bold text-neutral-500 uppercase tracking-widest mb-2 md:mb-3 ml-1 group-focus-within:text-orange-500 transition-colors">{f.label}</label>
                                        {f.options ? (
                                            <div className="relative">
                                                <select
                                                    value={staticData[f.id] || ''}
                                                    onChange={(e) => handleStaticChange(f.id, e.target.value)}
                                                    className={`w-full px-4 md:px-5 py-3 md:py-4 dark:bg-white/5 bg-black/5 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),_inset_0_1px_0_rgba(255,255,255,0.1)] border ${errors.includes(f.id) ? 'border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'dark:border-white/10 border-black/10'} rounded-xl text-sm dark:text-white text-black focus:border-orange-500/80 outline-none transition-all appearance-none cursor-pointer font-mono`}
                                                >
                                                    <option value="" disabled>{f.placeholder || 'SELECTIONNER_OPTION'}</option>
                                                    {f.options.map(opt => (
                                                        <option key={opt} value={opt} className="dark:bg-black bg-white">{opt}</option>
                                                    ))}
                                                </select>
                                                <FaChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none text-xs" />
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                value={staticData[f.id] || ''}
                                                onChange={(e) => handleStaticChange(f.id, e.target.value)}
                                                className={`w-full px-4 md:px-5 py-3 md:py-4 dark:bg-white/5 bg-black/5 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),_inset_0_1px_0_rgba(255,255,255,0.1)] border ${errors.includes(f.id) ? 'border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'dark:border-white/10 border-black/10'} rounded-xl text-sm dark:text-white text-black focus:border-orange-500/80 focus:dark:bg-white/10 focus:bg-white/60 outline-none transition-all font-mono placeholder:text-neutral-500`}
                                                placeholder={f.placeholder || 'SAISIE_DONNEES'}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Dynamic Rows */}
                            <div className="dark:bg-white/5 bg-black/5 backdrop-blur-md p-4 md:p-8 rounded-3xl border dark:border-white/10 border-black/10 relative overflow-hidden transition-colors shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                <div className="flex items-center justify-between mb-6 md:mb-8 relative z-10">
                                    <h3 className="text-xs font-tech font-bold dark:text-white text-black uppercase tracking-widest flex items-center gap-3 transition-colors">
                                        <span className="w-2 h-2 bg-orange-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(234,88,12,0.8)]"></span>
                                        Liste_Opérations
                                    </h3>
                                    <button onClick={addRow} className="dark:bg-white/20 bg-black/20 hover:bg-black/30 dark:hover:bg-white/30 backdrop-blur-md dark:text-white text-black border dark:border-white/20 border-black/10 text-[10px] md:text-xs font-tech font-bold py-2 md:py-3 px-4 md:px-6 rounded-full transition-all duration-300 flex items-center gap-2 uppercase tracking-wider shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                                        <FaPlus /> <span className="hidden md:inline">Ajouter Ligne</span>
                                    </button>
                                </div>
                                <div className="space-y-4 relative z-10">
                                    {rows.map((row, rowIndex) => (
                                        <div key={rowIndex} className="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-end dark:bg-black/40 bg-white/60 backdrop-blur-md p-4 md:p-5 rounded-2xl border dark:border-white/10 border-black/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] animate-[fadeIn_0.3s_ease-out] hover:border-orange-500/50 transition-colors">
                                            {procedure.dynamicFields.map(f => (
                                                <div key={f.id} className={`w-full ${f.width === 'flex-1' ? 'md:flex-1' : `md:${f.width}`}`}>
                                                    <label className="block text-[9px] font-mono font-bold text-neutral-600 uppercase mb-1 md:mb-2 whitespace-nowrap">{f.label}</label>
                                                    <div className="relative">
                                                        <input
                                                            type={f.type || 'text'}
                                                            value={row[f.id] || ''}
                                                            onChange={(e) => handleRowChange(rowIndex, f.id, e.target.value)}
                                                            className={`w-full p-2 bg-transparent border-b dark:border-white/10 border-black/10 focus:border-orange-500/80 rounded-none text-sm dark:text-white text-black outline-none transition-colors font-mono dark:placeholder:text-[#444] placeholder:text-neutral-400 ${['ref', 'article', 'imei', 'contenu'].includes(f.id) ? 'pr-8' : ''}`}
                                                            placeholder={f.placeholder || '...'}
                                                        />
                                                        {['ref', 'article', 'imei', 'contenu'].includes(f.id) && (
                                                            <button
                                                                onClick={() => setScanningField({ rowIndex, fieldId: f.id })}
                                                                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-neutral-400 hover:text-orange-500/80 transition-colors"
                                                                title="Scanner un code-barres"
                                                            >
                                                                <FaBarcode />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="flex items-center justify-center pt-2 md:pt-0">
                                                <input
                                                    type="file"
                                                    id={`file-${rowIndex}`}
                                                    className="hidden"
                                                    onChange={(e) => handleFileSelect(rowIndex, e)}
                                                />
                                                <label
                                                    htmlFor={`file-${rowIndex}`}
                                                    className={`cursor-pointer w-8 h-8 flex items-center justify-center rounded-full border transition-all ${row._content
                                                        ? 'bg-orange-600/80 text-white border-orange-500/50 shadow-[0_0_10px_rgba(234,88,12,0.4),_inset_0_1px_1px_rgba(255,255,255,0.4)] animate-pulse'
                                                        : 'bg-transparent text-neutral-500 border-neutral-300 dark:border-white/20 border-black/20 hover:text-orange-500 hover:border-orange-500/50'
                                                        }`}
                                                    title={row._fileName || "Joindre un fichier"}
                                                >
                                                    <FaPaperclip className="text-sm" />
                                                </label>
                                            </div>

                                            <button onClick={() => removeRow(rowIndex)} className="w-full md:w-8 h-8 flex-none flex items-center justify-center text-neutral-500 hover:text-red-500 drop-shadow-sm hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-colors border-t md:border-t-0 border-black/10 dark:border-white/10 mt-2 md:mt-0 pt-2 md:pt-0">
                                                <FaTrashCan />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6 dark:bg-black/30 bg-white/40 backdrop-blur-md rounded-2xl border dark:border-white/10 border-black/5 transition-colors shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                <div className="flex-1">
                                    <p className="text-[10px] font-tech font-bold uppercase text-neutral-500 mb-2 tracking-widest">Destinataire {isTestMode && <span className="text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">(MODE TEST ACTIVÉ)</span>}</p>
                                    <div className={`text-xs md:text-sm font-bold font-mono dark:bg-black/40 bg-white/60 backdrop-blur-sm p-3 rounded border dark:border-white/10 border-black/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] ${isTestMode ? 'text-yellow-500 border-yellow-500/50 shadow-[inset_0_2px_4px_rgba(234,179,8,0.1)]' : 'dark:text-white text-black'}`}>
                                        {isTestMode ? TEST_EMAIL_DESTINATION : procedure.to}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-tech font-bold uppercase text-neutral-500 mb-2 tracking-widest">Copie Carbone (CC)</p>
                                    <div className="text-[10px] md:text-[11px] text-neutral-500 font-mono dark:bg-black/40 bg-white/60 backdrop-blur-sm p-3 rounded border dark:border-white/10 border-black/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] break-all max-h-20 overflow-y-auto">
                                        {isTestMode ? '--- DÉSACTIVÉ EN TEST ---' : procedure.cc}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-5 md:p-8 border-t dark:border-white/10 border-black/5 grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto dark:bg-black/30 bg-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-colors relative z-20">
                    {isConfirming ? (
                        // ==========================
                        // BOUTONS MODE CONFIRMATION
                        // ==========================
                        <>
                            <button
                                onClick={() => setIsConfirming(false)}
                                disabled={isSending}
                                className="w-full py-4 md:py-5 dark:bg-black/20 bg-white/40 hover:dark:bg-white/10 hover:bg-black/5 dark:text-white text-black font-bold font-tech text-sm md:text-base rounded-2xl transition-all border dark:border-white/20 border-black/10 flex items-center justify-center gap-3 uppercase tracking-widest hover:scale-[1.01] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
                            >
                                <FaArrowLeft /> Retour / Corriger
                            </button>
                            <button
                                onClick={handleFinalSendEmail}
                                disabled={isSending}
                                className={`w-full py-4 md:py-5 font-bold font-tech text-sm md:text-base rounded-2xl transition-all shadow-[0_0_25px_rgba(234,88,12,0.4),_inset_0_2px_4px_rgba(255,255,255,0.4)] flex items-center justify-center gap-3 uppercase tracking-widest group backdrop-blur-md border border-orange-500/50 ${isSending
                                    ? 'bg-neutral-800/80 text-neutral-500 cursor-not-allowed border-neutral-500/50 shadow-none'
                                    : 'bg-orange-600/80 text-white hover:bg-orange-500/90 hover:shadow-[0_0_35px_rgba(234,88,12,0.6)] hover:scale-[1.01] active:scale-95'
                                    }`}
                            >
                                {isSending ? (
                                    <><FaSpinner className="animate-spin" /> ENVOI EN COURS...</>
                                ) : (
                                    <><FaPaperPlane /> CONFIRMER & ENVOYER</>
                                )}
                            </button>
                        </>
                    ) : (
                        // ==========================
                        // BOUTONS MODE NORMAL
                        // ==========================
                        <>
                            <button
                                onClick={handleVerifyBeforeSend}
                                className={`w-full py-4 md:py-5 font-bold font-tech text-sm md:text-base rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest group backdrop-blur-md border ${isTestMode
                                    ? 'bg-yellow-500/80 border-yellow-400/50 text-white shadow-[0_0_25px_rgba(234,179,8,0.4),_inset_0_2px_4px_rgba(255,255,255,0.4)] hover:bg-yellow-400/90 hover:shadow-[0_0_35px_rgba(234,179,8,0.6)]'
                                    : 'bg-orange-600/80 border-orange-500/50 text-white shadow-[0_0_25px_rgba(234,88,12,0.4),_inset_0_2px_4px_rgba(255,255,255,0.4)] hover:bg-orange-500/90 hover:shadow-[0_0_35px_rgba(234,88,12,0.6)]'
                                    } hover:scale-[1.01] active:scale-95`}
                            >
                                {isTestMode ? <FaFlask /> : <FaCheck className="group-hover:scale-110 transition-transform" />}
                                {isTestMode ? 'VÉRIFIER (MODE TEST)' : 'VÉRIFIER & ENVOYER'}
                            </button>
                            <button onClick={handleCopyTable} className="w-full py-4 md:py-5 dark:bg-white/10 bg-black/5 hover:bg-black/10 dark:hover:bg-white/20 backdrop-blur-md dark:text-white text-black font-bold font-tech text-sm md:text-base rounded-2xl hover:scale-[1.01] active:scale-95 transition-all border dark:border-white/20 border-black/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3 uppercase tracking-widest">
                                <FaCopy /> Copier Données
                            </button>
                        </>
                    )}
                </div>
            </div>
            {/* Barcode Scanner Portal */}
            {scanningField && (
                <BarcodeScanner
                    onScan={(decodedText) => {
                        handleRowChange(scanningField.rowIndex, scanningField.fieldId, decodedText);
                        setScanningField(null);
                        onShowToast("Code scanné !");
                    }}
                    onClose={() => setScanningField(null)}
                />
            )}
        </div>
    );
};

export default Modal;