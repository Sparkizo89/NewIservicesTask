import React, { useState, useMemo, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useElasticButtons } from './hooks/useElasticButtons';
import Header from './components/Header';
import ProcedureCard from './components/ProcedureCard';
import ContactCard from './components/ContactCard';
import Modal from './components/Modal';
import Toast from './components/Toast';
import ScrambleText from './components/ScrambleText';
import QualiReparForm from './components/QualiReparForm';
import { IntakeForm } from './components/IntakeForm';
import StockView from './components/StockView';
import { procedures } from './data/procedures';
import { contacts } from './data/contacts';
import { pdfContext } from './data/pdfContext';
import { Procedure, ProcedureCategory, Email } from './types';
import { FaMagnifyingGlass, FaAddressBook, FaBookOpen, FaRobot, FaPaperPlane, FaSquare, FaEnvelope, FaRotate, FaChevronLeft, FaInbox, FaArrowDown, FaPaperclip, FaDownload, FaFile, FaWandMagicSparkles, FaReply, FaSpellCheck } from 'react-icons/fa6';
import { GoogleGenAI } from "@google/genai";

// URL du script Google Apps
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzMcpeYUjqMvUJzy0-DMXYORvnvw_cQgk8CexEVavbkiv_54jQ6VBWJmaUTNP3J0yfD/exec";

// Composant pour isoler le rendu HTML des emails (Evite que le CSS de l'email ne casse le site)
const SafeEmailFrame: React.FC<{ html: string; isDarkMode: boolean }> = ({ html, isDarkMode }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        doc.open();
        const bg = isDarkMode ? '#0a0a0a' : '#ffffff';
        const fg = isDarkMode ? '#d4d4d4' : '#171717';

        // Injection de styles de base pour l'iframe afin de respecter le thème et empêcher les débordements
        // MODIF MOBILE : Ajout de styles spécifiques pour la lisibilité sur petit écran
        // MODIF CONTENU : CSS agressif pour forcer les tables et conteneurs à s'adapter
        const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <base target="_blank">
          <style>
            /* Reset & Base */
            *, *:before, *:after {
                box-sizing: border-box;
            }
            html {
                -webkit-text-size-adjust: 100%;
                width: 100%;
            }
            body { 
                margin: 0; 
                padding: 12px; /* Padding confortable sur mobile */
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: ${bg};
                color: ${fg};
                font-size: 16px;
                line-height: 1.6;
                width: 100% !important;
                overflow-x: hidden;
            }

            /* Content Adaptation (Tables & Containers) */
            table, .container, .wrapper {
                max-width: 100% !important;
                width: 100% !important;
                height: auto !important;
                table-layout: fixed; /* Force le respect des largeurs */
                display: table !important;
            }
            
            td {
                word-wrap: break-word;
                overflow-wrap: break-word;
            }

            /* Images Responsive */
            img { 
                max-width: 100% !important; 
                height: auto !important; 
                vertical-align: bottom;
                display: block;
            }
            
            /* Typography & Layout */
            p, h1, h2, h3, h4, h5, h6, ul, ol, li, span, div {
                max-width: 100%;
                overflow-wrap: break-word;
                word-wrap: break-word;
                word-break: break-word;
                hyphens: auto;
            }
            
            a { color: #ea580c; text-decoration: none; word-break: break-all; }
            a:hover { text-decoration: underline; }
            
            pre { 
                white-space: pre-wrap; 
                word-break: break-all; 
                background: rgba(128,128,128,0.1); 
                padding: 10px; 
                border-radius: 4px;
                overflow-x: auto;
            }
            
            blockquote { 
                border-left: 3px solid #ea580c; 
                margin: 10px 0; 
                padding-left: 10px; 
                opacity: 0.8; 
            }

            /* Scrollbar styling to match app */
            ::-webkit-scrollbar { width: 4px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: #555; border-radius: 4px; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `;
        doc.write(content);
        doc.close();

        // Ajustement automatique de la hauteur
        const updateHeight = () => {
            if (doc.body) {
                iframe.style.height = doc.body.scrollHeight + 20 + 'px';
            }
        };

        const resizeObserver = new ResizeObserver(updateHeight);
        if (doc.body) {
            resizeObserver.observe(doc.body);
            updateHeight();
        }

        // Gestion du chargement des images pour réajuster la hauteur
        const images = doc.getElementsByTagName('img');
        for (let i = 0; i < images.length; i++) {
            images[i].onload = updateHeight;
        }

        return () => resizeObserver.disconnect();
    }, [html, isDarkMode]);

    return <iframe ref={iframeRef} className="w-full border-none transition-all duration-300 block min-h-[100px]" title="Email Content" />;
};

import MobileSignature from './components/MobileSignature';

