import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AspectRatio, DesignBrief, LayoutElement } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ClarificationQuestion {
    question: string;
    options: string[];
}

export const analyzeAndClarifyBrief = async (initialPrompt: string): Promise<ClarificationQuestion[]> => {
    const systemInstruction = `Você é um "Consultor de Design Sênior". Sua tarefa é analisar o pedido inicial de um cliente e, se for vago, identificar as informações cruciais que um designer profissional precisaria. Gere de 2 a 3 perguntas de múltipla escolha para refinar o briefing.
- As perguntas devem ser claras e objetivas.
- As opções devem ser concisas e dar direções criativas distintas.
- Foque em estilo visual, público-alvo ou elementos-chave.
- Se o pedido for sobre um LOGO, pergunte o nome da empresa e sugira estilos (Ex: Minimalista, Vintage, Moderno).
- Exemplo para "logo de pizzaria": Pergunta 1: "Qual o nome da pizzaria?". Pergunta 2: "Qual estilo visual você prefere?"; Opções: ["Rústico/Artesanal", "Moderno/Minimalista", "Divertido/Casual"].
Sua resposta DEVE ser um JSON que segue estritamente o schema fornecido.`;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['question', 'options']
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Analise este pedido: "${initialPrompt}"`,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema
            }
        });
        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr) as ClarificationQuestion[];
    } catch (error) {
        console.error("Error analyzing brief:", error);
        throw new Error("Falha ao analisar o seu pedido. A IA pode estar sobrecarregada.");
    }
};

export const refineDesignBrief = async (originalBrief: DesignBrief, refinementRequest: string): Promise<DesignBrief> => {
     const systemInstruction = `Você é um "Diretor de Arte AI". Sua tarefa é refinar um plano de design JSON existente com base no pedido de ajuste do cliente.
- Analise o pedido de ajuste do cliente.
- Modifique APENAS as partes relevantes do JSON original para atender ao pedido.
- NÃO comece do zero. Mantenha as partes do design original que não foram mencionadas.
- Se o cliente pedir para mudar a fonte, altere 'fontSuggestions' e talvez o 'fontWeight' nos elementos do layout.
- Se o cliente pedir para mudar as cores, altere a 'colorPalette' e as cores nos elementos do layout.
- Se o cliente pedir para mudar o fundo, reescreva o 'imagePrompt'.
Sua resposta DEVE ser o JSON modificado, seguindo estritamente o schema original.`;

    const textElementSchema = {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: ['text'] },
            text: { type: Type.STRING },
            fontSize: { 
                type: Type.NUMBER,
                description: "Um número entre 3 (texto pequeno) e 15 (título grande), que representa a porcentagem da altura total da arte. Ex: um valor de 10 significa que a fonte terá 10% da altura da arte."
            },
            fontFamily: { type: Type.STRING },
            fontWeight: { type: Type.STRING },
            color: { type: Type.STRING },
            position: { type: Type.OBJECT, properties: { top: { type: Type.STRING }, left: { type: Type.STRING } }, required: ['top', 'left'] },
            textAlign: { type: Type.STRING }
        },
        required: ['type', 'text', 'fontSize', 'fontFamily', 'fontWeight', 'color', 'position', 'textAlign']
    };

    const imageElementSchema = {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: ['image'] },
            position: { type: Type.OBJECT, properties: { top: { type: Type.STRING }, left: { type: Type.STRING } }, required: ['top', 'left'] },
            size: { type: Type.OBJECT, properties: { width: { type: Type.STRING }, height: { type: Type.STRING } }, required: ['width', 'height'] }
        },
        required: ['type', 'position', 'size']
    };

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            imagePrompt: { type: Type.STRING },
            fontSuggestions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { fontFamily: { type: Type.STRING }, fontWeight: { type: Type.STRING } }, required: ['fontFamily', 'fontWeight'] } },
            colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
            layout: { type: Type.ARRAY, items: { oneOf: [textElementSchema, imageElementSchema] } }
        },
        required: ['imagePrompt', 'fontSuggestions', 'colorPalette', 'layout']
    };

    const prompt = `JSON Original:\n${JSON.stringify(originalBrief, null, 2)}\n\nPedido de Ajuste do Cliente:\n"${refinementRequest}"\n\nRefine o JSON.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema
            }
        });
        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr) as DesignBrief;
    } catch (error) {
        console.error("Error refining design brief:", error);
        throw new Error("Falha ao refinar o plano de design.");
    }
};


