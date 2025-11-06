import React from 'react';
import Spinner from './Spinner';
import { AspectRatio } from '../types';

interface ImageDisplayProps {
    title: string;
    imageUrl?: string | null;
    isLoading: boolean;
    placeholder: React.ReactNode;
    aspectRatio?: AspectRatio;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ title, imageUrl, isLoading, placeholder, aspectRatio = '1:1' }) => {
    const getAspectRatioClass = (ratio: AspectRatio): string => {
        switch (ratio) {
            case '16:9': return 'aspect-video';
            case '9:16': return 'aspect-[9/16]';
            case '4:3': return 'aspect-[4/3]';
            case '3:4': return 'aspect-[3/4]';
            case '1:1':
            default:
                return 'aspect-square';
        }
    };
    
    // Fix: Add a type assertion to resolve a type inference issue where aspectRatio was being treated as a generic string.
    const aspectRatioClass = getAspectRatioClass(aspectRatio as AspectRatio);

    return (
        <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">{title}</h3>
            <div className={`w-full ${aspectRatioClass} bg-gray-800/50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600 relative overflow-hidden`}>
                {isLoading ? (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-10">
                        <Spinner />
                        <p className="mt-2 text-sm">Processando...</p>
                    </div>
                ) : null}

                {imageUrl ? (
                    <img src={imageUrl} alt={title} className="w-full h-full object-contain" />
                ) : (
                    <div className="text-center text-gray-500">
                        {placeholder}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageDisplay;