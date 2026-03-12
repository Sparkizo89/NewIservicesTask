import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { FaMagnifyingGlass, FaBoxOpen, FaTriangleExclamation, FaCircleCheck, FaBarcode, FaTrash, FaListUl, FaDownload, FaFloppyDisk, FaFolderOpen, FaXmark } from 'react-icons/fa6';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import ScrambleText from './ScrambleText';
import * as XLSX from 'xlsx';

interface StockItem {
    'Code Article': string;
    'Description': string;
    'Existance': string;
    'Inventaire de Sécurité': string;
    'Code à Barres'?: string;
    'Prix Unitaire'?: string;
}

interface ActiveInventoryItem extends StockItem {
    scannedQuantity: number;
}

interface StockViewProps {
    isDarkMode: boolean;
    isScrolled: boolean;
}

const StockView: React.FC<StockViewProps> = ({ isDarkMode, isScrolled }) => {
    const [barcode, setBarcode] = useState('');
    const [inventory, setInventory] = useState<StockItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<StockItem[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    
    // Inventory Mode State
    const [isInventoryMode, setIsInventoryMode] = useState(false);
    const [inventorySession, setInventorySession] = useState<ActiveInventoryItem[]>([]);
    
    // Saved Sessions State
    const [savedSessions, setSavedSessions] = useState<{ id: string, name: string, date: string, items: ActiveInventoryItem[] }[]>([]);
    const [showSessionsModal, setShowSessionsModal] = useState(false);
    
    // Scanner State
    const [isScanning, setIsScanning] = useState(false);
    
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input on mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Load and parse CSV
    useEffect(() => {
        const loadCSV = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/Inventaire saint antoine.csv');
                
                if (!response.ok) {
                    throw new Error(`Erreur lors du chargement du fichier (Statut: ${response.status})`);
                }

                const csvText = await response.text();
                
                Papa.parse<StockItem>(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        setInventory(results.data);
                        setIsLoading(false);
                    },
                    error: (err: any) => {
                        console.error('Erreur PapaParse:', err);
                        setError('Impossible de lire le fichier d\'inventaire.');
                        setIsLoading(false);
                    }
                });
            } catch (err) {
                console.error('Erreur Fetch:', err);
                setError('Fichier inventaire introuvable.');
                setIsLoading(false);
            }
        };

        loadCSV();
    }, []);

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        if (!barcode.trim()) return;

        setHasSearched(true);
        const term = barcode.trim().toLowerCase();
        
        // Exact match first (Barcode or Article Code)
        let exactMatch = inventory.find(item => 
            (item['Code à Barres'] && item['Code à Barres'].toLowerCase() === term) ||
            (item['Code Article'] && item['Code Article'].toLowerCase() === term)
        );

        if (isInventoryMode) {
            // In Inventory mode, we only care about exact matches to aggregate them
            if (exactMatch) {
                // Check if already in session
                setInventorySession(prev => {
                    const exists = prev.find(p => p['Code Article'] === exactMatch!['Code Article']);
                    if (exists) {
                        return prev.map(p => 
                            p['Code Article'] === exactMatch!['Code Article'] 
                            ? { ...p, scannedQuantity: p.scannedQuantity + 1 } 
                            : p
                        );
                    } else {
                        return [...prev, { ...exactMatch!, scannedQuantity: 1 }];
                    }
                });
                
                // Keep input focused and clear it for the next scan immediately
                setBarcode('');
                if (inputRef.current) {
                    inputRef.current.focus();
                }
                return; // Stop here for inventory mode
            } else {
                // Play error or show toast ideally, for now just clear to avoid stuck state
                alert("Article introuvable dans la base pour l'inventaire.");
                if (inputRef.current) inputRef.current.select();
                return;
            }
        }

        // --- Standard Search Mode (Includes Fuzzy Match) ---
        // French to English Translation Map for common search terms
        const translationMap: Record<string, string> = {
            'ecran': 'display',
            'écran': 'display',
            'batterie': 'battery',
            'nappe': 'flex',
            'arriere': 'back',
            'arrière': 'back',
            'vitre': 'glass',
            'camera': 'camera', 
            'caméra': 'camera',
            'lentille': 'lens',
            'connecteur': 'connector',
            'charge': 'charging',
            'coque': 'cover'
        };

        // Translate terms
        const translatedTerms = term.split(' ').filter(t => t.length > 0).map(t => translationMap[t] || t);
        
        const found = inventory.filter(item => {
            // Exact match for barcodes and article codes
            if (item['Code à Barres'] && item['Code à Barres'].toLowerCase() === term) return true;
            if (item['Code Article'] && item['Code Article'].toLowerCase() === term) return true;
            
            // Fuzzy match for description (all terms must be present)
            if (item['Description']) {
                const descMatch = item['Description'].toLowerCase();
                return translatedTerms.every(t => descMatch.includes(t));
            }
            
            return false;
        });

        setSearchResults(found);
        
        // Select text to easily scan the next item
        if (inputRef.current) {
            inputRef.current.select();
        }
    };

    // Load local sessions
    useEffect(() => {
        const stored = localStorage.getItem('iservices_inventory_sessions');
        if (stored) {
            try {
                setSavedSessions(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse saved sessions");
            }
        }
    }, []);

    // Session Management Handlers
    const handleSaveSession = () => {
        if (inventorySession.length === 0) return;
        const newSession = {
            id: Date.now().toString(),
            name: `Session du ${new Date().toLocaleString('fr-FR')}`,
            date: new Date().toISOString(),
            items: [...inventorySession]
        };
        const updated = [newSession, ...savedSessions];
        setSavedSessions(updated);
        localStorage.setItem('iservices_inventory_sessions', JSON.stringify(updated));
        alert("Session sauvegardée avec succès !");
    };

    const handleLoadSession = (session: { id: string, name: string, date: string, items: ActiveInventoryItem[] }) => {
        if (inventorySession.length > 0) {
            if (!confirm("Attention, l'inventaire en cours sera remplacé. Continuer ?")) return;
        }
        setInventorySession(session.items);
        setShowSessionsModal(false);
    };

    const handleDeleteSession = (id: string) => {
        if (confirm("Supprimer cette session sauvegardée ?")) {
            const updated = savedSessions.filter(s => s.id !== id);
            setSavedSessions(updated);
            localStorage.setItem('iservices_inventory_sessions', JSON.stringify(updated));
        }
    };

    const prepareExportData = () => {
        return inventorySession.map(item => {
            const theoretical = parseFloat(item.Existance?.replace(',', '.') || '0');
            const diff = item.scannedQuantity - theoretical;
            let ecartLabel = "Stock juste";
            if (diff > 0) ecartLabel = `+${diff} (en trop)`;
            else if (diff < 0) ecartLabel = `${diff} (manquant)`;
            
            return {
                'Code Article': item['Code Article'],
                'Code à Barres': item['Code à Barres'] || '',
                'Description': item.Description,
                'Quantité Inventoriée': item.scannedQuantity,
                'Quantité Théorique': isNaN(theoretical) ? 'Inconnu' : theoretical,
                'Écart Numérique': isNaN(theoretical) ? '' : diff,
                'Détail Écart': isNaN(theoretical) ? 'Inconnu' : ecartLabel
            };
        });
    };

    // Inventory Handlers
    const handleUpdateQuantity = (codeArticle: string, newQuantity: number) => {
        if (newQuantity < 1) return;
        setInventorySession(prev => prev.map(item => 
            item['Code Article'] === codeArticle ? { ...item, scannedQuantity: newQuantity } : item
        ));
    };

    const handleRemoveItem = (codeArticle: string) => {
        setInventorySession(prev => prev.filter(item => item['Code Article'] !== codeArticle));
    };

    const handleClearInventory = () => {
        if (confirm("Êtes-vous sûr de vouloir vider la liste d'inventaire en cours ?")) {
            setInventorySession([]);
        }
    };

    const handleExportCSV = () => {
        if (inventorySession.length === 0) return;
        
        const exportData = prepareExportData();

        const csvString = Papa.unparse(exportData);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute("href", url);
        link.setAttribute("download", `inventaire_${date}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportXLSX = () => {
        if (inventorySession.length === 0) return;
        
        const exportData = prepareExportData();

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventaire");
        
        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `inventaire_${date}.xlsx`);
    };

    // Calculate status colors based on inventory levels
    const getStockStatus = (existanceStr: string) => {
        const existance = parseFloat(existanceStr?.replace(',', '.') || '0');
        
        if (isNaN(existance)) return { color: 'text-neutral-500', bg: 'bg-neutral-100 dark:bg-neutral-800', label: 'Inconnu' };

        if (existance <= 0) {
            return { color: 'text-red-600 dark:text-red-500', bg: 'bg-red-100 dark:bg-red-500/10', label: 'Rupture' };
        } else {
            return { color: 'text-green-600 dark:text-green-500', bg: 'bg-green-100 dark:bg-green-500/10', label: 'En Stock' };
        }
    };

    // Camera Scanner Effect
    useEffect(() => {
        if (isScanning) {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
                /* verbose= */ false
            );

            scanner.render((decodedText) => {
                // Success Callback
                setBarcode(decodedText);
                setIsScanning(false);
                scanner.clear();
                
                // Trigger search directly
                setTimeout(() => {
                    if (inputRef.current) {
                        const form = inputRef.current.closest('form');
                        if (form) form.requestSubmit();
                    }
                }, 100);
                
            }, (errorMessage) => {
                // Ignore general scanning errors as they happen constantly during camera feed
            });

            return () => {
                scanner.clear().catch(error => {
                    console.error("Failed to clear html5QrcodeScanner. ", error);
                });
            };
        }
    }, [isScanning]);

    return (
        <div className={`w-full max-w-[1200px] mx-auto px-4 md:px-8 pb-32 transition-all duration-700 ${isScrolled ? 'pt-24 md:pt-32' : 'pt-24 md:pt-40'}`}>
            
            {/* Header Section */}
            <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1.25rem] bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white shadow-[0_8px_32px_rgba(234,88,12,0.3)]">
                        <FaBoxOpen className="text-2xl md:text-3xl" />
                    </div>
                    <div>
                        <h2 className="text-3xl md:text-5xl font-tech font-bold tracking-tighter uppercase dark:text-white text-black">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-400">Stock</span> & Inventaire
                        </h2>
                        <p className="font-mono text-sm md:text-base text-neutral-500 tracking-wider">
                            Recherche par code-barres
                        </p>
                    </div>
                </div>

                {/* Mode Toggle Switch */}
                <div className="flex p-1 bg-black/5 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/5 relative z-10 w-fit">
                    <button
                        onClick={() => setIsInventoryMode(false)}
                        className={`relative z-10 flex items-center gap-2 px-6 py-3 rounded-xl font-tech text-sm uppercase tracking-wider font-bold transition-colors ${!isInventoryMode ? 'text-white' : 'text-neutral-500 hover:text-black dark:hover:text-white'}`}
                    >
                        <FaMagnifyingGlass /> Recherche
                    </button>
                    <button
                        onClick={() => {
                            setIsInventoryMode(true);
                            if (inputRef.current) inputRef.current.focus();
                        }}
                        className={`relative z-10 flex items-center gap-2 px-6 py-3 rounded-xl font-tech text-sm uppercase tracking-wider font-bold transition-colors ${isInventoryMode ? 'text-white' : 'text-neutral-500 hover:text-black dark:hover:text-white'}`}
                    >
                        <FaListUl /> Inventaire
                    </button>
                    {/* Active Background Pill */}
                    <div 
                        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-black dark:bg-white rounded-xl transition-transform duration-300 ease-spring"
                        style={{ transform: isInventoryMode ? 'translateX(calc(100% + 4px))' : 'translateX(0)' }}
                    ></div>
                </div>
            </div>

            {/* Main Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                
                {/* Search Column */}
                <div className="lg:col-span-5">
                    <div className="dark:bg-[#1a1a1a]/60 bg-white/60 backdrop-blur-2xl rounded-[32px] border dark:border-white/10 border-black/5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden">
                        
                        <div className="p-6 md:p-8">
                            <form onSubmit={handleSearch} className="relative z-10 w-full mb-2">
                                <label className="block text-xs font-tech tracking-[0.2em] uppercase text-neutral-500 mb-4 ml-2">Scanner l'article</label>
                                
                                <div className="relative flex items-center group">
                                    <div className="absolute left-6 text-neutral-400 group-focus-within:text-orange-500 transition-colors z-20">
                                        <FaBarcode className="text-xl" />
                                    </div>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                        placeholder="Code-barres ou Article..."
                                        className="w-full h-16 md:h-20 pl-16 pr-16 bg-neutral-100 dark:bg-black/40 rounded-2xl outline-none text-lg md:text-xl font-mono tracking-wider dark:text-white text-black border-2 border-transparent focus:border-orange-500/30 focus:shadow-[0_0_20px_rgba(234,88,12,0.15)] transition-all"
                                        disabled={isLoading || !!error}
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!barcode.trim() || isLoading || !!error}
                                        className="absolute right-4 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl bg-black dark:bg-white text-white dark:text-black disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all z-20"
                                    >
                                        <FaMagnifyingGlass />
                                    </button>
                                </div>
                                
                                <button
                                    type="button"
                                    onClick={() => setIsScanning(true)}
                                    className="w-full mt-4 h-12 flex items-center justify-center gap-3 rounded-xl bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider text-sm hover:bg-orange-200 dark:hover:bg-orange-500/20 transition-colors"
                                >
                                    <FaBarcode className="text-lg" />
                                    Scanner EAN 13
                                </button>
                            </form>
                            
                            {/* Loading State */}
                            {isLoading && (
                                <div className="mt-6 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-500/20 flex items-center gap-3">
                                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-sm font-medium text-orange-700 dark:text-orange-400">Chargement de la base de données ({inventory.length} articles lus...)</span>
                                </div>
                            )}

                            {/* Error State */}
                            {error && (
                                <div className="mt-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-500/20 flex flex-col gap-2 text-red-700 dark:text-red-400">
                                    <div className="flex items-center gap-3 font-semibold">
                                        <FaTriangleExclamation /> Erreur Base de Données
                                    </div>
                                    <span className="text-sm opacity-90">{error}</span>
                                </div>
                            )}
                            
                            {/* Status Indicator */}
                            {!isLoading && !error && (
                                <div className="mt-8 flex items-center gap-3 px-2">
                                    <div className="flex relative w-3 h-3 justify-center items-center">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full w-2 h-2 bg-green-500"></span>
                                    </div>
                                    <span className="text-sm font-medium text-neutral-500">Base synchronisée ({inventory.length.toLocaleString('fr-FR')} ref)</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Result or Inventory Column */}
                <div className="lg:col-span-7">
                    {isInventoryMode ? (
                        /* INVENTORY SESSION UI */
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="inventory-mode"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="h-full flex flex-col"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="text-sm font-tech font-bold tracking-widest uppercase text-neutral-500">
                                            Session : {inventorySession.length} articles
                                        </div>
                                        <button 
                                            onClick={() => setShowSessionsModal(true)}
                                            className="px-3 py-1.5 bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-200 dark:hover:bg-white/20 transition-colors"
                                        >
                                            <FaFolderOpen /> Mes Sessions ({savedSessions.length})
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button 
                                            onClick={handleSaveSession}
                                            disabled={inventorySession.length === 0}
                                            className="px-4 py-2 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 hover:bg-blue-200 dark:hover:bg-blue-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <FaFloppyDisk /> Sauvegarder
                                        </button>
                                        <button 
                                            onClick={handleClearInventory}
                                            disabled={inventorySession.length === 0}
                                            className="px-4 py-2 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <FaTrash /> Vider
                                        </button>
                                        <button 
                                            onClick={handleExportCSV}
                                            disabled={inventorySession.length === 0}
                                            className="px-4 py-2 bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 hover:bg-green-200 dark:hover:bg-green-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <FaDownload /> Exporter CSV
                                        </button>
                                        <button 
                                            onClick={handleExportXLSX}
                                            disabled={inventorySession.length === 0}
                                            className="px-4 py-2 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 hover:bg-indigo-200 dark:hover:bg-indigo-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <FaDownload /> Exporter XLSX
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex-1 dark:bg-[#1a1a1a]/80 bg-white/80 backdrop-blur-3xl rounded-[32px] border dark:border-white/10 border-black/5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden min-h-[400px]">
                                    {inventorySession.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center p-10 text-center text-neutral-400">
                                            <FaBarcode className="text-6xl mb-4 opacity-20" />
                                            <p className="font-tech uppercase tracking-wider">Scannez un article pour l'ajouter</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-y-auto max-h-[600px] styled-scrollbar">
                                            {inventorySession.map((item, index) => (
                                                <div key={item['Code Article']} className={`group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-6 border-b dark:border-white/10 border-black/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${index === inventorySession.length - 1 ? 'border-b-0' : ''}`}>
                                                    
                                                    {/* Details */}
                                                    <div className="flex-1 z-10 w-full md:w-auto">
                                                        <div className="flex flex-wrap items-center gap-3 mb-1.5">
                                                            <div className="text-xs font-mono font-bold tracking-wider text-neutral-400 dark:text-neutral-500">
                                                                {item['Code Article']}
                                                            </div>
                                                            {item['Code à Barres'] && (
                                                                <div className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[10px] font-mono tracking-wider text-neutral-500">
                                                                    {item['Code à Barres']}
                                                                </div>
                                                            )}
                                                            {(() => {
                                                                const theo = parseFloat(item.Existance?.replace(',', '.') || '0');
                                                                if (isNaN(theo)) return null;
                                                                const diff = item.scannedQuantity - theo;
                                                                
                                                                let badgeClass = "bg-green-100/50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200/50 dark:border-green-500/20";
                                                                let text = "Stock exact";
                                                                
                                                                if (diff > 0) {
                                                                    badgeClass = "bg-orange-100/50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200/50 dark:border-orange-500/20";
                                                                    text = `+${diff} en trop`;
                                                                } else if (diff < 0) {
                                                                    badgeClass = "bg-red-100/50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200/50 dark:border-red-500/20";
                                                                    text = `${diff} manquant`;
                                                                }

                                                                return (
                                                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${badgeClass}`}>
                                                                        {text} (attendu: {theo})
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                        <h3 className="text-base font-sans font-medium leading-tight dark:text-white text-black line-clamp-1 pr-4">
                                                            {item.Description}
                                                        </h3>
                                                    </div>

                                                    {/* Actions & Quantity */}
                                                    <div className="flex items-center justify-between md:justify-end gap-4 z-10 shrink-0 mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-black/5 dark:border-white/5">
                                                        
                                                        {/* Delete Button */}
                                                        <button 
                                                            onClick={() => handleRemoveItem(item['Code Article'])}
                                                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                                        >
                                                            <FaTrash />
                                                        </button>

                                                        {/* Quantity Input */}
                                                        <div className="flex items-center gap-2 bg-neutral-100 dark:bg-black/40 p-1.5 rounded-xl border border-black/5 dark:border-white/5">
                                                            <button 
                                                                onClick={() => handleUpdateQuantity(item['Code Article'], item.scannedQuantity - 1)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-[#222] text-black dark:text-white shadow-sm active:scale-95 transition-transform"
                                                            >
                                                                -
                                                            </button>
                                                            <input 
                                                                type="number"
                                                                value={item.scannedQuantity}
                                                                onChange={(e) => handleUpdateQuantity(item['Code Article'], parseInt(e.target.value) || 1)}
                                                                className="w-12 h-8 text-center bg-transparent font-tech font-bold text-lg outline-none flex-shrink-0"
                                                            />
                                                            <button 
                                                                onClick={() => handleUpdateQuantity(item['Code Article'], item.scannedQuantity + 1)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm active:scale-95 transition-transform"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    ) : (
                        /* SEARCH RESULTS UI */
                        <AnimatePresence mode="wait">
                            {hasSearched && (
                                <motion.div
                                    key={searchResults.length > 0 ? 'found' : 'not-found'}
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="h-full space-y-6"
                            >
                                {searchResults.length > 0 ? (
                                    <>
                                        <div className="text-sm font-tech font-bold tracking-widest uppercase text-neutral-500 mb-2">
                                            {searchResults.length} {searchResults.length > 1 ? 'Résultats trouvés' : 'Résultat trouvé'}
                                        </div>
                                        <div className="dark:bg-[#1a1a1a]/80 bg-white/80 backdrop-blur-3xl rounded-[32px] border dark:border-white/10 border-black/5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden">
                                            {searchResults.map((result, index) => (
                                                <div key={index} className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-6 border-b dark:border-white/10 border-black/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                    
                                                    {/* Subtle Hover Glow behind entire row */}
                                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none ${getStockStatus(result.Existance).bg.split(' ')[0]}`}></div>

                                                    {/* Left: Code & Name */}
                                                    <div className="flex-1 z-10 w-full md:w-auto">
                                                        <div className="flex flex-wrap items-center gap-3 mb-1.5">
                                                            <div className="text-xs font-mono font-bold tracking-wider text-neutral-400 dark:text-neutral-500">
                                                                {result['Code Article'] || 'N/A'}
                                                            </div>
                                                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${getStockStatus(result.Existance).bg} ${getStockStatus(result.Existance).color}`}>
                                                                {parseFloat(result.Existance?.replace(',', '.') || '0') > 0 ? <FaCircleCheck /> : <FaTriangleExclamation />}
                                                                {getStockStatus(result.Existance).label}
                                                            </div>
                                                        </div>
                                                        <h3 className="text-lg md:text-xl font-sans font-medium leading-tight dark:text-white text-black line-clamp-2 md:line-clamp-none pr-4">
                                                            {result.Description || 'Description non disponible'}
                                                        </h3>
                                                    </div>

                                                    {/* Right: Quantity & Price */}
                                                    <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-6 md:gap-8 z-10 shrink-0 mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-black/5 dark:border-white/5">
                                                        
                                                        {/* Quantity */}
                                                        <div className="flex flex-col items-start md:items-center justify-center">
                                                            <div className="text-[10px] font-tech tracking-[0.2em] uppercase text-neutral-500 mb-0.5">En Stock</div>
                                                            <div className={`text-2xl md:text-3xl font-tech font-bold tracking-tighter ${getStockStatus(result.Existance).color}`}>
                                                                {result.Existance || '0'}
                                                            </div>
                                                        </div>

                                                        {/* Divider Desktop */}
                                                        <div className="w-px h-12 bg-black/10 dark:bg-white/10 hidden md:block"></div>
                                                        
                                                        {/* Price */}
                                                        <div className="flex flex-col items-end shrink-0 min-w-[100px]">
                                                            <div className="text-[10px] font-tech tracking-[0.2em] uppercase text-neutral-500 mb-0.5">TTC (20%)</div>
                                                            <div className="text-xl md:text-2xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">
                                                                {(() => {
                                                                    const priceStr = result['Prix Unitaire'] || '0';
                                                                    const priceRaw = parseFloat(priceStr.replace(',', '.'));
                                                                    if (isNaN(priceRaw)) return 'N/A';
                                                                    const ttc = priceRaw * 1.20;
                                                                    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(ttc);
                                                                })()}
                                                            </div>
                                                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">HT: {parseFloat((result['Prix Unitaire'] || '0').replace(',', '.')).toFixed(2)}€</div>
                                                        </div>

                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-10 text-center dark:bg-[#1a1a1a]/40 bg-white/40 backdrop-blur-md rounded-[32px] border dark:border-white/5 border-black/5 border-dashed">
                                        <div className="w-20 h-20 mb-6 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-600">
                                            <FaBoxOpen className="text-4xl" />
                                        </div>
                                        <h3 className="text-xl font-bold dark:text-white text-black mb-2">Article Introuvable</h3>
                                        <p className="text-neutral-500 max-w-sm">
                                            Aucun article ne correspond au code-barres <span className="font-mono bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded text-sm mx-1">{barcode}</span>. 
                                            Vérifiez la saisie ou scannez à nouveau.
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            </div>

            {/* Scanner Modal */}
            <AnimatePresence>
                {isScanning && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-[#1a1a1a] p-6 rounded-[32px] w-full max-w-md relative shadow-2xl"
                        >
                            <button 
                                onClick={() => setIsScanning(false)}
                                className="absolute top-4 right-4 w-10 h-10 bg-neutral-100 dark:bg-[#222] rounded-full flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                            >
                                <FaTriangleExclamation className="rotate-45" /> {/* Close button icon placeholder */}
                            </button>
                            
                            <h3 className="text-xl font-bold mb-6 text-center dark:text-white text-black font-tech uppercase tracking-wider">
                                Scanner Code-Barres
                            </h3>
                            
                            <div className="rounded-2xl overflow-hidden bg-black aspect-square w-full">
                                <div id="reader" className="w-full h-full"></div>
                            </div>
                            
                            <p className="text-center text-sm text-neutral-500 mt-6 font-mono">
                                Placez le code CA ou EAN-13 dans le cadre
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sessions Modal */}
            <AnimatePresence>
                {showSessionsModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-[#1a1a1a] p-6 rounded-[32px] w-full max-w-lg relative shadow-2xl flex flex-col max-h-[80vh]"
                        >
                            <button 
                                onClick={() => setShowSessionsModal(false)}
                                className="absolute top-4 right-4 w-10 h-10 bg-neutral-100 dark:bg-[#222] rounded-full flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white transition-colors z-10"
                            >
                                <FaXmark className="text-xl" />
                            </button>
                            
                            <h3 className="text-xl font-bold mb-6 text-center dark:text-white text-black font-tech uppercase tracking-wider">
                                Mes Sessions d'Inventaire
                            </h3>

                            <div className="flex-1 overflow-y-auto styled-scrollbar pr-2">
                                {savedSessions.length === 0 ? (
                                    <div className="text-center py-10 text-neutral-500 font-mono text-sm">
                                        Aucune session sauvegardée.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {savedSessions.map(session => (
                                            <div key={session.id} className="p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div>
                                                    <h4 className="font-bold text-sm dark:text-white text-black">{session.name}</h4>
                                                    <p className="text-xs text-neutral-500 font-mono mt-1">{session.items.length} articles scannés</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleLoadSession(session)}
                                                        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold uppercase tracking-wider text-[10px] hover:opacity-80 transition-opacity"
                                                    >
                                                        Reprendre
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteSession(session.id)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                                    >
                                                        <FaTrash className="text-xs" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StockView;
