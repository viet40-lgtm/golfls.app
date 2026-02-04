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
    showInput?: boolean;
    inputType?: 'text' | 'password';
    inputPlaceholder?: string;
    inputValue?: string;
    onInputChange?: (val: string) => void;
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
    hideCancel = false,
    showInput = false,
    inputType = 'text',
    inputPlaceholder = '',
    inputValue = '',
    onInputChange
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-white z-[250] flex flex-col justify-center items-center p-4 animate-in fade-in duration-200">
            <div className="w-full h-full flex flex-col justify-center items-center max-w-none">
                <div className="text-center w-full mx-auto">
                    <h3 className="text-[24pt] font-black text-gray-900 mb-4">{title}</h3>
                    <p className="text-[18pt] text-gray-600 mb-8 leading-relaxed px-4">{message}</p>

                    {showInput && (
                        <div className="w-full px-4 mb-8">
                            <input
                                type={inputType}
                                value={inputValue}
                                onChange={(e) => onInputChange?.(e.target.value)}
                                placeholder={inputPlaceholder}
                                className="w-full px-4 py-4 bg-gray-50 border-2 border-zinc-200 focus:bg-white focus:border-black rounded-2xl transition-all outline-none font-bold text-[18pt] text-black text-center"
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-4 w-full px-4">
                        <button
                            onClick={onConfirm}
                            className={`w-full py-4 text-white text-[18pt] font-black uppercase tracking-widest rounded-2xl transition-colors shadow-xl active:scale-95 ${isDestructive
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-black hover:bg-zinc-800'
                                }`}
                        >
                            {confirmText}
                        </button>
                        {!hideCancel && (
                            <button
                                onClick={onCancel}
                                className="w-full py-4 bg-white text-black border-2 border-black text-[18pt] font-black uppercase tracking-widest rounded-2xl transition-colors shadow-lg active:scale-95"
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
