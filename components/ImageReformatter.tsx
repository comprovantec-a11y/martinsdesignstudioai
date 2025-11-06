import React, { useState, useRef } from 'react';
import { manipulateImage } from '../services/geminiService';
import { fileToBase64, prepareOutpaintingImage, upscaleImage } from '../utils';
import ImageDisplay from './ImageDisplay';
import { AspectRatio } from '../types';
import { useUser } from '../contexts/UserContext';

// Copied from ImageGenerator.tsx for consistent UI
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

const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-4-4V6a4 4 0 014-4h1a3 3 0 013 3v1m-1 9l-4-4m0 0l-4 4m4-4v12" />
    </svg>
);

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const ImageReformatter: React.FC = () => {
    const { user, consumeUsage } = useUser();
    const [originalImage, setOriginalImage] = useState<{ file: File, url: string, base64: string } | null>(null);
    const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [optimizeForPrint, setOptimizeForPrint] = useState<boolean>(false);
    const [printQuality, setPrintQuality] = useState<'300' | '600'>('300');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isUsageLimitReached = user.plan === 'free' && user.usage.reformat <= 0;

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                setOriginalImage({
                    file,
                    url: URL.createObjectURL(file),
                    base64,
                });
                setEnhancedImage(null);
                setError(null);
            } catch (err) {
                setError("Falha ao ler o arquivo.");
            }
        }
    };

    const handleEnhance = async () => {
        if (isUsageLimitReached) {
            setError('Você atingiu seu limite diário de aprimoramentos. Faça um upgrade para continuar.');
            return;
        }
        if (!originalImage) {
            setError('Por favor, envie uma imagem primeiro.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setEnhancedImage(null);
        
        try {
            const { newImageBase64, mimeType } = await prepareOutpaintingImage(
                originalImage.base64,
                aspectRatio
            );

            let prompt: string;
            
            if (optimizeForPrint) {
                const dpi = printQuality === '300' ? 300 : 600;
                prompt = `Tarefa de Inpainting e Aprimoramento de Resolução: A imagem fornecida tem áreas magenta (#ff00ff). Substitua APENAS as áreas magenta estendendo o tema principal e o fundo. Ao mesmo tempo, recrie a imagem inteira com detalhes fotorrealistas e extrema alta resolução, adequada para impressão em grande formato (${dpi} DPI). A imagem final não deve conter magenta.`;
            } else {
                prompt = `Tarefa de Inpainting: A imagem fornecida tem áreas magenta (#ff00ff). Substitua APENAS as áreas magenta estendendo o tema principal e o fundo. A imagem final não deve conter magenta.`;
            }
            
            const imageUrl = await manipulateImage(prompt, newImageBase64, mimeType);
            setEnhancedImage(imageUrl);
            consumeUsage('reformat');
        } catch (e: any) {
            setError(e.message || 'Ocorreu um erro inesperado.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!enhancedImage) return;
        setIsDownloading(true);
        setError(null);
        try {
            let imageUrlToDownload = enhancedImage;
            if (optimizeForPrint) {
                const scaleFactor = printQuality === '300' ? 2 : 4; // 2x for 300 DPI, 4x for 600 DPI
                imageUrlToDownload = await upscaleImage(enhancedImage, scaleFactor);
            }
            const link = document.createElement('a');
            link.href = imageUrlToDownload;
            link.download = `enhanced-image-${aspectRatio.replace(':', 'x')}${optimizeForPrint ? `-${printQuality}dpi` : ''}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e: any) {
            setError(e.message || "Falha ao fazer o upscale da imagem para download.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 md:p-8 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">1. Enviar Imagem</label>
                        <div className="flex items-center space-x-4">
                           <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                            >
                                Escolher Arquivo
                            </button>
                            <span className="text-gray-400 text-sm truncate">
                                {originalImage ? originalImage.file.name : 'Nenhum arquivo escolhido'}
                            </span>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">2. Selecione a Nova Proporção</label>
                        <AspectRatioSelector selected={aspectRatio} onSelect={setAspectRatio} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">3. Otimização (Opcional)</label>
                        <div className="flex items-center bg-gray-700 rounded-lg p-3">
                            <input
                                id="optimize-print-reformat"
                                type="checkbox"
                                checked={optimizeForPrint}
                                onChange={(e) => setOptimizeForPrint(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="optimize-print-reformat" className="ml-3 block text-sm font-medium text-white">
                                Otimizar para Impressão
                            </label>
                        </div>
                        
                        {optimizeForPrint && (
                            <div className="mt-4 pl-4 border-l-2 border-gray-600">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Qualidade de Impressão</label>
                                 <div className="flex flex-col gap-2">
                                    <label className="flex items-center text-sm text-gray-200 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="print-quality"
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
                                            name="print-quality"
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

                    <div className="space-y-2">
                        <button
                            onClick={handleEnhance}
                            disabled={isLoading || !originalImage || isUsageLimitReached}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                        >
                            {isLoading ? 'Aprimorando...' : (enhancedImage ? 'Refazer' : 'Aprimorar & Redimensionar Imagem')}
                        </button>
                        {isUsageLimitReached && (
                            <p className="text-yellow-400 text-sm text-center">
                                Você atingiu seu limite diário de aprimoramentos. Faça upgrade para continuar.
                            </p>
                        )}
                         {enhancedImage && !isLoading && !isUsageLimitReached && (
                            <p className="text-xs text-gray-400 text-center">
                                Ocasionalmente, a IA pode cometer pequenos erros. Se não gostar do resultado, clique em 'Refazer' para gerar uma nova versão.
                            </p>
                        )}
                    </div>
                </div>

                {/* Image Previews */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                    <div>
                        <ImageDisplay
                            title="Original"
                            imageUrl={originalImage?.url}
                            isLoading={false}
                            placeholder={<><UploadIcon /><p className="mt-2">Envie uma imagem para começar</p></>}
                        />
                    </div>
                    <div>
                        <ImageDisplay
                            title="Aprimorada"
                            imageUrl={enhancedImage}
                            isLoading={isLoading}
                            aspectRatio={aspectRatio}
                            placeholder={<><div className="text-4xl">🖼️</div><p className="mt-2">Sua imagem aprimorada aparecerá aqui</p></>}
                        />
                        {enhancedImage && !isLoading && (
                            <button
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                            >
                                <DownloadIcon />
                                {isDownloading ? 'Processando...' : 'Baixar Imagem'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageReformatter;