const App: React.FC = () => {
    // Simple Routing for Mobile Signature
    const [currentPath, setCurrentPath] = useState(window.location.pathname);

    useEffect(() => {
        const handlePopState = () => setCurrentPath(window.location.pathname);
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    if (currentPath.startsWith('/sign/')) {
        const sessionId = currentPath.split('/sign/')[1].replace(/\/$/, '');
        return <MobileSignature sessionId={sessionId} />;
    }

    const [activeCategory, setActiveCategory] = useState<ProcedureCategory>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);

    // Theme State (Default to Light)
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Pinned Procedures State
    const [pinnedProcedures, setPinnedProcedures] = useState<string[]>(() => {
        try {
            const cached = localStorage.getItem('iservices_pinned_procedures');
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });

    const togglePin = (procedureId: string) => {
        setPinnedProcedures(prev => {
            const newPinned = prev.includes(procedureId)
                ? prev.filter(id => id !== procedureId)
                : [...prev, procedureId];
            localStorage.setItem('iservices_pinned_procedures', JSON.stringify(newPinned));
            return newPinned;
        });
    };

    // Mailbox State - Initialisation avec Cache LocalStorage pour vitesse instantanée
    const [emails, setEmails] = useState<Email[]>(() => {
        try {
            const cached = localStorage.getItem('iservices_emails_v1');
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });

    // Simulation "Envoyés" avec persistance
    const [localSentEmails, setLocalSentEmails] = useState<Email[]>(() => {
        try {
            const cached = localStorage.getItem('iservices_sent_v1');
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });

    const [mailFolder, setMailFolder] = useState<'inbox' | 'sent'>('inbox');
    const [mailSearchQuery, setMailSearchQuery] = useState('');

    const [isLoadingEmails, setIsLoadingEmails] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    // Cache state to prevent auto-refetch
    const [hasFetchedEmails, setHasFetchedEmails] = useState(false);
    const [emailPage, setEmailPage] = useState(0);

    // Reply State
    const [isReplying, setIsReplying] = useState(false);
    const [replyDraft, setReplyDraft] = useState('');
    const [isGeneratingReply, setIsGeneratingReply] = useState(false);
    const [isSendingReply, setIsSendingReply] = useState(false);

    // Global elastic iOS button interaction hook
    useElasticButtons();

    // Scroll Tracker
    const [isScrolled, setIsScrolled] = useState(false);

    // Apply theme to HTML tag
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    useEffect(() => {
        // Only fetch automatically if we haven't fetched successfully yet
        if (activeCategory === 'mailbox' && !hasFetchedEmails) {
            fetchEmails(0);
        }
    }, [activeCategory, hasFetchedEmails]);

    const toggleTheme = (e?: React.MouseEvent) => {
        const nextThemeIsDark = !isDarkMode;

        // Type guard for startViewTransition (it's not fully typed in all TS versions yet)
        const doc = document as any;

        if (!e || !doc.startViewTransition) {
            flushSync(() => {
                setIsDarkMode(nextThemeIsDark);
            });
            if (nextThemeIsDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            return;
        }

        const x = e.clientX;
        const y = e.clientY;
        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        document.documentElement.classList.add('theme-transition');

        const transition = doc.startViewTransition(() => {
            flushSync(() => {
                setIsDarkMode(nextThemeIsDark);
            });
            if (nextThemeIsDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        });

        transition.ready.then(() => {
            const targetDiameter = endRadius * 5;
            const fromSize = '0px 0px';
            const toSize = `${targetDiameter}px ${targetDiameter}px`;
            const fromPos = `${x}px ${y}px`;
            const toPos = `${x - targetDiameter / 2}px ${y - targetDiameter / 2}px`;

            const gradient = 'radial-gradient(circle closest-side, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)';

            const animationFrames = nextThemeIsDark ? {
                maskImage: [gradient, gradient],
                WebkitMaskImage: [gradient, gradient],
                maskSize: [fromSize, toSize],
                WebkitMaskSize: [fromSize, toSize],
                maskPosition: [fromPos, toPos],
                WebkitMaskPosition: [fromPos, toPos],
                maskRepeat: ['no-repeat', 'no-repeat'],
                WebkitMaskRepeat: ['no-repeat', 'no-repeat']
            } : {
                maskImage: [gradient, gradient],
                WebkitMaskImage: [gradient, gradient],
                maskSize: [toSize, fromSize],
                WebkitMaskSize: [toSize, fromSize],
                maskPosition: [toPos, fromPos],
                WebkitMaskPosition: [toPos, fromPos],
                maskRepeat: ['no-repeat', 'no-repeat'],
                WebkitMaskRepeat: ['no-repeat', 'no-repeat']
            };

            document.documentElement.animate(
                animationFrames,
                {
                    duration: 800,
                    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
                    fill: "forwards",
                    pseudoElement: nextThemeIsDark
                        ? "::view-transition-new(root)"
                        : "::view-transition-old(root)",
                }
            );
        });

        transition.finished.then(() => {
            document.documentElement.classList.remove('theme-transition');
        });
    };

    // Reset reply state when opening new email
    useEffect(() => {
        if (selectedEmail) {
            setIsReplying(false);
            setReplyDraft('');
        }
    }, [selectedEmail]);

    // Gemini State for Guide
    const [guideQuery, setGuideQuery] = useState('');
    const [guideResponse, setGuideResponse] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);

    const filteredProcedures = useMemo(() => {
        if (activeCategory === 'contacts' || activeCategory === 'mailbox' || activeCategory === 'qualirepar' || activeCategory === 'intake' || activeCategory === 'stock') return [];
        let filtered = procedures.filter(p => {
            const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
            const matchesSearch =
                p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.code.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        // Tri : Les procédures épinglées remontent en haut de la liste
        filtered.sort((a, b) => {
            const isAPinned = pinnedProcedures.includes(a.id);
            const isBPinned = pinnedProcedures.includes(b.id);
            if (isAPinned && !isBPinned) return -1;
            if (!isAPinned && isBPinned) return 1;
            return 0;
        });

        return filtered;
    }, [activeCategory, searchQuery, pinnedProcedures]);

    const filteredContacts = useMemo(() => {
        if (activeCategory !== 'contacts') return [];
        return contacts.filter(c =>
            c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [activeCategory, searchQuery]);

    // Filtre Emails (Recherche locale)
    const filteredEmails = useMemo(() => {
        const source = mailFolder === 'inbox' ? emails : localSentEmails;
        if (!mailSearchQuery) return source;
        const lowerQ = mailSearchQuery.toLowerCase();
        return source.filter(e =>
            (e.subject && e.subject.toLowerCase().includes(lowerQ)) ||
            (e.from && e.from.toLowerCase().includes(lowerQ)) ||
            (e.snippet && e.snippet.toLowerCase().includes(lowerQ))
        );
    }, [emails, localSentEmails, mailFolder, mailSearchQuery]);

    const handleShowToast = (msg: string) => {
        setToastMessage(msg);
        setShowToast(true);
    };

    const fetchEmails = async (pageToFetch = 0) => {
        const isLoadMore = pageToFetch > 0;

        if (isLoadMore) {
            setIsLoadingMore(true);
        } else {
            setIsLoadingEmails(true);
            // Reset page if full refresh
            setEmailPage(0);
        }

        setEmailError('');

        try {
            // Append page parameter
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?page=${pageToFetch}`, {
                method: 'GET'
            });
            const data = await response.json();

            if (data.status === 'success') {
                if (isLoadMore) {
                    // Append new emails to existing list
                    // Filter duplicates just in case
                    setEmails(prev => {
                        const newEmails = data.data.filter((newE: Email) => !prev.some(currE => currE.id === newE.id));
                        return [...prev, ...newEmails];
                    });
                    setEmailPage(pageToFetch);
                } else {
                    // Replace list
                    setEmails(data.data);
                    setHasFetchedEmails(true);
                    setEmailPage(0);

                    // UPDATE CACHE - OPTIMIZED TO AVOID QUOTA EXCEEDED
                    try {
                        // 1. Keep only last 20 emails
                        // 2. Strip attachments data (base64 is huge)
                        // 3. Truncate body if massive
                        const emailsToCache = data.data.slice(0, 20).map((email: Email) => ({
                            ...email,
                            htmlBody: (email.htmlBody && email.htmlBody.length > 50000) ? email.htmlBody.substring(0, 50000) + '...' : email.htmlBody,
                            attachments: email.attachments ? email.attachments.map(a => ({
                                name: a.name,
                                mime: a.mime,
                                data: '' // Don't store base64 in cache
                            })) : []
                        }));
                        localStorage.setItem('iservices_emails_v1', JSON.stringify(emailsToCache));
                    } catch (e) {
                        console.error("Cache Full", e);
                    }
                }
            } else {
                setEmailError('Impossible de charger les emails.');
            }
        } catch (err) {
            console.error(err);
            setEmailError('Erreur de connexion au serveur mail.');
        } finally {
            setIsLoadingEmails(false);
            setIsLoadingMore(false);
        }
    };

    const handleManualRefresh = () => {
        fetchEmails(0);
    };

    const handleLoadMore = () => {
        const nextPage = emailPage + 1;
        fetchEmails(nextPage);
    };

    // --- GEMINI MAIL REPLY LOGIC ---
    const handleMagicReply = async () => {
        if (!selectedEmail) return;
        setIsGeneratingReply(true);

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error("API key non configurée");
            const ai = new GoogleGenAI({ apiKey });

            const systemInstruction = `Tu es un assistant expert pour iServices France.
        Ta mission est de rédiger une réponse email parfaite.

        RÈGLES PRIX (CRUCIAL) :
        - NE CHERCHE PAS LE PRIX SUR INTERNET.
        - À la place du montant, écris systématiquement : "[PRIX À VÉRIFIER]".
        - Je remplirai le prix moi-même avant d'envoyer.

        RÈGLES DÉLAIS (Respect Impératif) :
        - Smartphone (écran/batterie/etc) : 1 Heure.
        - Smartphone (châssis/dos) : 3 Heures.
        - Tablette / Macbook : 2 à 3 Heures.

        RÈGLES FORME :
        - Pas d'objet, juste le corps.
        - Pas de Markdown, pas d'étoiles (**).
        - Ton professionnel et empathique.
        - NE PARLE PAS DU BONUS RÉPARATION sauf si demandé.
        `;

            const prompt = `
        EMAIL CLIENT :
        Sujet : ${selectedEmail.subject}
        Message : ${selectedEmail.fullBody}

        MON BROUILLON/CONSIDÉRATION : "${replyDraft}"

        ACTION :
        Rédige la réponse. Utilise le placeholder "[PRIX À VÉRIFIER]" pour le tarif.
        `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    systemInstruction: systemInstruction,
                }
            });

            // Nettoyage de sécurité pour enlever les étoiles si l'IA en met quand même
            const suggestedText = response.text?.replace(/\*\*/g, '') || "Erreur de génération.";
            setReplyDraft(suggestedText);

        } catch (error) {
            console.error("Gemini Mail Error:", error);
            handleShowToast("Erreur IA : Vérifiez votre connexion");
        } finally {
            setIsGeneratingReply(false);
        }
    };

    const handleAutoCorrect = async () => {
        if (!replyDraft.trim()) return;
        setIsGeneratingReply(true);

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error("API key non configurée");
            const ai = new GoogleGenAI({ apiKey });
            const systemInstruction = `Tu es un correcteur orthographique. Corrige uniquement les fautes. Ne change pas le sens, n'ajoute pas de prix, ne mets pas de markdown.`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Corrige : "${replyDraft}"`,
                config: { systemInstruction: systemInstruction }
            });

            const correctedText = response.text?.replace(/\*\*/g, '') || replyDraft;
            setReplyDraft(correctedText);
            handleShowToast("Texte corrigé !");

        } catch (error) {
            console.error("Gemini Correction Error:", error);
            handleShowToast("Erreur lors de la correction");
        } finally {
            setIsGeneratingReply(false);
        }
    };

    const handleSendReply = async () => {
        if (!selectedEmail || !replyDraft.trim()) return;
        setIsSendingReply(true);

        // Clean sender email to extract just the address
        const toEmail = selectedEmail.from.match(/<(.+)>/)?.[1] || selectedEmail.from;

        const payload = {
            to_email: toEmail,
            subject: `Re: ${selectedEmail.subject}`,
            message: replyDraft,
            body: replyDraft,
            htmlBody: replyDraft.replace(/\n/g, '<br/>') // Basic HTML conversion
        };

        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            // Simulation d'ajout dans "Envoyés"
            const sentEmail: Email = {
                id: `sent-${Date.now()}`,
                subject: `Re: ${selectedEmail.subject}`,
                from: "Moi (iServices)",
                date: new Date().toISOString(),
                snippet: replyDraft.substring(0, 50) + "...",
                fullBody: replyDraft,
                htmlBody: replyDraft.replace(/\n/g, '<br/>')
            };

            setLocalSentEmails(prev => {
                const newState = [sentEmail, ...prev];
                try {
                    // Optimization for sent emails cache
                    const sentToCache = newState.slice(0, 20).map(e => ({
                        ...e,
                        htmlBody: (e.htmlBody && e.htmlBody.length > 50000) ? e.htmlBody.substring(0, 50000) : e.htmlBody,
                        attachments: []
                    }));
                    localStorage.setItem('iservices_sent_v1', JSON.stringify(sentToCache));
                } catch (e) { console.error(e); }
                return newState;
            });

            handleShowToast("Réponse envoyée !");
            setIsReplying(false);
            setReplyDraft('');
        } catch (err) {
            console.error(err);
            handleShowToast("Erreur lors de l'envoi");
        } finally {
            setIsSendingReply(false);
        }
    };

    // --- GEMINI GUIDE LOGIC ---
    const handleAskGemini = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsThinking(true);
        setGuideResponse(null);

        try {
            // Using the user-provided API key from .env
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error("Veuillez configurer VITE_GEMINI_API_KEY dans le fichier .env");
            const ai = new GoogleGenAI({ apiKey });
            const systemInstruction = `Tu es un assistant virtuel expert pour les employés d'iServices. 
        Ta mission est de répondre aux questions en te basant UNIQUEMENT sur le contexte fourni.
        
        TOLÉRANCE ORTHOGRAPHIQUE MAXIMALE :
        L'utilisateur peut faire des fautes d'orthographe, de frappe ou utiliser du langage SMS (ex: "ecran kasser", "stok", "coment fair").
        Tu dois AUTOMATIQUEMENT corriger l'intention de l'utilisateur sans jamais mentionner ses fautes. Comprends le sens phonétique.

        RÈGLES DE FORMATAGE (OBLIGATOIRES) :
        1. Utilise le format Markdown.
        2. Titres niveau 3 (###) pour les étapes.
        3. Listes à puces (-) pour les actions.
        4. GRAS (**) pour les éléments importants.

        CONTEXTE DU GUIDE :
        ${pdfContext}`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Question utilisateur (analyse phonétiquement si nécessaire) : ${searchQuery}`,
                config: {
                    systemInstruction: systemInstruction,
                }
            });

            setGuideResponse(response.text || "Erreur de génération.");

        } catch (error) {
            console.error("Gemini Error:", error);
            setGuideResponse("Une erreur est survenue lors de la consultation du guide. Veuillez vérifier votre clé API ou réessayer plus tard.");
        } finally {
            setIsThinking(false);
        }
    };

    const renderFormattedResponse = (text: string) => {
        if (!text) return null;
        const lines = text.split(/\r?\n/);
        let delayCounter = 0;
        return (
            <div className="space-y-3 font-tech text-sm md:text-base">
                {lines.map((line, index) => {
                    if (!line.trim()) return <div key={index} className="h-2"></div>;
                    const style = { animationDelay: `${delayCounter * 0.05}s` };
                    delayCounter++;
                    if (line.startsWith('###')) {
                        const content = line.replace(/^###\s*/, '');
                        return (
                            <h3 key={index} className="text-orange-600 font-bold text-lg uppercase tracking-wide mt-4 mb-2 flex items-center gap-2 animate-[slideUp_0.4s_ease-out_forwards] opacity-0 translate-y-2" style={style}>
                                <FaSquare className="text-[8px]" />
                                {content}
                            </h3>
                        );
                    }
                    if (line.trim().startsWith('-')) {
                        const textContent = line.replace(/^\s*-\s*/, '');
                        const parts = textContent.split(/(\*\*.*?\*\*)/g).map((part, i) =>
                            part.startsWith('**') && part.endsWith('**')
                                ? <strong key={i} className="text-orange-600 dark:text-orange-500 font-bold">{part.slice(2, -2)}</strong>
                                : <span key={i}>{part}</span>
                        );
                        return (
                            <div key={index} className="flex gap-3 items-start pl-2 animate-[slideUp_0.4s_ease-out_forwards] opacity-0 translate-y-2" style={style}>
                                <span className="w-1.5 h-1.5 bg-neutral-400 dark:bg-neutral-600 rounded-full mt-1.5 shrink-0"></span>
                                <p className="dark:text-neutral-300 text-neutral-700 leading-relaxed">{parts}</p>
                            </div>
                        );
                    }
                    const parts = line.split(/(\*\*.*?\*\*)/g).map((part, i) =>
                        part.startsWith('**') && part.endsWith('**')
                            ? <strong key={i} className="text-black dark:text-white font-bold">{part.slice(2, -2)}</strong>
                            : <span key={i}>{part}</span>
                    );
                    return (
                        <p key={index} className="dark:text-neutral-400 text-neutral-600 leading-relaxed animate-[slideUp_0.4s_ease-out_forwards] opacity-0 translate-y-2" style={style}>
                            {parts}
                        </p>
                    );
                })}
            </div>
        );
    };

    const renderContent = () => {
        // === MAILBOX VIEW (GMAIL STYLE) ===
        if (activeCategory === 'mailbox') {

            // --- VUE DÉTAIL (THREAD) ---
            if (selectedEmail) {
                return (
                    <div className="flex flex-col h-full animate-fadeIn pb-5 md:pb-10 relative bg-white dark:bg-[#0a0a0a] md:bg-transparent">
                        {/* Toolbar Detail */}
                        <div className="flex items-center gap-4 mb-2 p-4 md:p-0 md:mb-6 border-b md:border-b-0 dark:border-[#262626] border-neutral-200">
                            <button onClick={() => setSelectedEmail(null)} className="p-2 md:p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors bg-neutral-100 dark:bg-[#111] md:bg-transparent" title="Retour">
                                <FaChevronLeft className="text-neutral-600 dark:text-neutral-400 hover:text-orange-600 text-lg md:text-base" />
                            </button>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-base md:text-xl font-sans font-bold dark:text-white text-black truncate pr-4">{selectedEmail.subject}</h2>
                                <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
                                    <span className="bg-neutral-200 dark:bg-[#222] px-2 py-0.5 rounded text-[10px] uppercase">{mailFolder === 'inbox' ? 'Boîte de réception' : 'Envoyés'}</span>
                                    <span className="truncate">{new Date(selectedEmail.date).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-0 md:pr-2 space-y-0 md:space-y-6 scrollbar-thin">

                            {/* 1. Message Original (Reçu) */}
                            <div className="dark:bg-[#1a1a1a]/40 bg-white/40 backdrop-blur-xl md:rounded-[32px] border-t md:border dark:border-white/10 border-black/10 overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.1)] transition-colors">
                                {/* Header Message */}
                                <div className="p-4 md:p-6 border-b dark:border-white/10 border-black/5 flex items-start gap-3 md:gap-4 dark:bg-white/5 bg-black/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 text-white flex items-center justify-center font-bold font-tech text-lg shadow-[0_0_15px_rgba(234,88,12,0.4)] shrink-0">
                                        {selectedEmail.from.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline">
                                            <span className="font-bold font-sans text-neutral-800 dark:text-neutral-200 truncate text-sm md:text-base">{selectedEmail.from.split('<')[0]}</span>
                                            <span className="text-xs text-neutral-400 font-mono hidden md:block">{new Date(selectedEmail.date).toLocaleString()}</span>
                                        </div>
                                        <span className="text-xs text-neutral-500 font-mono truncate block">{selectedEmail.from.match(/<(.+)>/)?.[1] || selectedEmail.from}</span>
                                        <span className="text-xs text-neutral-500 block md:hidden mt-1">{new Date(selectedEmail.date).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {/* Body Message */}
                                <div className="p-4 md:p-8 text-sm md:text-base font-sans leading-relaxed dark:text-neutral-300 text-neutral-700">
                                    {selectedEmail.htmlBody ? (
                                        <SafeEmailFrame html={selectedEmail.htmlBody} isDarkMode={isDarkMode} />
                                    ) : (
                                        <div className="whitespace-pre-wrap">{selectedEmail.fullBody}</div>
                                    )}
                                </div>

                                {/* Attachments */}
                                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                                    <div className="px-6 pb-6 pt-2 flex flex-wrap gap-3">
                                        {selectedEmail.attachments.map((att, idx) => (
                                            <a key={idx} href={`data:${att.mime};base64,${att.data}`} download={att.name} className="flex items-center gap-3 p-2 pr-4 rounded-lg bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-200 dark:border-[#333] hover:border-orange-500 transition-colors group">
                                                <div className="w-8 h-8 rounded bg-white dark:bg-black flex items-center justify-center text-red-500"><FaFile /></div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold truncate max-w-[120px] dark:text-neutral-300">{att.name}</span>
                                                    <span className="text-[9px] text-neutral-400 uppercase">Télécharger</span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 2. Zone de Réponse (Ouverture au clic) */}
                            <div className="dark:bg-[#1a1a1a]/40 bg-white/40 backdrop-blur-xl md:rounded-[32px] border-t md:border dark:border-white/10 border-black/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.1)] overflow-hidden transition-all duration-300 pb-20 md:pb-0 mt-6">
                                {!isReplying ? (
                                    <div
                                        onClick={() => setIsReplying(true)}
                                        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-neutral-500 border-t dark:border-white/10 border-black/10 md:border-none"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-[#222] flex items-center justify-center"><FaReply /></div>
                                        <span className="font-sans text-sm">Cliquez ici pour <span className="font-bold">répondre</span>...</span>
                                    </div>
                                ) : (
                                    <div className="p-4 md:p-6 animate-fadeIn">
                                        <div className="flex flex-wrap items-center gap-2 mb-4 bg-neutral-50 dark:bg-[#111] p-2 rounded-xl border dark:border-[#222] border-neutral-200">
                                            <div className="flex-1 flex items-center gap-2 ml-2">
                                                <FaReply className="text-neutral-400" />
                                                <span className="text-xs font-bold uppercase text-neutral-500 font-tech tracking-wider hidden md:inline">Réponse à {selectedEmail.from.split('<')[0]}</span>
                                                <span className="text-xs font-bold uppercase text-neutral-500 font-tech tracking-wider md:hidden">Répondre</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handleAutoCorrect}
                                                    disabled={isGeneratingReply || !replyDraft.trim()}
                                                    className="flex items-center gap-2 px-3 py-2 md:py-1.5 bg-white dark:bg-[#222] border dark:border-[#333] border-neutral-300 hover:border-orange-500 rounded-lg text-xs font-bold uppercase transition-all"
                                                    title="Correction Orthographe"
                                                >
                                                    {isGeneratingReply ? <FaRotate className="animate-spin" /> : <FaSpellCheck />}
                                                    <span className="hidden md:inline">Correction</span>
                                                </button>
                                                <button
                                                    onClick={handleMagicReply}
                                                    disabled={isGeneratingReply}
                                                    className="flex items-center gap-2 px-3 py-2 md:py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-xs font-bold uppercase shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105 transition-all"
                                                >
                                                    {isGeneratingReply ? <FaRotate className="animate-spin" /> : <FaWandMagicSparkles />}
                                                    Assistant IA
                                                </button>
                                            </div>
                                        </div>

                                        <textarea
                                            autoFocus
                                            value={replyDraft}
                                            onChange={(e) => setReplyDraft(e.target.value)}
                                            placeholder="Rédigez votre réponse..."
                                            className="w-full h-64 md:h-48 p-4 rounded-[20px] dark:bg-black/20 bg-white/40 backdrop-blur-md border dark:border-white/10 border-black/10 font-sans text-base focus:border-orange-600 focus:outline-none transition-colors dark:text-white text-black resize-none leading-relaxed shadow-[inset_0_1px_4px_rgba(0,0,0,0.05)]"
                                        />

                                        <div className="flex items-center justify-between mt-4">
                                            <p className="text-[10px] text-neutral-400 font-mono hidden md:block">* L'assistant IA prépare le texte, prix à compléter.</p>
                                            <div className="flex gap-3 w-full md:w-auto">
                                                <button onClick={() => setIsReplying(false)} className="flex-1 md:flex-none px-4 py-3 md:py-2 text-neutral-500 hover:text-black dark:hover:text-white font-bold text-xs uppercase transition-colors bg-neutral-100 dark:bg-[#222] md:bg-transparent rounded-lg md:rounded-none">Annuler</button>
                                                <button
                                                    onClick={handleSendReply}
                                                    disabled={isSendingReply || !replyDraft.trim()}
                                                    className="flex-1 md:flex-none bg-orange-600 text-white px-6 py-3 md:py-2 rounded-lg font-bold text-sm uppercase tracking-wide hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    {isSendingReply ? "Envoi..." : <><FaPaperPlane /> Envoyer</>}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            }

            // --- VUE LISTE (GMAIL STYLE) ---
            return (
                <div className="flex flex-col h-full overflow-hidden">
                    {/* 1. Header & Recherche */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-2 md:mb-6 shrink-0">
                        <div className="hidden md:flex items-center gap-4 w-full md:w-auto">
                            <div className="w-10 h-10 flex items-center justify-center bg-orange-600 text-white rounded-xl shadow-lg shrink-0">
                                <FaEnvelope />
                            </div>
                            <h2 className="text-xl font-tech font-bold dark:text-white text-black uppercase tracking-tight hidden md:block">Messagerie</h2>
                        </div>

                        {/* Search Bar Pro */}
                        <div className="flex-1 w-full md:w-auto relative group shrink-0">
                            <FaMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-orange-600 transition-colors z-10" />
                            <input
                                type="text"
                                value={mailSearchQuery}
                                onChange={(e) => setMailSearchQuery(e.target.value)}
                                placeholder="Rechercher..."
                                className="w-full pl-11 pr-4 py-3 bg-white/40 dark:bg-black/40 backdrop-blur-xl border dark:border-white/10 border-black/10 rounded-[20px] focus:border-orange-500/50 focus:bg-white/60 dark:focus:bg-black/60 focus:outline-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_2px_10px_rgba(0,0,0,0.05)] dark:text-white text-black text-sm font-sans transition-all"
                            />
                        </div>

                        <button onClick={handleManualRefresh} className="hidden md:block p-3.5 bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-[20px] hover:text-orange-600 hover:bg-white/60 dark:hover:bg-black/60 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_2px_10px_rgba(0,0,0,0.05)]" title="Actualiser">
                            <FaRotate className={isLoadingEmails ? "animate-spin" : ""} />
                        </button>
                    </div>

                    <div className="flex flex-1 overflow-hidden gap-6">
                        {/* 2. Sidebar Dossiers (Desktop) */}
                        <div className="hidden md:flex flex-col w-48 shrink-0 gap-3">
                            <button
                                onClick={() => { setMailFolder('inbox'); setSelectedEmail(null); }}
                                className={`flex items-center justify-between px-5 py-3.5 rounded-[20px] text-sm font-bold transition-all border ${mailFolder === 'inbox' ? 'bg-white/60 dark:bg-black/60 text-orange-600 border-orange-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_2px_10px_rgba(0,0,0,0.05)]' : 'border-transparent text-neutral-500 hover:bg-white/40 dark:hover:bg-black/40 hover:border-black/5 dark:hover:border-white/5'}`}
                            >
                                <div className="flex items-center gap-3"><FaInbox /> Réception</div>
                                {emails.length > 0 && <span className="text-xs bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-full text-black/70 dark:text-white/70">{emails.length}</span>}
                            </button>
                            <button
                                onClick={() => { setMailFolder('sent'); setSelectedEmail(null); }}
                                className={`flex items-center justify-between px-5 py-3.5 rounded-[20px] text-sm font-bold transition-all border ${mailFolder === 'sent' ? 'bg-white/60 dark:bg-black/60 text-orange-600 border-orange-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_2px_10px_rgba(0,0,0,0.05)]' : 'border-transparent text-neutral-500 hover:bg-white/40 dark:hover:bg-black/40 hover:border-black/5 dark:hover:border-white/5'}`}
                            >
                                <div className="flex items-center gap-3"><FaPaperPlane /> Envoyés</div>
                            </button>
                            <div className="h-px bg-black/5 dark:bg-white/5 my-2"></div>
                            <div className="px-5 py-2 text-[10px] font-tech uppercase text-neutral-400 tracking-widest">Labels</div>
                            <button className="flex items-center gap-3 px-5 py-2.5 text-sm text-neutral-500 hover:text-black dark:hover:text-white hover:bg-white/20 dark:hover:bg-black/20 rounded-[16px] transition-colors"><FaSquare className="text-xs text-red-500" /> Urgent</button>
                            <button className="flex items-center gap-3 px-5 py-2.5 text-sm text-neutral-500 hover:text-black dark:hover:text-white hover:bg-white/20 dark:hover:bg-black/20 rounded-[16px] transition-colors"><FaSquare className="text-xs text-green-500" /> Terminé</button>
                        </div>

                        {/* 3. Liste des Emails */}
                        <div className="flex-1 dark:bg-[#1a1a1a]/40 bg-white/40 backdrop-blur-xl md:rounded-[32px] border-t md:border dark:border-white/10 border-black/10 overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_8px_32px_rgba(0,0,0,0.1)] flex flex-col relative transition-colors">

                            {/* Mobile Tabs - STICKY TOP */}
                            <div className="flex md:hidden sticky top-0 z-20 bg-white/40 dark:bg-black/40 backdrop-blur-xl border-b dark:border-white/10 border-black/10 p-2 gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                                <button onClick={() => setMailFolder('inbox')} className={`flex-1 py-2.5 rounded-[16px] text-xs font-bold uppercase tracking-wide transition-all border ${mailFolder === 'inbox' ? 'bg-white/60 dark:bg-black/60 text-orange-600 border-orange-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_2px_10px_rgba(0,0,0,0.05)]' : 'border-transparent text-neutral-500 bg-black/5 dark:bg-white/5'}`}>
                                    Réception {emails.length > 0 && `(${emails.length})`}
                                </button>
                                <button onClick={() => setMailFolder('sent')} className={`flex-1 py-2.5 rounded-[16px] text-xs font-bold uppercase tracking-wide transition-all border ${mailFolder === 'sent' ? 'bg-white/60 dark:bg-black/60 text-orange-600 border-orange-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_2px_10px_rgba(0,0,0,0.05)]' : 'border-transparent text-neutral-500 bg-black/5 dark:bg-white/5'}`}>
                                    Envoyés
                                </button>
                                <button onClick={handleManualRefresh} className="p-2.5 bg-black/5 dark:bg-white/5 rounded-[16px] text-neutral-500 border border-transparent">
                                    <FaRotate className={isLoadingEmails ? "animate-spin" : ""} />
                                </button>
                            </div>

                            {/* Loading / Error / Empty States */}
                            {emailError && (
                                <div className="p-4 bg-red-500/10 text-red-500 text-sm text-center border-b border-red-500/20">{emailError}</div>
                            )}

                            {isLoadingEmails && filteredEmails.length === 0 ? (
                                <div className="flex flex-col items-center justify-center flex-1 space-y-4 opacity-50">
                                    <FaRotate className="animate-spin text-2xl text-orange-600" />
                                    <span className="font-tech text-xs tracking-widest">SYNCHRONISATION...</span>
                                </div>
                            ) : filteredEmails.length === 0 ? (
                                <div className="flex flex-col items-center justify-center flex-1 text-neutral-400 gap-4">
                                    <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-[#111] flex items-center justify-center text-2xl"><FaInbox /></div>
                                    <p className="font-tech text-sm uppercase tracking-widest">Aucun message</p>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto scrollbar-thin">
                                    {filteredEmails.map((email) => (
                                        <div
                                            key={email.id}
                                            onClick={() => setSelectedEmail(email)}
                                            className="group flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 p-4 md:px-6 md:py-5 border-b dark:border-white/5 border-black/5 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all md:hover:pl-7 border-l-4 border-l-transparent md:hover:border-l-orange-500 active:bg-black/10 dark:active:bg-white/10"
                                        >
                                            {/* Avatar / Checkbox Area */}
                                            <div className="flex items-center gap-3 w-full md:w-56 shrink-0 min-w-0">
                                                {/* Mobile Layout: Avatar + Name + Date Top Row */}
                                                <div className="w-10 h-10 md:w-9 md:h-9 shrink-0 rounded-full dark:bg-white/5 bg-black/5 text-neutral-600 dark:text-neutral-400 flex items-center justify-center text-xs font-bold font-tech uppercase border dark:border-white/10 border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                                                    {email.from.substring(0, 2)}
                                                </div>
                                                <div className="flex flex-col md:justify-center w-full min-w-0">
                                                    <div className="flex justify-between items-center w-full min-w-0">
                                                        <span className={`text-sm font-bold truncate flex-1 min-w-0 pr-2 ${mailFolder === 'inbox' ? 'dark:text-white text-black' : 'text-neutral-500'}`}>
                                                            {mailFolder === 'inbox' ? email.from.split('<')[0] : `À: ${email.from.split('<')[0]}`}
                                                        </span>
                                                        <span className="text-[10px] text-neutral-400 font-mono md:hidden whitespace-nowrap ml-2 shrink-0">{new Date(email.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                    </div>
                                                    {/* Mobile Subject Preview directly under name */}
                                                    <div className="md:hidden text-sm dark:text-neutral-200 text-neutral-800 font-medium truncate mt-0.5 min-w-0">
                                                        {email.subject || '(Sans objet)'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Content Desktop */}
                                            <div className="hidden md:flex flex-1 min-w-0 items-center gap-4">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-sm dark:text-neutral-200 text-neutral-800 font-medium truncate">{email.subject || '(Sans objet)'}</span>
                                                    <span className="text-sm text-neutral-400">-</span>
                                                    <span className="text-sm text-neutral-500 truncate">{email.snippet}</span>
                                                </div>
                                            </div>

                                            {/* Mobile Snippet (3rd Line) */}
                                            <p className="text-xs text-neutral-500 line-clamp-2 md:hidden pl-[52px] -mt-1 leading-relaxed w-full">
                                                {email.snippet}
                                            </p>

                                            {/* Meta & Actions Desktop */}
                                            <div className="hidden md:flex items-center gap-4 shrink-0 ml-auto">
                                                {email.attachments && email.attachments.length > 0 && (
                                                    <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-[#222] border border-neutral-200 dark:border-[#333] text-[10px] font-bold text-neutral-500 flex items-center gap-1">
                                                        <FaPaperclip /> PDF
                                                    </span>
                                                )}
                                                <span className="text-xs font-mono text-neutral-400 w-24 text-right">{new Date(email.date).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}

                                    {mailFolder === 'inbox' && (
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={isLoadingMore}
                                            className="w-full py-6 md:py-4 text-xs font-tech font-bold uppercase text-neutral-500 hover:text-orange-600 hover:bg-neutral-50 dark:hover:bg-[#111] transition-colors pb-20 md:pb-4"
                                        >
                                            {isLoadingMore ? "Chargement..." : "Charger plus d'anciens messages"}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // === GUIDE VIEW ===
        // The 'guide' category UI has been removed to be fully migrated into Header's Search Bubble

        // === QUALIREPAR VIEW ===
        if (activeCategory === 'qualirepar') {
            return <QualiReparForm onShowToast={handleShowToast} />;
        }

        // === STOCK VIEW ===
        if (activeCategory === 'stock') {
            return <StockView isDarkMode={isDarkMode} isScrolled={isScrolled} />;
        }

        // === INTAKE FORM VIEW ===
        if (activeCategory === 'intake') {
            return <IntakeForm onShowToast={handleShowToast} />;
        }

        // === CONTACTS VIEW ===
        if (activeCategory === 'contacts') {
            return (
                <>
                    <div className="flex items-center gap-4 md:gap-5 mb-6 md:mb-10 pl-2">
                        <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center dark:bg-white bg-black dark:text-black text-white rounded-full transition-colors"><FaAddressBook className="text-base md:text-lg" /></div>
                        <h2 className="text-2xl md:text-3xl font-tech font-bold dark:text-white text-black tracking-tighter uppercase transition-colors">Répertoire</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-24 lg:pb-20">
                        {filteredContacts.map(c => (
                            <ContactCard key={c.id} contact={c} />
                        ))}
                        {filteredContacts.length === 0 && (
                            <div className="col-span-full text-center py-32 dark:text-neutral-700 text-neutral-400 font-tech text-xl uppercase tracking-widest">
                            // AUCUN_CONTACT_TROUVE //
                            </div>
                        )}
                    </div>
                </>
            );
        }

        // Default Procedures View
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-24 lg:pb-20">
                {filteredProcedures.map(p => (
                    <ProcedureCard
                        key={p.id}
                        procedure={p}
                        onClick={setSelectedProcedure}
                        isPinned={pinnedProcedures.includes(p.id)}
                        onTogglePin={() => togglePin(p.id)}
                    />
                ))}
                {filteredProcedures.length === 0 && (
                    <div className="col-span-full text-center py-32 dark:text-neutral-700 text-neutral-400 font-tech text-xl uppercase tracking-widest">
                    // AUCUNE_PROCEDURE_TROUVEE //
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-screen flex flex-col overflow-x-hidden overflow-y-auto dark:bg-black bg-[#f5f5f5] dark:text-white text-black transition-colors duration-300 print:h-auto print:overflow-visible print:bg-white print:block text-base">
            <div className="print:hidden">
                <Header
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                    activeCategory={activeCategory}
                    onSelectCategory={setActiveCategory}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    isScrolled={isScrolled}
                    onAskGemini={handleAskGemini}
                    guideResponse={guideResponse}
                    isThinking={isThinking}
                    renderFormattedResponse={renderFormattedResponse}
                />
            </div>

            <main
                className="flex-1 overflow-y-auto w-full h-full relative scrollbar-thin pt-20 pb-24 md:pt-32 md:pb-0 lg:p-10 lg:pt-32 print:overflow-visible print:p-0 print:pt-0 print:block print:h-auto print:static"
                onScroll={(e) => {
                    setIsScrolled(e.currentTarget.scrollTop > 10);
                }}
            >
                {/* Background decoration */}
                <div className="fixed top-0 left-0 w-full h-full bg-dots pointer-events-none opacity-40 z-0 print:hidden"></div>

                <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 h-full flex flex-col relative z-10 pt-4 print:static print:block print:h-auto print:space-y-0 print:pt-6 print:px-6">

                    {/* Content Area */}
                    <div className="flex-1 print:block print:h-auto">
                        {renderContent()}
                    </div>

                </div>
            </main>

            {selectedProcedure && (
                <Modal
                    procedure={selectedProcedure}
                    onClose={() => setSelectedProcedure(null)}
                    onShowToast={handleShowToast}
                />
            )}

            <Toast
                message={toastMessage}
                isVisible={showToast}
                onClose={() => setShowToast(false)}
            />

            {/* Inject animation styles locally for the staggered effect */}
            <style>{`
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
};

export default App;