import { ContactItem } from '../types';

export const contacts: ContactItem[] = [
    {
        id: 'garanties',
        role: 'Garanties',
        icon: 'fa-shield-halved',
        email: 'central.distribuicao@iservices.pt',
        cc: 'Tiago.costa@iservices.pt + Pedro.brites@iservices.pt'
    },
    {
        id: 'coques',
        role: 'Coques',
        icon: 'fa-mobile-screen',
        email: 'central.distribuicao@iservices.pt',
        cc: 'Tiago.costa@iservices.pt + Joao.barbosa@iservices.pt'
    },
    {
        id: 'logistique',
        role: 'Logistique',
        icon: 'fa-truck-ramp-box',
        email: 'central.distribuicao@iservices.pt',
        cc: 'Tiago.costa@iservices.pt + Goncalo.delgado@iservices.pt'
    },
    {
        id: 'clients',
        role: 'Demandes des clients',
        icon: 'fa-users',
        phones: [
            { label: 'Téléphone général', number: '+351 21 013 6769' },
            { label: 'Pièces sur l\'heure', number: '+351 93 272 5399' }
        ],
        desc: 'Pour vous aider dans toute situation.'
    },
    {
        id: 'recond',
        role: 'Reconditionnés',
        icon: 'fa-rotate',
        email: 'seminovos@iservices.pt',
        cc: 'Maria.ferreira@iservices.pt',
        phones: [
             { label: 'Téléphone', number: '+351 21 013 2186' }
        ]
    },
    {
        id: 'conso',
        role: 'Consommables',
        icon: 'fa-box-open',
        email: 'consumiveis@iservices.pt',
        cc: 'Diogo.inverno@iservices.pt'
    },
    {
        id: 'stock_min_pieces',
        role: 'Stock minimum de pièces',
        icon: 'fa-microchip',
        email: 'jorge.almeida@iservices.pt',
        cc: 'Tiago.costa@iservices.pt + central.distribuicao@iservices.pt',
        desc: 'Exclusivement pour Jorge Almeida.\nSujet: STOCK MINIMO'
    },
    {
        id: 'stock_acc_coques',
        role: 'Stock d’accessoires et coques',
        icon: 'fa-shapes',
        email: 'planograma@iservices.pt',
        cc: 'Tiago.costa@iservices.pt + central.distribuicao@iservices.pt',
        desc: "Pour le stock minimum et les excédents d'accessoires.\nSujet: STOCK MINIMO\n\nImportant : Tous les excédents de stock doivent toujours être signalés au format Excel, avec des informations détaillées sur les références, les quantités et l'emplacement."
    },
    {
        id: 'vols',
        role: 'Signaler les Vols',
        icon: 'fa-triangle-exclamation',
        email: 'central.distribuicao@iservices.pt',
        cc: 'Tiago Costa + votre coordinateur de magasin',
        desc: "Objet : VOL\n\nSignalez immédiatement toute situation de vol avec tous les détails pertinents : date, heure, description du produit, circonstances et toute information pouvant aider à l'enquête."
    }
];