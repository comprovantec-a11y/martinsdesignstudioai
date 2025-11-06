import React from 'react';
import { useUser } from '../contexts/UserContext';
import { Plan } from '../types';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TickIcon = () => (
    <svg className="w-5 h-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);


const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
    const { user, changePlan } = useUser();

    if (!isOpen) return null;
    
    const plans = [
        {
            name: 'Gratuito',
            id: 'free' as Plan,
            price: 'R$0',
            description: 'Perfeito para experimentar as ferramentas.',
            features: [
                '3 Gerações de Imagem / dia',
                '3 Edições de Imagem / dia',
                '2 Aprimoramentos / dia',
                '1 Arte no Designer 24h / dia',
                'Download em resolução padrão'
            ]
        },
        {
            name: 'Criador',
            id: 'creator' as Plan,
            price: 'R$29,90',
            priceSuffix: '/ mês',
            description: 'Ideal para criadores de conteúdo e freelancers.',
            features: [
                '100 créditos de uso / mês',
                'Acesso a todas as ferramentas',
                'Download em alta resolução (Impressão)',
                'Sem marca d\'água'
            ]
        },
        {
            name: 'Profissional',
            id: 'pro' as Plan,
            price: 'R$79,90',
            priceSuffix: '/ mês',
            description: 'Uso ilimitado para agências e empresas.',
            features: [
                'Uso ILIMITADO de todas as ferramentas',
                'Download em alta resolução (Impressão)',
                'Suporte prioritário',
                'Acesso antecipado a novas funcionalidades'
            ]
        }
    ];

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl space-y-4" onClick={e => e.stopPropagation()}>
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white">Nossos Planos</h2>
                    <p className="text-gray-400 mt-2">Escolha o plano que melhor se adapta às suas necessidades.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    {plans.map(plan => (
                        <div key={plan.id} className={`bg-gray-900/50 rounded-lg p-6 flex flex-col border-2 ${user.plan === plan.id ? 'border-indigo-500' : 'border-gray-700'}`}>
                            <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                            <p className="text-gray-400 mt-2 flex-grow">{plan.description}</p>
                            <p className="mt-6">
                                <span className="text-4xl font-bold text-white">{plan.price}</span>
                                {plan.priceSuffix && <span className="text-gray-400">{plan.priceSuffix}</span>}
                            </p>
                            <ul className="mt-6 space-y-3 text-sm text-gray-300">
                                {plan.features.map(feature => (
                                    <li key={feature} className="flex items-center gap-2">
                                        <TickIcon />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button 
                                onClick={() => changePlan(plan.id)}
                                disabled={user.plan === plan.id}
                                className={`mt-8 w-full py-2 px-4 rounded-lg font-semibold transition-colors ${user.plan === plan.id ? 'bg-gray-600 text-gray-400 cursor-default' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                            >
                                {user.plan === plan.id ? 'Plano Atual' : 'Selecionar Plano'}
                            </button>
                        </div>
                    ))}
                </div>
                 <div className="text-center pt-4">
                     <button onClick={onClose} className="text-gray-400 hover:text-white">Fechar</button>
                 </div>
            </div>
        </div>
    );
};

export default SubscriptionModal;
