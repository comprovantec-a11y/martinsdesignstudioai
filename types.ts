export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export enum AppTab {
  GENERATE = 'Gerar',
  EDIT = 'Editar',
  REFORMAT = 'Aprimorar & Redimensionar',
  DESIGNER = 'Meu Designer 24h',
}

// --- Tipos para o "Meu Designer 24h" ---

export interface TextElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  position: { top: string; left: string };
  textAlign: 'left' | 'center' | 'right';
}

export interface ImageElement {
  type: 'image';
  // A IA define a posição e o tamanho, o usuário ajusta
  position: { top: string; left: string }; 
  size: { width: string; height: string }; // em porcentagem da tela
}

export type LayoutElement = TextElement | ImageElement;

export interface DesignBrief {
    imagePrompt: string;
    fontSuggestions: {
        fontFamily: string;
        fontWeight: string;
    }[];
    colorPalette: string[];
    layout: LayoutElement[];
}

export interface TemplateSettings {
    aspectRatio: AspectRatio;
    isCustomSize: boolean;
    customWidth: string;
    customHeight: string;
    customUnit: 'px' | 'pol.' | 'mm' | 'cm';
    optimizationTarget: 'social' | 'print';
    printQuality: '300' | '600';
    fontFamily: string;
}

export interface SavedTemplate {
    id: string;
    name: string;
    brief: DesignBrief;
    settings: TemplateSettings;
}

// --- Tipos para o Sistema de Contas ---
export type Plan = 'free' | 'creator' | 'pro';

export type UsageType = 'generate' | 'edit' | 'reformat' | 'designer';

export interface Usage {
    generate: number;
    edit: number;
    reformat: number;
    designer: number;
}

export interface UserState {
    plan: Plan;
    usage: Usage;
    lastReset: number; // timestamp
}
