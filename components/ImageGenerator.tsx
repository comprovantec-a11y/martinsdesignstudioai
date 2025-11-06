import React, { useState } from 'react';
import { AspectRatio } from '../types';
import { generateImage, enhancePrompt } from '../services/geminiService';
import { getImageDimensions } from '../utils';
import ImageDisplay from './ImageDisplay';
import Spinner from './Spinner';
import DownloadModal from './DownloadModal';
import { useUser } from '../contexts/UserContext';

// --- Ícones ---
const CinematicIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 4h16v16H4V4z" />
    </svg>
);
const PhotorealisticIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const UltraRealisticIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
    </svg>
);
const FantasyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);
const AnimeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);
const GenerateIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);
const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);
const AutoFramingIcon: React.FC = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4V4z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-4-4h8" /><path strokeLinecap="round" strokeLinejoin="round" d="M17.5 6.5l-3.5 3.5m0-3.5l3.5 3.5" /></svg>);
const CloseupIcon: React.FC = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 10L6 6" /></svg>);
const WideShotIcon: React.FC = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>);
const ObjectFocusIcon: React.FC = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>);


// --- Sub-componentes ---
const AspectRatioSelector: React.FC<{ selected: AspectRatio; onSelect: (ratio: AspectRatio) => void }> = ({ selected, onSelect }) => {
    const ratios: { value: AspectRatio; iconClass: string }[] = [
        { value: '1:1', iconClass: 'w-10 h-10' }, { value: '16:9', iconClass: 'w-16 h-9' }, { value: '9:16', iconClass: 'w-9 h-16' }, { value: '4:3', iconClass: 'w-12 h-9' }, { value: '3:4', iconClass: 'w-9 h-12' },
    ];
    return (
        <div className="flex items-end justify-center gap-3">
            {ratios.map(({ value, iconClass }) => (
                <div key={value} className="flex flex-col items-center gap-2">
                    <button onClick={() => onSelect(value)} className={`bg-gray-700 rounded-md p-1 transition-all duration-200 ${selected === value ? 'ring-2 ring-indigo-500' : 'hover:bg-gray-600'}`} aria-label={`Proporção ${value}`}>
                        <div className={`${iconClass} bg-gray-500 rounded-sm`}></div>
                    </button>
                    <span className={`text-xs ${selected === value ? 'text-white' : 'text-gray-400'}`}>{value}</span>
                </div>
            ))}
        </div>
    );
};

interface Style { name: string; icon: React.ReactNode; }
const styles: Style[] = [
    { name: "Cinemático", icon: <CinematicIcon /> }, { name: "Fotorrealista", icon: <PhotorealisticIcon /> }, { name: "Ultra Realista", icon: <UltraRealisticIcon /> }, { name: "Fantasia", icon: <FantasyIcon /> }, { name: "Anime", icon: <AnimeIcon /> },
];

type FramingOption = "Automático" | "Close-up / Detalhe" | "Plano Aberto / Ambiente" | "Objeto em Foco";
const framingOptions: { name: FramingOption, icon: React.ReactNode }[] = [
    { name: "Automático", icon: <AutoFramingIcon /> }, { name: "Close-up / Detalhe", icon: <CloseupIcon /> }, { name: "Plano Aberto / Ambiente", icon: <WideShotIcon /> }, { name: "Objeto em Foco", icon: <ObjectFocusIcon /> }
];

