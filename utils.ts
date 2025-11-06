import { AspectRatio } from './types';

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const prepareOutpaintingImage = (
    imageBase64: string,
    targetAspectRatio: AspectRatio
): Promise<{ newImageBase64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            const [targetW, targetH] = targetAspectRatio.split(':').map(Number);
            const targetNumericAspectRatio = targetW / targetH;
            const originalAspectRatio = img.width / img.height;

            let canvasWidth: number;
            let canvasHeight: number;
            
            if (targetNumericAspectRatio > originalAspectRatio) {
                canvasHeight = img.height;
                canvasWidth = img.height * targetNumericAspectRatio;
            } else {
                canvasWidth = img.width;
                canvasHeight = img.width / targetNumericAspectRatio;
            }

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const x = (canvas.width - img.width) / 2;
            const y = (canvas.height - img.height) / 2;

            ctx.drawImage(img, x, y);

            const newImageBase64 = canvas.toDataURL('image/png');
            resolve({ newImageBase64, mimeType: 'image/png' });
        };
        img.onerror = (err) => {
            reject(new Error("Falha ao carregar a imagem para processamento no canvas."));
        };
        img.src = imageBase64;
    });
};

export const upscaleImage = (imageBase64: string, scaleFactor: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Não foi possível obter o contexto do canvas para upscaling.'));
            }

            const newWidth = img.width * scaleFactor;
            const newHeight = img.height * scaleFactor;

            canvas.width = newWidth;
            canvas.height = newHeight;
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => {
            reject(new Error("Falha ao carregar a imagem para upscaling."));
        };
        img.src = imageBase64;
    });
};

export const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // Handle potential CORS issues with data URLs or external images
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error("Falha ao carregar a imagem."));
        img.src = src;
    });
};

export const getImageDimensions = (imageBase64: string): Promise<{width: number, height: number}> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
            reject(new Error("Falha ao ler as dimensões da imagem."));
        };
        img.src = imageBase64;
    });
};