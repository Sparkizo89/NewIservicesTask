import React, { useState, useMemo } from 'react';
import { FaStar, FaFilter, FaImage, FaStore, FaRotate, FaGoogle } from 'react-icons/fa6';
import { Review } from '../types';

// Mock Data Generator for "Real-time" simulation
const MOCK_REVIEWS: Review[] = [
    {
        id: 'r1',
        author: 'Jean Dupont',
        rating: 5,
        date: 'Il y a 2 heures',
        text: 'Super service ! Mon iPhone 13 a été réparé en 30 minutes. L\'équipe est très pro et accueillante. Je recommande vivement cette boutique.',
        store: 'Bastille',
        source: 'google',
        images: ['https://picsum.photos/seed/iphone1/400/300']
    },
    {
        id: 'r2',
        author: 'Sophie Martin',
        rating: 5,
        date: 'Il y a 5 heures',
        text: 'Remplacement de batterie sur mon MacBook Air. Travail soigné et rapide. Merci à toute l\'équipe !',
        store: 'Bastille',
        source: 'google'
    },
    {
        id: 'r3',
        author: 'Pierre Durand',
        rating: 4,
        date: 'Hier',
        text: 'Bon accueil, réparation un peu plus longue que prévu mais résultat impeccable.',
        store: 'Saint-Antoine',
        source: 'google'
    },
    {
        id: 'r4',
        author: 'Marie Leroy',
        rating: 5,
        date: 'Hier',
        text: 'Sauvetage de mon téléphone tombé dans l\'eau ! Des magiciens. Merci infiniment.',
        store: 'Bastille',
        source: 'google',
        images: ['https://picsum.photos/seed/water/400/300', 'https://picsum.photos/seed/shop/400/300']
    },
    {
        id: 'r5',
        author: 'Lucas Bernard',
        rating: 1,
        date: 'Il y a 2 jours',
        text: 'Attente trop longue en boutique...',
        store: 'Forum des Halles',
        source: 'google'
    },
    {
        id: 'r6',
        author: 'Emma Petit',
        rating: 5,
        date: 'Il y a 3 jours',
        text: 'Écran changé parfaitement. Le technicien m\'a même offert un verre trempé. Top !',
        store: 'Bastille',
        source: 'google',
        images: ['https://picsum.photos/seed/screen/400/300']
    },
    {
        id: 'r7',
        author: 'Thomas Richard',
        rating: 5,
        date: 'Il y a 4 jours',
        text: 'Service client au top. Ils ont pris le temps de m\'expliquer le problème.',
        store: 'Saint Dominique',
        source: 'google'
    },
    {
        id: 'r8',
        author: 'Julie Moreau',
        rating: 3,
        date: 'Il y a 1 semaine',
        text: 'Correct, mais un peu cher par rapport à la concurrence.',
        store: 'Bastille',
        source: 'google'
    }
];