const ImageGenerator: React.FC = () => {
    const { user, consumeUsage } = useUser();
    const [basePrompt, setBasePrompt] = useState<string>('');
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
    const [customStyle, setCustomStyle] = useState<string>('');
    const [isCustomStyleActive, setIsCustomStyleActive] = useState<boolean>(false);
    const [framing, setFraming] = useState<FramingOption>("Automático");
    
    const [enhancedPrompt, setEnhancedPrompt] = useState<string>('');
    const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [optimizeForPrint, setOptimizeForPrint] = useState<boolean>(false);
    const [printQuality, setPrintQuality] = useState<'300' | '600'>('300');
    
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);

    const isUsageLimitReached = user.plan === 'free' && user.usage.generate <= 0;

    const handleStyleSelect = (style: string) => {
        setSelectedStyle(style);
        setIsCustomStyleActive(false);
        setCustomStyle('');
    };

    const handleToggleCustomInput = () => {
        setIsCustomStyleActive(true);
        setSelectedStyle(null);
    };
    
    const handleGenerate = async () => {
        if (isUsageLimitReached) {
            setError('Você atingiu seu limite diário de gerações. Faça um upgrade para continuar criando.');
            return;
        }
        if (!basePrompt) {
            setError('Por favor, insira um prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setActiveImage(null);
        setEnhancedPrompt('');

        let finalStyle = selectedStyle;
        if (isCustomStyleActive && customStyle.trim()) {
            finalStyle = customStyle.trim();
        }

        const promptForEnhancement = finalStyle 
            ? `${basePrompt} no estilo ${finalStyle}` 
            : basePrompt;

        setIsEnhancingPrompt(true);
        const newlyEnhancedPrompt = await enhancePrompt(promptForEnhancement, framing);
        setEnhancedPrompt(newlyEnhancedPrompt);
        setIsEnhancingPrompt(false);
        
        try {
            const imageUrl = await generateImage(newlyEnhancedPrompt, aspectRatio);
            setActiveImage(imageUrl);
            setHistory(prev => [imageUrl, ...prev].slice(0, 5));
            consumeUsage('generate');
        } catch (e: any) {
            setError(e.message || 'Ocorreu um erro inesperado.');
        } finally {
            setIsLoading(false);
        }
    };

    const openDownloadModal = async () => {
        if (!activeImage) return;
        try {
            const dims = await getImageDimensions(activeImage);
            setImageDimensions(dims);
            setIsDownloadModalOpen(true);
        } catch (e) {
            setError("Não foi possível ler as dimensões da imagem para download.");
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 md:p-8 max-w-5xl mx-auto">
            <div className="space-y-6">
                <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">1. Descreva sua ideia</label>
                    <textarea
                        id="prompt" rows={3}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                        placeholder="Ex: um leão majestoso com uma coroa" value={basePrompt} onChange={(e) => setBasePrompt(e.target.value)}
                    />
                </div>
                
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">2. Adicione um Estilo (Opcional)</label>
                    <div className="flex flex-wrap gap-2 items-center">
                        {styles.map(style => (
                            <button key={style.name} onClick={() => handleStyleSelect(style.name)}
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${selectedStyle === style.name ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                                aria-label={`Aplicar estilo ${style.name}`}
                            > {style.icon} {style.name} </button>
                        ))}
                        <button onClick={handleToggleCustomInput}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isCustomStyleActive ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                        > 🎨 Outro... </button>
                    </div>
                    {isCustomStyleActive && (
                        <div className="mt-3">
                            <input type="text"
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                placeholder="Descreva o seu estilo aqui (ex: arte em aquarela, vaporwave)"
                                value={customStyle} onChange={(e) => setCustomStyle(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">3. Enquadramento</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                         {framingOptions.map(option => (
                            <button
                                key={option.name}
                                onClick={() => setFraming(option.name)}
                                className={`flex flex-col items-center justify-center text-center gap-2 p-3 rounded-lg transition-colors ${framing === option.name ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                                aria-label={`Enquadramento: ${option.name}`}
                            >
                                {option.icon}
                                <span className="text-xs font-medium">{option.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">4. Escolha a Proporção</label>
                    <AspectRatioSelector selected={aspectRatio} onSelect={setAspectRatio} />
                </div>
                
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">5. Otimização (Opcional)</label>
                    <div className="bg-gray-700 rounded-lg p-3">
                        <div className="flex items-center">
                            <input id="optimize-print-generate" type="checkbox" checked={optimizeForPrint} onChange={(e) => setOptimizeForPrint(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500" />
                            <label htmlFor="optimize-print-generate" className="ml-3 block text-sm font-medium text-white">
                                Otimizar para Impressão
                            </label>
                        </div>
                    </div>
                    
                    {optimizeForPrint && (
                        <div className="mt-4 pl-4 border-l-2 border-gray-600">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Qualidade de Impressão</label>
                             <div className="flex flex-col gap-2">
                                <label className="flex items-center text-sm text-gray-200 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="print-quality-generate"
                                        value="300"
                                        checked={printQuality === '300'}
                                        onChange={() => setPrintQuality('300')}
                                        className="h-4 w-4 text-indigo-600 bg-gray-800 border-gray-600 focus:ring-indigo-500"
                                    />
                                    <span className="ml-2">Padrão (300 DPI) - Resolução 2x Maior</span>
                                </label>
                                 <label className="flex items-center text-sm text-gray-200 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="print-quality-generate"
                                        value="600"
                                        checked={printQuality === '600'}
                                        onChange={() => setPrintQuality('600')}
                                        className="h-4 w-4 text-indigo-600 bg-gray-800 border-gray-600 focus:ring-indigo-500"
                                    />
                                    <span className="ml-2">Máxima (600 DPI) - Resolução 4x Maior</span>
                                </label>
                            </div>
                        </div>
                    )}
                     <p className="text-xs text-gray-400 mt-2">
                       Aumenta a resolução da imagem para impressão em grandes formatos. Pode levar mais tempo para processar e baixar.
                    </p>
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}
                
                {isEnhancingPrompt && (
                    <div className="flex items-center justify-center gap-2 p-2 bg-gray-700/50 rounded-lg">
                        <Spinner />
                        <span className="text-sm text-gray-300">Aprimorando seu prompt...</span>
                    </div>
                )}
                
                {enhancedPrompt && !isLoading && (
                    <div>
                         <label className="block text-sm font-medium text-gray-400 mb-2">Prompt Aprimorado (usado para gerar):</label>
                         <p className="text-sm text-gray-300 bg-gray-700/50 p-3 rounded-lg border border-gray-600">{enhancedPrompt}</p>
                    </div>
                )}

                <button
                    onClick={handleGenerate} disabled={isLoading || isUsageLimitReached}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                    {isLoading ? (isEnhancingPrompt ? 'Aprimorando...' : 'Gerando Imagem...') : 'Gerar Imagem'}
                </button>
                 {isUsageLimitReached && (
                    <p className="text-yellow-400 text-sm text-center mt-2">
                        Você atingiu seu limite diário de {user.usage.generate}/{user.usage.generate} gerações. Faça upgrade para continuar.
                    </p>
                )}
            </div>

            <div className="mt-8">
                <ImageDisplay
                    title="Imagem Gerada" imageUrl={activeImage} isLoading={isLoading && !isEnhancingPrompt} aspectRatio={aspectRatio}
                    placeholder={<><GenerateIcon /><p className="mt-2">Sua imagem gerada aparecerá aqui</p></>}
                />
                 {activeImage && !isLoading && (
                    <button
                        onClick={openDownloadModal}
                        className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                    >
                        <DownloadIcon />
                        Baixar Imagem
                    </button>
                )}
            </div>
            
            {history.length > 0 && (
                 <div className="mt-10 border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-gray-300 mb-4 text-center">Histórico Recente</h3>
                    <div className="grid grid-cols-5 gap-3">
                        {history.map((imgSrc, index) => (
                            <button 
                                key={index} onClick={() => setActiveImage(imgSrc)}
                                className={`aspect-square bg-gray-700 rounded-lg overflow-hidden focus:outline-none transition-all duration-200 ${activeImage === imgSrc ? 'ring-4 ring-indigo-500' : 'ring-2 ring-transparent hover:ring-gray-500'}`}
                            >
                                <img src={imgSrc} alt={`Histórico ${index + 1}`} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {activeImage && imageDimensions && (
                <DownloadModal
                    isOpen={isDownloadModalOpen}
                    onClose={() => setIsDownloadModalOpen(false)}
                    imageBase64={activeImage}
                    initialWidth={imageDimensions.width}
                    initialHeight={imageDimensions.height}
                    isPrintOptimized={optimizeForPrint}
                    printQuality={printQuality}
                />
            )}
        </div>
    );
};

export default ImageGenerator;
