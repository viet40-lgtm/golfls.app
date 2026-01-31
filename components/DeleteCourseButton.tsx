'use client';

import { useTransition } from 'react';
import { deleteCourse } from '@/app/actions/update-course';
import { useRouter } from 'next/navigation';

export default function DeleteCourseButton({ courseId, canDelete }: { courseId: string, canDelete: boolean }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleDelete = () => {
        const password = prompt("Enter password to delete this course:");
        if (password !== 'cpgc-Delete') {
            if (password) alert('Incorrect password.');
            return;
        }

        startTransition(async () => {
            try {
                const result = await deleteCourse(courseId);
                if (result.success) {
                    router.refresh();
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                alert('An unexpected error occurred.');
                console.error(error);
            }
        });
    };

    if (!canDelete) {
        return null;
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-4 py-2 text-[15pt] rounded-lg transition-colors border border-red-200"
        >
            {isPending ? 'Deleting...' : 'Delete'}
        </button>
    );
}
