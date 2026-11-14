import React from "react";

export type ConfirmVariant = "danger" | "warning" | "primary";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "primary",
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const variantStyles: Record<
    ConfirmVariant,
    { iconBg: string; iconColor: string; btnBg: string; icon: string }
  > = {
    danger: {
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      btnBg: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
      icon: "🗑️",
    },
    warning: {
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      btnBg: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
      icon: "⚠️",
    },
    primary: {
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      btnBg: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
      icon: "🚀",
    },
  };

  const currentStyle = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full p-6 transform transition-all">
        <div className="flex items-start gap-4">
          <div
            className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${currentStyle.iconBg} ${currentStyle.iconColor}`}
          >
            {currentStyle.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${currentStyle.btnBg}`}
          >
            {isLoading ? "Procesando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
