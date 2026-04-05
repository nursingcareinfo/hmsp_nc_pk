import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraCaptureProps {
  onCapture: (images: string | string[]) => void;
  onClose: () => void;
  title?: string;
  multiple?: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose, title = "Capture Image", multiple = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [currentCapture, setCurrentCapture] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, // Prefer back camera
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please ensure you have granted permission.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  const capture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        
        if (multiple) {
          setCapturedImages(prev => [...prev, dataUrl]);
          // In multiple mode, we don't stop the camera, we just keep taking photos
        } else {
          setCurrentCapture(dataUrl);
          stopCamera();
        }
      }
    }
  }, [multiple]);

  const retake = () => {
    setCurrentCapture(null);
    startCamera();
  };

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const confirm = () => {
    if (multiple) {
      if (capturedImages.length > 0) {
        onCapture(capturedImages);
        onClose();
      }
    } else if (currentCapture) {
      onCapture(currentCapture);
      onClose();
    }
  };

  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-teal-600 text-white">
          <div className="flex flex-col">
            <h3 className="font-bold">{title}</h3>
            {multiple && (
              <p className="text-[10px] uppercase tracking-widest opacity-80 font-bold">
                Batch Mode: {capturedImages.length} captured
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden shrink-0">
            {error ? (
              <div className="p-8 text-center text-white">
                <p className="mb-4">{error}</p>
                <button 
                  onClick={startCamera}
                  className="px-6 py-2 bg-teal-500 rounded-full font-bold"
                >
                  Retry
                </button>
              </div>
            ) : currentCapture && !multiple ? (
              <img src={currentCapture} alt="Captured" className="w-full h-full object-contain" />
            ) : (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
            
            {multiple && capturedImages.length > 0 && (
              <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {capturedImages.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-lg border-2 border-white shadow-lg shrink-0 overflow-hidden group">
                    <img src={img} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImage(idx)}
                      className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-8 flex justify-center gap-4 bg-slate-50 shrink-0">
            {(!currentCapture || multiple) ? (
              <div className="flex flex-col items-center gap-4 w-full">
                <button 
                  onClick={capture}
                  disabled={!isStreaming}
                  className="w-16 h-16 bg-teal-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-90"
                >
                  <Camera size={32} />
                </button>
                {multiple && capturedImages.length > 0 && (
                  <button 
                    onClick={confirm}
                    className="flex items-center gap-2 px-8 py-3 bg-teal-600 text-white rounded-2xl font-bold hover:bg-teal-700 transition-all shadow-lg"
                  >
                    <Check size={20} />
                    Finish & Use {capturedImages.length} Photos
                  </button>
                )}
              </div>
            ) : (
              <>
                <button 
                  onClick={retake}
                  className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                >
                  <RefreshCw size={20} />
                  Retake
                </button>
                <button 
                  onClick={confirm}
                  className="flex items-center gap-2 px-8 py-3 bg-teal-600 text-white rounded-2xl font-bold hover:bg-teal-700 transition-all shadow-lg"
                >
                  <Check size={20} />
                  Use Photo
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
