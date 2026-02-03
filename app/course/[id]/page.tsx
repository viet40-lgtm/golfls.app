'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, MapPin, Flag, Ruler, Hash, Info } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getAllCourses } from '@/app/actions/get-all-courses';

export default function CourseViewPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.id as string;
    const [course, setCourse] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadCourse() {
            setLoading(true);
            try {
                // Since this is a client component, we'll use the existing action or fetch via API if needed.
                // For now, let's use getAllCourses and find the one we need.
                const allCourses = await getAllCourses();
                const found = allCourses.find((c: any) => c.id === courseId);
                setCourse(found);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadCourse();
    }, [courseId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-black mb-4">Course Not Found</h1>
                <button onClick={() => router.back()} className="bg-black text-white px-6 py-2 rounded-xl font-bold">
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors"
                        title="Go Back"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-black italic uppercase tracking-tighter truncate px-2">{course.name}</h1>
                    <Link href={`/settings/course/${course.id}/edit`} className="text-xs font-black uppercase text-blue-600">
                        Edit
                    </Link>
                </div>
            </header>

            <main className="max-w-xl mx-auto p-4 space-y-6">
                {/* Course Stats Card */}
                <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-wrap gap-6 justify-between">
                    <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Holes</span>
                        <span className="text-2xl font-black">{course.holes?.length || 0}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Par</span>
                        <span className="text-2xl font-black">{course.holes?.reduce((acc: number, h: any) => acc + h.par, 0) || 0}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Tees</span>
                        <span className="text-2xl font-black">{course.teeBoxes?.length || 0}</span>
                    </div>
                </section>

                {/* Tee Boxes */}
                <section className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <Flag className="w-4 h-4 text-gray-400" />
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Tee Boxes</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {course.teeBoxes?.map((tee: any) => {
                            const teeName = tee.name.toLowerCase();
                            const bgClass =
                                teeName.includes('white') ? 'bg-white' :
                                    teeName.includes('blue') ? 'bg-blue-600' :
                                        teeName.includes('black') ? 'bg-black' :
                                            teeName.includes('red') ? 'bg-red-600' :
                                                teeName.includes('gold') || teeName.includes('yellow') ? 'bg-yellow-400' :
                                                    teeName.includes('green') ? 'bg-green-600' :
                                                        teeName.includes('silver') ? 'bg-gray-400' :
                                                            'bg-gray-200';

                            return (
                                <div key={tee.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full border border-gray-200 ${bgClass}`}></div>
                                        <span className="font-bold text-lg">{tee.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm font-bold text-gray-500">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] uppercase text-gray-300">Rating</span>
                                            <span>{tee.rating}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] uppercase text-gray-300">Slope</span>
                                            <span>{tee.slope}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] uppercase text-gray-300">Total Par</span>
                                            <span>{tee.par}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Holes Scorecard */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2 px-1">
                        <Hash className="w-4 h-4 text-gray-400" />
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Scorecard</h2>
                    </div>

                    {[
                        { title: 'FRONT NINE', holes: course.holes?.filter((h: any) => h.holeNumber >= 1 && h.holeNumber <= 9).sort((a: any, b: any) => a.holeNumber - b.holeNumber) || [] },
                        { title: 'BACK NINE', holes: course.holes?.filter((h: any) => h.holeNumber >= 10 && h.holeNumber <= 18).sort((a: any, b: any) => a.holeNumber - b.holeNumber) || [] }
                    ].map((section, idx) => {
                        const isBack = idx === 1;
                        const parSum = section.holes.reduce((acc: number, h: any) => acc + h.par, 0);
                        const totalPar = course.holes?.reduce((acc: number, h: any) => acc + h.par, 0);

                        return (
                            <div key={section.title} className="space-y-2">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{section.title}</h3>
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                                    <table className="w-full text-center border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-50">
                                                <th className="px-3 py-3 text-left text-[10px] font-black uppercase text-gray-400 bg-gray-50/50 w-20">Hole</th>
                                                {section.holes.map((h: any) => (
                                                    <th key={h.id} className="px-2 py-3 text-sm font-black text-gray-900 border-l border-gray-50">
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            {h.holeNumber}
                                                            {h.latitude && <div className="w-1 h-1 bg-blue-500 rounded-full" title="GPS Available" />}
                                                        </div>
                                                    </th>
                                                ))}
                                                <th className="px-3 py-3 text-[10px] font-black uppercase text-gray-400 bg-gray-50/50 border-l border-gray-100 w-12">{isBack ? 'IN' : 'OUT'}</th>
                                                {isBack && <th className="px-3 py-3 text-[10px] font-black uppercase text-gray-400 bg-gray-50/50 border-l border-gray-100 w-12">TOT</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b border-gray-50">
                                                <td className="px-3 py-3 text-left text-sm font-black text-gray-900 bg-gray-50/50">Par</td>
                                                {section.holes.map((h: any) => (
                                                    <td key={h.id} className="px-2 py-3 text-sm font-bold text-gray-600 border-l border-gray-50">{h.par}</td>
                                                ))}
                                                <td className="px-3 py-3 text-sm font-black text-gray-900 border-l border-gray-100 bg-gray-50/50">{parSum}</td>
                                                {isBack && <td className="px-3 py-3 text-sm font-black text-gray-900 border-l border-gray-100 bg-gray-200/50">{totalPar}</td>}
                                            </tr>
                                            <tr>
                                                <td className="px-3 py-3 text-left text-sm font-black text-gray-900 bg-gray-50/50">Hardness</td>
                                                {section.holes.map((h: any) => (
                                                    <td key={h.id} className="px-2 py-3 text-xs font-medium text-gray-400 border-l border-gray-50 italic">{h.difficulty || '-'}</td>
                                                ))}
                                                <td className="px-3 py-3 text-[10px] font-black text-gray-300 border-l border-gray-100 bg-gray-50/50">-</td>
                                                {isBack && <td className="px-3 py-3 text-[10px] font-black text-gray-300 border-l border-gray-100 bg-gray-50/50">-</td>}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </section>
            </main>
        </div>
    );
}
