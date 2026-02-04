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
        <div className="fixed inset-0 bg-white z-[250] flex flex-col justify-center items-center p-4 animate-in fade-in duration-200">
            <div className="w-full h-full flex flex-col justify-center items-center max-w-none">
                <div className="text-center w-full mx-auto">
                    <h3 className="text-[24pt] font-black text-gray-900 mb-4">{title}</h3>
                    <p className="text-[18pt] text-gray-600 mb-12 leading-relaxed px-4">{message}</p>

                    <div className="flex flex-col gap-4 w-full px-4">
                        <button
                            onClick={onConfirm}
                            className={`w-full py-4 text-white text-[18pt] font-bold rounded-full transition-colors shadow-xl active:scale-95 ${isDestructive
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-black hover:bg-gray-800'
                                }`}
                        >
                            {confirmText}
                        </button>
                        {!hideCancel && (
                            <button
                                onClick={onCancel}
                                className="w-full py-4 bg-black text-white text-[18pt] font-bold rounded-full transition-colors shadow-xl active:scale-95"
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
