import { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { imgSrc } from "@/lib/api";

interface ImageLightboxModalProps {
  images: { url: string; id?: number }[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

export default function ImageLightboxModal({
  images,
  initialIndex = 0,
  open,
  onClose,
}: ImageLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
  }, [initialIndex, open]);

  // Handle browser back button (popstate) to close lightbox without exiting page
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ modal: "lightbox" }, "");

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [open, onClose]);

  if (!open || !images || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const handleZoomIn = () => setZoom((z) => Math.min(3, z + 0.5));
  const handleZoomOut = () => setZoom((z) => Math.max(1, z - 0.5));
  const handleResetZoom = () => setZoom(1);

  const handlePrev = () => {
    setZoom(1);
    setCurrentIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  };

  const handleNext = () => {
    setZoom(1);
    setCurrentIndex((i) => (i < images.length - 1 ? i + 1 : 0));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 transition-all duration-200">
      {/* Top Header Control Bar */}
      <div className="flex items-center justify-between z-10 text-white px-2 py-2">
        <div className="text-xs font-semibold bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
          {currentIndex + 1} / {images.length}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white transition-all active:scale-95 cursor-pointer"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-white/80 min-w-8 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white transition-all active:scale-95 cursor-pointer"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          {zoom > 1 && (
            <button
              onClick={handleResetZoom}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 cursor-pointer"
              aria-label="Reset zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all ml-2 active:scale-95 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Display */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden my-2">
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 z-10 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-xs transition-all active:scale-95 cursor-pointer"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
          <img
            src={imgSrc(currentImage.url)}
            alt="Full size product view"
            className="max-h-[80vh] max-w-full object-contain transition-transform duration-200 ease-out select-none cursor-zoom-in"
            style={{ transform: `scale(${zoom})` }}
            onClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
          />
        </div>

        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 z-10 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-xs transition-all active:scale-95 cursor-pointer"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Selector Bar */}
      {images.length > 1 && (
        <div className="flex justify-center items-center gap-2 overflow-x-auto py-2 z-10 no-scrollbar">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setZoom(1);
                setCurrentIndex(idx);
              }}
              className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                idx === currentIndex
                  ? "border-primary scale-105"
                  : "border-white/20 opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={imgSrc(img.url)}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
