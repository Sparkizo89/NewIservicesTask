import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import {
    FaEraser, FaDownload, FaFloppyDisk, FaXmark,
    FaUser, FaFileInvoice, FaMobileScreen, FaScrewdriverWrench,
    FaEuroSign, FaSignature, FaBuilding, FaListUl, FaTrash, FaPen,
    FaChartSimple, FaCalendar, FaChevronDown, FaFlask, FaEye
} from 'react-icons/fa6';

interface QualiReparFormProps {
    onShowToast: (msg: string) => void;
}

interface AttestationData {
    id: string;
    prenom: string;
    nom: string;
    telephone: string;
    facture: string;
    date: string;
    entreprise: string;
    appareil: string;
    marque: string;
    serie: string;
    panne: string;
    montant: string;
    signatureData?: string;
    savedAt: number;
    downloadedAt?: number;
}

const QualiReparForm: React.FC<QualiReparFormProps> = ({ onShowToast }) => {
    const [view, setView] = useState<'form' | 'list' | 'dashboard'>('form');
    const [savedAttestations, setSavedAttestations] = useState<AttestationData[]>([]);
    const [downloadedAttestations, setDownloadedAttestations] = useState<AttestationData[]>([]);
    const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
    const [isTestMode, setIsTestMode] = useState(false);
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [previewAttestation, setPreviewAttestation] = useState<AttestationData | null>(null);
    const TEST_PASSWORD = "Franca2024";

    const [formData, setFormData] = useState<AttestationData>({
        id: Date.now().toString(),
        prenom: '',
        nom: '',
        telephone: '',
        facture: '',
        date: new Date().toLocaleDateString('fr-FR'),
        entreprise: 'Worten France',
        appareil: '',
        marque: '',
        serie: '',
        panne: '',
        montant: '',
        savedAt: Date.now()
    });

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

    // Load saved attestations list on mount
    useEffect(() => {
        const savedList = localStorage.getItem('qualirepar_attestations_list');
        if (savedList) {
            try {
                setSavedAttestations(JSON.parse(savedList));
            } catch (e) {
                console.error("Error parsing saved attestations list", e);
            }
        }

        const savedDownloaded = localStorage.getItem('qualirepar_downloaded_list');
        if (savedDownloaded) {
            try {
                setDownloadedAttestations(JSON.parse(savedDownloaded));
            } catch (e) {
                console.error("Error parsing downloaded attestations list", e);
            }
        }

        // Also check for the "last draft" to restore state if user just refreshed
        const lastDraft = localStorage.getItem('last_qualirepar_form');
        const lastSig = localStorage.getItem('last_qualirepar_signature');
        if (lastDraft) {
            try {
                const parsedDraft = JSON.parse(lastDraft);
                // Ensure it has an ID
                if (!parsedDraft.id) parsedDraft.id = Date.now().toString();
                setFormData(parsedDraft);

                // Restore signature
                if (lastSig && sigCanvas.current) {
                    setTimeout(() => {
                        sigCanvas.current?.fromDataURL(lastSig);
                    }, 200);
                }
            } catch (e) { console.error(e); }
        }
    }, []);

    useEffect(() => {
        if (view === 'form') {
            const timer = setTimeout(resizeCanvas, 100);
            window.addEventListener("resize", resizeCanvas);
            return () => {
                clearTimeout(timer);
                window.removeEventListener("resize", resizeCanvas);
            };
        }
    }, [view]);

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let newFormData = { ...formData, [name]: value };

        // Auto-fill amount based on device type
        if (name === 'appareil') {
            let amount = '';
            switch (value) {
                case 'Smartphone':
                case 'Tablette':
                    amount = '25';
                    break;
                case 'Ordinateur Portable':
                    amount = '50';
                    break;
                case 'Console de jeux':
                    amount = '20';
                    break;
            }
            if (amount) {
                newFormData = { ...newFormData, montant: amount };
            }
        }

        setFormData(newFormData);
    };

    const clearSignature = () => {
        sigCanvas.current?.clear();
        localStorage.removeItem('last_qualirepar_signature');
    };

    const handleReset = () => {
        setFormData({
            id: Date.now().toString(),
            prenom: '',
            nom: '',
            telephone: '',
            facture: '',
            date: new Date().toLocaleDateString('fr-FR'),
            entreprise: 'Worten France',
            appareil: '',
            marque: '',
            serie: '',
            panne: '',
            montant: '',
            savedAt: Date.now()
        });
        clearSignature();
        localStorage.removeItem('last_qualirepar_form');
        onShowToast("Formulaire réinitialisé");
    };

    const handleSave = () => {
        // 1. Get current signature
        let currentSig = '';
        if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
            currentSig = sigCanvas.current.toDataURL();
        }

        // 2. Prepare object to save
        const dataToSave: AttestationData = {
            ...formData,
            signatureData: currentSig,
            savedAt: Date.now()
        };

        // 3. Update list
        const newList = [...savedAttestations];
        const existingIndex = newList.findIndex(item => item.id === dataToSave.id);

        if (existingIndex >= 0) {
            newList[existingIndex] = dataToSave;
        } else {
            newList.unshift(dataToSave); // Add to top
        }

        // 4. Save to state and localStorage
        setSavedAttestations(newList);
        localStorage.setItem('qualirepar_attestations_list', JSON.stringify(newList));

        // Also save as "current draft" for refresh persistence
        localStorage.setItem('last_qualirepar_form', JSON.stringify(dataToSave));
        if (currentSig) {
            localStorage.setItem('last_qualirepar_signature', currentSig);
        } else {
            localStorage.removeItem('last_qualirepar_signature');
        }

        onShowToast("Attestation sauvegardée dans 'Mes attestations'");
    };

    const loadAttestation = (attestation: AttestationData) => {
        setFormData(attestation);
        setView('form');

        // Wait for view to switch then load signature
        setTimeout(() => {
            if (sigCanvas.current) {
                sigCanvas.current.clear();
                if (attestation.signatureData) {
                    sigCanvas.current.fromDataURL(attestation.signatureData);
                }
            }
        }, 100);

        onShowToast("Attestation chargée");
    };

    const deleteAttestation = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newList = savedAttestations.filter(item => item.id !== id);
        setSavedAttestations(newList);
        localStorage.setItem('qualirepar_attestations_list', JSON.stringify(newList));

        const newDownloaded = downloadedAttestations.filter(item => item.id !== id);
        setDownloadedAttestations(newDownloaded);
        localStorage.setItem('qualirepar_downloaded_list', JSON.stringify(newDownloaded));

        onShowToast("Attestation supprimée");
    };

    const generatePDF = async () => {
        try {
            // Validation
            const requiredFields = ['prenom', 'nom', 'telephone', 'facture', 'date', 'entreprise', 'appareil', 'marque', 'serie', 'panne', 'montant'];
            const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);

            if (missingFields.length > 0) {
                onShowToast(`Champs manquants : ${missingFields.join(', ')}`);
                return;
            }

            if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
                onShowToast("La signature est manquante !");
                return;
            }

            console.log("Generating PDF...");
            if (typeof jsPDF === 'undefined') {
                throw new Error("jsPDF is not defined. Please reload the page.");
            }
            const doc = new jsPDF();

            // --- HEADER LOGOS ---

            // --- HEADER LOGOS ---

            // ---------------------------------------------------------------------------
            // LE CODE DU LOGO EST GÉNÉRÉ ICI (DEBUT)
            // Vous pouvez modifier les coordonnées ci-dessous pour ajuster la forme.
            // ---------------------------------------------------------------------------

            const logoX = 20;
            const logoY = 10; // Remonté pour plus d'espace avec le titre
            const s = 1.6; // Facteur d'agrandissement du bonhomme
            const cx = logoX + 8; // Centre X du bonhomme
            const cy = logoY + 10; // Centre Y du bonhomme

            // 1. CORPS PRINCIPAL (Bleu) - Pointes arrondies et taille augmentée
            doc.setFillColor(0, 174, 239); // Cyan #00AEEF

            // Base et remontée du cou (côté droit)
            doc.moveTo(cx - 2.0 * s, cy + 8.0 * s);
            doc.lineTo(cx + 2.0 * s, cy + 8.0 * s);
            doc.lineTo(cx + 2.0 * s, cy + 5.0 * s);

            // Évasement de l'épaule droite
            doc.curveTo(cx + 2.0 * s, cy + 4.3 * s, cx + 2.1 * s, cy + 3.8 * s, cx + 2.5 * s, cy + 3.13 * s);

            // Bras inférieur droit
            doc.lineTo(cx + 3.9 * s, cy + 0.69 * s);

            // Coude droit
            doc.curveTo(cx + 4.1 * s, cy + 0.35 * s, cx + 4.1 * s, cy - 0.35 * s, cx + 3.9 * s, cy - 0.69 * s);

            // Bras supérieur droit
            doc.lineTo(cx + 2.6 * s, cy - 2.94 * s);

            // Pointe du bras droit (demi-cercle parfait aligné avec l'angle du bras)
            doc.curveTo(cx + 2.168 * s, cy - 3.689 * s, cx + 1.044 * s, cy - 3.040 * s, cx + 1.477 * s, cy - 2.291 * s);

            // Plongeon sous la gomme blanche
            doc.lineTo(cx, cy - 1.0 * s);
            doc.lineTo(cx - 1.477 * s, cy - 2.291 * s);

            // Pointe du bras gauche (symétrie du demi-cercle)
            doc.curveTo(cx - 1.044 * s, cy - 3.040 * s, cx - 2.168 * s, cy - 3.689 * s, cx - 2.6 * s, cy - 2.94 * s);

            // Bras supérieur gauche
            doc.lineTo(cx - 3.9 * s, cy - 0.69 * s);

            // Coude gauche
            doc.curveTo(cx - 4.1 * s, cy - 0.35 * s, cx - 4.1 * s, cy + 0.35 * s, cx - 3.9 * s, cy + 0.69 * s);

            // Bras inférieur gauche
            doc.lineTo(cx - 2.5 * s, cy + 3.13 * s);

            // Évasement de l'épaule gauche
            doc.curveTo(cx - 2.1 * s, cy + 3.8 * s, cx - 2.0 * s, cy + 4.3 * s, cx - 2.0 * s, cy + 5.0 * s);

            // Retour à la base
            doc.lineTo(cx - 2.0 * s, cy + 8.0 * s);
            doc.fill();

            // 2. LA "GOMME" (Blanc)
            doc.setFillColor(255, 255, 255);
            const r_gap = 2.8 * s;
            const h_gap = r_gap * 0.866;
            doc.moveTo(cx - r_gap / 2, cy - h_gap);
            doc.lineTo(cx + r_gap / 2, cy - h_gap);
            doc.lineTo(cx + r_gap, cy);
            doc.lineTo(cx + r_gap / 2, cy + h_gap);
            doc.lineTo(cx - r_gap / 2, cy + h_gap);
            doc.lineTo(cx - r_gap, cy);
            doc.fill();

            // 3. HEXAGONE CENTRAL (Bleu)
            doc.setFillColor(0, 174, 239);
            const r = 2.2 * s;
            const h = r * 0.866;
            doc.moveTo(cx - r / 2, cy - h);
            doc.lineTo(cx + r / 2, cy - h);
            doc.lineTo(cx + r, cy);
            doc.lineTo(cx + r / 2, cy + h);
            doc.lineTo(cx - r / 2, cy + h);
            doc.lineTo(cx - r, cy);
            doc.fill();

            // ---------------------------------------------------------------------------
            // FIN DU CODE DU LOGO
            // ---------------------------------------------------------------------------

            // 3. TEXT
            const textX = cx + 10;

            // "LABEL" - Espacé pour faire la même largeur que QUALI
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text("L    A    B    E    L", textX, logoY + 4);

            // "QUALI"
            doc.setFontSize(22);
            doc.setTextColor(0, 174, 239); // Cyan
            doc.text("QUALI", textX, logoY + 12);

            // "RÉPAR"
            doc.setTextColor(0, 0, 0); // Black
            doc.text("RÉPAR", textX, logoY + 20);

            // 4. FOOTER LINE
            const footerY = logoY + 24;

            // Dark Blue Bar
            doc.setFillColor(0, 0, 139); // Dark Blue
            doc.rect(logoX, footerY, 4, 1.5, 'F');

            // Text
            doc.setFontSize(6);
            doc.setTextColor(0, 174, 239); // Cyan
            doc.text("EQUIPEMENTS ELECTRIQUES ET ELECTRONIQUES", logoX + 5, footerY + 1.2);

            // Red Bar
            // Calculate width of text roughly to place red bar
            const footerTextWidth = doc.getTextWidth("EQUIPEMENTS ELECTRIQUES ET ELECTRONIQUES");
            doc.setFillColor(230, 0, 0); // Red
            doc.rect(logoX + 5 + footerTextWidth + 1, footerY, 4, 1.5, 'F');

            // Right Logo: e-reparateur (Remonté pour s'aligner)
            doc.setFont("times", "italic"); // Script-like
            doc.setFontSize(28);
            doc.setTextColor(128, 195, 66); // Green
            doc.text("e", 140, 20);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(0, 159, 227); // Blue
            doc.text("-reparateur", 150, 20);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100); // Grey
            doc.text("un service d'Ecologic", 152, 25);

            // --- TITLE ---
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0); // Black
            doc.text("ATTESTATION CONSOMMATEUR DE DEMANDE DE", 105, 45, { align: "center" });
            doc.text("BONUS REPARATION", 105, 52, { align: "center" });

            // --- BODY ---
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            let y = 70;
            const lineHeight = 8;

            doc.text("Je, soussigné(e) :", 20, y);
            y += lineHeight;
            doc.text(`[Prénom] : ${formData.prenom}`, 20, y);
            y += lineHeight;
            doc.text(`[Nom] : ${formData.nom}`, 20, y);
            y += lineHeight;
            doc.text(`[téléphone] : ${formData.telephone}`, 20, y);
            y += lineHeight * 2;

            doc.text("Atteste avoir effectué une demande de réparation avec bonus réparation :", 20, y);
            y += lineHeight;
            doc.text(`[numéro de dossier] : ${formData.facture}`, 20, y);
            y += lineHeight;
            doc.text(`[date] : ${formData.date}`, 20, y);
            y += lineHeight;
            doc.text(`[nom de l'entreprise de réparation] : ${formData.entreprise}`, 20, y);
            y += lineHeight * 2;

            doc.text("Équipement concerné :", 20, y);
            y += lineHeight;
            doc.text(`[Équipement] : ${formData.appareil}`, 20, y);
            y += lineHeight;
            doc.text(`[marque] : ${formData.marque}`, 20, y);
            y += lineHeight;
            doc.text(`[numéro de série] : ${formData.serie}`, 20, y);
            y += lineHeight;
            doc.text(`[Type de panne] : ${formData.panne}`, 20, y);
            y += lineHeight * 2;

            doc.text("Le montant du bonus réparation s'élève à :", 20, y);
            y += lineHeight;
            doc.text(`[Montant du bonus] : ${formData.montant} €`, 20, y);
            y += lineHeight * 2;

            doc.text("Fait pour servir et valoir ce que de droit.", 20, y);
            y += lineHeight * 2;

            doc.text(`[date] : ${formData.date}`, 20, y);
            y += lineHeight;
            doc.text("[signature du consommateur] :", 20, y);

            // Add signature image
            let currentSignature = '';
            if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
                // Use getCanvas() instead of getTrimmedCanvas() to avoid import errors
                currentSignature = sigCanvas.current.getCanvas().toDataURL('image/png');
                doc.addImage(currentSignature, 'PNG', 20, y + 5, 50, 30);
            }

            const safeNom = formData.nom.replace(/[^a-z0-9]/gi, '_');
            const safePrenom = formData.prenom.replace(/[^a-z0-9]/gi, '_');
            doc.save(`Attestation_QualiRepar_${safeNom}_${safePrenom}.pdf`);
            console.log("PDF saved successfully.");

            // Save to downloaded attestations for the dashboard
            const existingIndex = downloadedAttestations.findIndex(a => a.facture === formData.facture && formData.facture !== '');
            let updatedDownloaded;

            const dataToSave = {
                ...formData,
                signatureData: currentSignature,
                downloadedAt: Date.now()
            };

            if (existingIndex >= 0) {
                updatedDownloaded = [...downloadedAttestations];
                updatedDownloaded[existingIndex] = dataToSave;
            } else {
                updatedDownloaded = [{ ...dataToSave, id: Date.now().toString() }, ...downloadedAttestations];
            }
            setDownloadedAttestations(updatedDownloaded);
            localStorage.setItem('qualirepar_downloaded_list', JSON.stringify(updatedDownloaded));

            onShowToast("PDF Téléchargé !");
        } catch (error) {
            console.error("Error generating PDF:", error);
            onShowToast("Erreur lors de la génération du PDF : " + (error instanceof Error ? error.message : String(error)));
        }
    };

    const [attestationSearchQuery, setAttestationSearchQuery] = useState('');

    // Dashboard Helpers
    const groupedAttestations = downloadedAttestations.reduce((acc, att) => {
        const date = new Date(att.downloadedAt || Date.now());
        const monthYear = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        const formattedMonth = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
        if (!acc[formattedMonth]) acc[formattedMonth] = [];
        acc[formattedMonth].push(att);
        return acc;
    }, {} as Record<string, AttestationData[]>);

    const getMonthTotal = (atts: AttestationData[]) => {
        return atts.reduce((sum, att) => {
            const val = parseFloat(att.montant);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
    };

    const AnimatedCounter = ({ value }: { value: number }) => {
        const [displayValue, setDisplayValue] = useState(0);

        useEffect(() => {
            let start = 0;
            const end = value;
            if (start === end) return;

            const duration = 1000;
            const incrementTime = 20;
            const steps = duration / incrementTime;
            const increment = (end - start) / steps;

            const timer = setInterval(() => {
                start += increment;
                if (start >= end) {
                    setDisplayValue(end);
                    clearInterval(timer);
                } else {
                    setDisplayValue(Math.floor(start));
                }
            }, incrementTime);

            return () => clearInterval(timer);
        }, [value]);

        return <span>{displayValue}</span>;
    };

    const toggleMonth = (month: string) => {
        setExpandedMonths(prev =>
            prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
        );
    };

    const handleDeleteDownloaded = (id: string) => {
        const updated = downloadedAttestations.filter(a => a.id !== id);
        setDownloadedAttestations(updated);
        localStorage.setItem('qualirepar_downloaded_list', JSON.stringify(updated));

        const updatedSaved = savedAttestations.filter(a => a.id !== id);
        setSavedAttestations(updatedSaved);
        localStorage.setItem('qualirepar_attestations_list', JSON.stringify(updatedSaved));

        onShowToast("Attestation supprimée");
    };

    // Filtered attestations
    const filteredAttestations = savedAttestations.filter(att =>
        att.nom.toLowerCase().includes(attestationSearchQuery.toLowerCase()) ||
        att.prenom.toLowerCase().includes(attestationSearchQuery.toLowerCase()) ||
        att.appareil.toLowerCase().includes(attestationSearchQuery.toLowerCase()) ||
        att.facture.toLowerCase().includes(attestationSearchQuery.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 pb-40">
            {/* Header with Tech Vibe */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10 border-b border-neutral-200 dark:border-[#333] pb-6">
                <div>
                    <h2 className="text-4xl font-tech font-bold dark:text-white text-black uppercase tracking-tighter">
                        Quali<span className={isTestMode ? "text-yellow-500" : "text-orange-600"}>Repar</span>
                    </h2>
                    <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest mt-1">
                        Générateur d'Attestation Numérique
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {view === 'form' && (
                        <>
                            <button onClick={handleReset} className="flex items-center gap-2 px-4 py-3 dark:bg-red-900/10 bg-red-50/50 backdrop-blur-sm dark:text-red-500/70 text-red-500/70 hover:dark:text-red-500 hover:text-red-500 transition-all text-xs font-bold uppercase tracking-widest rounded-full hover:bg-red-500/10 dark:hover:bg-red-500/20 border border-transparent hover:border-red-500/20">
                                <FaXmark /> <span className="hidden md:inline">Réinitialiser</span>
                            </button>
                            <button onClick={handleSave} className="flex items-center gap-2 px-5 py-3 dark:bg-white/5 bg-black/5 backdrop-blur-md dark:text-neutral-400 text-neutral-600 rounded-full font-tech text-xs uppercase tracking-widest font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-all border dark:border-white/10 border-black/5 hover:border-black/20 dark:hover:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                <FaFloppyDisk /> <span className="hidden md:inline">Sauvegarder</span>
                            </button>
                            <button onClick={generatePDF} className={`flex items-center gap-2 px-6 py-3 text-white rounded-full font-tech text-xs uppercase tracking-widest font-bold transition-all hover:scale-105 backdrop-blur-md border ${isTestMode ? 'bg-yellow-500/80 hover:bg-yellow-500 border-yellow-400/50 shadow-[0_0_20px_rgba(234,179,8,0.4),_inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6),_inset_0_1px_1px_rgba(255,255,255,0.6)]' : 'bg-orange-600/80 hover:bg-orange-600 border-orange-500/50 shadow-[0_0_20px_rgba(234,88,12,0.4),_inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_0_30px_rgba(234,88,12,0.6),_inset_0_1px_1px_rgba(255,255,255,0.6)]'}`}>
                                <FaDownload /> <span className="hidden md:inline">Télécharger</span>
                            </button>
                            <div className="w-px h-8 dark:bg-white/10 bg-black/10 hidden md:block mx-1"></div>
                        </>
                    )}
                    <button
                        onClick={() => setView('dashboard')}
                        className={`
                        flex items-center gap-3 px-5 py-3 rounded-full transition-all duration-300 font-tech text-xs tracking-widest uppercase relative overflow-hidden group backdrop-blur-md border border-transparent
                        ${view === 'dashboard'
                                ? (isTestMode ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500 font-bold shadow-[0_0_20px_rgba(234,179,8,0.2),_inset_0_1px_1px_rgba(255,255,255,0.1)] scale-105' : 'bg-orange-600/20 border-orange-600/50 text-orange-500 font-bold shadow-[0_0_20px_rgba(234,88,12,0.2),_inset_0_1px_1px_rgba(255,255,255,0.1)] scale-105')
                                : 'text-neutral-500 hover:text-black dark:hover:text-white dark:bg-white/5 bg-black/5 hover:bg-black/10 dark:hover:bg-white/10 dark:border-white/5 border-black/5 hover:border-black/20 dark:hover:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                            }
                    `}
                    >
                        <FaChartSimple className="text-lg" />
                        <span className="hidden md:inline">Dashboard</span>
                    </button>
                    <button
                        onClick={() => setView('list')}
                        className={`
                        flex items-center gap-3 px-5 py-3 rounded-full transition-all duration-300 font-tech text-xs tracking-widest uppercase relative overflow-hidden group backdrop-blur-md border border-transparent
                        ${view === 'list'
                                ? (isTestMode ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500 font-bold shadow-[0_0_20px_rgba(234,179,8,0.2),_inset_0_1px_1px_rgba(255,255,255,0.1)] scale-105' : 'bg-orange-600/20 border-orange-600/50 text-orange-500 font-bold shadow-[0_0_20px_rgba(234,88,12,0.2),_inset_0_1px_1px_rgba(255,255,255,0.1)] scale-105')
                                : 'text-neutral-500 hover:text-black dark:hover:text-white dark:bg-white/5 bg-black/5 hover:bg-black/10 dark:hover:bg-white/10 dark:border-white/5 border-black/5 hover:border-black/20 dark:hover:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                            }
                    `}
                    >
                        <FaListUl className="text-lg" />
                        <span className="hidden md:inline">Mes Attestations</span>
                        {savedAttestations.length > 0 && (
                            <span className={`ml-1 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold backdrop-blur-sm ${view === 'list' ? (isTestMode ? 'bg-yellow-500/20 text-yellow-500' : 'bg-orange-600/20 text-orange-500') : 'dark:bg-white/10 bg-black/10 dark:text-white text-black'}`}>
                                {savedAttestations.length}
                            </span>
                        )}
                    </button>

                    {(view === 'list' || view === 'dashboard') && (
                        <button
                            onClick={() => setView('form')}
                            className="flex items-center gap-2 px-5 py-3 dark:bg-white/10 bg-black/80 backdrop-blur-md text-white dark:text-white rounded-full font-tech text-xs uppercase tracking-widest font-bold hover:bg-black dark:hover:bg-white/20 transition-all border dark:border-white/20 border-black/5 hover:border-black/20 dark:hover:border-white/40 shadow-[0_4px_15px_rgba(0,0,0,0.1),_inset_0_1px_1px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.15),_inset_0_1px_1px_rgba(255,255,255,0.3)] hover:scale-105"
                        >
                            <FaPen /> Nouveau
                        </button>
                    )}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {view === 'dashboard' ? (
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="space-y-6"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-tech font-bold dark:text-white text-black uppercase tracking-widest">Dashboard</h3>

                            <div className="flex items-center gap-4">
                                {/* Test Mode Button */}
                                <div className="relative">
                                    {showPasswordInput ? (
                                        <input
                                            type="password"
                                            value={passwordInput}
                                            onChange={(e) => setPasswordInput(e.target.value)}
                                            onKeyDown={handlePasswordSubmit}
                                            autoFocus
                                            onBlur={() => setShowPasswordInput(false)}
                                            className="px-4 py-2 rounded-full border border-neutral-300 dark:border-[#333] bg-white dark:bg-[#111] text-sm outline-none focus:border-orange-500 w-32"
                                            placeholder="Mot de passe..."
                                        />
                                    ) : (
                                        <button
                                            onClick={handleTestButtonClick}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors text-xs font-bold tracking-widest uppercase ${isTestMode ? 'bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-500' : 'border-neutral-200 dark:border-[#333] text-neutral-500 hover:bg-neutral-100 dark:hover:bg-[#222]'}`}
                                        >
                                            <FaFlask /> TEST {isTestMode ? 'ON' : 'OFF'}
                                        </button>
                                    )}
                                </div>

                                {isTestMode && (
                                    <button
                                        onClick={() => {
                                            setDownloadedAttestations([]);
                                            localStorage.removeItem('qualirepar_downloaded_list');
                                            setSavedAttestations([]);
                                            localStorage.removeItem('qualirepar_attestations_list');
                                            onShowToast("Toutes les attestations ont été supprimées");
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-600 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 transition-colors"
                                    >
                                        <FaTrash /> Réinitialiser
                                    </button>
                                )}
                            </div>
                        </div>

                        {Object.keys(groupedAttestations).length === 0 ? (
                            <div className="text-center py-20 text-neutral-500">
                                <FaChartSimple className="text-4xl mx-auto mb-4 opacity-20" />
                                <p>Aucune attestation téléchargée pour le moment.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid gap-4">
                                    {Object.entries(groupedAttestations).map(([month, atts]) => (
                                        <div key={month} className="dark:bg-[#1a1a1a]/40 bg-white/40 backdrop-blur-md border dark:border-white/10 border-black/10 rounded-2xl overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)]">
                                            <button
                                                onClick={() => toggleMonth(month)}
                                                className="w-full flex items-center justify-between p-6 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isTestMode ? 'bg-yellow-500/20 text-yellow-600' : 'bg-orange-500/20 text-orange-600'}`}>
                                                        <FaCalendar />
                                                    </div>
                                                    <h4 className="text-lg font-bold capitalize dark:text-white text-black">{month}</h4>
                                                    <span className="text-xs font-mono bg-neutral-100 dark:bg-[#222] px-2 py-1 rounded text-neutral-500">{atts.length} attestation(s)</span>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Total Bonus</div>
                                                        <div className={`text-xl font-bold ${isTestMode ? 'text-yellow-500' : 'text-orange-600'}`}><AnimatedCounter value={getMonthTotal(atts)} /> €</div>
                                                    </div>
                                                    <FaChevronDown className={`text-neutral-400 transition-transform ${expandedMonths.includes(month) ? 'rotate-180' : ''}`} />
                                                </div>
                                            </button>

                                            {expandedMonths.includes(month) && (
                                                <div className="border-t dark:border-white/10 border-black/10 dark:bg-black/20 bg-black/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                                                    <div className="space-y-2">
                                                        {atts.map((att, idx) => (
                                                            <div key={att.id || idx} className="flex items-center justify-between p-4 dark:bg-black/20 bg-white/60 backdrop-blur-md border dark:border-white/5 border-black/5 rounded-xl hover:dark:border-white/20 hover:border-black/20 transition-colors group shadow-sm hover:shadow-md">
                                                                <div className="grid grid-cols-4 gap-4 flex-1">
                                                                    <div>
                                                                        <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Client</div>
                                                                        <div className="text-sm font-bold dark:text-white text-black">{att.nom} {att.prenom}</div>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Facture</div>
                                                                        <div className="text-sm font-mono dark:text-neutral-300 text-neutral-700">{att.facture || '-'}</div>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Appareil</div>
                                                                        <div className="text-sm dark:text-neutral-300 text-neutral-700">{att.appareil || '-'}</div>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Marque</div>
                                                                        <div className="text-sm dark:text-neutral-300 text-neutral-700">{att.marque || '-'}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 ml-4">
                                                                    <div className={`font-bold ${isTestMode ? 'text-yellow-500' : 'text-orange-600'}`}>
                                                                        {att.montant} €
                                                                    </div>
                                                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setPreviewAttestation(att);
                                                                            }}
                                                                            className="p-2 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                                            title="Prévisualiser"
                                                                        >
                                                                            <FaEye />
                                                                        </button>
                                                                        {isTestMode && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteDownloaded(att.id);
                                                                                }}
                                                                                className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                                title="Supprimer"
                                                                            >
                                                                                <FaTrash />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                ) : view === 'list' ? (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="space-y-8"
                    >
                        {/* Search Bar (Softer Style) */}
                        <div className="relative max-w-md mx-auto md:mx-0">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <FaListUl className="text-neutral-400" />
                            </div>
                            <input
                                type="text"
                                value={attestationSearchQuery}
                                onChange={(e) => setAttestationSearchQuery(e.target.value)}
                                className={`block w-full pl-11 pr-4 py-3.5 border-none rounded-2xl bg-white dark:bg-[#111] text-sm placeholder-neutral-400 focus:ring-2 shadow-sm transition-all dark:text-white ${isTestMode ? 'focus:ring-yellow-500/50' : 'focus:ring-orange-600/50'}`}
                                placeholder="Rechercher un dossier..."
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                                <span className="text-[10px] text-neutral-400 font-mono uppercase bg-neutral-100 dark:bg-[#222] px-2 py-1 rounded-lg">
                                    {filteredAttestations.length}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredAttestations.length === 0 ? (
                                <div className="col-span-full text-center py-20 text-neutral-400 bg-neutral-50 dark:bg-[#111]/50 rounded-[32px] border border-dashed border-neutral-200 dark:border-[#333]">
                                    <FaListUl className="text-4xl mx-auto mb-4 opacity-20" />
                                    <p className="font-tech text-sm uppercase tracking-widest">Aucune donnée trouvée.</p>
                                    {savedAttestations.length === 0 && (
                                        <button onClick={() => setView('form')} className={`mt-4 font-bold hover:underline font-tech text-xs uppercase ${isTestMode ? 'text-yellow-500' : 'text-orange-600'}`}>Créer un nouveau dossier</button>
                                    )}
                                </div>
                            ) : (
                                filteredAttestations.map((attestation) => (
                                    <div
                                        key={attestation.id}
                                        onClick={() => loadAttestation(attestation)}
                                        className={`relative dark:bg-black/30 bg-white/60 backdrop-blur-xl rounded-[32px] p-7 cursor-pointer transition-all duration-300 group overflow-hidden border dark:border-white/10 border-black/5 hover:bg-white/80 dark:hover:bg-black/50 active:scale-[0.98] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),_0_12px_40px_rgba(0,0,0,0.1)] ${isTestMode ? 'hover:border-yellow-500/50 hover:shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'hover:border-orange-500/50 hover:shadow-[0_0_15px_rgba(234,88,12,0.2)]'}`}
                                    >
                                        {/* Header with Icon and Date */}
                                        <div className="flex justify-between items-start mb-6 z-10 relative">
                                            <div className={`w-14 h-14 rounded-2xl dark:bg-white/10 bg-black/5 backdrop-blur-md border dark:border-white/20 border-black/10 dark:text-white text-black flex items-center justify-center text-2xl transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] ${isTestMode ? 'group-hover:bg-yellow-500 group-hover:text-black group-hover:border-yellow-500 group-hover:shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'group-hover:bg-orange-600 group-hover:text-black group-hover:border-orange-600 group-hover:shadow-[0_0_15px_rgba(234,88,12,0.4)]'}`}>
                                                <FaUser />
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={`text-[10px] font-tech border px-2 py-0.5 rounded uppercase tracking-wider ${isTestMode ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5' : 'text-orange-600 border-orange-600/30 bg-orange-600/5'}`}>
                                                    {attestation.date}
                                                </span>
                                                <div className="flex items-center gap-1 mt-3">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewAttestation(attestation);
                                                        }}
                                                        className="text-neutral-400 hover:text-blue-500 transition-colors p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full"
                                                        title="Prévisualiser"
                                                    >
                                                        <FaEye className="text-lg" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => deleteAttestation(attestation.id, e)}
                                                        className="text-neutral-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                                        title="Supprimer"
                                                    >
                                                        <FaTrash className="text-lg" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="relative z-10 mb-6">
                                            <h3 className={`font-tech text-xl dark:text-white text-black mb-1 uppercase tracking-tight leading-none transition-colors truncate ${isTestMode ? 'group-hover:text-yellow-500' : 'group-hover:text-orange-500'}`}>
                                                {attestation.prenom} {attestation.nom}
                                            </h3>
                                            <p className="text-xs font-sans text-neutral-500 leading-relaxed truncate">
                                                {attestation.appareil || 'Appareil non spécifié'}
                                            </p>
                                        </div>

                                        {/* Footer Info */}
                                        <div className="flex justify-between items-end border-t border-neutral-100 dark:border-[#222] pt-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Dossier</span>
                                                <span className="text-xs font-mono dark:text-neutral-300">{attestation.facture || 'N/A'}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Bonus</span>
                                                <span className={`text-lg font-bold leading-none ${isTestMode ? 'text-yellow-500' : 'text-orange-600'}`}>{attestation.montant}€</span>
                                            </div>
                                        </div>

                                        {/* Hover Dots */}
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                            <div className={`w-1 h-1 rounded-full ${isTestMode ? 'bg-yellow-500' : 'bg-orange-600'}`}></div>
                                            <div className={`w-1 h-1 rounded-full ${isTestMode ? 'bg-yellow-500' : 'bg-orange-600'}`}></div>
                                            <div className={`w-1 h-1 rounded-full ${isTestMode ? 'bg-yellow-500' : 'bg-orange-600'}`}></div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="grid grid-cols-1 xl:grid-cols-12 gap-6"
                    >

                        {/* LEFT COLUMN - INFO (8 cols) */}
                        <div className="xl:col-span-8 flex flex-col gap-6">

                            {/* ROW 1: CLIENT & REPAIR */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* CARD: CLIENT */}
                                <div className="dark:bg-black/30 bg-white/60 backdrop-blur-md p-6 rounded-2xl border dark:border-white/10 border-black/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                                    <div className={`absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity ${isTestMode ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]' : 'bg-orange-600 shadow-[0_0_10px_rgba(234,88,12,0.8)]'}`}></div>
                                    <div className="flex items-center gap-3 mb-6 text-neutral-400">
                                        <FaUser className={isTestMode ? 'text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.4)]' : 'text-orange-600 drop-shadow-[0_0_5px_rgba(234,88,12,0.4)]'} />
                                        <h3 className="font-tech uppercase tracking-widest text-sm font-bold">Consommateur</h3>
                                    </div>
                                    <div className="space-y-4 relative z-10">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Nom</label>
                                                <input type="text" name="nom" value={formData.nom} onChange={handleChange} className={`w-full dark:bg-black/40 bg-white/50 backdrop-blur-sm border dark:border-white/10 border-black/10 rounded-lg p-2.5 text-sm outline-none transition-colors dark:text-white text-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] ${isTestMode ? 'focus:border-yellow-500/80 focus:shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'focus:border-orange-500/80 focus:shadow-[0_0_10px_rgba(234,88,12,0.2)]'}`} placeholder="Nom" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Prénom</label>
                                                <input type="text" name="prenom" value={formData.prenom} onChange={handleChange} className={`w-full dark:bg-black/40 bg-white/50 backdrop-blur-sm border dark:border-white/10 border-black/10 rounded-lg p-2.5 text-sm outline-none transition-colors dark:text-white text-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] ${isTestMode ? 'focus:border-yellow-500/80 focus:shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'focus:border-orange-500/80 focus:shadow-[0_0_10px_rgba(234,88,12,0.2)]'}`} placeholder="Prénom" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Téléphone</label>
                                            <input type="text" name="telephone" value={formData.telephone} onChange={handleChange} className={`w-full dark:bg-black/40 bg-white/50 backdrop-blur-sm border dark:border-white/10 border-black/10 rounded-lg p-2.5 text-sm outline-none transition-colors dark:text-white text-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] ${isTestMode ? 'focus:border-yellow-500/80 focus:shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'focus:border-orange-500/80 focus:shadow-[0_0_10px_rgba(234,88,12,0.2)]'}`} placeholder="06..." />
                                        </div>
                                    </div>
                                </div>

                                {/* CARD: REPAIR INFO */}
                                <div className="dark:bg-black/30 bg-white/60 backdrop-blur-md p-6 rounded-2xl border dark:border-white/10 border-black/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                                    <div className="flex items-center gap-3 mb-6 text-neutral-400">
                                        <FaFileInvoice className="text-blue-500 drop-shadow-[0_0_5px_rgba(59,130,246,0.4)]" />
                                        <h3 className="font-tech uppercase tracking-widest text-sm font-bold">Dossier</h3>
                                    </div>
                                    <div className="space-y-4 relative z-10">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">N° Facture / Dossier</label>
                                            <input type="text" name="facture" value={formData.facture} onChange={handleChange} className="w-full dark:bg-black/40 bg-white/50 backdrop-blur-sm border dark:border-white/10 border-black/10 rounded-lg p-2.5 text-sm focus:border-blue-500/80 focus:shadow-[0_0_10px_rgba(59,130,246,0.2)] outline-none transition-colors font-mono dark:text-white text-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]" placeholder="FAC-2024-..." />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Date</label>
                                                <input type="text" name="date" value={formData.date} readOnly className="w-full dark:bg-black/20 bg-black/5 backdrop-blur-sm border dark:border-white/5 border-black/5 rounded-lg p-2.5 text-sm outline-none transition-colors dark:text-neutral-400 text-neutral-500 cursor-not-allowed shadow-inner" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Entreprise</label>
                                                <div className="relative">
                                                    <input type="text" name="entreprise" value={formData.entreprise} readOnly className="w-full dark:bg-black/20 bg-black/5 backdrop-blur-sm border dark:border-white/5 border-black/5 rounded-lg p-2.5 text-sm outline-none transition-colors pl-8 dark:text-neutral-400 text-neutral-500 cursor-not-allowed shadow-inner" />
                                                    <FaBuilding className="absolute left-2.5 top-3 text-neutral-400/50 text-xs" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ROW 2: DEVICE (Full width) */}
                            <div className="dark:bg-black/30 bg-white/60 backdrop-blur-md p-6 rounded-2xl border dark:border-white/10 border-black/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
                                <div className="flex items-center gap-3 mb-6 text-neutral-400">
                                    <FaMobileScreen className="text-purple-500 drop-shadow-[0_0_5px_rgba(168,85,247,0.4)]" />
                                    <h3 className="font-tech uppercase tracking-widest text-sm font-bold">Matériel & Panne</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Type d'appareil</label>
                                        <select name="appareil" value={formData.appareil} onChange={handleChange} className="w-full dark:bg-black/40 bg-white/50 backdrop-blur-sm border dark:border-white/10 border-black/10 rounded-lg p-2.5 text-sm focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(168,85,247,0.2)] outline-none transition-colors appearance-none dark:text-white text-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                                            <option value="">Sélectionner...</option>
                                            <option value="Smartphone">Smartphone</option>
                                            <option value="Tablette">Tablette</option>
                                            <option value="Ordinateur Portable">Ordinateur Portable</option>
                                            <option value="Console de jeux">Console de jeux</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Marque</label>
                                        <select name="marque" value={formData.marque} onChange={handleChange} className="w-full dark:bg-black/40 bg-white/50 backdrop-blur-sm border dark:border-white/10 border-black/10 rounded-lg p-2.5 text-sm focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(168,85,247,0.2)] outline-none transition-colors appearance-none dark:text-white text-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                                            <option value="">Sélectionner...</option>
                                            <option value="Apple">Apple</option>
                                            <option value="Samsung">Samsung</option>
                                            <option value="Xiaomi">Xiaomi</option>
                                            <option value="Oppo">Oppo</option>
                                            <option value="Huawei">Huawei</option>
                                            <option value="Google">Google</option>
                                            <option value="Honor">Honor</option>
                                            <option value="Realme">Realme</option>
                                            <option value="OnePlus">OnePlus</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">N° Série / IMEI</label>
                                        <input type="text" name="serie" value={formData.serie} onChange={handleChange} className="w-full dark:bg-black/40 bg-white/50 backdrop-blur-sm border dark:border-white/10 border-black/10 rounded-lg p-2.5 text-sm focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(168,85,247,0.2)] outline-none transition-colors font-mono dark:text-white text-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]" placeholder="SN..." />
                                    </div>
                                    <div className="md:col-span-3 space-y-1">
                                        <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Description de la panne</label>
                                        <div className="relative">
                                            <input type="text" name="panne" value={formData.panne} onChange={handleChange} className="w-full dark:bg-black/40 bg-white/50 backdrop-blur-sm border dark:border-white/10 border-black/10 rounded-lg p-2.5 text-sm focus:border-purple-500/80 focus:shadow-[0_0_10px_rgba(168,85,247,0.2)] outline-none transition-colors pl-9 dark:text-white text-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]" placeholder="Ex: Écran cassé, Batterie HS..." />
                                            <FaScrewdriverWrench className="absolute left-3 top-3 text-neutral-400 text-xs" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN - VALIDATION (4 cols) */}
                        <div className="xl:col-span-4 flex flex-col gap-6">

                            {/* CARD: AMOUNT */}
                            <div className="dark:bg-black/60 bg-white/60 backdrop-blur-2xl text-white p-6 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.15)] border dark:border-white/10 border-black/10 relative overflow-hidden">
                                <div className={`absolute top-0 right-0 p-32 rounded-full blur-3xl opacity-30 -mr-16 -mt-16 ${isTestMode ? 'bg-yellow-500' : 'bg-orange-600'}`}></div>
                                <div className="flex items-center gap-3 mb-4 text-neutral-400 relative z-10">
                                    <FaEuroSign className={isTestMode ? 'text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.4)]' : 'text-orange-500 drop-shadow-[0_0_5px_rgba(234,88,12,0.4)]'} />
                                    <h3 className="font-tech uppercase tracking-widest text-sm font-bold dark:text-neutral-300 text-neutral-600">Bonus Réparation</h3>
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-end gap-2">
                                        <input
                                            type="text"
                                            name="montant"
                                            value={formData.montant}
                                            readOnly
                                            className="w-full bg-transparent border-b-2 dark:border-white/20 border-black/20 text-5xl font-bold font-mono outline-none py-2 cursor-not-allowed dark:text-white text-black"
                                            placeholder="0"
                                        />
                                        <span className="text-2xl font-bold text-neutral-500 mb-3">€</span>
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-2 font-medium">Montant déduit automatiquement de la facture client.</p>
                                </div>
                            </div>

                            {/* CARD: SIGNATURE */}
                            <div className="dark:bg-black/30 bg-white/60 backdrop-blur-md p-6 rounded-2xl border dark:border-white/10 border-black/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.05)] flex-1 flex flex-col relative overflow-hidden">
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <div className="flex items-center gap-3 text-neutral-400">
                                        <FaSignature className="text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.4)]" />
                                        <h3 className="font-tech uppercase tracking-widest text-sm font-bold">Signature</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={clearSignature} className="text-[10px] uppercase font-bold text-neutral-500 hover:text-red-500 flex items-center gap-1 transition-colors px-2">
                                            <FaEraser /> Effacer
                                        </button>
                                    </div>
                                </div>

                                <div className="border border-dashed dark:border-white/20 border-black/20 rounded-xl bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-sm relative overflow-hidden hover:border-black/40 dark:hover:border-white/40 transition-colors h-80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
                                    <SignatureCanvas
                                        ref={sigCanvas}
                                        penColor="currentColor"
                                        canvasProps={{ className: 'w-full h-full block dark:text-white text-black' }}
                                        backgroundColor="transparent"
                                        clearOnResize={false}
                                    />
                                    <div className="absolute bottom-2 right-2 pointer-events-none text-[10px] text-neutral-400 font-mono select-none drop-shadow-sm">
                                        ZONE DE SIGNATURE
                                    </div>
                                </div>
                            </div>

                        </div>

                    </motion.div>
                )}
            </AnimatePresence>

            {/* PREVIEW MODAL */}
            {previewAttestation && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setPreviewAttestation(null)}>
                    <div className="dark:bg-black/60 bg-white/60 backdrop-blur-2xl w-full max-w-2xl rounded-[32px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),_0_24px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300 border dark:border-white/10 border-black/10" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b dark:border-white/10 border-black/5 dark:bg-black/20 bg-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                            <h3 className="text-xl font-tech font-bold uppercase tracking-widest dark:text-white text-black">
                                Détails Quali<span className={isTestMode ? "text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" : "text-orange-600 drop-shadow-[0_0_5px_rgba(234,88,12,0.5)]"}>Repar</span>
                            </h3>
                            <button onClick={() => setPreviewAttestation(null)} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-black/10 dark:hover:bg-white/10 backdrop-blur-md rounded-full transition-colors drop-shadow-sm">
                                <FaXmark className="text-xl" />
                            </button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="dark:bg-black/40 bg-white/50 backdrop-blur-md p-4 rounded-xl border dark:border-white/10 border-black/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                                        <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Client</div>
                                        <div className="dark:text-white text-black font-medium">{previewAttestation.prenom} {previewAttestation.nom}</div>
                                        <div className="text-sm text-neutral-500">{previewAttestation.telephone || 'Non renseigné'}</div>
                                    </div>
                                    <div className="dark:bg-black/40 bg-white/50 backdrop-blur-md p-4 rounded-xl border dark:border-white/10 border-black/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                                        <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Dossier</div>
                                        <div className="dark:text-white text-black font-mono">{previewAttestation.facture || 'N/A'}</div>
                                        <div className="text-sm text-neutral-500">{previewAttestation.date}</div>
                                        <div className="text-sm text-neutral-500">{previewAttestation.entreprise}</div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="dark:bg-black/40 bg-white/50 backdrop-blur-md p-4 rounded-xl border dark:border-white/10 border-black/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                                        <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Appareil</div>
                                        <div className="dark:text-white text-black font-medium">{previewAttestation.appareil || 'Non spécifié'}</div>
                                        <div className="text-sm text-neutral-500">{previewAttestation.marque || 'Marque non spécifiée'}</div>
                                        <div className="text-sm text-neutral-500 font-mono">S/N: {previewAttestation.serie || 'N/A'}</div>
                                    </div>
                                    <div className="dark:bg-black/40 bg-white/50 backdrop-blur-md p-4 rounded-xl border dark:border-white/10 border-black/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                                        <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Panne</div>
                                        <div className="dark:text-white text-black text-sm">{previewAttestation.panne || 'Non spécifiée'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t dark:border-white/10 border-black/10 pt-6 flex justify-between items-end">
                                <div>
                                    <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-2">Signature</div>
                                    {previewAttestation.signatureData && (
                                        <img src={previewAttestation.signatureData} alt="Signature" className="h-16 object-contain bg-white/80 backdrop-blur-sm rounded-lg border dark:border-white/20 border-black/10 p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]" />
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Bonus Réparation</div>
                                    <div className={`text-4xl font-bold font-tech ${isTestMode ? 'text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'text-orange-600 drop-shadow-[0_0_10px_rgba(234,88,12,0.4)]'}`}>{previewAttestation.montant} €</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QualiReparForm;
