
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateImage = async (prompt: string): Promise<{ base64: string; mimeType: string }> => {
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/png',
      aspectRatio: '1:1',
    },
  });

  if (!response.generatedImages || response.generatedImages.length === 0) {
    throw new Error("Image generation failed: No images returned.");
  }

  const image = response.generatedImages[0];
  const base64ImageBytes: string = image.image.imageBytes;
  const mimeType = image.image.mimeType || 'image/png';

  return { base64: base64ImageBytes, mimeType };
};

export const editImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<{ base64: string; mimeType: string }> => {
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        },
        { text: prompt },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
     throw new Error("Image editing failed: Invalid response structure.");
  }

  for (const part of parts) {
    if (part.inlineData) {
      const base64ImageBytes: string = part.inlineData.data;
      const responseMimeType: string = part.inlineData.mimeType;
      return { base64: base64ImageBytes, mimeType: responseMimeType };
    }
  }

  throw new Error("Image editing failed: No image returned in response.");
};
