import React, { useState, useEffect, useRef } from 'react';
import { generateDesignBrief, generateImage, analyzeAndClarifyBrief, ClarificationQuestion } from '../services/geminiService';
import { DesignBrief, TextElement, ImageElement, LayoutElement, AspectRatio, SavedTemplate, TemplateSettings } from '../types';
import Spinner from './Spinner';
import { fileToBase64, getImageDimensions } from '../utils';
import DownloadModal from './DownloadModal';
import { useUser } from '../contexts/UserContext';

// --- Ícones ---
const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);
const ResultPlaceholderIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);
const AspectRatioSelector: React.FC<{ selected: AspectRatio; onSelect: (ratio: AspectRatio) => void; disabled?: boolean }> = ({ selected, onSelect, disabled }) => {
    const ratios: { value: AspectRatio; iconClass: string }[] = [
        { value: '1:1', iconClass: 'w-10 h-10' }, { value: '16:9', iconClass: 'w-16 h-9' }, { value: '9:16', iconClass: 'w-9 h-16' }, { value: '4:3', iconClass: 'w-12 h-9' }, { value: '3:4', iconClass: 'w-9 h-12' },
    ];
    return (
        <div className="flex items-end justify-center gap-3">
            {ratios.map(({ value, iconClass }) => (
                <div key={value} className="flex flex-col items-center gap-2">
                    <button onClick={() => onSelect(value)} disabled={disabled} className={`bg-gray-700 rounded-md p-1 transition-all duration-200 ${selected === value ? 'ring-2 ring-indigo-500' : 'hover:bg-gray-600'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} aria-label={`Proporção ${value}`}>
                        <div className={`${iconClass} bg-gray-500 rounded-sm`}></div>
                    </button>
                    <span className={`text-xs ${selected === value ? 'text-white' : 'text-gray-400'} ${disabled ? 'text-gray-500' : ''}`}>{value}</span>
                </div>
            ))}
        </div>
    );
};

// --- Constantes ---
const FONT_OPTIONS = [
    { name: 'Anton', css: 'Anton, sans-serif' },
    { name: 'Bebas Neue', css: 'Bebas Neue, cursive' },
    { name: 'Caveat', css: 'Caveat, cursive' },
    { name: 'Lato', css: 'Lato, sans-serif' },
    { name: 'Lobster', css: 'Lobster, cursive' },
    { name: 'Merriweather', css: 'Merriweather, serif' },
    { name: 'Montserrat', css: 'Montserrat, sans-serif' },
    { name: 'Oswald', css: 'Oswald, sans-serif' },
    { name: 'Pacifico', css: 'Pacifico, cursive' },
    { name: 'Playfair Display', css: 'Playfair Display, serif' },
    { name: 'Poppins', css: 'Poppins, sans-serif' },
    { name: 'Roboto', css: 'Roboto, sans-serif' },
    { name: 'Source Sans Pro', css: 'Source Sans Pro, sans-serif' },
];

const FONT_OPTIONS_WITH_AI = [{ name: 'Fonte escolhida pela IA', css: 'ai-choice' }, ...FONT_OPTIONS];


const ProfessionalDesigner: React.FC = () => {
    const { user, consumeUsage } = useUser();
    // --- State Management ---
    const [conversationState, setConversationState] = useState<'initial' | 'clarifying' | 'generating' | 'result'>('initial');
    
    // Briefing state
    const [initialPrompt, setInitialPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [isCustomSize, setIsCustomSize] = useState(false);
    const [customWidth, setCustomWidth] = useState('');
    const [customHeight, setCustomHeight] = useState('');
    const [customUnit, setCustomUnit] = useState<'px' | 'pol.' | 'mm' | 'cm'>('px');
    const [optimizationTarget, setOptimizationTarget] = useState<'social' | 'print'>('social');
    const [printQuality, setPrintQuality] = useState<'300' | '600'>('300');
    const [fontFamily, setFontFamily] = useState<string>('ai-choice');
    
    const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarificationQuestion[]>([]);
    const [userAnswers, setUserAnswers] = useState<{[key: string]: string}>({});
    const [userImage, setUserImage] = useState<{file: File, base64: string} | null>(null);
    const userImageFileInputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    // Generation state
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [lastUsedBrief, setLastUsedBrief] = useState('');
    
    // Result state
    const [designBrief, setDesignBrief] = useState<DesignBrief | null>(null);
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
    const [resultAspectRatio, setResultAspectRatio] = useState<number>(1);
    const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
    const [backgroundPrompt, setBackgroundPrompt] = useState('');
    
    // Download Modal State
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);

    // Template State
    const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
    const [loadedTemplateName, setLoadedTemplateName] = useState<string | null>(null);
    const [lastLoadedTemplate, setLastLoadedTemplate] = useState<SavedTemplate | null>(null);

    const isUsageLimitReached = user.plan === 'free' && user.usage.designer <= 0;

    // --- Effects ---
    useEffect(() => {
        if (chatContainerRef.current) {
             setTimeout(() => {
                chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
             }, 100);
        }
    }, [clarifyingQuestions, userAnswers]);
    
    useEffect(() => {
        if (designBrief) {
            setBackgroundPrompt(designBrief.imagePrompt);
        }
    }, [designBrief]);
    
    // Load templates from localStorage on mount
    useEffect(() => {
        try {
            const storedTemplates = localStorage.getItem('martins-design-templates');
            if (storedTemplates) {
                setSavedTemplates(JSON.parse(storedTemplates));
            }
        } catch (error) {
            console.error("Failed to load templates from localStorage", error);
        }
    }, []);

    // Save templates to localStorage on change
    useEffect(() => {
        try {
            localStorage.setItem('martins-design-templates', JSON.stringify(savedTemplates));
        } catch (error) {
            console.error("Failed to save templates to localStorage", error);
        }
    }, [savedTemplates]);


    // --- Core Logic ---
    const handleStartConsultation = async () => {
        if (isUsageLimitReached) {
            setError('Você atingiu seu limite diário de criações no Designer 24h. Faça um upgrade para continuar.');
            return;
        }
        if (!initialPrompt.trim()) {
            setError("Por favor, descreva o que você precisa criar.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setLoadingStep("Analisando seu pedido...");
        
        setConversationState('clarifying'); 

        try {
            const questions = await analyzeAndClarifyBrief(initialPrompt);
            
            if (questions.length > 0) {
                setClarifyingQuestions(questions);
            } else {
                setClarifyingQuestions([{ 
                    question: "Seu pedido está bem claro! Se quiser, pode pedir algum ajuste ou clicar em 'Gerar Arte' para começar.", 
                    options: [] 
                }]);
            }
        } catch (e: any) {
            setError(e.message);
            setConversationState('initial');
        } finally {
            setIsLoading(false);
            setLoadingStep('');
        }
    };
    
    const handleAnswerSelect = (question: string, answer: string) => {
        setUserAnswers(prev => ({...prev, [question]: answer}));
    };

    const handleGenerate = async (finalBriefOverride?: string) => {
        if (isUsageLimitReached) {
            setError('Você atingiu seu limite diário de criações no Designer 24h. Faça um upgrade para continuar.');
            return;
        }

        let fullBrief = finalBriefOverride || lastUsedBrief;
        if (finalBriefOverride) {
            setLastUsedBrief(finalBriefOverride);
            setLoadedTemplateName(null); 
            setLastLoadedTemplate(null);
        } else if (lastLoadedTemplate) {
            // This is a "Generate New" from a template
            await handleLoadTemplate(lastLoadedTemplate, true);
            return;
        }

        if (!fullBrief.trim()) {
            setError("Por favor, descreva sua ideia para começar.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setDesignBrief(null);
        setBackgroundImage(null);
        setConversationState('generating');

        try {
            setLoadingStep('Criando plano de design com o Diretor de Arte AI...');
            const briefConfig = {
                fullBrief,
                userImageBase64: userImage?.base64,
                fontFamily,
                optimization: {
                    target: optimizationTarget,
                    ...(optimizationTarget === 'print' && { dpi: printQuality })
                },
                ... (isCustomSize && customWidth && customHeight
                    ? { customSize: { width: Number(customWidth), height: Number(customHeight), unit: customUnit } }
                    : { aspectRatio: aspectRatio }
                )
            };

            const brief = await generateDesignBrief(briefConfig);
            setDesignBrief(brief);

            setLoadingStep('Gerando a arte de fundo com o Artista Visual AI...');
            
            let finalAspectRatio: AspectRatio;
            let finalNumericAspectRatio: number;

            if (isCustomSize && customWidth && customHeight) {
                finalNumericAspectRatio = Number(customWidth) / Number(customHeight);
            } else {
                const [w, h] = aspectRatio.split(':').map(Number);
                finalNumericAspectRatio = w / h;
            }
            setResultAspectRatio(finalNumericAspectRatio);

            const standardRatios: { ratio: AspectRatio; value: number }[] = [ { ratio: '1:1', value: 1 }, { ratio: '16:9', value: 16 / 9 }, { ratio: '9:16', value: 9 / 16 }, { ratio: '4:3', value: 4 / 3 }, { ratio: '3:4', value: 3 / 4 }];
            finalAspectRatio = standardRatios.reduce((prev, curr) => Math.abs(curr.value - finalNumericAspectRatio) < Math.abs(prev.value - finalNumericAspectRatio) ? curr : prev).ratio;
            
            const bgImage = await generateImage(brief.imagePrompt, finalAspectRatio);
            setBackgroundImage(bgImage);
            setConversationState('result');
            consumeUsage('designer');

        } catch (e: any) {
            setError(e.message);
            setConversationState('initial');
        } finally {
            setIsLoading(false);
            setLoadingStep('');
        }
    };

    const handleReset = () => {
        setConversationState('initial');
        setInitialPrompt('');
        setAspectRatio('1:1');
        setIsCustomSize(false);
        setCustomWidth('');
        setCustomHeight('');
        setCustomUnit('px');
        setOptimizationTarget('social');
        setPrintQuality('300');
        setFontFamily('ai-choice');
        setClarifyingQuestions([]);
        setUserAnswers({});
        if (userImageFileInputRef.current) {
            userImageFileInputRef.current.value = "";
        }
        setUserImage(null);
        setIsLoading(false);
        setLoadingStep('');
        setError(null);
        setDesignBrief(null);
        setBackgroundImage(null);
        setLastUsedBrief('');
        setLoadedTemplateName(null);
        setLastLoadedTemplate(null);
    };
    
    const handleGenerateNewBackground = async () => {
        if (!backgroundPrompt.trim()) {
            setError('Por favor, insira um prompt para o fundo.');
            return;
        }
        setIsGeneratingBackground(true);
        setError(null);

        try {
            const standardRatios: { ratio: AspectRatio; value: number }[] = [ { ratio: '1:1', value: 1 }, { ratio: '16:9', value: 16 / 9 }, { ratio: '9:16', value: 9 / 16 }, { ratio: '4:3', value: 4 / 3 }, { ratio: '3:4', value: 3 / 4 }];
            const finalAspectRatio = standardRatios.reduce((prev, curr) => Math.abs(curr.value - resultAspectRatio) < Math.abs(prev.value - resultAspectRatio) ? curr : prev).ratio;

            const newBgImage = await generateImage(backgroundPrompt, finalAspectRatio);
            setBackgroundImage(newBgImage);
            if (designBrief) {
                setDesignBrief({ ...designBrief, imagePrompt: backgroundPrompt });
            }
        } catch (e: any) {
            setError(e.message || 'Falha ao gerar o novo fundo.');
        } finally {
            setIsGeneratingBackground(false);
        }
    };
    
    const openDownloadModal = async () => {
         if (!backgroundImage) return;
        try {
            const dims = await getImageDimensions(backgroundImage);
            setImageDimensions(dims);
            setIsDownloadModalOpen(true);
        } catch (e: any) {
            setError("Não foi possível ler as dimensões da imagem para download.");
        }
    };
    
    const handleUserImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                setUserImage({ file, base64 });
            } catch (err) {
                setError("Falha ao ler o arquivo de imagem.");
            }
        }
    };
    
    // --- Template Handlers ---
    const handleSaveTemplate = () => {
        if (!designBrief) return;

        const name = prompt("Digite um nome para o seu template:");
        if (!name || !name.trim()) {
            return;
        }

        const currentSettings: TemplateSettings = {
            aspectRatio, isCustomSize, customWidth, customHeight, customUnit, optimizationTarget, printQuality, fontFamily,
        };
        
        const newTemplate: SavedTemplate = {
            id: new Date().toISOString(),
            name: name.trim(),
            brief: designBrief,
            settings: currentSettings
        };
        
        setSavedTemplates(prev => [...prev, newTemplate]);
    };

    const handleLoadTemplate = async (template: SavedTemplate, isRegeneration = false) => {
        if (isUsageLimitReached && !isRegeneration) {
            setError('Você atingiu seu limite diário de criações no Designer 24h. Faça um upgrade para continuar.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setConversationState('generating');
        
        if (!isRegeneration) {
            setLoadedTemplateName(template.name);
            setLastLoadedTemplate(template);
        }
        
        const { settings, brief } = template;
        setAspectRatio(settings.aspectRatio);
        setIsCustomSize(settings.isCustomSize);
        setCustomWidth(settings.customWidth);
        setCustomHeight(settings.customHeight);
        setCustomUnit(settings.customUnit);
        setOptimizationTarget(settings.optimizationTarget);
        setPrintQuality(settings.printQuality);
        setFontFamily(settings.fontFamily || 'ai-choice');
        
        setDesignBrief(brief);

        try {
            setLoadingStep('Gerando novo fundo com base no template...');
            
            let finalAspectRatio: AspectRatio;
            let finalNumericAspectRatio: number;

            if (settings.isCustomSize && settings.customWidth && settings.customHeight) {
                finalNumericAspectRatio = Number(settings.customWidth) / Number(settings.customHeight);
            } else {
                const [w, h] = settings.aspectRatio.split(':').map(Number);
                finalNumericAspectRatio = w / h;
            }
            setResultAspectRatio(finalNumericAspectRatio);

            const standardRatios: { ratio: AspectRatio; value: number }[] = [ { ratio: '1:1', value: 1 }, { ratio: '16:9', value: 16 / 9 }, { ratio: '9:16', value: 9 / 16 }, { ratio: '4:3', value: 4 / 3 }, { ratio: '3:4', value: 3 / 4 }];
            finalAspectRatio = standardRatios.reduce((prev, curr) => Math.abs(curr.value - finalNumericAspectRatio) < Math.abs(prev.value - finalNumericAspectRatio) ? curr : prev).ratio;

            const bgImage = await generateImage(brief.imagePrompt, finalAspectRatio);
            setBackgroundImage(bgImage);
            setConversationState('result');
            if (!isRegeneration) {
                consumeUsage('designer');
            }

        } catch (e: any) {
            setError(e.message);
            setConversationState('initial');
        } finally {
            setIsLoading(false);
            setLoadingStep('');
        }
    };
    
    const handleDeleteTemplate = (templateId: string) => {
        if (window.confirm("Tem certeza que deseja excluir este template?")) {
            setSavedTemplates(prev => prev.filter(t => t.id !== templateId));
        }
    };


    const questionsWithOptions = clarifyingQuestions.filter(q => q.options && q.options.length > 0);
    const isReadyToGenerateInChat = Object.keys(userAnswers).length === questionsWithOptions.length;

    // --- Render Methods ---
    
    const renderChatMessages = () => (
        <div ref={chatContainerRef} className="flex-grow space-y-4 p-4 overflow-y-auto">
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">🎨</div>
                <div className="bg-gray-700 rounded-lg p-3 text-white max-w-lg">
                    <p>Olá! Sou seu designer pessoal. Para começar, farei algumas perguntas para entender melhor o que você precisa.</p>
                </div>
            </div>
            {initialPrompt && (
                 <div className="flex items-start gap-3 justify-end">
                    <div className="bg-indigo-600 rounded-lg p-3 text-white max-w-lg"><p>{initialPrompt}</p></div>
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">👤</div>
                </div>
            )}
            {clarifyingQuestions.map((q, qIndex) => (
                <div key={qIndex} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">🎨</div>
                    <div className="bg-gray-700 rounded-lg p-3 text-white max-w-lg space-y-2">
                        <p>{q.question}</p>
                        {userAnswers[q.question] ? (
                             <p className="font-bold text-indigo-300">Sua escolha: {userAnswers[q.question]}</p>
                        ) : (
                           q.options.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {q.options.map(opt => (
                                        <button key={opt} onClick={() => handleAnswerSelect(q.question, opt)} className="bg-gray-600 hover:bg-indigo-500 text-sm px-3 py-1 rounded-full transition-colors">{opt}</button>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
    
    const renderBriefingPanel = () => {
        // Renders the chat view ONLY when in 'clarifying' state
        if (conversationState === 'clarifying') {
             return (
                <div className="lg:col-span-1 h-full flex flex-col">
                    <h3 className="text-xl font-semibold border-b border-gray-700 pb-2 mb-4 p-4">Consultor de Design</h3>
                    {renderChatMessages()}
                    <div className="p-4 border-t border-gray-700 space-y-3">
                        {conversationState === 'clarifying' && (
                            <button onClick={() => handleGenerate()} disabled={isLoading || (questionsWithOptions.length > 0 && !isReadyToGenerateInChat)} className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center">
                                {isLoading ? <Spinner /> : (questionsWithOptions.length > 0 ? "Gerar Arte com Base nas Respostas" : "Gerar Arte")}
                            </button>
                        )}
                    </div>
                    {error && <p className="text-red-400 text-sm p-4">{error}</p>}
                </div>
            );
        }

        // Renders the form view for 'initial', 'generating', and 'result' states
        const isFormDisabled = conversationState === 'generating' || conversationState === 'result';
        
        return (
            <div className="lg:col-span-1 h-full flex flex-col bg-gray-800 p-4 border-r border-gray-700">
                <h3 className="text-xl font-semibold mb-2">Meu Designer 24h</h3>
                <p className="text-gray-400 text-sm mb-4">
                    Descreva sua ideia, ajuste as opções e gere uma arte profissional em segundos.
                </p>
                
                <div className="flex-grow space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                    <div>
                        <label htmlFor="designer-prompt" className="block text-sm font-medium text-gray-300 mb-2">1. Descreva sua ideia</label>
                        <textarea id="designer-prompt" value={initialPrompt} onChange={e => setInitialPrompt(e.target.value)} rows={4} placeholder="Ex: um post para Instagram sobre o lançamento de um novo tênis de corrida, com uma vibe futurista." className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500" disabled={isFormDisabled}/>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">2. Proporção</label>
                        <AspectRatioSelector selected={aspectRatio} onSelect={setAspectRatio} disabled={isFormDisabled || isCustomSize} />
                        <button onClick={() => setIsCustomSize(!isCustomSize)} className={`mt-3 w-full text-sm py-2 rounded-lg ${isCustomSize ? 'bg-indigo-600' : 'bg-gray-600 hover:bg-gray-500'}`} disabled={isFormDisabled}>Tamanho Personalizado (BETA)</button>
                         {isCustomSize && (
                            <div className="mt-3 p-3 bg-gray-900/50 rounded-lg space-y-2 border border-indigo-500/50">
                                 <p className="text-xs text-indigo-300 text-center">A IA entregará a arte na medida aproximada.</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <div><label className="text-xs text-gray-400">Largura</label><input type="number" value={customWidth} onChange={e => setCustomWidth(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md text-sm" disabled={isFormDisabled}/></div>
                                    <div><label className="text-xs text-gray-400">Altura</label><input type="number" value={customHeight} onChange={e => setCustomHeight(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md text-sm" disabled={isFormDisabled}/></div>
                                    <div><label className="text-xs text-gray-400">Unidades</label><select value={customUnit} onChange={e => setCustomUnit(e.target.value as any)} className="w-full bg-gray-700 p-2 rounded-md text-sm" disabled={isFormDisabled}><option>px</option><option>pol.</option><option>mm</option><option>cm</option></select></div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">3. Upload do Logo ou Imagem de Produto</label>
                         <input ref={userImageFileInputRef} type="file" onChange={handleUserImageUpload} accept="image/*" className="hidden" />
                        <button onClick={() => userImageFileInputRef.current?.click()} className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700/50 hover:border-gray-500 transition" disabled={isFormDisabled}>
                            <UploadIcon /> {userImage ? `Arquivo: ${userImage.file.name}` : "Clique para enviar uma imagem"}
                        </button>
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">4. Escolha a Fonte (Opcional)</label>
                        <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500" disabled={isFormDisabled}>
                            {FONT_OPTIONS_WITH_AI.map(font => (
                                <option key={font.css} value={font.css} style={{ fontFamily: font.css }}>
                                    {font.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">5. Otimização</label>
                         <div className="flex bg-gray-700 rounded-lg p-1">
                            <button onClick={() => setOptimizationTarget('social')} className={`w-1/2 py-2 text-sm rounded-md ${optimizationTarget === 'social' ? 'bg-indigo-600' : ''}`} disabled={isFormDisabled}>Mídias Sociais</button>
                            <button onClick={() => setOptimizationTarget('print')} className={`w-1/2 py-2 text-sm rounded-md ${optimizationTarget === 'print' ? 'bg-indigo-600' : ''}`} disabled={isFormDisabled}>Impressão</button>
                        </div>
                        {optimizationTarget === 'print' && (
                            <div className="mt-3 pl-3 border-l-2 border-gray-600">
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center text-sm text-gray-200 cursor-pointer"><input type="radio" name="print-quality" value="300" checked={printQuality === '300'} onChange={() => setPrintQuality('300')} className="h-4 w-4 text-indigo-600 bg-gray-800 border-gray-600 focus:ring-indigo-500" disabled={isFormDisabled}/><span className="ml-2">Padrão (300 DPI)</span></label>
                                    <label className="flex items-center text-sm text-gray-200 cursor-pointer"><input type="radio" name="print-quality" value="600" checked={printQuality === '600'} onChange={() => setPrintQuality('600')} className="h-4 w-4 text-indigo-600 bg-gray-800 border-gray-600 focus:ring-indigo-500" disabled={isFormDisabled}/><span className="ml-2">Máxima (600 DPI)</span></label>
                                </div>
                            </div>
                        )}
                    </div>

                    {savedTemplates.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Meus Templates</label>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar border-t border-gray-700 pt-3">
                                {savedTemplates.map(template => (
                                    <div key={template.id} className="bg-gray-700 p-2 rounded-lg flex justify-between items-center transition-all hover:bg-gray-600">
                                        <span className="text-sm font-medium">{template.name}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleLoadTemplate(template)} className="bg-indigo-600 hover:bg-indigo-500 text-xs px-3 py-1 rounded font-semibold" disabled={isFormDisabled}>Usar</button>
                                            <button onClick={() => handleDeleteTemplate(template.id)} className="bg-red-600 hover:bg-red-500 text-white text-xs px-2 py-1 rounded font-bold" disabled={isFormDisabled}>X</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="pt-4 border-t border-gray-700 space-y-2">
                     {error && <p className="text-red-400 text-sm mb-2 text-center">{error}</p>}
                     {conversationState === 'initial' && (
                         <>
                            <button onClick={() => handleGenerate(initialPrompt)} disabled={!initialPrompt.trim() || isLoading || isUsageLimitReached} className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center text-base">
                                {isLoading ? <><Spinner /> <span className="ml-2">{loadingStep}</span></> : "⚡ GERAR ARTE RÁPIDA"}
                            </button>
                            {isUsageLimitReached && (
                                <p className="text-yellow-400 text-xs text-center">
                                    Você atingiu seu limite diário. Faça upgrade para continuar.
                                </p>
                            )}
                            <button onClick={handleStartConsultation} disabled={!initialPrompt.trim() || isLoading || isUsageLimitReached} className="w-full bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 font-medium py-2 px-4 rounded-lg flex items-center justify-center text-sm">
                                {isLoading ? "Analisando..." : "Falar com o Designer"}
                            </button>
                        </>
                     )}
                     {conversationState === 'generating' && (
                        <p className="text-center text-gray-400 animate-pulse">Gerando sua arte profissional...</p>
                     )}
                     {conversationState === 'result' && (
                        <p className="text-center text-sm text-gray-400">Arte gerada com sucesso! Use as opções à direita.</p>
                     )}
                </div>
            </div>
        );
    };

    const renderResultPanel = () => (
         <div className="lg:col-span-2 p-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl">
                 <h3 className="text-xl font-semibold text-gray-300 mb-4 text-center">
                    {loadedTemplateName ? `Arte Gerada do Template "${loadedTemplateName}"` : "Arte Profissional Gerada"}
                </h3>
                
                {isLoading && (
                    <div className="aspect-square w-full bg-gray-800/50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-700">
                        <Spinner />
                        <p className="mt-4 text-center text-gray-300">{loadingStep}</p>
                    </div>
                )}

                {!isLoading && designBrief && backgroundImage && (
                     <div className="flex flex-col gap-4">
                        <div className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2">
                             <div className="relative shadow-lg mx-auto" style={{ width: '100%', aspectRatio: resultAspectRatio, containerType: 'size' }}>
                                <img src={backgroundImage} alt="Arte de fundo gerada" className="w-full h-full object-contain" />
                                {designBrief.layout.map((item, index) => {
                                    const containerStyle: React.CSSProperties = {
                                        position: 'absolute',
                                        top: item.position.top,
                                        left: item.position.left,
                                        transform: item.type === 'text' && item.textAlign === 'center' ? 'translateX(-50%)' : 'none',
                                        ...(item.type === 'image' && { width: item.size.width, height: item.size.height }),
                                    };

                                    return (
                                        <div key={index} style={containerStyle}>
                                            {item.type === 'text' && (
                                                <p style={{
                                                    fontSize: `clamp(8px, ${item.fontSize}cqmin, 200px)`,
                                                    fontFamily: item.fontFamily,
                                                    fontWeight: item.fontWeight,
                                                    color: item.color,
                                                    textAlign: item.textAlign,
                                                    whiteSpace: 'pre-wrap',
                                                    textShadow: '1px 1px 3px rgba(0,0,0,0.3)',
                                                }}>
                                                    {item.text}
                                                </p>
                                            )}
                                            {item.type === 'image' && userImage && (
                                                <img src={userImage.base64} alt="Imagem do usuário" className="w-full h-full object-contain" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        {/* Background Generation Section */}
                        <div className="bg-gray-700/50 p-4 rounded-lg space-y-3 border border-gray-600">
                            <h4 className="text-md font-semibold text-gray-200">Ajustar Fundo</h4>
                            <div>
                                <label htmlFor="bg-prompt" className="text-xs text-gray-400 block mb-1">
                                    Prompt para imagem de fundo:
                                </label>
                                <textarea
                                    id="bg-prompt"
                                    rows={2}
                                    value={backgroundPrompt}
                                    onChange={(e) => setBackgroundPrompt(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Descreva o fundo que você deseja..."
                                />
                            </div>
                            <button
                                onClick={handleGenerateNewBackground}
                                disabled={isGeneratingBackground}
                                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center text-sm"
                            >
                                {isGeneratingBackground ? <><Spinner /> <span className="ml-2">Gerando...</span></> : 'Gerar Novo Fundo'}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={openDownloadModal} className="col-span-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center">
                                Baixar Imagem
                            </button>
                            <button onClick={() => handleGenerate()} disabled={isLoading || isUsageLimitReached} className="col-span-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center">
                                {isLoading ? <Spinner/> : 'Gerar Nova Arte'}
                            </button>
                            <button onClick={handleSaveTemplate} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center text-sm">
                                Salvar como Template
                            </button>
                            <button onClick={handleReset} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center text-sm">
                                Novo Pedido
                            </button>
                        </div>
                    </div>
                )}

                {!isLoading && !designBrief && (
                    <div className="aspect-square w-full bg-gray-800/50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-700 p-4">
                        <ResultPlaceholderIcon />
                        <p className="text-gray-400 text-center mt-2">Sua arte profissional aparecerá aqui.</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-0 md:p-0 max-w-7xl mx-auto" style={{ height: 'calc(100vh - 150px)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-full">
                {renderBriefingPanel()}
                {renderResultPanel()}
            </div>
            
            {backgroundImage && imageDimensions && designBrief && (
                <DownloadModal 
                    isOpen={isDownloadModalOpen} 
                    onClose={() => setIsDownloadModalOpen(false)} 
                    imageBase64={backgroundImage} 
                    initialWidth={imageDimensions.width}
                    initialHeight={imageDimensions.height}
                    layout={designBrief.layout}
                    userImage={userImage?.base64}
                    isPrintOptimized={optimizationTarget === 'print'}
                    printQuality={printQuality}
                />
            )}
        </div>
    );
};

export default ProfessionalDesigner;