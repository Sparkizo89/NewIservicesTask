import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { FaBox, FaUpload, FaCamera, FaCircleCheck, FaTriangleExclamation, FaTrash, FaMagnifyingGlass, FaBarcode, FaRotate } from 'react-icons/fa6';

interface StockItem {
    'Code Article': string;
    'Description': string;
    'Code à Barres'?: string;
    'Prix Unitaire'?: string;
}

interface ColisItem {
    id: string; // Unique ID (could be article code or barcode)
    reference: string;
    description: string;
    expectedQuantity: number;
    scannedQuantity: number;
    barcode?: string;
}

interface ColisViewProps {
    isDarkMode: boolean;
    isScrolled: boolean;
}

const ColisView: React.FC<ColisViewProps> = ({ isDarkMode, isScrolled }) => {
    const [inventory, setInventory] = useState<StockItem[]>([]);
    const [expectedItems, setExpectedItems] = useState<ColisItem[]>(() => {
        const saved = localStorage.getItem('colis_expected_items');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { }
        }
        return [];
    });

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('colis_expected_items', JSON.stringify(expectedItems));
    }, [expectedItems]);

    const [isUploading, setIsUploading] = useState(false);
    const [isScanningStatus, setIsScanningStatus] = useState(false);
    const [barcodeInput, setBarcodeInput] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    // 1. Load Inventory Data for matching
    useEffect(() => {
        const loadCSV = async () => {
            try {
                const response = await fetch('/Inventaire saint antoine.csv');
                if (response.ok) {
                    const csvText = await response.text();
                    Papa.parse<StockItem>(csvText, {
                        header: true,
                        skipEmptyLines: true,
                        delimiter: ";",
                        complete: (results) => setInventory(results.data)
                    });
                }
            } catch (err) {
                console.error('Failed to load inventory for Colis mapping', err);
            }
        };
        loadCSV();
    }, []);

    // 2. Barcode Input Focus Loop (for physical scanner)
    useEffect(() => {
        if (!isScanningStatus && barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    }, [isScanningStatus, expectedItems]); // Refocus when items change or camera stops

    // === PARSING LOGIC DELEGATION ===

    const processExtractedData = (items: Array<{ reference: string, description: string, quantity: number }>) => {
        const mergedItems: ColisItem[] = items.map(extracted => {
            // Find in inventory to get the exact barcode
            const match = inventory.find(inv =>
                inv['Code Article']?.toLowerCase() === extracted.reference.toLowerCase() ||
                inv['Code à Barres']?.toLowerCase() === extracted.reference.toLowerCase()
            );

            return {
                id: match?.['Code à Barres'] || match?.['Code Article'] || extracted.reference,
                reference: match?.['Code Article'] || extracted.reference,
                description: match?.['Description'] || extracted.description,
                barcode: match?.['Code à Barres'],
                expectedQuantity: extracted.quantity,
                scannedQuantity: 0
            };
        });

        // Consolidate duplicates if any
        const consolidated: ColisItem[] = [];
        mergedItems.forEach(item => {
            const existing = consolidated.find(c => c.id === item.id);
            if (existing) {
                existing.expectedQuantity += item.expectedQuantity;
            } else {
                consolidated.push(item);
            }
        });

        setExpectedItems(consolidated);
        setIsUploading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        try {
            if (fileExtension === 'csv') {
                Papa.parse(file, {
                    header: true,
                    complete: (results) => {
                        // Very basic generic mapping, assuming columns 'Reference'/'Code' and 'Quantity'/'Qte'
                        const items = results.data.map((row: any) => ({
                            reference: row['Reference'] || row['Réf. Article'] || row['Code'] || '',
                            description: row['Description'] || row['Nom'] || '',
                            quantity: parseInt(row['Quantite'] || row['Quantité'] || row['Qte'] || row['Quantity'] || '1', 10) || 1
                        })).filter(item => item.reference);
                        processExtractedData(items);
                    }
                });
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const data = XLSX.utils.sheet_to_json(worksheet) as any[];

                const items = data.map((row: any) => ({
                    reference: row['Reference'] || row['Réf. Article'] || row['Code'] || '',
                    description: row['Description'] || row['Nom'] || '',
                    quantity: parseInt(row['Quantite'] || row['Quantité'] || row['Qte'] || row['Quantity'] || '1', 10) || 1
                })).filter(item => item.reference);
                processExtractedData(items);
            } else if (file) {
                // Image Processing with Gemini (Supports Multiple Files)
                const files = Array.from(e.target.files || []);
                const imageFiles = files.filter(f => f.type.startsWith('image/'));

                if (imageFiles.length === 0) {
                    alert("Format non supporté. Veuillez utiliser CSV, Excel ou Image.");
                    setIsUploading(false);
                    return;
                }

                try {
                    // Convert all images to Base64 Parts
                    const imageParts = await Promise.all(imageFiles.map(async (img) => {
                        return new Promise<{ inlineData: { data: string, mimeType: string } }>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const base64data = (reader.result as string).split(',')[1];
                                resolve({ inlineData: { data: base64data, mimeType: img.type } });
                            };
                            reader.readAsDataURL(img);
                        });
                    }));

                    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
                    if (!apiKey) {
                        alert("Veuillez configurer VITE_GEMINI_API_KEY dans votre fichier .env");
                        setIsUploading(false);
                        return;
                    }
                    const ai = new GoogleGenAI({ apiKey });

                    const response = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: [
                            {
                                role: 'user',
                                parts: [
                                    { text: 'Extrais TOUS les articles de ces bons de livraison. Renvoie UNIQUEMENT un tableau JSON valide (sans markdown) regroupant tous les articles avec le format suivant : [{ "reference": "code article ex: REP123", "description": "nom du produit", "quantity": 1 }]. S\'il n\'y a pas de référence explicite, utilise le code-barres ou un identifiant unique.' },
                                    ...imageParts
                                ]
                            }
                        ]
                    });

                    let text = response.text || "[]";
                    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                    const items = JSON.parse(text);
                    processExtractedData(items);
                } catch (err) {
                    console.error("Gemini Vision Error:", err);
                    alert("Erreur lors de l'analyse des images par l'IA.");
                    setIsUploading(false);
                }
            } else {
                alert("Format de fichier non supporté. Veuillez utiliser CSV, Excel ou une image (JPG/PNG).");
                setIsUploading(false);
            }
        } catch (error) {
            console.error(error);
            alert("Erreur lors du traitement du fichier.");
            setIsUploading(false);
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // 3. Scanning logic
    const handleScan = (code: string) => {
        if (!code.trim()) return;
        const scannedCode = code.trim().toLowerCase();

        setExpectedItems(prev => {
            // Find existing matching item
            const matchIndex = prev.findIndex(p =>
                p.id.toLowerCase() === scannedCode ||
                p.barcode?.toLowerCase() === scannedCode ||
                p.reference.toLowerCase() === scannedCode
            );

            if (matchIndex >= 0) {
                // Increment scanned count
                const newItems = [...prev];
                newItems[matchIndex] = { ...newItems[matchIndex], scannedQuantity: newItems[matchIndex].scannedQuantity + 1 };
                return newItems;
            } else {
                // Item not found in expected list => It's an extra item!
                // Try to identify it from the general inventory
                const invMatch = inventory.find(inv =>
                    inv['Code à Barres']?.toLowerCase() === scannedCode ||
                    inv['Code Article']?.toLowerCase() === scannedCode
                );

                const newItem: ColisItem = {
                    id: invMatch?.['Code à Barres'] || invMatch?.['Code Article'] || scannedCode,
                    reference: invMatch?.['Code Article'] || scannedCode,
                    description: invMatch?.['Description'] || 'Article Inconnu (Hors Liste)',
                    barcode: invMatch?.['Code à Barres'] || scannedCode,
                    expectedQuantity: 0, // 0 expected means it's an Extra
                    scannedQuantity: 1
                };
                return [newItem, ...prev]; // Put extra items at the top
            }
        });
    };

    const handleUpdateScannedQuantity = (id: string, newQuantity: number) => {
        if (newQuantity < 0) return;
        setExpectedItems(prev => prev.map(item =>
            item.id === id ? { ...item, scannedQuantity: newQuantity } : item
        ));
    };

    const handleRemoveScannedItem = (id: string) => {
        setExpectedItems(prev => {
            const item = prev.find(p => p.id === id);
            if (!item) return prev;
            // If it's an extra item (expected 0), completely remove it
            if (item.expectedQuantity === 0) {
                return prev.filter(p => p.id !== id);
            }
            // If it's an expected item, just reset its scanned quantity to 0
            return prev.map(p =>
                p.id === id ? { ...item, scannedQuantity: 0 } : p
            );
        });
    };

    const onPhysicalScanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleScan(barcodeInput);
        setBarcodeInput('');
    };

    // Camera Scanner logic
    useEffect(() => {
        let scanner: Html5QrcodeScanner | null = null;
        if (isScanningStatus) {
            scanner = new Html5QrcodeScanner(
                "colis-reader",
                { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
                false
            );
            scanner.render((decodedText) => {
                // On scan success
                handleScan(decodedText);
            }, undefined); // On error
        }

        return () => {
            if (scanner) {
                scanner.clear().catch(e => console.error("Failed to clear scanner", e));
            }
        };
    }, [isScanningStatus]); // Need to ensure it has latest state though

    // Computed Stats
    const totalExpected = expectedItems.reduce((acc, item) => acc + item.expectedQuantity, 0);
    const totalScanned = expectedItems.reduce((acc, item) => acc + item.scannedQuantity, 0);

    // Categorize Items for Display
    const missingItems = expectedItems.filter(i => i.scannedQuantity < i.expectedQuantity);
    const validatedItems = expectedItems.filter(i => i.expectedQuantity > 0 && i.scannedQuantity === i.expectedQuantity);
    const extraItems = expectedItems.filter(i => i.scannedQuantity > i.expectedQuantity); // Includes expected=0 items

    return (
        <div className="h-full flex flex-col pt-6 md:pt-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center dark:bg-white bg-black dark:text-black text-white rounded-full transition-colors shadow-lg">
                            <FaBox className="text-base md:text-lg" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-tech font-bold dark:text-white text-black tracking-tighter uppercase transition-colors">
                            Réception Colis
                        </h2>
                    </div>
                    <p className="text-neutral-500 font-sans text-sm mt-1 max-w-lg">
                        Importez un bon de livraison (Photo, CSV, Excel) puis scannez les articles pour vérifier le contenu de votre colis.
                    </p>
                </div>

                <div className="flex gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        multiple
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, image/*"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-5 py-3 rounded-[20px] bg-white/40 dark:bg-[#1a1a1a]/40 backdrop-blur-xl border border-black/10 dark:border-white/10 hover:border-orange-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_2px_10px_rgba(0,0,0,0.05)] text-sm font-bold uppercase tracking-widest transition-all text-neutral-600 dark:text-neutral-300 group"
                    >
                        {isUploading ? <FaRotate className="animate-spin text-orange-500" /> : <FaUpload className="text-orange-500" />}
                        <span>Importer</span>
                    </button>
                    {expectedItems.length > 0 && (
                        <button
                            onClick={() => {
                                if (confirm("Voulez-vous vraiment effacer la liste en cours ?")) {
                                    setExpectedItems([]);
                                }
                            }}
                            className="flex items-center gap-2 px-5 py-3 rounded-[20px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white backdrop-blur-xl transition-all font-bold text-sm uppercase tracking-widest"
                        >
                            <FaTrash />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
                {/* Left Panel: Scanner & Progress */}
                <div className="w-full lg:w-[400px] flex flex-col gap-6 shrink-0 h-full overflow-y-auto custom-scrollbar">

                    {/* Progress Summary Card */}
                    <div className="dark:bg-[#1a1a1a]/40 bg-white/40 backdrop-blur-xl rounded-[32px] border dark:border-white/10 border-black/10 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.1)] transition-colors">
                        <h3 className="font-tech text-neutral-500 uppercase tracking-widest text-xs mb-4">Progression du colis</h3>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-5xl font-tech font-bold dark:text-white text-black leading-none">{totalScanned}</span>
                            <span className="text-xl text-neutral-400 font-tech mb-1">/ {totalExpected}</span>
                        </div>

                        <div className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-4">
                            <div
                                className="h-full bg-orange-500 transition-all duration-500"
                                style={{ width: `${Math.min(100, totalExpected === 0 ? 0 : (totalScanned / totalExpected) * 100)}%` }}
                            ></div>
                        </div>

                        <div className="flex justify-between mt-4">
                            <div className="text-center">
                                <div className="text-green-500 font-bold font-tech text-lg">{validatedItems.length}</div>
                                <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Validés</div>
                            </div>
                            <div className="text-center">
                                <div className="text-red-400 font-bold font-tech text-lg">{missingItems.length}</div>
                                <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Manquants</div>
                            </div>
                            <div className="text-center">
                                <div className="text-orange-500 font-bold font-tech text-lg">{extraItems.length}</div>
                                <div className="text-[10px] text-neutral-500 uppercase tracking-wider">En trop</div>
                            </div>
                        </div>
                    </div>

                    {/* Scanner Input Panel */}
                    <div className="dark:bg-[#1a1a1a]/40 bg-white/40 backdrop-blur-xl rounded-[32px] border dark:border-white/10 border-black/10 p-6 flex flex-col gap-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.1)] transition-colors">
                        <h3 className="font-tech text-neutral-500 uppercase tracking-widest text-xs">Pointage Manuel</h3>

                        <form onSubmit={onPhysicalScanSubmit} className="relative">
                            <FaBarcode className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-lg" />
                            <input
                                ref={barcodeInputRef}
                                type="text"
                                value={barcodeInput}
                                onChange={(e) => setBarcodeInput(e.target.value)}
                                placeholder="Douchette (Scan direct)"
                                className="w-full pl-12 pr-4 py-4 rounded-[20px] dark:bg-black/40 bg-white/60 border border-black/10 dark:border-white/10 focus:border-orange-500 focus:outline-none dark:text-white text-black font-sans text-sm transition-colors shadow-inner"
                            />
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t dark:border-white/10 border-black/10"></span>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-white dark:bg-[#1a1a1a] px-2 text-neutral-500">OU</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsScanningStatus(!isScanningStatus)}
                            className={`flex items-center justify-center gap-2 py-4 rounded-[20px] font-tech tracking-widest text-sm uppercase transition-all shadow-md ${isScanningStatus ? 'bg-red-500 text-white' : 'bg-neutral-800 text-white hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200'}`}
                        >
                            <FaCamera className="text-lg" />
                            {isScanningStatus ? 'Fermer Caméra' : 'Ouvrir Caméra'}
                        </button>

                        <div id="colis-reader" className={`w-full rounded-[20px] overflow-hidden ${!isScanningStatus ? 'hidden' : ''}`}></div>
                    </div>

                </div>

                {/* Right Panel: Lists */}
                <div className="flex-1 flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar pr-2 pb-24">
                    {expectedItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-400 opacity-60 pointer-events-none p-10 text-center">
                            <FaBox className="text-6xl mb-6 text-neutral-300 dark:text-neutral-700" />
                            <p className="font-tech text-lg uppercase tracking-widest mb-2">Aucun Colis en cours</p>
                            <p className="font-sans text-sm">Importez un bordereau pour commencer le pointage.</p>
                        </div>
                    ) : (
                        <>
                            {/* Missing Section */}
                            {missingItems.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <h3 className="flex items-center gap-2 font-tech font-bold text-red-500 uppercase tracking-widest text-xs px-2 mb-2">
                                        <FaTriangleExclamation /> Manquants / À Scanner ({missingItems.length})
                                    </h3>
                                    <div className="grid gap-2">
                                        <AnimatePresence>
                                            {missingItems.map(item => (
                                                <motion.div
                                                    key={item.id}
                                                    layout
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="flex items-center justify-between p-4 dark:bg-[#1a1a1a]/40 bg-white/40 backdrop-blur-lg border border-red-500/30 rounded-2xl shadow-sm"
                                                >
                                                    <div className="flex flex-col min-w-0 flex-1 pr-4">
                                                        <span className="font-bold font-sans dark:text-white text-black truncate">{item.description}</span>
                                                        <div className="flex gap-2 text-[10px] font-tech uppercase text-neutral-500">
                                                            <span>{item.reference}</span>
                                                            {item.barcode && <span>• EAN: {item.barcode}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {item.scannedQuantity > 0 && (
                                                            <button
                                                                onClick={() => handleRemoveScannedItem(item.id)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                                            >
                                                                <FaTrash className="text-xs" />
                                                            </button>
                                                        )}
                                                        <div className="flex items-center gap-1 bg-red-500/10 p-1 rounded-xl border border-red-500/20">
                                                            <button
                                                                onClick={() => handleUpdateScannedQuantity(item.id, item.scannedQuantity - 1)}
                                                                disabled={item.scannedQuantity === 0}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-[#222] text-black dark:text-white shadow-sm active:scale-95 transition-transform disabled:opacity-50"
                                                            >-</button>
                                                            <div className="flex items-baseline gap-1 px-2 min-w-[3rem] justify-center text-center">
                                                                <span className="text-red-500 font-bold font-tech text-lg">{item.scannedQuantity}</span>
                                                                <span className="text-red-400 font-tech text-xs">/ {item.expectedQuantity}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => handleUpdateScannedQuantity(item.id, item.scannedQuantity + 1)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500 text-white shadow-sm active:scale-95 transition-transform"
                                                            >+</button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}

                            {/* Extra / Unexpected Section */}
                            {extraItems.length > 0 && (
                                <div className="flex flex-col gap-2 mt-4">
                                    <h3 className="flex items-center gap-2 font-tech font-bold text-orange-500 uppercase tracking-widest text-xs px-2 mb-2">
                                        <FaTriangleExclamation /> Scannés en trop ({extraItems.length})
                                    </h3>
                                    <div className="grid gap-2">
                                        <AnimatePresence>
                                            {extraItems.map(item => (
                                                <motion.div
                                                    key={`extra-${item.id}`}
                                                    layout
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="flex items-center justify-between p-4 dark:bg-orange-900/10 bg-orange-50 border border-orange-500/40 rounded-2xl shadow-sm"
                                                >
                                                    <div className="flex flex-col min-w-0 flex-1 pr-4">
                                                        <span className="font-bold font-sans dark:text-white text-black truncate">{item.description}</span>
                                                        <div className="flex gap-2 text-[10px] font-tech uppercase text-neutral-500">
                                                            <span>{item.reference}</span>
                                                            {item.expectedQuantity === 0 && <span className="text-orange-500 font-bold">• Hors Liste</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() => handleRemoveScannedItem(item.id)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-600 hover:bg-orange-500 hover:text-white transition-colors"
                                                        >
                                                            <FaTrash className="text-xs" />
                                                        </button>
                                                        <div className="flex items-center gap-1 bg-orange-500/10 p-1 rounded-xl border border-orange-500/20">
                                                            <button
                                                                onClick={() => handleUpdateScannedQuantity(item.id, item.scannedQuantity - 1)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-[#222] text-black dark:text-white shadow-sm active:scale-95 transition-transform"
                                                            >-</button>
                                                            <div className="flex items-baseline gap-1 px-2 min-w-[3rem] justify-center text-center">
                                                                <span className="font-bold font-tech text-lg text-orange-600 dark:text-orange-400">+{item.scannedQuantity - item.expectedQuantity}</span>
                                                                {item.expectedQuantity > 0 && <span className="text-orange-400 font-tech text-xs ml-1">/ {item.expectedQuantity}</span>}
                                                            </div>
                                                            <button
                                                                onClick={() => handleUpdateScannedQuantity(item.id, item.scannedQuantity + 1)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm active:scale-95 transition-transform"
                                                            >+</button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}

                            {/* Validated Section */}
                            {validatedItems.length > 0 && (
                                <div className="flex flex-col gap-2 mt-4">
                                    <h3 className="flex items-center gap-2 font-tech font-bold text-green-500 uppercase tracking-widest text-xs px-2 mb-2">
                                        <FaCircleCheck /> Validés ({validatedItems.length})
                                    </h3>
                                    <div className="grid gap-2 opacity-60 hover:opacity-100 transition-opacity">
                                        <AnimatePresence>
                                            {validatedItems.map(item => (
                                                <motion.div
                                                    key={`val-${item.id}`}
                                                    layout
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="group flex items-center justify-between p-3 px-4 dark:bg-green-900/10 bg-green-50 border border-green-500/30 rounded-2xl"
                                                >
                                                    <div className="flex flex-col min-w-0 flex-1 pr-4">
                                                        <span className="font-sans dark:text-white text-black text-sm line-through decoration-green-500/40">{item.description}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="flex items-center gap-1 bg-green-500/10 p-1 rounded-xl border border-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleUpdateScannedQuantity(item.id, item.scannedQuantity - 1)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-[#222] text-black dark:text-white shadow-sm active:scale-95 transition-transform"
                                                            >-</button>
                                                            <div className="flex items-baseline gap-1 px-2 min-w-[2rem] justify-center text-center">
                                                                <span className="text-green-600 dark:text-green-400 font-bold font-tech text-sm">{item.scannedQuantity}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => handleUpdateScannedQuantity(item.id, item.scannedQuantity + 1)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-500 text-white shadow-sm active:scale-95 transition-transform"
                                                            >+</button>
                                                        </div>
                                                        <FaCircleCheck className="text-green-500 text-xl" />
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ColisView;