const ReviewsView: React.FC = () => {
    const [filterRating, setFilterRating] = useState<number | null>(null);
    const [filterStore, setFilterStore] = useState<string>('All');
    const [filterHasImage, setFilterHasImage] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Simulate fetching new data
    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1500);
    };

    const filteredReviews = useMemo(() => {
        return MOCK_REVIEWS.filter(review => {
            const matchRating = filterRating ? review.rating === filterRating : true;
            const matchStore = filterStore !== 'All' ? review.store === filterStore : true;
            const matchImage = filterHasImage ? (review.images && review.images.length > 0) : true;
            return matchRating && matchStore && matchImage;
        });
    }, [filterRating, filterStore, filterHasImage]);

    const stores = Array.from(new Set(MOCK_REVIEWS.map(r => r.store)));

    const averageRating = (MOCK_REVIEWS.reduce((acc, curr) => acc + curr.rating, 0) / MOCK_REVIEWS.length).toFixed(1);

    return (
        <div className="flex flex-col h-full overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 shrink-0">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-12 h-12 flex items-center justify-center bg-orange-600 text-white rounded-2xl shadow-lg shrink-0">
                        <FaGoogle className="text-2xl" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-tech font-bold dark:text-white text-black uppercase tracking-tight">Avis Clients</h2>
                        <div className="flex items-center gap-2 text-sm font-mono text-neutral-500">
                            <span className="text-orange-500 font-bold text-lg">{averageRating}</span>
                            <div className="flex text-orange-500 text-xs">
                                {[...Array(5)].map((_, i) => (
                                    <FaStar key={i} className={i < Math.round(parseFloat(averageRating)) ? "text-orange-500" : "text-neutral-300 dark:text-neutral-700"} />
                                ))}
                            </div>
                            <span>({MOCK_REVIEWS.length} avis)</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {/* Store Filter */}
                    <div className="relative group">
                        <FaStore className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <select 
                            value={filterStore} 
                            onChange={(e) => setFilterStore(e.target.value)}
                            className="pl-9 pr-8 py-2 bg-white dark:bg-[#111] border dark:border-[#333] border-neutral-300 rounded-xl text-sm font-bold uppercase focus:border-orange-600 outline-none appearance-none cursor-pointer shadow-sm hover:bg-neutral-50 dark:hover:bg-[#1a1a1a] transition-colors min-w-[140px]"
                        >
                            <option value="All">Toutes Boutiques</option>
                            {stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Rating Filter */}
                    <div className="flex bg-white dark:bg-[#111] border dark:border-[#333] border-neutral-300 rounded-xl p-1 shadow-sm">
                        {[5, 4, 3, 2, 1].map(star => (
                            <button
                                key={star}
                                onClick={() => setFilterRating(filterRating === star ? null : star)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${filterRating === star ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-400 hover:text-orange-500 hover:bg-neutral-100 dark:hover:bg-[#222]'}`}
                                title={`${star} étoiles`}
                            >
                                <span className="font-bold text-xs">{star}</span>
                                <FaStar className="text-[8px] ml-0.5" />
                            </button>
                        ))}
                    </div>

                    {/* Image Filter */}
                    <button 
                        onClick={() => setFilterHasImage(!filterHasImage)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all shadow-sm ${filterHasImage ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white dark:bg-[#111] dark:border-[#333] border-neutral-300 text-neutral-500 hover:text-black dark:hover:text-white'}`}
                    >
                        <FaImage /> <span className="text-xs font-bold uppercase hidden md:inline">Avec Photos</span>
                    </button>

                    <button 
                        onClick={handleRefresh}
                        className={`p-2.5 bg-white dark:bg-[#111] border dark:border-[#333] border-neutral-300 rounded-xl hover:text-orange-600 transition-colors shadow-sm ${isRefreshing ? 'animate-spin text-orange-600' : 'text-neutral-500'}`}
                    >
                        <FaRotate />
                    </button>
                </div>
            </div>

            {/* Reviews Grid */}
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-10">
                    {filteredReviews.map(review => (
                        <div key={review.id} className="dark:bg-[#0a0a0a] bg-white rounded-2xl p-5 border dark:border-[#262626] border-neutral-200 shadow-sm hover:border-orange-600/30 transition-all group flex flex-col h-full">
                            {/* Review Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-[#222] dark:to-[#333] flex items-center justify-center font-bold text-neutral-600 dark:text-neutral-300 shadow-inner">
                                        {review.author.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm dark:text-white text-black">{review.author}</h3>
                                        <div className="flex items-center gap-1 text-xs text-neutral-500">
                                            <FaStore className="text-[10px]" />
                                            <span>{review.store}</span>
                                            <span className="mx-1">•</span>
                                            <span>{review.date}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-0.5 bg-orange-50 dark:bg-orange-900/10 px-2 py-1 rounded-lg border border-orange-100 dark:border-orange-900/20">
                                    <span className="font-bold text-orange-600 text-sm mr-1">{review.rating}</span>
                                    <FaStar className="text-orange-500 text-xs" />
                                </div>
                            </div>

                            {/* Review Text */}
                            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4 flex-1">
                                {review.text}
                            </p>

                            {/* Images Grid */}
                            {review.images && review.images.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t dark:border-[#222] border-neutral-100">
                                    {review.images.map((img, idx) => (
                                        <div key={idx} className="relative aspect-video rounded-lg overflow-hidden group/img cursor-pointer">
                                            <img src={img} alt="Review attachment" className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" />
                                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors"></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {/* Google Footer */}
                            <div className="mt-4 pt-3 border-t dark:border-[#222] border-neutral-100 flex items-center gap-2 opacity-50 grayscale group-hover:grayscale-0 transition-all">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" className="w-4 h-4" />
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Avis Google Certifié</span>
                            </div>
                        </div>
                    ))}
                </div>
                
                {filteredReviews.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-neutral-400 gap-4">
                        <FaFilter className="text-4xl opacity-20" />
                        <p className="font-tech uppercase tracking-widest">Aucun avis ne correspond aux filtres</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReviewsView;
