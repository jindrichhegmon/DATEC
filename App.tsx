
import React, { useState, useCallback } from 'react';
import { generateImage, editImage } from './services/geminiService';
import Spinner from './components/Spinner';
import { Icon } from './components/Icon';

type LoadingTask = 'generate' | 'edit';
type ImageState = { url: string; mimeType: string };

// Helper function to download image
const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- Sub-components defined outside App to prevent re-creation on re-render ---

interface ImageCardProps {
    imageUrl: string | null;
    title: string;
    isLoading: boolean;
    placeholder: React.ReactNode;
    onDownload: () => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ imageUrl, title, isLoading, placeholder, onDownload }) => (
    <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-200">{title}</h2>
            {imageUrl && (
                <button
                    onClick={onDownload}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                    <Icon type="download" className="w-4 h-4" />
                    Download
                </button>
            )}
        </div>
        <div className="aspect-square w-full rounded-xl bg-gray-800 border-2 border-dashed border-gray-700 flex items-center justify-center relative overflow-hidden">
            {isLoading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
                    <Spinner className="w-12 h-12" />
                    <p className="mt-4 text-gray-300">Working on it...</p>
                </div>
            )}
            {imageUrl ? (
                <img src={imageUrl} alt={title} className="w-full h-full object-contain" />
            ) : (
                placeholder
            )}
        </div>
    </div>
);


// --- Main App Component ---

const App: React.FC = () => {
    const [generatedImage, setGeneratedImage] = useState<ImageState | null>(null);
    const [editedImage, setEditedImage] = useState<ImageState | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingTask, setLoadingTask] = useState<LoadingTask | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');

    const handleGenerate = async () => {
        if (!prompt || isLoading) return;
        setIsLoading(true);
        setLoadingTask('generate');
        setError(null);
        setGeneratedImage(null);
        setEditedImage(null);

        try {
            const { base64, mimeType } = await generateImage(prompt);
            setGeneratedImage({ url: `data:${mimeType};base64,${base64}`, mimeType });
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred during image generation.');
        } finally {
            setIsLoading(false);
            setLoadingTask(null);
            setPrompt('');
        }
    };
    
    const handleEdit = async () => {
        if (!prompt || !generatedImage || isLoading) return;
        setIsLoading(true);
        setLoadingTask('edit');
        setError(null);
        setEditedImage(null);

        try {
            const base64Data = generatedImage.url.split(',')[1];
            const { base64, mimeType } = await editImage(prompt, base64Data, generatedImage.mimeType);
            setEditedImage({ url: `data:${mimeType};base64,${base64}`, mimeType });
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred during image editing.');
        } finally {
            setIsLoading(false);
            setLoadingTask(null);
            setPrompt('');
        }
    };

    const handleReset = useCallback(() => {
        setGeneratedImage(null);
        setEditedImage(null);
        setError(null);
        setPrompt('');
        setIsLoading(false);
        setLoadingTask(null);
    }, []);

    const renderHeader = () => (
        <header className="p-4 sm:p-6 flex justify-between items-center border-b border-gray-800">
            <h1 className="text-2xl font-bold text-white">Gemini Image Studio</h1>
            {generatedImage && (
                <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
                >
                    <Icon type="reset" className="w-4 h-4" />
                    Start Over
                </button>
            )}
        </header>
    );

    const renderError = () => {
        if (!error) return null;
        return (
            <div className="p-4 mx-auto max-w-4xl text-center bg-red-900/50 text-red-300 border border-red-700 rounded-lg">
                <strong>Error:</strong> {error}
            </div>
        );
    };

    const renderGeneratorView = () => (
        <div className="flex flex-col items-center justify-center p-8 gap-6 text-center">
            <Icon type="sparkles" className="w-16 h-16 text-indigo-400" />
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white">Unleash Your Creativity</h2>
            <p className="max-w-2xl text-lg text-gray-400">
                Describe the image you want to create. Be as specific or as imaginative as you like.
                Try "A cinematic shot of a raccoon in a library, wearing a monocle".
            </p>
            <div className="w-full max-w-2xl mt-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A futuristic city skyline at sunset, with flying cars..."
                    className="w-full p-4 text-base text-white bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    rows={3}
                    disabled={isLoading}
                />
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !prompt}
                    className="mt-4 w-full flex items-center justify-center gap-3 px-6 py-4 text-lg font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? <><Spinner className="w-6 h-6"/>Generating...</> : <><Icon type="sparkles" className="w-6 h-6" />Generate Image</>}
                </button>
            </div>
        </div>
    );
    
    const renderEditorView = () => (
        <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-6">
                {generatedImage && 
                    <ImageCard 
                        title="Generated Image"
                        imageUrl={generatedImage.url}
                        isLoading={false}
                        placeholder={<></>}
                        onDownload={() => downloadImage(generatedImage.url, 'generated-image.png')}
                    />
                }
                
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-bold text-gray-200">Edit your image</h2>
                    <p className="text-gray-400">Describe the changes you want to make. For example, "Add a retro filter" or "Make the sky look like a galaxy".</p>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., Change the background to a sunny beach..."
                        className="w-full p-4 text-base text-white bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                        rows={3}
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleEdit}
                        disabled={isLoading || !prompt}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3 text-md font-bold text-white bg-green-600 rounded-lg hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                       {isLoading && loadingTask === 'edit' ? <><Spinner className="w-5 h-5"/>Applying...</> : <><Icon type="edit" className="w-5 h-5" />Apply Edit</>}
                    </button>
                </div>
            </div>
            
            <ImageCard 
                title="Edited Image"
                imageUrl={editedImage?.url ?? null}
                isLoading={isLoading && loadingTask === 'edit'}
                placeholder={
                    <div className="text-center text-gray-500 p-4">
                        <Icon type="edit" className="w-12 h-12 mx-auto" />
                        <p className="mt-2 font-semibold">Your edited image will appear here.</p>
                    </div>
                }
                onDownload={() => {
                    if (editedImage) {
                        downloadImage(editedImage.url, 'edited-image.png')
                    }
                }}
            />
        </div>
    );


    return (
        <div className="min-h-screen bg-gray-900 text-white selection:bg-indigo-500/30">
            {renderHeader()}
            <main className="py-8">
                {renderError()}
                <div className="max-w-7xl mx-auto">
                    {!generatedImage ? renderGeneratorView() : renderEditorView()}
                </div>
            </main>
        </div>
    );
};

export default App;
