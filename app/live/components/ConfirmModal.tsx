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
        <div className="fixed inset-0 bg-white flex flex-col z-[250] animate-in fade-in zoom-in duration-200">
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
                <div className="max-w-md w-full">
                    <h3 className="text-[24pt] font-black text-gray-900 mb-6 tracking-tight">{title}</h3>
                    <p className="text-[16pt] text-gray-600 mb-8 leading-relaxed font-medium">{message}</p>
                </div>
            </div>

            <div className="flex w-full border-t border-gray-100 bg-white sticky bottom-0">
                {!hideCancel && (
                    <button
                        onClick={onCancel}
                        className="flex-1 py-10 bg-black text-white text-[15pt] font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md active:scale-95 border-r border-gray-100 cursor-pointer"
                    >
                        {cancelText}
                    </button>
                )}
                <button
                    onClick={onConfirm}
                    className={`flex-1 py-10 text-white text-[18pt] font-black uppercase tracking-widest transition-all active:brightness-90 cursor-pointer ${isDestructive
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-black hover:bg-gray-900'
                        } ${hideCancel ? 'w-full' : ''}`}
                >
                    {confirmText}
                </button>
            </div>
        </div>
    );
}