export const enhancePrompt = async (simplePrompt: string, framing: string): Promise<string> => {
    if (!simplePrompt.trim()) {
        return simplePrompt;
    }
    try {
        const systemInstruction = `Você é um "diretor de arte de prompts" para IA de geração de imagem. Sua tarefa é reescrever o prompt simples do usuário em uma descrição vívida e profissional para o modelo Imagen-4. Incorpore detalhes obrigatórios seguindo estes 5 pilares:
1.  **Assunto Detalhado:** Enriqueça o assunto principal. Se for uma pessoa, adicione emoção e vestuário. Se for um objeto, descreva seus materiais e texturas. Se for uma criatura, sua aparência e humor.
2.  **Ambiente e Fundo:** Construa um cenário coerente ao redor do assunto para criar profundidade e contar uma história.
3.  **Iluminação e Atmosfera:** Defina o humor da cena com iluminação específica (ex: "luz dourada do amanhecer", "néon cyberpunk", "luz de velas dramática", "iluminação de estúdio suave").
4.  **Composição Fotográfica:** Use termos de câmera profissional para guiar a IA. O usuário escolheu este enquadramento: "${framing}". Se for "Automático", escolha o melhor enquadramento. Se for "Close-up", use termos como "foto macro, detalhes extremos". Se for "Plano Aberto", use "plano geral épico, paisagem vasta". Se for "Objeto em Foco", use "fundo minimalista, fundo desfocado (bokeh), lente de 85mm".
5.  **Estilo Artístico:** Defina um estilo visual claro (ex: "fotorrealismo", "pintura a óleo digital", "arte vetorial", "estilo Ghibli", "cinemático com gradação de cores teal and orange").
Responda APENAS com o prompt aprimorado, sem nenhuma outra explicação.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: simplePrompt,
            config: {
                systemInstruction,
                temperature: 0.9,
            }
        });

        const enhanced = response.text.trim();
        return enhanced || simplePrompt;
    } catch (error) {
        console.error("Error enhancing prompt:", error);
        return simplePrompt; 
    }
};


export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio,
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
        throw new Error("A geração de imagem falhou, nenhuma imagem foi retornada.");
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Falha ao gerar a imagem. Por favor, verifique o console para mais detalhes.");
    }
};

export const manipulateImage = async (
    prompt: string,
    imageBase64: string,
    mimeType: string
): Promise<string> => {
    try {
        const base64Data = imageBase64.split(',')[1];
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        throw new Error("Nenhuma imagem encontrada na resposta.");
    } catch (error) {
        console.error("Error manipulating image:", error);
        throw new Error("Falha ao manipular a imagem. Por favor, verifique o console para mais detalhes.");
    }
};

interface DesignBriefConfig {
    fullBrief: string;
    userImageBase64?: string;
    aspectRatio?: AspectRatio;
    customSize?: { width: number; height: number; unit: string; };
    optimization?: { target: 'social' | 'print'; dpi?: '300' | '600' };
    fontFamily?: string;
}

export const generateDesignBrief = async (config: DesignBriefConfig): Promise<DesignBrief> => {
    const { fullBrief, userImageBase64, aspectRatio, customSize, optimization, fontFamily } = config;

    const hasUserImage = !!userImageBase64;
    const isLogoRequest = fullBrief.toLowerCase().includes('logo');

    // --- Dynamic System Instruction ---
    let userImageInstruction = hasUserImage
        ? `IMPORTANTE: O cliente enviou uma imagem (logo, produto). Sua tarefa MAIS IMPORTANTE é construir o design ao redor dela.
1.  **Layout:** Crie um layout que posicione a imagem do cliente como elemento principal. Organize os textos de forma harmoniosa. Defina um espaço para a imagem no layout (type: 'image').
2.  **Cores e Fontes:** A paleta de cores e fontes DEVEM HARMONIZAR com a imagem enviada.
3.  **Imagem de Fundo:** O 'imagePrompt' deve criar um fundo que COMPLEMENTE a imagem do cliente, não que compita com ela.`
        : `O cliente NÃO enviou uma imagem. Crie um 'imagePrompt' que seja o elemento visual principal da arte.`;

    let technicalSpecInstruction = '';
    if (customSize) {
        technicalSpecInstruction += `\n- **Tamanho Personalizado (Regra Crítica):** A arte final será de ${customSize.width} x ${customSize.height} ${customSize.unit}. O layout e a composição da imagem de fundo DEVEM ser planejados para esta proporção exata.`;
    } else if (aspectRatio) {
        technicalSpecInstruction += `\n- **Proporção (Regra Crítica):** A arte deve ser criada na proporção ${aspectRatio}.`;
    }

    if (optimization?.target === 'print') {
        technicalSpecInstruction += `\n- **Otimização para Impressão:** O design é para impressão em alta qualidade (${optimization.dpi} DPI). O 'imagePrompt' deve incluir termos como 'detalhes nítidos', 'alta resolução', 'fotorrealista' para garantir um resultado final rico em detalhes.`;
    } else {
        technicalSpecInstruction += `\n- **Otimização para Mídias Sociais:** O design é para telas digitais. Cores vibrantes e boa legibilidade são essenciais.`;
    }
    
    if (fontFamily && fontFamily !== 'ai-choice') {
        technicalSpecInstruction += `\n- **Tipografia (Regra Crítica):** A família de fontes a ser usada para TODOS os textos é "${fontFamily}".`;
    }

    if (isLogoRequest) {
         userImageInstruction += `\n\n**PEDIDO DE LOGO:** O cliente quer um logo. A imagem de fundo gerada pelo 'imagePrompt' DEVE ser o logo em um fundo branco sólido (#FFFFFF) para facilitar a remoção do fundo.`;
    }

    const systemInstruction = `Você é um "Mestre do Design e Estrategista de Marca" com a sofisticação e o olhar crítico de um diretor de arte sênior com 30 anos de experiência em agências de publicidade de renome. Sua tarefa é transformar um simples pedido de cliente em uma peça de design visualmente deslumbrante e estrategicamente eficaz.

**PROCESSO CRIATIVO ESTRATÉGICO (SIGA ESTRITAMENTE):**

1.  **DECOMPOSIÇÃO INTELIGENTE DO BRIEFING:** Analise o pedido do cliente e decomponha-o em seus elementos semânticos. Identifique claramente:
    *   **Título Principal:** A mensagem de maior impacto.
    *   **Subtítulo/Apoio:** Texto que complementa o título.
    *   **Lista de Serviços/Itens:** Geralmente separados por vírgulas ou quebras de linha.
    *   **Chamada para Ação (CTA):** O que o cliente quer que o espectador faça (ex: "AGENDE UMA VISITA", "COMPRE AGORA").
    *   **Informação de Contato/Rede Social:** (ex: "@seuatelieaqui", "Whatsapp: (xx) xxxxx-xxxx").

2.  **ESTRATÉGIA DE TIPOGRAFIA (REGRA DE MESTRE):** Você DEVE aplicar a técnica clássica de **pareamento de fontes** para criar hierarquia e sofisticação:
    *   **Para Títulos e Subtítulos:** Use uma fonte **SERIFADA ELEGANTE** (ex: 'Playfair Display', 'Merriweather') para transmitir autoridade e classe.
    *   **Para o Resto do Conteúdo (Serviços, CTA, Contato):** Use uma fonte **SANS-SERIF LIMPA E MODERNA** (ex: 'Montserrat', 'Roboto', 'Poppins') para máxima legibilidade e clareza.
    *   A 'fontFamily' no JSON deve refletir essa escolha estratégica.

3.  **ESTRATÉGIA DE COR INTENCIONAL:**
    *   Defina uma 'colorPalette' harmoniosa.
    *   Escolha UMA cor da paleta para ser a **COR DE DESTAQUE**.
    *   Use a cor de destaque **EXCLUSIVAMENTE no elemento da Chamada para Ação (CTA)** para atrair o olhar e guiar a ação do usuário.

4.  **CRIAÇÃO DA IMAGEM PRINCIPAL:** Crie um 'imagePrompt' que gere um fundo espetacular, com iluminação profissional, texturas e composição cinematográfica.

5.  **COMPOSIÇÃO E LAYOUT (Onde a Maestria Acontece):**
    *   **Agrupe Elementos Relacionados:** Mantenha a lista de serviços junta. Mantenha o CTA e o contato próximos, geralmente na base da arte.
    *   **Adicione Detalhes Profissionais:** Se houver uma lista de serviços, use um separador elegante como "•" entre os itens.
    *   **APLIQUE AS REGRAS DE OURO (NÃO-NEGOCIÁVEIS):**
        *   **FOCO NO PRODUTO:** NUNCA posicione textos sobre o assunto principal (o produto) da imagem de fundo. Use o espaço negativo (áreas mais vazias, como céu, parede ou fundo desfocado) para garantir que o produto seja a estrela da arte.
        *   **NÃO INVENTE INFORMAÇÃO:** SÓ inclua informações de contato (como @ de rede social ou telefone) se o cliente as fornecer explicitamente no pedido. NUNCA invente esta informação.
        *   **SEM SOBREPOSIÇÃO:** Elementos NUNCA se sobrepõem.
        *   **LEGIBILIDADE É REI:** Contraste perfeito entre texto e fundo.
        *   **RESPEITE AS BORDAS:** Mantenha margens generosas.
        *   **HIERARQUIA VISUAL:** O Título e o CTA devem ser os pontos de maior atenção.

**Briefing Completo do Cliente:**
"${fullBrief}"

**Especificações Técnicas Mandatórias:**
${technicalSpecInstruction}

**Diretrizes Criativas:**
${userImageInstruction}

Agora, gere a resposta JSON.`;
    
    // Schemas (unchanged)
    const textElementSchema = {
        type: Type.OBJECT, properties: { 
            type: { type: Type.STRING }, 
            text: { type: Type.STRING }, 
            fontSize: { 
                type: Type.NUMBER,
                description: "Um número entre 3 (texto pequeno) e 15 (título grande), que representa a porcentagem da altura total da arte. Ex: um valor de 10 significa que a fonte terá 10% da altura da arte."
            }, 
            fontFamily: { type: Type.STRING }, 
            fontWeight: { type: Type.STRING }, 
            color: { type: Type.STRING }, 
            position: { type: Type.OBJECT, properties: { top: { type: Type.STRING }, left: { type: Type.STRING } }, required: ['top', 'left'] }, 
            textAlign: { type: Type.STRING } 
        }, 
        required: ['type', 'text', 'fontSize', 'fontFamily', 'fontWeight', 'color', 'position', 'textAlign']
    };
    const imageElementSchema = {
        type: Type.OBJECT, properties: { type: { type: Type.STRING }, position: { type: Type.OBJECT, properties: { top: { type: Type.STRING }, left: { type: Type.STRING } }, required: ['top', 'left'] }, size: { type: Type.OBJECT, properties: { width: { type: Type.STRING }, height: { type: Type.STRING } }, required: ['width', 'height'] } }, required: ['type', 'position', 'size']
    };
    const responseSchema = {
        type: Type.OBJECT, properties: { imagePrompt: { type: Type.STRING }, fontSuggestions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { fontFamily: { type: Type.STRING }, fontWeight: { type: Type.STRING } }, required: ['fontFamily', 'fontWeight'] } }, colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } }, layout: { type: Type.ARRAY, items: { oneOf: [textElementSchema, imageElementSchema] } } }, required: ['imagePrompt', 'fontSuggestions', 'colorPalette', 'layout']
    };
    
    const contents = userImageBase64 
        ? { parts: [ { text: `Crie o plano de design para: ${fullBrief}` }, { inlineData: { data: userImageBase64.split(',')[1], mimeType: 'image/png' } } ]}
        : `Crie o plano de design para: ${fullBrief}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema,
            }
        });

        const jsonStr = response.text.trim();
        if (typeof jsonStr === 'string') {
            return JSON.parse(jsonStr) as DesignBrief;
        }
        return jsonStr as DesignBrief;

    } catch (error) {
        console.error("Error generating design brief:", error);
        throw new Error("Falha ao criar o plano de design. A IA pode estar sobrecarregada. Tente novamente.");
    }
};