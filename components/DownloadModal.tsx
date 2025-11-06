import React, { useState } from 'react';
import { upscaleImage, loadImage } from '../utils';
import { LayoutElement } from '../types';
import { useUser } from '../contexts/UserContext';

interface DownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageBase64: string;
    initialWidth: number;
    initialHeight: number;
    isPrintOptimized?: boolean;
    printQuality?: '300' | '600';
    // Props for Professional Designer
    layout?: LayoutElement[];
    userImage?: string;
}

const LockIcon: React.FC<{locked: boolean}> = ({locked}) => {
    if (locked) {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
        );
    }
    return (
         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 016 0v2a1 1 0 102 0V7a5 5 0 00-5-5z" />
        </svg>
    );
};


const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose, imageBase64, initialWidth, initialHeight, isPrintOptimized, printQuality = '300', layout, userImage }) => {
    const { user } = useUser();
    const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');
    const [exportQuality, setExportQuality] = useState(92);
    
    const isFreePlan = user.plan === 'free';
    const finalIsPrintOptimized = isFreePlan ? false : isPrintOptimized;
    const scaleFactor = finalIsPrintOptimized ? (printQuality === '300' ? 2 : 4) : 1;

    const [exportWidth, setExportWidth] = useState(initialWidth * scaleFactor);
    const [exportHeight, setExportHeight] = useState(initialHeight * scaleFactor);

    const [isExportRatioLocked, setIsExportRatioLocked] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    
    const aspectRatio = initialWidth / initialHeight;

    if (!isOpen) return null;

    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newWidth = parseInt(e.target.value) || 0;
        setExportWidth(newWidth);
        if (isExportRatioLocked) {
            setExportHeight(Math.round(newWidth / aspectRatio));
        }
    };

    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHeight = parseInt(e.target.value) || 0;
        setExportHeight(newHeight);
        if (isExportRatioLocked) {
            setExportWidth(Math.round(newHeight * aspectRatio));
        }
    };
    
    const handleExport = async () => {
        setIsExporting(true);
        try {
            const canvas = document.createElement('canvas');
            canvas.width = exportWidth;
            canvas.height = exportHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error("Não foi possível criar o canvas para download.");
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // If layout is provided, it's a composite image from Professional Designer
            if (layout) {
                const imagesToLoad: Promise<HTMLImageElement>[] = [loadImage(imageBase64)]; // background image
                if (userImage) {
                    imagesToLoad.push(loadImage(userImage));
                }
                const [bgImg, userImg] = await Promise.all(imagesToLoad);
                
                ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

                for (const item of layout) {
                    if (item.type === 'text') {
                        const fontSize = (item.fontSize / 100) * canvas.height;
                        ctx.font = `${item.fontWeight} ${fontSize}px "${item.fontFamily}"`;
                        ctx.fillStyle = item.color;
                        ctx.textAlign = item.textAlign;
                        const x = (parseFloat(item.position.left) / 100) * canvas.width;
                        const y = (parseFloat(item.position.top) / 100) * canvas.height;
                        ctx.fillText(item.text, x, y);
                    } else if (item.type === 'image' && userImg) {
                        const itemWidth = (parseFloat(item.size.width) / 100) * canvas.width;
                        const itemHeight = item.size.height === 'auto' ? itemWidth * (userImg.height / userImg.width) : (parseFloat(item.size.height) / 100) * canvas.height;
                        const x = (parseFloat(item.position.left) / 100) * canvas.width;
                        const y = (parseFloat(item.position.top) / 100) * canvas.height;
                        ctx.drawImage(userImg, x, y, itemWidth, itemHeight);
                    }
                }
            } else {
                // It's a simple image from Generator or Editor
                const sourceImage = await loadImage(imageBase64);
                ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
            }

            const mimeType = exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
            const quality = exportFormat === 'jpeg' ? exportQuality / 100 : undefined;
            const dataUrl = canvas.toDataURL(mimeType, quality);

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `martins-design-studio-ai.${exportFormat}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            onClose();

        } catch (err) {
            console.error("Export failed:", err);
            // Here you could set an error state to show in the modal
        } finally {
            setIsExporting(false);
        }
    };
    

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-white">Opções de Download</h3>
                
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Formato</label>
                    <div className="flex gap-2">
                        <button onClick={() => setExportFormat('png')} className={`flex-1 p-2 rounded-md text-sm ${exportFormat === 'png' ? 'bg-indigo-600' : 'bg-gray-700'}`}>PNG (Alta Qualidade)</button>
                        <button onClick={() => setExportFormat('jpeg')} className={`flex-1 p-2 rounded-md text-sm ${exportFormat === 'jpeg' ? 'bg-indigo-600' : 'bg-gray-700'}`}>JPG (Arquivo Menor)</button>
                    </div>
                </div>

                {exportFormat === 'jpeg' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Qualidade ({exportQuality}%)</label>
                        <input type="range" min="1" max="100" value={exportQuality} onChange={e => setExportQuality(parseInt(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"/>
                    </div>
                )}
                 <div className={`relative ${isFreePlan ? 'opacity-50' : ''}`}>
                    {isFreePlan && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center cursor-not-allowed group">
                            <span className="hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded-md absolute -top-8">
                                Disponível nos planos pagos
                            </span>
                        </div>
                    )}
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Resolução (px)</label>
                        <div className="flex items-center gap-2">
                            <input type="number" value={exportWidth} onChange={handleWidthChange} className="w-full bg-gray-700 p-2 rounded-md" disabled={isFreePlan} />
                            <span className="text-gray-400">×</span>
                            <input type="number" value={exportHeight} onChange={handleHeightChange} className="w-full bg-gray-700 p-2 rounded-md" disabled={isFreePlan}/>
                            <button onClick={() => setIsExportRatioLocked(!isExportRatioLocked)} className={`p-2 rounded-md ${isExportRatioLocked ? 'bg-indigo-600' : 'bg-gray-700'}`} disabled={isFreePlan}>
                                <LockIcon locked={isExportRatioLocked} />
                            </button>
                        </div>
                    </div>
                 </div>


                <div className="flex gap-3 pt-4">
                    <button onClick={onClose} disabled={isExporting} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                    <button onClick={handleExport} disabled={isExporting} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
                        {isExporting ? 'Exportando...' : 'Exportar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DownloadModal;
