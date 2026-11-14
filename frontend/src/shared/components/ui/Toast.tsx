import React, { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string | null;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "success",
  onClose,
  duration = 3500,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const styles: Record<ToastType, string> = {
    success: "bg-emerald-600 text-white border-emerald-700",
    error: "bg-red-600 text-white border-red-700",
    info: "bg-gray-800 text-white border-gray-900",
  };

  const icons: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all animate-bounce-once ${styles[type]}`}
    >
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-bold">
        {icons[type]}
      </span>
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-white/80 hover:text-white text-xs font-bold"
        aria-label="Cerrar notificación"
      >
        ✕
      </button>
    </div>
  );
};
