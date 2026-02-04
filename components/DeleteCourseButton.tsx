'use client';

import { useTransition, useState } from 'react';
import { deleteCourse } from '@/app/actions/update-course';
import { useRouter } from 'next/navigation';
import ConfirmModal from './ConfirmModal';

export default function DeleteCourseButton({ courseId, canDelete }: { courseId: string, canDelete: boolean }) {
    const [isPending, startTransition] = useTransition();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [modalConfig, setModalConfig] = useState<{ title: string, message: string, showInput?: boolean } | null>(null);
    const router = useRouter();

    const handleDeleteClick = () => {
        setPassword('');
        setModalConfig({
            title: 'Password Required',
            message: 'Enter password to delete this course:',
            showInput: true
        });
        setIsModalOpen(true);
    };

    const handleConfirm = () => {
        if (modalConfig?.showInput) {
            if (password !== 'cpgc-Delete') {
                setModalConfig({
                    title: 'Error',
                    message: 'Incorrect password.'
                });
                return;
            }

            setModalConfig({
                title: 'Confirm Delete',
                message: 'Are you sure you want to permanently delete this course?'
            });
            return;
        }

        setIsModalOpen(false);
        startTransition(async () => {
            try {
                const result = await deleteCourse(courseId);
                if (result.success) {
                    router.refresh();
                } else {
                    setModalConfig({ title: 'Error', message: result.error || 'Delete failed.' });
                    setIsModalOpen(true);
                }
            } catch (error) {
                setModalConfig({ title: 'Error', message: 'An unexpected error occurred.' });
                setIsModalOpen(true);
                console.error(error);
            }
        });
    };

    if (!canDelete) {
        return null;
    }

    return (
        <>
            <button
                onClick={handleDeleteClick}
                disabled={isPending}
                className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-4 py-2 text-[15pt] rounded-lg transition-colors border border-red-200"
            >
                {isPending ? 'Deleting...' : 'Delete'}
            </button>

            {modalConfig && (
                <ConfirmModal
                    isOpen={isModalOpen}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    isDestructive={true}
                    showInput={modalConfig.showInput}
                    inputPlaceholder="Password"
                    inputValue={password}
                    onInputChange={setPassword}
                    onConfirm={handleConfirm}
                    onCancel={() => setIsModalOpen(false)}
                />
            )}
        </>
    );
}
