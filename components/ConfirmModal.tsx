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
        <div className="fixed inset-0 z-[250] bg-white p-1 animate-in fade-in duration-200">
            <div className="w-full h-full flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-md text-center">
                    <h3 className="text-3xl font-black text-black mb-4">{title}</h3>
                    <p className="text-xl text-gray-600 mb-10 leading-relaxed font-medium">{message}</p>

                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={onConfirm}
                            className={`w-full py-4 text-white text-xl font-bold rounded-xl transition-all shadow-lg active:scale-95 ${isDestructive
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-black hover:bg-gray-800'
                                }`}
                        >
                            {confirmText}
                        </button>
                        {!hideCancel && (
                            <button
                                onClick={onCancel}
                                className="w-full py-4 bg-gray-100 text-gray-900 text-xl font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-95"
                            >
                                {cancelText}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
