'use client';

type ConfirmModalProps = {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
    hideCancel?: boolean;
};

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isDestructive = false,
    hideCancel = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[250] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                <div className="p-4 text-center">
                    <h3 className="text-xl font-black text-gray-900 mb-2">{title}</h3>
                    <p className="text-[14pt] text-gray-600 mb-4 leading-relaxed">{message}</p>

                    <div className="flex gap-3 justify-center">
                        {!hideCancel && (
                            <button
                                onClick={onCancel}
                                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 text-[14pt] font-bold rounded-xl hover:bg-gray-200 transition-colors active:scale-95"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-3 text-white text-[14pt] font-bold rounded-xl transition-colors shadow-lg active:scale-95 ${isDestructive
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-black hover:bg-gray-800'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
