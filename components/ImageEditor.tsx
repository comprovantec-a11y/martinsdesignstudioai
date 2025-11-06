import React, { useState, useRef } from 'react';
import { manipulateImage, enhancePrompt } from '../services/geminiService';
import { fileToBase64, prepareOutpaintingImage, getImageDimensions } from '../utils';
import ImageDisplay from './ImageDisplay';
import { AspectRatio } from '../types';
import Spinner from './Spinner';
import DownloadModal from './DownloadModal';
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

interface UploadedImage {
  file: File;
  url: string;
  base64: string;
}

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

const ImageEditor: React.FC = () => {
    const { user, consumeUsage } = useUser();
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [enhancedPrompt, setEnhancedPrompt] = useState<string>('');
    const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [optimizeForPrint, setOptimizeForPrint] = useState<boolean>(false);
    const [printQuality, setPrintQuality] = useState<'300' | '600'>('300');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);

    const selectedImage = selectedImageIndex !== null ? uploadedImages[selectedImageIndex] : null;
    const isUsageLimitReached = user.plan === 'free' && user.usage.edit <= 0;

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            try {
                // Fix: Explicitly type `file` as `File` to resolve type inference issue.
                const newImagesPromises = Array.from(files).map(async (file: File) => {
                    const base64 = await fileToBase64(file);
                    const url = URL.createObjectURL(file);
                    return { file, url, base64 };
                });

                const newImages = await Promise.all(newImagesPromises);
                
                const currentImagesCount = uploadedImages.length;
                setUploadedImages(prevImages => [...prevImages, ...newImages]);
                // Automatically select the first of the newly uploaded images
                handleSelectImage(currentImagesCount, newImages[0]);
                setEditedImage(null);
                setError(null);

            } catch (err) {
                setError("Falha ao ler os arquivos.");
            }
             // Reset the file input so the same files can be re-uploaded if needed
            if(fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSelectImage = (index: number, image?: UploadedImage) => {
        const selected = image || uploadedImages[index];
        const img = new Image();
        img.onload = () => {
             const ratio = img.width / img.height;
             const aspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
             const closest = aspectRatios.reduce((prev, curr) => {
                 const [w, h] = curr.split(':').map(Number);
                 const currRatio = w / h;
                 const [prevW, prevH] = prev.split(':').map(Number);
                 const prevRatio = prevW / prevH;
                 return Math.abs(currRatio - ratio) < Math.abs(prevRatio - ratio) ? curr : prev;
             }) as AspectRatio;
             setAspectRatio(closest);
        }
        img.src = selected.url;

        setSelectedImageIndex(index);
        setEditedImage(null); // Clear previous edit when changing image
    }

    const handleEdit = async () => {
        if (isUsageLimitReached) {
            setError('Você atingiu seu limite diário de edições. Faça um upgrade para continuar.');
            return;
        }
        if (!selectedImage) {
            setError('Por favor, selecione uma imagem para editar.');
            return;
        }
        if (!prompt) {
            setError('Por favor, insira um prompt de edição.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setEditedImage(null);
        setEnhancedPrompt('');

        setIsEnhancingPrompt(true);
        // Fix: Pass a default framing argument to `enhancePrompt` to resolve the "Expected 2 arguments, but got 1" error.
        const newlyEnhancedPrompt = await enhancePrompt(prompt, 'Automático');
        setEnhancedPrompt(newlyEnhancedPrompt);
        setIsEnhancingPrompt(false);

        try {
            const { newImageBase64, mimeType } = await prepareOutpaintingImage(
                selectedImage.base64,
                aspectRatio
            );
            
            let combinedPrompt: string;

            if (optimizeForPrint) {
                const dpi = printQuality === '300' ? 300 : 600;
                combinedPrompt = `Tarefa de Edição, Inpainting e Aprimoramento de Resolução:
1. Na imagem central (não na área magenta), aplique esta edição: "${newlyEnhancedPrompt}".
2. Depois, substitua TODAS as áreas magenta (#ff00ff) estendendo o tema e o fundo da imagem já editada.
3. Finalmente, recrie a imagem inteira com detalhes fotorrealistas e extrema alta resolução, adequada para impressão em grande formato (${dpi} DPI).
A imagem final não deve conter magenta.`;
            } else {
                 combinedPrompt = `Tarefa de Edição e Inpainting em duas etapas:
1. Na imagem central (não na área magenta), aplique esta edição: "${newlyEnhancedPrompt}".
2. Depois, substitua TODAS as áreas magenta (#ff00ff) estendendo o tema e o fundo da imagem já editada.
A imagem final não deve conter magenta.`;
            }


            const imageUrl = await manipulateImage(combinedPrompt, newImageBase64, mimeType);
            setEditedImage(imageUrl);
            consumeUsage('edit');
        } catch (e: any) {
            setError(e.message || 'Ocorreu um erro inesperado.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const openDownloadModal = async () => {
        if (!editedImage) return;
        try {
            const dims = await getImageDimensions(editedImage);
            setImageDimensions(dims);
            setIsDownloadModalOpen(true);
        } catch (e) {
            setError("Não foi possível ler as dimensões da imagem para download.");
        }
    };

    return (
        <>
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 md:p-8 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Controls */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">1. Enviar Imagem(ns)</label>
                            <div className="flex items-center space-x-4">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                                >
                                    Escolher Arquivo(s)
                                </button>
                                <span className="text-gray-400 text-sm truncate">
                                    {selectedImage ? selectedImage.file.name : (uploadedImages.length > 0 ? `${uploadedImages.length} imagens carregadas` : 'Nenhum arquivo escolhido')}
                                </span>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                    multiple
                                />
                            </div>
                        </div>
                        
                        {uploadedImages.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Imagens Enviadas (Selecione para editar)</label>
                                <div className="flex flex-wrap gap-3 p-2 bg-gray-900/50 rounded-lg border border-gray-700">
                                    {uploadedImages.map((image, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSelectImage(index)}
                                            className={`relative w-20 h-20 rounded-md overflow-hidden focus:outline-none transition-all duration-200 ${selectedImageIndex === index ? 'ring-4 ring-indigo-500' : 'ring-2 ring-transparent hover:ring-gray-500'}`}
                                            aria-label={`Selecionar ${image.file.name}`}
                                        >
                                            <img src={image.url} alt={`Preview ${image.file.name}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label htmlFor="edit-prompt" className="block text-sm font-medium text-gray-300 mb-2">2. Descreva sua Edição</label>
                            <textarea
                                id="edit-prompt"
                                rows={3}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                placeholder="Ex: Adicione um filtro retrô, remova a pessoa no fundo"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">3. Selecione a Proporção (Opcional)</label>
                            <AspectRatioSelector selected={aspectRatio} onSelect={setAspectRatio} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">4. Otimização (Opcional)</label>
                             <div className="bg-gray-700 rounded-lg p-3">
                                <div className="flex items-center">
                                    <input
                                        id="optimize-print-edit"
                                        type="checkbox"
                                        checked={optimizeForPrint}
                                        onChange={(e) => setOptimizeForPrint(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor="optimize-print-edit" className="ml-3 block text-sm font-medium text-white">
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
                                                name="print-quality-edit"
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
                                                name="print-quality-edit"
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
                                <span className="text-sm text-gray-300">Aprimorando seu prompt de edição...</span>
                            </div>
                        )}
                        
                        {enhancedPrompt && !isLoading && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Prompt Aprimorado (usado para editar):</label>
                                <p className="text-sm text-gray-300 bg-gray-700/50 p-3 rounded-lg border border-gray-600">{enhancedPrompt}</p>
                            </div>
                        )}


                        <div className="space-y-2 mt-4">
                            <button
                                onClick={handleEdit}
                                disabled={isLoading || !selectedImage || isUsageLimitReached}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                            >
                                {isLoading ? (isEnhancingPrompt ? 'Aprimorando...' : 'Aplicando Edição...') : (editedImage ? 'Refazer Edição' : 'Aplicar Edição')}
                            </button>
                             {isUsageLimitReached && (
                                <p className="text-yellow-400 text-sm text-center">
                                    Você atingiu seu limite diário de edições. Faça upgrade para continuar.
                                </p>
                            )}
                            {editedImage && !isLoading && !isUsageLimitReached && (
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
                                imageUrl={selectedImage?.url}
                                isLoading={false}
                                placeholder={<><UploadIcon /><p className="mt-2">Envie uma ou mais imagens para começar</p></>}
                            />
                        </div>
                        <div>
                            <ImageDisplay
                                title="Editada"
                                imageUrl={editedImage}
                                isLoading={isLoading && !isEnhancingPrompt}
                                aspectRatio={aspectRatio}
                                placeholder={<><div className="text-4xl">✨</div><p className="mt-2">Sua imagem editada aparecerá aqui</p></>}
                            />
                            {editedImage && !isLoading && (
                                <button
                                    onClick={openDownloadModal}
                                    className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                                >
                                    <DownloadIcon />
                                    Baixar Imagem
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {editedImage && imageDimensions && (
                <DownloadModal
                    isOpen={isDownloadModalOpen}
                    onClose={() => setIsDownloadModalOpen(false)}
                    imageBase64={editedImage}
                    initialWidth={imageDimensions.width}
                    initialHeight={imageDimensions.height}
                    isPrintOptimized={optimizeForPrint}
                    printQuality={printQuality}
                />
            )}
        </>
    );
};

export default ImageEditor;
