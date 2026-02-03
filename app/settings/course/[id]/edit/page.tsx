'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Save, Plus, Trash2, MapPin, Hash, Flag, Edit3, X, Check } from 'lucide-react';
import { getAllCourses } from '@/app/actions/get-all-courses';
import { updateCourse } from '@/app/actions/update-course';
import ConfirmModal from '@/components/ConfirmModal';

export default function EditCoursePage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [course, setCourse] = useState<any>(null);
    const [courseName, setCourseName] = useState('');
    const [tees, setTees] = useState<any[]>([]);
    const [holes, setHoles] = useState<any[]>([]);

    // Modal state
    const [editingHoleId, setEditingHoleId] = useState<string | null>(null);
    const [confirmConfig, setConfirmConfig] = useState<any>(null);

    useEffect(() => {
        async function loadCourse() {
            setLoading(true);
            try {
                const allCourses = await getAllCourses();
                const found = allCourses.find((c: any) => c.id === courseId);
                if (found) {
                    setCourse(found);
                    setCourseName(found.name);
                    setTees(found.teeBoxes || []);
                    // Ensure we have 18 holes, fill if missing
                    const existingHoles = (found.holes || []).sort((a: any, b: any) => a.holeNumber - b.holeNumber);
                    const completeHoles = [];
                    for (let i = 1; i <= 18; i++) {
                        const h = existingHoles.find((eh: any) => eh.holeNumber === i);
                        completeHoles.push(h || { holeNumber: i, par: 4, difficulty: i, latitude: null, longitude: null, elements: [] });
                    }
                    setHoles(completeHoles);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadCourse();
    }, [courseId]);

    const handleHoleChange = (index: number, field: string, value: any) => {
        const newHoles = [...holes];
        newHoles[index] = { ...newHoles[index], [field]: value };
        setHoles(newHoles);
    };

    const handleTeeChange = (index: number, field: string, value: any) => {
        const newTees = [...tees];
        newTees[index] = { ...newTees[index], [field]: value };
        setTees(newTees);
    };

    const addTee = () => {
        setTees([...tees, { name: 'New Tee', rating: 72, slope: 113, yardages: Array(18).fill(0) }]);
    };

    const removeTee = (index: number) => {
        setTees(tees.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateCourse(courseId, {
                name: courseName,
                tees,
                holes: holes.map(h => ({
                    ...h,
                    latitude: h.latitude ? parseFloat(h.latitude.toString()) : null,
                    longitude: h.longitude ? parseFloat(h.longitude.toString()) : null,
                    difficulty: h.difficulty ? parseInt(h.difficulty.toString()) : null,
                    par: parseInt(h.par.toString())
                }))
            });
            router.push('/settings');
        } catch (err) {
            console.error(err);
            alert('Failed to save course');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors" title="Back">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-black italic uppercase tracking-tighter truncate px-2">Edit Course: {courseName}</h1>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-black text-white px-6 py-2 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {saving ? <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" /> : <Save className="w-4 h-4" />}
                        Save
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 space-y-8">
                {/* Course Basic Info */}
                <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Course Name</label>
                        <input
                            type="text"
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                            className="w-full p-1 bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl transition-all outline-none font-bold text-[15pt]"
                            placeholder="e.g. Augusta National"
                        />
                    </div>

                    {/* Tee Boxes */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <Flag className="w-4 h-4 text-gray-400" />
                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Tee Boxes</h2>
                            </div>
                            <button onClick={addTee} className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Add Tee
                            </button>
                        </div>
                        <div className="space-y-2">
                            {tees.map((tee, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-2xl p-4 flex flex-wrap items-center gap-4 border border-gray-100">
                                    <div className="flex-1 min-w-[150px] space-y-1">
                                        <label className="text-[10px] uppercase text-gray-400 font-bold">Tee Name</label>
                                        <input
                                            type="text"
                                            value={tee.name}
                                            onChange={(e) => handleTeeChange(idx, 'name', e.target.value)}
                                            className="w-full bg-white p-1 rounded-xl font-bold border border-transparent focus:border-black outline-none text-[15pt]"
                                            placeholder="Tee Name"
                                            title="Tee Name"
                                        />
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <label className="text-[10px] uppercase text-gray-400 font-bold">Rating</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={tee.rating}
                                            onChange={(e) => handleTeeChange(idx, 'rating', e.target.value)}
                                            className="w-full bg-white p-1 rounded-xl font-bold border border-transparent focus:border-black outline-none text-center text-[15pt]"
                                            placeholder="72.0"
                                            title="Course Rating"
                                        />
                                    </div>
                                    <div className="w-20 space-y-1">
                                        <label className="text-[10px] uppercase text-gray-400 font-bold">Slope</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={tee.slope}
                                            onChange={(e) => handleTeeChange(idx, 'slope', e.target.value)}
                                            className="w-full bg-white p-1 rounded-xl font-bold border border-transparent focus:border-black outline-none text-center text-[15pt]"
                                            placeholder="113"
                                            title="Slope Rating"
                                        />
                                    </div>
                                    <button onClick={() => removeTee(idx)} className="p-2 text-red-400 hover:text-red-600 self-end mb-1" title="Remove Tee Box">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Hole Data Section */}
                <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-10">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Hole Data</h2>
                        <p className="text-gray-400 text-sm mt-1">Edit hole Par and Hardness.</p>
                    </div>

                    {[
                        { title: 'Front Nine', holesSlice: holes.slice(0, 9), offset: 0 },
                        { title: 'Back Nine', holesSlice: holes.slice(9, 18), offset: 9 }
                    ].map((section) => (
                        <div key={section.title} className="space-y-4">
                            <h3 className="text-lg font-black text-gray-900">{section.title}</h3>
                            <div className="overflow-x-auto -mx-8 px-8">
                                <table className="w-full border-separate border-spacing-[1px]">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-1 py-4 text-left font-black text-gray-400 uppercase tracking-widest text-[15pt] border-b border-gray-100">Hole</th>
                                            {section.holesSlice.map((h) => (
                                                <th key={h.holeNumber} className="px-1 py-4 text-center font-black text-gray-900 border-b border-gray-100 min-w-[60px] text-[15pt]">{h.holeNumber}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        <tr>
                                            <td className="px-2 py-1 text-left font-black text-gray-900 text-[15pt] whitespace-nowrap">Par</td>
                                            {section.holesSlice.map((h, idx) => (
                                                <td key={h.holeNumber} className="p-0 text-center">
                                                    <div className="flex justify-center items-center">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={h.par}
                                                            onChange={(e) => handleHoleChange(section.offset + idx, 'par', e.target.value)}
                                                            className="w-14 h-14 text-center bg-white border border-gray-200 rounded-xl font-bold focus:border-black outline-none p-1 text-[15pt]"
                                                            placeholder="4"
                                                            title={`Hole ${h.holeNumber} Par`}
                                                        />
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="px-2 py-1 text-left font-black text-gray-900 text-[15pt] whitespace-nowrap">Hardness</td>
                                            {section.holesSlice.map((h, idx) => (
                                                <td key={h.holeNumber} className="p-0 text-center">
                                                    <div className="flex justify-center items-center">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={h.difficulty || ''}
                                                            onChange={(e) => handleHoleChange(section.offset + idx, 'difficulty', e.target.value)}
                                                            className="w-14 h-14 text-center bg-white border border-gray-200 rounded-xl font-bold focus:border-black outline-none p-1 text-[15pt]"
                                                            placeholder="10"
                                                            title={`Hole ${h.holeNumber} Hardness`}
                                                        />
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="px-2 py-1 text-left font-black text-gray-900 text-[15pt] whitespace-nowrap">CG</td>
                                            {section.holesSlice.map((h, idx) => (
                                                <td key={h.holeNumber} className="p-0 text-center">
                                                    <div className="flex justify-center items-center">
                                                        <input
                                                            type="text"
                                                            value={h.latitude || ''}
                                                            onChange={(e) => handleHoleChange(section.offset + idx, 'latitude', e.target.value)}
                                                            className="w-full min-w-[120px] p-1 text-[15pt] text-center bg-white border border-gray-200 rounded-xl font-medium focus:border-black outline-none"
                                                            placeholder="Lat"
                                                        />
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="px-2 py-4 text-left font-black text-gray-900 text-[15pt] whitespace-nowrap">Elements</td>
                                            {section.holesSlice.map((h, idx) => (
                                                <td key={h.holeNumber} className="p-0 text-center">
                                                    <div className="flex justify-center items-center py-2">
                                                        <button
                                                            onClick={() => setEditingHoleId(h.id || `temp-${h.holeNumber}`)}
                                                            className="bg-blue-600 text-white w-14 h-10 rounded-xl text-[12pt] font-black uppercase active:scale-95 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center"
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </section>
            </main>

            {/* Elements Modal Placeholder */}
            {editingHoleId && (
                <ElementsModal
                    hole={holes.find(h => (h.id === editingHoleId) || (`temp-${h.holeNumber}` === editingHoleId))}
                    onClose={() => setEditingHoleId(null)}
                    onSave={(updatedHole) => {
                        const idx = holes.findIndex(h => (h.id === editingHoleId) || (`temp-${h.holeNumber}` === editingHoleId));
                        if (idx !== -1) {
                            const newHoles = [...holes];
                            newHoles[idx] = updatedHole;
                            setHoles(newHoles);
                        }
                        setEditingHoleId(null);
                    }}
                />
            )}
        </div>
    );
}

function ElementsModal({ hole, onClose, onSave }: { hole: any, onClose: () => void, onSave: (h: any) => void }) {
    const [elements, setElements] = useState<any[]>(hole.elements || []);

    const addElement = (side: 'LEFT' | 'RIGHT') => {
        const sideElements = elements.filter(e => e.side === side);
        setElements([...elements, {
            side,
            elementNumber: sideElements.length + 1,
            water: false,
            bunker: false,
            tree: false,
            frontLatitude: null,
            frontLongitude: null,
            backLatitude: null,
            backLongitude: null
        }]);
    };

    const updateElement = (index: number, field: string, value: any) => {
        const newElements = [...elements];
        newElements[index] = { ...newElements[index], [field]: value };
        setElements(newElements);
    };

    const handleLatLongInput = (index: number, type: 'front' | 'back', input: string) => {
        const parts = input.trim().split(/[\s,]+/);
        const newElements = [...elements];
        if (parts.length >= 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            if (type === 'front') {
                newElements[index].frontLatitude = isNaN(lat) ? null : lat;
                newElements[index].frontLongitude = isNaN(lng) ? null : lng;
            } else {
                newElements[index].backLatitude = isNaN(lat) ? null : lat;
                newElements[index].backLongitude = isNaN(lng) ? null : lng;
            }
        } else if (input === '') {
            if (type === 'front') {
                newElements[index].frontLatitude = null;
                newElements[index].frontLongitude = null;
            } else {
                newElements[index].backLatitude = null;
                newElements[index].backLongitude = null;
            }
        }
        setElements(newElements);
    };

    const formatCoord = (lat: any, lng: any) => {
        if (lat === null || lng === null || lat === undefined || lng === undefined) return '';
        return `${lat} ${lng}`;
    };

    const removeElement = (index: number) => {
        setElements(elements.filter((_, i) => i !== index));
    };

    const renderSide = (side: 'LEFT' | 'RIGHT') => {
        const sideElements = elements
            .map((el, originalIndex) => ({ ...el, originalIndex }))
            .filter(e => e.side === side)
            .sort((a, b) => b.elementNumber - a.elementNumber);

        return (
            <div className="flex-1 space-y-6">
                <div className="text-center pb-2 border-b-2 border-gray-100 mb-6">
                    <h3 className="text-2xl font-black text-gray-900">{side === 'LEFT' ? 'Left Side' : 'Right Side'}</h3>
                </div>

                <div className="space-y-4">
                    {sideElements.map((el) => (
                        <div key={el.originalIndex} className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 space-y-4 relative group">
                            <button
                                onClick={() => removeElement(el.originalIndex)}
                                className="absolute top-4 right-4 p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                title="Remove Element"
                            >
                                <X size={16} />
                            </button>

                            <h4 className="text-xl font-black text-gray-900">Element {el.elementNumber}</h4>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-400">Front (Lat Long)</label>
                                    <input
                                        type="text"
                                        placeholder="Lat Long"
                                        defaultValue={formatCoord(el.frontLatitude, el.frontLongitude)}
                                        onBlur={(e) => handleLatLongInput(el.originalIndex, 'front', e.target.value)}
                                        className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-black outline-none placeholder:text-gray-300 shadow-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-400">Back (Lat Long)</label>
                                    <input
                                        type="text"
                                        placeholder="Lat Long"
                                        defaultValue={formatCoord(el.backLatitude, el.backLongitude)}
                                        onBlur={(e) => handleLatLongInput(el.originalIndex, 'back', e.target.value)}
                                        className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-black outline-none placeholder:text-gray-300 shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 items-center pt-2">
                                <label className="flex items-center gap-2 cursor-pointer group/check">
                                    <input
                                        type="checkbox"
                                        checked={el.water}
                                        onChange={(e) => updateElement(el.originalIndex, 'water', e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                                    />
                                    <span className="text-sm font-bold text-gray-600">Water</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group/check">
                                    <input
                                        type="checkbox"
                                        checked={el.bunker}
                                        onChange={(e) => updateElement(el.originalIndex, 'bunker', e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                                    />
                                    <span className="text-sm font-bold text-gray-600">Bunker</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group/check">
                                    <input
                                        type="checkbox"
                                        checked={el.tree}
                                        onChange={(e) => updateElement(el.originalIndex, 'tree', e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                                    />
                                    <span className="text-sm font-bold text-gray-600">Tree</span>
                                </label>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={() => addElement(side)}
                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-3xl text-sm font-black uppercase text-gray-400 hover:border-black hover:text-black transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Add {side === 'LEFT' ? 'Left' : 'Right'} Element
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom duration-300 flex flex-col">
            {/* Modal Header */}
            <div className="max-w-6xl mx-auto w-full px-8 py-8 flex items-center justify-between">
                <h2 className="text-3xl font-black text-gray-900">Hole {hole.holeNumber} Elements</h2>
                <button
                    onClick={onClose}
                    className="bg-black text-white px-10 py-3 rounded-full font-black text-xl active:scale-95 transition-all shadow-xl hover:bg-gray-900"
                >
                    Close
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-16">
                    {renderSide('LEFT')}
                    {renderSide('RIGHT')}
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="p-8 border-t border-gray-100 bg-gray-50/50">
                <div className="max-w-6xl mx-auto flex gap-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-5 bg-white text-gray-500 rounded-3xl font-black uppercase tracking-widest text-sm border border-gray-200 active:scale-[0.98] transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave({ ...hole, elements })}
                        className="flex-1 py-5 bg-black text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-2xl active:scale-[0.98] transition-all shadow-black/20"
                    >
                        Apply To Hole #{hole.holeNumber}
                    </button>
                </div>
            </div>
        </div>
    );
}
