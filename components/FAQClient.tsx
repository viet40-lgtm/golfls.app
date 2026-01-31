'use client';

import { useState } from 'react';
import Link from 'next/link';
import CourseCalculator from '@/components/CourseCalculator';
import RulesModal from '@/components/RulesModal';

type Player = {
    id: string;
    name: string;
    index: number;
};

export default function FAQClient({ players }: { players: Player[] }) {
    const [modalData, setModalData] = useState<{ open: boolean; title: string; content: React.ReactNode }>({
        open: false,
        title: '',
        content: null
    });

    const openModal = (title: string, content: React.ReactNode) => {
        setModalData({ open: true, title, content });
    };

    const clubRules = (
        <div className="space-y-3">
            <section>
                <h3 className="text-[14pt] font-black text-gray-900 mb-3 border-b-2 border-green-500 inline-block">1. General - Local Club Rules</h3>
                <div className="space-y-3 text-[14pt] leading-relaxed">
                    <div className="space-y-1"><p className="font-bold text-gray-800 underline">1. Tees</p><p>Club Members will play ALL tournaments from the White Tees. Over 70 play the Gold, unless started the year from White.</p></div>
                    <div className="space-y-1"><p className="font-bold text-gray-800 underline">2. Putting</p><p>Sink ALL putts. No pickups on green.</p></div>
                    <div className="space-y-1"><p className="font-bold text-gray-800 underline">3. Out of Bounds</p><p>All roads, and fences - penalty one stroke and distance.</p></div>
                    <div className="space-y-1"><p className="font-bold text-gray-800 underline">4. Lost Ball</p><p>Play as Lateral Hazard – penalty one stroke. Drop ball in area where ball was lost.</p></div>
                    <div className="space-y-1"><p className="font-bold text-gray-800 underline">5. Water Hazards</p><p>If not indicated by yellow stakes and/or yellow lines, the margin shall be defined as 1 club length from the edge, drop 2 club lengths from point ball crossed edge of hazard not nearer hole - penalty one stroke.</p></div>
                    <div className="space-y-1"><p className="font-bold text-gray-800 underline">6. Lateral Water Hazard</p><p>If not indicated by red stakes and or red lines, the margin shall be defined as 1 club length from the edge, drop 2 club lengths from point ball crossed edge of hazard not nearer hole - penalty one stroke.</p></div>
                    <div className="space-y-1"><p className="font-bold text-gray-800 underline">7. Obstructions</p><p>Ball near pipes, bridges, benches, shelters, hydrants, sprinkler heads, etc, drop one club length from obstruction not nearer hole - no penalty.</p></div>
                    <div className="space-y-1"><p className="font-bold text-gray-800 underline">8. Casual Water</p><p>Ball in casual water, drop the required distance to improve the lie and the player's footing not nearer hole - no penalty.</p></div>
                    <div className="space-y-1"><p className="font-bold text-gray-800 underline">9. Ground Under Repair</p><p>Ball on ground under repair, drop 1 club length from the area not nearer hole - no penalty.</p></div>
                    <div className="space-y-1"><p className="font-bold text-gray-800 underline">10. Through the Green</p><p>a. Improve lie with the club head the length of a scorecard, including balls near trees, not nearer hole - no penalty.</p><p>b. Change ball in fairway or green – no penalty.</p></div>
                    <div className="space-y-1"><p className="font-bold text-gray-800 underline">11. Balls and Clubs</p><p>a. All USGA approved Balls and Clubs may be used. Balls should be clearly marked with a unique identifier.</p><p>b. Fourteen (14) club limit shall not be exceeded.</p></div>
                    <div className="space-y-1"><p className="font-bold text-gray-800 underline">12. Sand Traps</p><p>Balls that come to rest in an unnatural depression in the sand trap shall be allowed to smooth out trap and drop ball. Ball lies in its own pitch-mark shall be allowed no relief. Ball lands in grass in bunker you may ground your club, but not improve your lie.</p></div>
                    <div className="space-y-1"><p className="font-bold text-gray-800 underline">13. Cart Path/Drainage</p><p>Ball lands on cart path or in drainage ditch you may obtain relief, the nearest point of relief not nearer hole and drop within one club length - no penalty.</p></div>
                    <div className="space-y-1"><p className="font-bold text-gray-800 underline">14. Distance Measuring Device</p><p>Distance-measuring device allowed.</p></div>
                    <div className="space-y-1"><p className="font-bold text-gray-800 underline">15. 40 Second Rule</p><p>40 Second Rule at all times (a player should play his shot in 40 seconds or less once there is no interference or nearby distraction).</p></div>
                    <div className="space-y-1"><p className="font-bold text-gray-800 underline">16. Tournament Rounds</p><p>All tournament rounds are to be played on the Saturday of the tournament, rounds played on any other days will not be considered for tournaments or points.</p></div>
                </div>
            </section>

            <section>
                <h3 className="text-[14pt] font-black text-gray-900 mb-3 border-b-2 border-green-500 inline-block">2. Hole Exceptions</h3>
                <div className="space-y-3 text-[14pt] italic">
                    <p><span className="font-bold underline">Hole #3:</span> Ball past to right of white stakes play as out of bounds. Penalty, one stroke and distance.</p>
                    <p><span className="font-bold underline">Hole #7:</span> Ball in or over water to left, play as lateral water hazard. May drop on right side of cart path. Penalty one stroke.</p>
                    <p><span className="font-bold underline">Hole #8:</span> Ball in or over water to left, play as lateral water hazard. Penalty one stroke.</p>
                    <p><span className="font-bold underline">Hole #10:</span> Ball past farthest edge of cart path on Hole #18, or on road to left, play as OB. – Penalty, one stroke and distance.</p>
                    <p><span className="font-bold underline">Hole #11:</span> Ball on or over road to left, play as OB. - Penalty, one stroke and distance.</p>
                    <p><span className="font-bold underline">Hole #18:</span> Ball past farthest edge of cart path and canal right side of cart path. – Penalty, one stroke, and distance.</p>
                </div>
            </section>

            <section>
                <h3 className="text-[14pt] font-black text-gray-900 mb-3 border-b-2 border-green-500 inline-block">Course Information</h3>
                <div className="bg-white border border-gray-100 rounded-xl py-3 px-1 shadow-sm space-y-3">
                    <p className="font-bold text-gray-800 text-[14pt]">City Park North, New Orleans</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 py-3 px-1 rounded-xl text-center border border-gray-100">
                            <p className="text-[14pt] uppercase font-black text-gray-400 mb-1">Par</p>
                            <p className="text-[14pt] font-black">68</p>
                            <p className="text-[14pt] text-gray-400 font-bold">(All Tees)</p>
                        </div>
                        <div className="bg-gray-50 py-3 px-1 rounded-xl text-center border border-gray-100">
                            <p className="text-[14pt] uppercase font-black text-gray-400 mb-1">Tee Times</p>
                            <p className="text-[14pt] font-black text-green-600">Saturdays</p>
                            <p className="text-[14pt] text-gray-400 font-bold">at Sunrise</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 pt-3">
                        <div className="flex justify-between items-center bg-white border border-gray-100 py-3 px-1 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-white border border-gray-300 rounded-full"></div>
                                <span className="font-bold text-[14pt]">White Tees</span>
                            </div>
                            <span className="text-[14pt] font-bold text-gray-500">63.8 Rating / 100 Slope</span>
                        </div>
                        <div className="flex justify-between items-center bg-white border border-gray-100 py-3 px-1 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                                <span className="font-bold text-[14pt]">Gold Tees</span>
                            </div>
                            <span className="text-[14pt] font-bold text-gray-500">61.3 Rating / 92 Slope</span>
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="text-[14pt] font-black text-gray-900 mb-3 border-b-2 border-green-500 inline-block">Tie Breaker Rules (Net Scores)</h3>
                <div className="space-y-3">
                    <p className="text-[14pt] text-gray-600 italic">When two or more players tie for a position, ties are broken using hole-by-hole comparison starting from the hardest handicap holes:</p>

                    <div className="space-y-3">
                        <div className="bg-slate-50 border-l-4 border-slate-900 py-3 px-1 rounded-xl shadow-sm">
                            <p className="font-black text-gray-900 text-[14pt] mb-1 uppercase tracking-tight">Tournament Placement & Pool Total Category</p>
                            <p className="text-[14pt] text-gray-600 leading-relaxed mb-2">Compare net scores starting from the <span className="font-bold underline text-black">hardest handicap hole across all 18 holes</span> and work backwards through each hole (by hardness rank) until a lower score is found.</p>
                            <p className="text-[14pt] text-gray-500 italic">Example: Compare hole #1 (hardest), then #2, then #3, etc. until the tie is broken.</p>
                        </div>
                        <div className="bg-emerald-50 border-l-4 border-emerald-500 py-3 px-1 rounded-xl shadow-sm">
                            <p className="font-black text-emerald-900 text-[14pt] mb-1 uppercase tracking-tight">Pool Front 9 Category</p>
                            <p className="text-[14pt] text-emerald-700 leading-relaxed mb-2">Compare net scores starting from the <span className="font-bold underline text-emerald-900">hardest handicap hole on the front nine only</span> (holes 1-9) and work backwards through front nine holes until a lower score is found.</p>
                            <p className="text-[14pt] text-emerald-600 italic">Example: If hole #9 is the hardest on front 9, compare #9 first, then the next hardest front 9 hole, etc.</p>
                        </div>
                        <div className="bg-blue-50 border-l-4 border-blue-500 py-3 px-1 rounded-xl shadow-sm">
                            <p className="font-black text-blue-900 text-[14pt] mb-1 uppercase tracking-tight">Pool Back 9 Category</p>
                            <p className="text-[14pt] text-blue-700 leading-relaxed mb-2">Compare net scores starting from the <span className="font-bold underline text-blue-900">hardest handicap hole on the back nine only</span> (holes 10-18) and work backwards through back nine holes until a lower score is found.</p>
                            <p className="text-[14pt] text-blue-600 italic">Example: If hole #11 is the hardest on back 9, compare #11 first, then the next hardest back 9 hole, etc.</p>
                        </div>
                    </div>

                    <div className="bg-gray-100 py-3 px-1 rounded-xl text-[14pt] space-y-2">
                        <p className="font-black uppercase tracking-widest text-gray-400">Important Notes:</p>
                        <ul className="list-disc pl-1 space-y-1 font-bold text-gray-700">
                            <li>Net Score = Gross score minus handicap stroke(s) received on that hole</li>
                            <li>Hardness ranking is based on the hole's handicap designation (1 = hardest, 18 = easiest)</li>
                            <li>This ensures fairness by comparing performance on the most difficult holes first</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="text-[14pt] font-black text-gray-900 mb-3 border-b-2 border-green-500 inline-block">Tournament Payouts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-black text-white py-3 px-1 rounded-2xl shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10"><span className="text-[14pt]">⛳</span></div>
                        <p className="text-[14pt] font-black uppercase text-gray-500 mb-3 tracking-widest text-center">One Round ($150 Total)</p>
                        <div className="space-y-1 font-black text-[14pt]">
                            <div className="flex justify-between border-b border-gray-800 py-2"><span>1st Place</span> <span className="text-green-400">$35</span></div>
                            <div className="flex justify-between border-b border-gray-800 py-2"><span>2nd Place</span> <span className="text-green-400">$25</span></div>
                            <div className="flex justify-between py-2"><span>3rd Place</span> <span className="text-green-400">$15</span></div>
                        </div>
                        <p className="text-[8px] text-gray-500 mt-3 text-center italic">* Payouts per flight ($75 per flight)</p>
                    </div>
                    <div className="bg-black text-white py-3 px-1 rounded-2xl shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10"><span className="text-[14pt]">🏆</span></div>
                        <p className="text-[14pt] font-black uppercase text-gray-500 mb-3 tracking-widest text-center">Multi Round ($180 Total)</p>
                        <div className="space-y-1 font-black text-[14pt]">
                            <div className="flex justify-between border-b border-gray-800 py-2"><span>1st Place</span> <span className="text-green-400">$40</span></div>
                            <div className="flex justify-between border-b border-gray-800 py-2"><span>2nd Place</span> <span className="text-green-400">$30</span></div>
                            <div className="flex justify-between py-2"><span>3rd Place</span> <span className="text-green-400">$20</span></div>
                        </div>
                        <p className="text-[8px] text-gray-500 mt-3 text-center italic">* Payouts per flight ($90 per flight)</p>
                    </div>
                </div>
                <p className="text-[14pt] font-bold text-gray-400 mt-3 text-center italic uppercase tracking-tighter">Tie Breakers apply to all tournament placement and payouts</p>
            </section>

            <section>
                <h3 className="text-[14pt] font-black text-gray-900 mb-3 border-b-2 border-green-500 inline-block">Tournament Point System</h3>
                <div className="bg-gray-900 text-white rounded-2xl py-3 px-1 shadow-xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="text-center border-r border-gray-800 pr-1">
                            <p className="text-[14pt] font-black text-gray-500 uppercase mb-1">Base Entry</p>
                            <p className="text-[14pt] font-black text-white">20</p>
                            <p className="text-[9px] text-gray-500 font-bold uppercase">Points</p>
                        </div>
                        <div className="space-y-1 font-black text-[14pt] flex flex-col justify-center">
                            <div className="flex justify-between border-b border-gray-800 py-1"><span>1st Place Bonus</span> <span className="text-green-400">+80</span></div>
                            <div className="flex justify-between border-b border-gray-800 py-1"><span>2nd Place Bonus</span> <span className="text-green-400">+55</span></div>
                            <div className="flex justify-between py-1"><span>3rd Place Bonus</span> <span className="text-green-400">+30</span></div>
                        </div>
                    </div>
                    <div className="bg-zinc-800 py-3 px-1 rounded-lg text-center">
                        <p className="text-[14pt] text-gray-400 italic">Example: A 1st place finisher receives <span className="text-white font-bold underline">100 points total</span></p>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="text-[14pt] font-black text-gray-900 mb-3 border-b-2 border-green-500 inline-block">$5 Pool Payout Details</h3>
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-md">
                    <div className="bg-green-600 py-3 px-1 text-center">
                        <p className="text-[14pt] font-black text-green-100 uppercase tracking-widest">Weekly Side Competition</p>
                        <p className="text-[14pt] font-black text-white">$5 ENTRY PER PLAYER</p>
                    </div>
                    <div className="py-3 px-1 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-gray-50 py-3 px-1 rounded-lg border border-gray-100">
                                <p className="text-[14pt] font-black text-gray-400 uppercase mb-1">FRONT 9 (40%)</p>
                                <div className="space-y-1 text-[14pt] font-bold">
                                    <div className="flex justify-between"><span>1st Place</span> <span className="text-green-600">50%</span></div>
                                    <div className="flex justify-between text-gray-400"><span>2nd Place</span> <span>30%</span></div>
                                    <div className="flex justify-between text-gray-400"><span>3rd Place</span> <span>20%</span></div>
                                </div>
                            </div>
                            <div className="bg-gray-50 py-3 px-1 rounded-lg border border-gray-100">
                                <p className="text-[14pt] font-black text-gray-400 uppercase mb-1">BACK 9 (40%)</p>
                                <div className="space-y-1 text-[14pt] font-bold">
                                    <div className="flex justify-between"><span>1st Place</span> <span className="text-green-600">50%</span></div>
                                    <div className="flex justify-between text-gray-400"><span>2nd Place</span> <span>30%</span></div>
                                    <div className="flex justify-between text-gray-400"><span>3rd Place</span> <span>20%</span></div>
                                </div>
                            </div>
                            <div className="bg-gray-50 py-3 px-1 rounded-lg border border-gray-100">
                                <p className="text-[14pt] font-black text-gray-400 uppercase mb-1">TOTAL (20%)</p>
                                <div className="space-y-1 text-[14pt] font-bold">
                                    <div className="flex justify-between"><span>1st Place</span> <span className="text-green-600">50%</span></div>
                                    <div className="flex justify-between text-gray-400"><span>2nd Place</span> <span>30%</span></div>
                                    <div className="flex justify-between text-gray-400"><span>3rd Place</span> <span>20%</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-900 text-white rounded-xl py-3 px-1">
                            <p className="text-[14pt] font-black text-zinc-500 uppercase mb-2 tracking-widest">Payout Example (for 20 Players / $100 Pot):</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[14pt]">
                                <div>
                                    <p className="font-bold text-green-400 mb-1">Front/Back 9 ($40 each)</p>
                                    <ul className="space-y-1 opacity-80">
                                        <li>1st Place: $20.00</li>
                                        <li>2nd Place: $12.00</li>
                                        <li>3rd Place: $8.00</li>
                                    </ul>
                                </div>
                                <div>
                                    <p className="font-bold text-blue-400 mb-1">Total Pot ($20)</p>
                                    <ul className="space-y-1 opacity-80">
                                        <li>1st Place: $10.00</li>
                                        <li>2nd Place: $6.00</li>
                                        <li>3rd Place: $4.00</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <p className="text-[14pt] text-center text-gray-500 font-medium">Tie Breakers: Pool categories use hole-by-hole comparison by hardness (see above)</p>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="text-[14pt] font-black text-gray-900 mb-3 border-b-2 border-green-500 inline-block">Scoring Format</h3>
                <div className="bg-white border border-gray-100 rounded-xl py-3 px-1 shadow-sm space-y-3 text-[14pt]">
                    <div className="flex gap-3">
                        <div className="w-1 bg-green-500 rounded-full"></div>
                        <div>
                            <p className="font-black text-gray-900">Gross Score</p>
                            <p className="text-gray-600">Your actual strokes taken</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-1 bg-blue-500 rounded-full"></div>
                        <div>
                            <p className="font-black text-gray-900">Net Score</p>
                            <p className="text-gray-600">Gross score minus your course handicap</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-1 bg-amber-500 rounded-full"></div>
                        <div>
                            <p className="font-black text-gray-900">Adjusted Gross Score</p>
                            <p className="text-gray-600">For handicap calculation only - each hole is capped at Net Double Bogey</p>
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="text-[14pt] font-black text-gray-900 mb-3 border-b-2 border-green-500 inline-block">Support & Joining</h3>
                <div className="space-y-3 text-[14pt] font-medium">
                    <div className="bg-white border border-gray-100 py-3 px-1 rounded-xl shadow-sm space-y-3">
                        <div>
                            <p className="font-black text-gray-900 text-[14pt] mb-1 uppercase tracking-tight">Joining the Club</p>
                            <p className="text-gray-600">We welcome new players! Join us for a few Saturday rounds to see if it's a good fit. Contact us at <span className="font-bold text-green-600">Viet53@gmail.com</span> for more information.</p>
                        </div>
                        <div className="pt-3 border-t border-gray-50">
                            <p className="font-black text-gray-900 text-[14pt] mb-1 uppercase tracking-tight">Questions?</p>
                            <p className="text-gray-600">For rules clarifications or any questions, contact <a href="mailto:Viet53@gmail.com" className="text-green-600 font-black hover:underline">Viet53@gmail.com</a></p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );

    const handicapRules = (
        <div className="space-y-3 max-w-full overflow-hidden">
            <header className="border-b border-gray-100 pb-3">
                <h3 className="text-[14pt] font-black text-gray-900 tracking-tight uppercase">WHS Handicap System</h3>
                <p className="text-[14pt] text-green-600 font-bold italic mt-1">All mechanisms are 2025 USGA/WHS compliant</p>
            </header>

            {/* 2024 Update Section */}
            <section className="bg-white border-2 border-green-500 rounded-2xl py-3 px-1 shadow-xl mb-3">
                <div className="flex items-center gap-3 mb-3">
                    <div className="bg-green-500 text-white p-2 rounded-lg font-black text-[12pt]">NEW</div>
                    <h4 className="text-[16pt] font-black text-gray-900 uppercase">The 2024 "Playing to Par" Update</h4>
                </div>
                <div className="space-y-4 text-[14pt] leading-relaxed">
                    <p className="font-bold text-gray-800 italic underline decoration-green-500 underline-offset-4 decoration-2">Why the change?</p>
                    <p className="text-gray-600">
                        In January 2024, the USGA added a critical piece to the formula to make it more <strong>"equitable"</strong> when comparing players across different tee boxes.
                    </p>
                    <div className="bg-gray-100 p-4 rounded-xl border-l-4 border-green-500 font-mono text-[14pt] font-bold text-center">
                        Course HCP = (Index × Slope / 113) + (Rating - Par)
                    </div>
                    <p className="text-gray-600">
                        <strong>Before 2024:</strong> A scratch golfer (0 index) playing a difficult course (Rating 75, Par 72) had a handicap of 0. They had to shoot a 75 to "play to their handicap."
                    </p>
                    <p className="text-gray-600">
                        <strong>Now:</strong> With the <strong>(Rating - Par)</strong> adjustment, that same golfer gets 3 extra strokes (75 - 72 = 3). Their target score is now <strong>72 (Net Par)</strong>. This makes it much easier to compare players chasing the same "Net Par" goal.
                    </p>
                    <p className="text-gray-500 font-black italic pt-2">
                        * Note: This "2024 version" is the current gold standard and remains the official system through 2026-2027.
                    </p>
                </div>
            </section>

            {/* White Tee Course Handicap Chart */}
            <section className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-end">
                    <div>
                        <h4 className="font-black text-gray-900 text-[14pt] uppercase">White Tee Chart</h4>
                        <p className="text-[11pt] text-gray-500 font-bold">Rating 63.8 / Slope 100 / Par 68</p>
                    </div>
                    <div className="text-right">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10pt] font-bold uppercase tracking-wider">Course HCP</span>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-[13pt] text-center font-medium">
                        <thead className="bg-gray-900 text-white sticky top-0 z-10">
                            <tr>
                                <th className="py-2 px-2 w-1/3">HCP</th>
                                <th className="py-2 px-2 w-2/3 border-l border-gray-700">Index Range</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                            <tr className="even:bg-gray-50"><td className="py-1.5 font-black text-black">-3</td><td className="py-1.5 border-l border-gray-100">0.8 — 1.9</td></tr>
                            <tr className="even:bg-gray-50"><td className="py-1.5 font-black text-black">-2</td><td className="py-1.5 border-l border-gray-100">2.0 — 3.0</td></tr>
                            <tr className="even:bg-gray-50"><td className="py-1.5 font-black text-black">-1</td><td className="py-1.5 border-l border-gray-100">3.1 — 4.1</td></tr>
                            <tr className="even:bg-gray-50 border-t-2 border-gray-200"><td className="py-1.5 font-black text-green-600 text-[15pt]">0</td><td className="py-1.5 border-l border-gray-100 font-bold text-gray-900 bg-green-50">4.2 — 5.3</td></tr>
                            <tr className="even:bg-gray-50"><td className="py-1.5 font-black text-black">1</td><td className="py-1.5 border-l border-gray-100">5.4 — 6.4</td></tr>
                            <tr className="even:bg-gray-50"><td className="py-1.5 font-black text-black">2</td><td className="py-1.5 border-l border-gray-100">6.5 — 7.5</td></tr>
                            <tr className="even:bg-gray-50"><td className="py-1.5 font-black text-black">3</td><td className="py-1.5 border-l border-gray-100">7.6 — 8.7</td></tr>
                            <tr className="even:bg-gray-50"><td className="py-1.5 font-black text-black">4</td><td className="py-1.5 border-l border-gray-100">8.8 — 9.8</td></tr>
                            <tr className="even:bg-gray-50 border-t-2 border-gray-200"><td className="py-1.5 font-black text-green-600 text-[15pt]">5</td><td className="py-1.5 border-l border-gray-100 font-bold text-gray-900 bg-green-50">9.9 — 10.9</td></tr>
                            <tr className="even:bg-gray-50"><td className="py-1.5 font-black text-black">6</td><td className="py-1.5 border-l border-gray-100">11.0 — 12.0</td></tr>
                            <tr className="even:bg-gray-50"><td className="py-1.5 font-black text-black">7</td><td className="py-1.5 border-l border-gray-100">12.1 — 13.2</td></tr>
                            <tr className="even:bg-gray-50"><td className="py-1.5 font-black text-black">8</td><td className="py-1.5 border-l border-gray-100">13.3 — 14.3</td></tr>
                            <tr className="even:bg-gray-50"><td className="py-1.5 font-black text-black">9</td><td className="py-1.5 border-l border-gray-100">14.4 — 15.4</td></tr>
                            <tr className="even:bg-gray-50 border-t-2 border-gray-200"><td className="py-1.5 font-black text-green-600 text-[15pt]">10</td><td className="py-1.5 border-l border-gray-100 font-bold text-gray-900 bg-green-50">15.5 — 16.6</td></tr>
                            <tr className="even:bg-gray-50"><td className="py-1.5 font-black text-black">11</td><td className="py-1.5 border-l border-gray-100">16.7 — 17.7</td></tr>
                            <tr className="even:bg-gray-50"><td className="py-1.5 font-black text-black">12</td><td className="py-1.5 border-l border-gray-100">17.8 — 18.8</td></tr>
                            <tr className="even:bg-gray-50"><td className="py-1.5 font-black text-black">13</td><td className="py-1.5 border-l border-gray-100">18.9 — 20.0</td></tr>
                            <tr className="even:bg-gray-50"><td className="py-1.5 font-black text-black">14</td><td className="py-1.5 border-l border-gray-100">20.1 — 21.1</td></tr>
                            <tr className="even:bg-gray-50 border-t-2 border-gray-200"><td className="py-1.5 font-black text-green-600 text-[15pt]">15</td><td className="py-1.5 border-l border-gray-100 font-bold text-gray-900 bg-green-50">21.2 — 22.2</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* 2026 PGA Tour Rule Changes */}
            <section className="space-y-4 pt-6 mt-6 border-t border-gray-100">
                <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden ring-4 ring-slate-100">
                    <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl">2026</div>
                    <h4 className="font-black text-[18pt] uppercase leading-tight mb-1">6 PGA Tour Rule Changes</h4>
                    <p className="text-[12pt] text-green-400 font-bold uppercase tracking-widest mb-6 border-b border-gray-700 pb-4">Effective 2026 Season</p>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* 1. Ball Movement */}
                            <div className="bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">⚠️</span>
                                    <h5 className="font-black text-[15pt]">Ball Movement</h5>
                                </div>
                                <ul className="space-y-1 text-[13pt] text-gray-300 font-medium leading-snug">
                                    <li>• <span className="text-white font-bold">1 stroke, not 2</span>, for unknowingly moving ball.</li>
                                    <li>• No more harsh penalties.</li>
                                </ul>
                            </div>

                            {/* 2. Embedded Ball */}
                            <div className="bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">⛳</span>
                                    <h5 className="font-black text-[15pt]">Embedded Ball</h5>
                                </div>
                                <ul className="space-y-1 text-[13pt] text-gray-300 font-medium leading-snug">
                                    <li>• <span className="text-white font-bold">Free relief</span> from any pitch mark.</li>
                                    <li>• Removes guesswork.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* 3. Internal O.B. */}
                            <div className="bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">⛔</span>
                                    <h5 className="font-black text-[15pt]">Internal O.B.</h5>
                                </div>
                                <ul className="space-y-1 text-[13pt] text-gray-300 font-medium leading-snug">
                                    <li>• O.B. only for tee shots.</li>
                                    <li>• No unfair limits on recovery.</li>
                                </ul>
                            </div>

                            {/* 4. Obstructions */}
                            <div className="bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">🚿</span>
                                    <h5 className="font-black text-[15pt]">Obstructions</h5>
                                </div>
                                <ul className="space-y-1 text-[13pt] text-gray-300 font-medium leading-snug">
                                    <li>• Relief beyond sprinkler heads.</li>
                                    <li>• Includes mic holes.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* 5. Broken Clubs */}
                            <div className="bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">🛠️</span>
                                    <h5 className="font-black text-[15pt]">Broken Clubs</h5>
                                </div>
                                <ul className="space-y-1 text-[13pt] text-gray-300 font-medium leading-snug">
                                    <li>• Repair with parts from bag.</li>
                                    <li>• Practical mid-round fixes.</li>
                                </ul>
                            </div>

                            {/* 6. Preferred Lies */}
                            <div className="bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">📏</span>
                                    <h5 className="font-black text-[15pt]">Preferred Lies</h5>
                                </div>
                                <ul className="space-y-1 text-[13pt] text-gray-300 font-medium leading-snug">
                                    <li>• Relief reduced to scorecard.</li>
                                    <li>• Fairer placements.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <p className="text-center mt-6 text-[11pt] text-gray-500 font-bold uppercase tracking-widest italic border-t border-gray-800 pt-3">Designed to reward skill — not technicalities.</p>
                </div>
            </section>

            {/* Stroke Allocation */}
            <section>
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 mb-6">
                    <p className="font-black text-amber-900 mb-2 italic flex items-center gap-2 text-[14pt] uppercase">
                        <span>⚠️</span> Important: Use FULL Course Handicap
                    </p>
                    <p className="text-[14pt] text-amber-800 leading-relaxed font-semibold">
                        Players receive strokes based on their FULL course handicap, NOT half.
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <h4 className="font-black text-gray-900 text-[14pt] uppercase mb-2">How Strokes Are Allocated</h4>
                        <p className="text-[14pt] text-gray-600 mb-3 leading-relaxed italic">
                            Strokes are allocated based on hole difficulty (hardness rating). If your <span className="font-bold underline text-black">Course Handicap = 10</span>, you get a stroke on the 10 hardest holes (hardness 1-10).
                        </p>
                    </div>

                    <div className="overflow-x-auto border border-gray-100 rounded-lg shadow-sm">
                        <table className="w-full text-[14pt] font-medium">
                            <thead className="bg-gray-50 text-gray-400 uppercase font-black">
                                <tr>
                                    <th className="px-1 py-2 text-left">Hole</th>
                                    <th className="px-1 py-2 text-center">Par</th>
                                    <th className="px-1 py-2 text-center">Hardness</th>
                                    <th className="px-1 py-2 text-center">Actual</th>
                                    <th className="px-1 py-2 text-center">Strokes</th>
                                    <th className="px-1 py-2 text-center">Net</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                <tr className="bg-white">
                                    <td className="px-1 py-2 font-black">1</td>
                                    <td className="px-1 py-2 text-center">4</td>
                                    <td className="px-1 py-2 text-center">5</td>
                                    <td className="px-1 py-2 text-center">6</td>
                                    <td className="px-1 py-2 text-center text-green-600 font-black bg-green-50/50">1</td>
                                    <td className="px-1 py-2 text-center font-black">5</td>
                                </tr>
                                <tr className="bg-white">
                                    <td className="px-1 py-2 font-black">2</td>
                                    <td className="px-1 py-2 text-center">4</td>
                                    <td className="px-1 py-2 text-center">15</td>
                                    <td className="px-1 py-2 text-center">6</td>
                                    <td className="px-1 py-2 text-center text-red-600 font-black bg-red-50/50">0</td>
                                    <td className="px-1 py-2 text-center font-black">6</td>
                                </tr>
                                <tr className="bg-white">
                                    <td className="px-1 py-2 font-black">3</td>
                                    <td className="px-1 py-2 text-center">3</td>
                                    <td className="px-1 py-2 text-center">3</td>
                                    <td className="px-1 py-2 text-center">5</td>
                                    <td className="px-1 py-2 text-center text-green-600 font-black bg-green-50/50">1</td>
                                    <td className="px-1 py-2 text-center font-black">4</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-1 text-[14pt] text-gray-500 font-bold px-1 italic">
                        <p className="text-green-600">✓ Hole 1 & 3: Hardness ≤ 10 → Get 1 stroke</p>
                        <p className="text-red-500">✗ Hole 2: Hardness &gt; 10 → No stroke</p>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-[14pt] text-blue-900 leading-relaxed shadow-sm">
                        <p className="font-black uppercase tracking-wider mb-2">For Front 9 and Back 9 Competitions:</p>
                        <p className="font-bold underline text-blue-700 italic mb-2">Use the SAME stroke allocation method - do NOT divide by 2!</p>
                        <ul className="list-disc pl-1 space-y-1">
                            <li>Front 9: strokes where hardness ≤ total course handicap</li>
                            <li>Back 9: strokes where hardness ≤ total course handicap</li>
                        </ul>
                        <p className="mt-2 text-blue-700 opacity-80 italic">Ex: A 10-hcp player might get 6 strokes on front 9 and 4 on back 9, depending on where the 10 hardest holes are.</p>
                    </div>
                </div>
            </section>

            {/* Calculations Section */}
            <section className="space-y-6 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-zinc-900 text-white p-5 rounded-2xl shadow-lg border-l-4 border-green-500">
                        <p className="text-[9px] font-black text-gray-500 uppercase mb-2 tracking-widest">Score Differential</p>
                        <p className="text-[14pt] font-mono text-green-400 italic mb-2 leading-tight">(Adj Gross - Rating) × 113 / Slope</p>
                        <p className="text-[14pt] text-gray-400 leading-tight">Ex (White): (85 - 63.8) × 113 / 100 = <span className="text-white font-bold underline">23.96 → 24.0 Diff</span></p>
                    </div>

                    <div className="bg-zinc-900 text-white p-5 rounded-2xl shadow-lg border-l-4 border-blue-500">
                        <p className="text-[9px] font-black text-gray-500 uppercase mb-2 tracking-widest">Course Handicap</p>
                        <p className="text-[14pt] font-mono text-blue-400 italic mb-2 leading-tight">(Index × Slope / 113) + (Rating - Par)</p>
                        <div className="space-y-1 text-[14pt] text-gray-400">
                            <p>Ex (White): (15.0 × 100 / 113) + (63.8 - 68) = 13.3 - 4.2 = <span className="text-white font-bold underline">9 HCP</span></p>
                            <p>Ex (Gold): (15.0 × 92 / 113) + (61.3 - 68) = 12.2 - 6.7 = <span className="text-white font-bold underline">6 HCP</span></p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                    <p className="bg-gray-50 px-1 py-3 font-black text-[14pt] text-gray-400 uppercase tracking-widest border-b border-gray-100">Handicap Index Calculation</p>
                    <table className="w-full text-[14pt] font-bold">
                        <thead className="bg-gray-50/50 text-gray-400">
                            <tr>
                                <th className="px-1 py-2 text-left">Rounds Played</th>
                                <th className="px-1 py-2 text-right">Best Differentials Used</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-gray-600">
                            <tr><td className="px-1 py-1.5 ">3 - 5</td><td className="px-1 py-1.5 text-right text-green-600">Lowest 1</td></tr>
                            <tr><td className="px-1 py-1.5 ">6 - 8</td><td className="px-1 py-1.5 text-right text-green-600">Lowest 2</td></tr>
                            <tr><td className="px-1 py-1.5 ">9 - 10</td><td className="px-1 py-1.5 text-right text-green-600">Lowest 3</td></tr>
                            <tr><td className="px-1 py-1.5 ">11 - 12</td><td className="px-1 py-1.5 text-right text-green-600">Lowest 4</td></tr>
                            <tr><td className="px-1 py-1.5 ">13 - 14</td><td className="px-1 py-1.5 text-right text-green-600">Lowest 5</td></tr>
                            <tr><td className="px-1 py-1.5 ">15 - 16</td><td className="px-1 py-1.5 text-right text-green-600">Lowest 6</td></tr>
                            <tr><td className="px-1 py-1.5 ">17 - 18</td><td className="px-1 py-1.5 text-right text-green-600">Lowest 7</td></tr>
                            <tr className="bg-gray-50 font-black"><td className="px-1 py-2 text-gray-900 border-l-4 border-black">19 - 20+</td><td className="px-1 py-2 text-right text-black">Lowest 8</td></tr>
                        </tbody>
                    </table>
                    <p className="p-3 text-center text-[14pt] font-black italic bg-gray-900 text-white shadow-inner underline decoration-green-500 underline-offset-4">Index = Average of Best Differentials × 0.96</p>
                </div>
            </section>

            {/* Caps and Protections */}
            <section className="space-y-6 pt-4 border-t border-gray-100">
                <h4 className="font-black text-gray-900 text-[14pt] uppercase">Caps & Protections</h4>

                <div className="bg-white p-5 border border-gray-100 rounded-xl shadow-sm">
                    <p className="font-black text-[14pt] mb-1 uppercase text-red-600">NET DOUBLE BOGEY (Adjusted Gross)</p>
                    <p className="text-[14pt] text-gray-500 mb-2 italic">Max Score = Par + 2 + Handicap Strokes on That Hole</p>
                    <div className="space-y-1 text-[14pt] text-gray-600 leading-tight">
                        <p>• Hole #1 (Par 4, strokes 1): 4 + 2 + 1 = <span className="font-bold underline">7 Max</span></p>
                        <p>• Hole #2 (Par 4, strokes 0): 4 + 2 + 0 = <span className="font-bold underline">6 Max</span></p>
                        <p className="opacity-80 italic pt-1">If you shoot 9 on Hole #1, it counts as 7 for handicap calculation.</p>
                    </div>
                </div>

                <div className="bg-white p-5 border border-gray-100 rounded-xl shadow-sm space-y-3">
                    <div className="flex justify-between items-center"><p className="font-black text-[14pt] uppercase">Soft Cap (3.0 Protection)</p> <span className="bg-green-100 text-green-700 px-1 py-0.5 rounded text-[8px] font-black tracking-tighter">50% REDUCTION</span></div>
                    <ul className="text-[14pt] text-gray-500 leading-relaxed space-y-1">
                        <li>• Increases up to 3.0 strokes are applied fully</li>
                        <li>• Increases beyond 3.0 are <span className="font-bold underline text-black">reduced by 50%</span></li>
                    </ul>
                    <div className="bg-zinc-50 p-3 rounded-lg text-[14pt] text-gray-600 space-y-0.5 font-medium">
                        <p>Ex: Low Index: 10.0, Calculated Index: 14.5 (Increase: 4.5)</p>
                        <p>→ First 3.0 + (1.5 × 50% = 0.75)</p>
                        <p className="font-black text-black">Final Index: 13.75</p>
                    </div>
                </div>

                <div className="bg-white p-5 border border-gray-100 rounded-xl shadow-sm space-y-3">
                    <div className="flex justify-between items-center"><p className="font-black text-[14pt] uppercase">Hard Cap (5.0 Maximum)</p> <span className="bg-red-100 text-red-700 px-1 py-0.5 rounded text-[8px] font-black tracking-tighter">ABSOLUTE LIMIT</span></div>
                    <p className="text-[14pt] text-gray-500 leading-relaxed italic">Index cannot increase more than 5.0 strokes above Low Index.</p>
                    <div className="bg-zinc-50 p-3 rounded-lg text-[14pt] text-gray-600 space-y-0.5 font-medium">
                        <p>Ex: Low Index: 8.0, Calculated: 15.2 (Increase: 7.2)</p>
                        <p className="font-black text-red-600">Capped at 8.0 + 5.0 = 13.0</p>
                    </div>
                </div>

                <div className="bg-black text-white p-5 rounded-xl border border-green-500/30 shadow-2xl space-y-3">
                    <div className="flex justify-between items-center">
                        <p className="font-black text-[14pt] text-green-400">ESR (EXCEPTIONAL SCORE REDUCTION)</p>
                        <span className="bg-green-500 text-black px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">-1.0 REDUCTION</span>
                    </div>
                    <p className="text-[14pt] text-gray-400 italic font-medium leading-tight">Trigger: Lowest differential is 7.0+ below current index.</p>
                    <div className="bg-zinc-800 p-3 rounded-lg text-[14pt] text-zinc-400 space-y-0.5">
                        <p>Ex: Index 16.5, Amazing round diff: 8.9 (Diff is 7.6 below index)</p>
                        <p className="font-black text-green-400 uppercase tracking-widest text-[8px]">✓ Triggered! Reduction applied.</p>
                        <p className="font-black text-white">New Index: 15.5</p>
                    </div>
                </div>

                <p className="text-center text-[14pt] font-black italic text-[#22c55e] uppercase pt-4 leading-tight">
                    "This rewards improvement and prevents 'Sandbagging' by quickly adjusting your handicap when you demonstrate significantly better play."
                </p>
            </section>
        </div>
    );

    const appInstructions = (
        <div className="space-y-6 text-[14pt]">
            {/* Live Score Page Section */}
            <section className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200 shadow-lg">
                <h3 className="text-[16pt] font-black text-blue-900 mb-4 flex items-center gap-2">
                    <span className="text-[20pt]">📱</span> Live Score Page - Button Guide
                </h3>

                {/* FYI Notice */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-2 border-amber-300 shadow-md mb-4">
                    <h4 className="text-[14pt] font-black text-amber-900 mb-2 flex items-center gap-2">
                        <span className="text-[16pt]">ℹ️</span> FYI:
                    </h4>
                    <div className="space-y-2 text-gray-800 leading-relaxed text-[13pt]">
                        <p className="font-bold">
                            Live score data is isolated from club rounds. So test all you want and it will not affect your club index or handicap.
                        </p>
                        <p>
                            Will be locked after midnight, for viewing only.
                        </p>
                        <p className="bg-white p-2 rounded-lg border-l-4 border-amber-500 font-bold">
                            You have to text Vincent to turn in your scorecard, for the club.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Course Button */}
                    <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-black text-white px-3 py-1 rounded-full font-bold text-[12pt]">Course</div>
                            <span className="text-gray-500 italic">(Course Info Section)</span>
                        </div>
                        <p className="text-gray-700 leading-relaxed mb-2">Opens a modal to edit the live round settings including:</p>
                        <ul className="list-disc pl-6 space-y-1 text-gray-600">
                            <li>Select a different course</li>
                            <li>Adjust Par, Rating, and Slope values</li>
                            <li>Update round name and date</li>
                        </ul>
                        <p className="text-amber-700 font-bold mt-2 italic">⚠️ Hidden after hole 3 is completed or when all players finish</p>
                    </div>

                    {/* Players Button */}
                    <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-black text-white px-3 py-1 rounded-full font-bold text-[12pt]">Players</div>
                            <span className="text-gray-500 italic">(Group Section)</span>
                        </div>
                        <p className="text-gray-700 leading-relaxed mb-2">Opens the player selection modal to add players to your group. Features:</p>
                        <ul className="list-disc pl-6 space-y-1 text-gray-600">
                            <li>Search and select from all club members</li>
                            <li>Players are added to the round automatically</li>
                            <li>Your selection is saved locally for this device</li>
                            <li>Each device can track their own group</li>
                        </ul>
                        <p className="text-amber-700 font-bold mt-2 italic">⚠️ Hidden after hole 3 is completed</p>
                    </div>

                    {/* Guest Button */}
                    <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-black text-white px-3 py-1 rounded-full font-bold text-[12pt]">Guest</div>
                            <span className="text-gray-500 italic">(Group Section)</span>
                        </div>
                        <p className="text-gray-700 leading-relaxed mb-2">Add a guest player to the round. Opens a form to enter:</p>
                        <ul className="list-disc pl-6 space-y-1 text-gray-600">
                            <li>Guest name</li>
                            <li>Handicap Index</li>
                            <li>Course Handicap (auto-calculated or manual entry)</li>
                        </ul>
                        <p className="text-blue-700 font-bold mt-2">✓ Guest data is saved to the database and visible on all devices</p>
                        <p className="text-amber-700 font-bold mt-1 italic">⚠️ Hidden after hole 3 is completed</p>
                    </div>
                </div>
            </section>
        </div>
    );

    const appLogicContent = (
        <div className="space-y-12 text-gray-700 text-[14pt]">
            {/* Tie Breaker Section */}
            <section>
                <h3 className="text-[14pt] font-bold text-blue-800 mb-6 border-b border-blue-100 pb-2">
                    🏆 Tie Breaker Rules
                </h3>
                <div className="space-y-6 pl-1">
                    <p className="leading-relaxed text-[14pt]">
                        When players have the same Net Score, we use a <span className="font-bold text-gray-900">"Hardest Hole" card-off</span> to determine the winner.
                    </p>
                    <ol className="list-decimal pl-8 space-y-4 marker:font-bold marker:text-blue-600 text-[14pt]">
                        <li>
                            <span className="font-bold text-gray-900">Step 1:</span> We compare the Net Score on the <span className="font-bold text-red-600">#1 Hardest Hole</span> (Stroke Index 1). Lower score wins.
                        </li>
                        <li>
                            <span className="font-bold text-gray-900">Step 2:</span> If tied on the #1 hole, we move to the <span className="font-bold text-red-600">#2 Hardest Hole</span>, and so on.
                        </li>
                        <li>
                            <span className="font-bold text-gray-900">Why?</span> This rewards performance on the most difficult parts of the course.
                        </li>
                    </ol>
                    <div className="bg-blue-50 p-6 rounded-xl mt-4 text-[14pt] border-l-8 border-blue-500">
                        <strong className="block text-[14pt] mb-2">Example:</strong>
                        Tom and Charlie both shoot Net 71.<br />
                        - Hole #18 is Rank 1 (Hardest). Both make Net 5. (Still Tied)<br />
                        - Hole #9 is Rank 2. Tom makes 5, Charlie makes 6.<br />
                        ✅ <strong className="text-[14pt] text-blue-900">Tom Wins</strong> the tie-breaker.
                    </div>

                    <div className="space-y-6 pt-6">
                        <div className="bg-emerald-50 border-l-8 border-emerald-500 p-6 rounded-xl shadow-sm">
                            <p className="font-black text-emerald-900 text-[14pt] mb-2 uppercase tracking-tight">Pool Front 9 Category</p>
                            <p className="text-[14pt] text-emerald-800 leading-relaxed mb-2">Compare net scores starting from the <span className="font-bold underline text-emerald-900">hardest handicap hole on the front nine only</span> (holes 1-9) and work backwards through front nine holes until a lower score is found.</p>
                            <p className="text-[14pt] text-emerald-700 italic font-bold">Example: If hole #9 is the hardest on front 9, compare #9 first, then the next hardest front 9 hole, etc.</p>
                        </div>
                        <div className="bg-indigo-50 border-l-8 border-indigo-500 p-6 rounded-xl shadow-sm">
                            <p className="font-black text-indigo-900 text-[14pt] mb-2 uppercase tracking-tight">Pool Back 9 Category</p>
                            <p className="text-[14pt] text-indigo-800 leading-relaxed mb-2">Compare net scores starting from the <span className="font-bold underline text-indigo-900">hardest handicap hole on the back nine only</span> (holes 10-18) and work backwards through back nine holes until a lower score is found.</p>
                            <p className="text-[14pt] text-indigo-700 italic font-bold">Example: If hole #11 is the hardest on back 9, compare #11 first, then the next hardest back 9 hole, etc.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Handicap Section */}
            <section>
                <h3 className="text-[14pt] font-bold text-green-800 mb-6 border-b border-green-100 pb-2">
                    ⛳ Handicap & Hardness
                </h3>
                <div className="space-y-6 pl-1">
                    <p className="text-[14pt]">
                        <strong>Course Handicap (CH):</strong> Calculated using your Index, the Tee Slope, and Rating.
                    </p>
                    <code className="block bg-gray-100 p-4 rounded-xl text-[14pt] font-mono text-center font-bold">
                        CH = (Index * Slope / 113) + (Rating - Par)
                    </code>
                    <p className="mt-4 text-[14pt]">
                        <strong>Stroke Allocation (Dots):</strong> Strokes are assigned to holes based on the hole's <strong>Difficulty Rank</strong> (1-18).
                    </p>
                    <ul className="list-disc pl-8 space-y-3 text-[14pt]">
                        <li>If you are an <strong>11 Handicap</strong>, you get 1 stroke on the 11 hardest holes (Ranks 1-11).</li>
                        <li>If you are a <strong>20 Handicap</strong>, you get 1 stroke on every hole, PLUS an extra stroke on Ranks 1-2 (Total 2 strokes on hardest holes).</li>
                    </ul>
                </div>
            </section>

            {/* Pool Logic Section */}
            <section>
                <h3 className="text-[14pt] font-bold text-amber-800 mb-6 border-b border-amber-100 pb-2">
                    💰 The $5 Pool
                </h3>
                <div className="space-y-6 pl-1">
                    <p className="text-[14pt]">
                        Everyone contributes <strong>$5.00</strong> to the pot. Each Flight's pot is split three ways:
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-green-50 p-5 rounded-xl border-2 border-green-200">
                            <div className="text-[14pt] font-black text-green-700">40%</div>
                            <div className="text-[14pt] font-bold uppercase text-green-800">Front 9 Winner</div>
                        </div>
                        <div className="bg-green-50 p-5 rounded-xl border-2 border-green-200">
                            <div className="text-[14pt] font-black text-green-700">40%</div>
                            <div className="text-[14pt] font-bold uppercase text-green-800">Back 9 Winner</div>
                        </div>
                        <div className="bg-green-50 p-5 rounded-xl border-2 border-green-200">
                            <div className="text-[14pt] font-black text-green-700">20%</div>
                            <div className="text-[14pt] font-bold uppercase text-green-800">Total Net Winner</div>
                        </div>
                    </div>
                    <p className="text-[14pt] text-gray-500 italic font-medium">
                        *Winners are determined by lowest Net Score, using the Tie Breaker rules above.
                    </p>
                </div>
            </section>

            {/* Points & YTD Section */}
            <section>
                <h3 className="text-[14pt] font-bold text-purple-800 mb-6 border-b border-purple-100 pb-2">
                    📈 Points & YTD
                </h3>
                <div className="space-y-6 pl-1">
                    <p className="text-[14pt]">
                        <strong>Tournament Points</strong> are awarded based on your Net Score finish in your Flight:
                    </p>
                    <ul className="list-none space-y-4 text-[14pt]">
                        <li className="flex items-center gap-4">
                            <span className="bg-yellow-100 text-yellow-700 font-bold px-1 py-1.5 rounded-lg w-20 text-center">1st</span>
                            <span className="font-bold">100 Points</span>
                        </li>
                        <li className="flex items-center gap-4">
                            <span className="bg-gray-100 text-gray-700 font-bold px-1 py-1.5 rounded-lg w-20 text-center">2nd</span>
                            <span className="font-bold">75 Points</span>
                        </li>
                        <li className="flex items-center gap-4">
                            <span className="bg-orange-100 text-orange-700 font-bold px-1 py-1.5 rounded-lg w-20 text-center">3rd</span>
                            <span className="font-bold">50 Points</span>
                        </li>
                        <li className="flex items-center gap-4">
                            <span className="bg-slate-100 text-slate-700 font-bold px-1 py-1.5 rounded-lg w-20 text-center">Others</span>
                            <span className="font-bold">20 Points</span>
                        </li>
                    </ul>
                    <p className="mt-6 text-[14pt]">
                        <strong>YTD (Year to Date):</strong> The sum of all points earned in tournaments throughout the current year.
                    </p>
                </div>
            </section>

            {/* WHS Calculations & Caps Section */}
            <section className="pt-8 border-t-2 border-gray-100 space-y-8">
                <h3 className="text-[14pt] font-bold text-gray-900 mb-6 border-b border-gray-200 pb-2">
                    📐 WHS Calculations & Caps
                </h3>

                {/* Differential & Index Calc */}
                <div className="space-y-6">
                    <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-lg border-l-8 border-green-500">
                        <p className="text-[14pt] font-black text-gray-400 uppercase mb-2 tracking-widest">Score Differential</p>
                        <p className="text-[14pt] font-mono text-green-400 italic mb-3 leading-tight">(Adj Gross - Rating) × 113 / Slope</p>
                        <p className="text-[14pt] text-gray-300 leading-tight">Ex (White): (85 - 63.8) × 113 / 100 = <span className="text-white font-bold underline">23.96 → 24.0 Diff</span></p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                        <p className="bg-gray-50 px-1 py-4 font-black text-lg text-gray-500 uppercase tracking-widest border-b border-gray-100">Handicap Index Calculation</p>
                        <table className="w-full text-lg font-bold">
                            <thead className="bg-gray-50/50 text-gray-400">
                                <tr>
                                    <th className="px-1 py-3 text-left">Rounds Played</th>
                                    <th className="px-1 py-3 text-right">Best Differentials Used</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-gray-600">
                                <tr><td className="px-1 py-2 ">3 - 5</td><td className="px-1 py-2 text-right text-green-600">Lowest 1</td></tr>
                                <tr><td className="px-1 py-2 ">6 - 8</td><td className="px-1 py-2 text-right text-green-600">Lowest 2</td></tr>
                                <tr><td className="px-1 py-2 ">9 - 10</td><td className="px-1 py-2 text-right text-green-600">Lowest 3</td></tr>
                                <tr><td className="px-1 py-2 ">11 - 12</td><td className="px-1 py-2 text-right text-green-600">Lowest 4</td></tr>
                                <tr><td className="px-1 py-2 ">13 - 14</td><td className="px-1 py-2 text-right text-green-600">Lowest 5</td></tr>
                                <tr><td className="px-1 py-2 ">15 - 16</td><td className="px-1 py-2 text-right text-green-600">Lowest 6</td></tr>
                                <tr><td className="px-1 py-2 ">17 - 18</td><td className="px-1 py-2 text-right text-green-600">Lowest 7</td></tr>
                                <tr className="bg-gray-50 font-black text-gray-900 border-l-8 border-black"><td className="px-1 py-3">19 - 20+</td><td className="px-1 py-3 text-right text-black">Lowest 8</td></tr>
                            </tbody>
                        </table>
                        <p className="p-4 text-center text-xl font-black italic bg-gray-900 text-white shadow-inner underline decoration-green-500 underline-offset-4">Index = Average of Best 8 Differentials</p>
                    </div>
                </div>

                {/* Caps */}
                <div className="space-y-4">
                    <h4 className="font-black text-gray-900 text-2xl uppercase">Caps & Protections</h4>

                    <div className="bg-white p-6 border border-gray-100 rounded-xl shadow-sm">
                        <p className="font-black text-lg mb-2 uppercase text-red-600">NET DOUBLE BOGEY (Adjusted Gross)</p>
                        <p className="text-xl text-gray-500 mb-3 italic">Max Score = Par + 2 + Handicap Strokes on That Hole</p>
                        <div className="space-y-2 text-lg text-gray-600 leading-tight">
                            <p>• Hole #1 (Par 4, strokes 1): 4 + 2 + 1 = <span className="font-bold underline">7 Max</span></p>
                            <p>• Hole #2 (Par 4, strokes 0): 4 + 2 + 0 = <span className="font-bold underline">6 Max</span></p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 border border-gray-100 rounded-xl shadow-sm space-y-4">
                            <div className="flex justify-between items-center"><p className="font-black text-xl uppercase">Soft Cap</p> <span className="bg-green-100 text-green-700 px-1 py-1 rounded-lg text-xs font-black tracking-tighter">50% REDUCTION</span></div>
                            <p className="text-lg text-gray-500">If Index increases &gt; 3.0 above Low Index, the excess is reduced by 50%.</p>
                        </div>
                        <div className="bg-white p-6 border border-gray-100 rounded-xl shadow-sm space-y-4">
                            <div className="flex justify-between items-center"><p className="font-black text-xl uppercase">Hard Cap</p> <span className="bg-red-100 text-red-700 px-1 py-1 rounded-lg text-xs font-black tracking-tighter">MAX +5.0</span></div>
                            <p className="text-lg text-gray-500">Index CANNOT increase &gt; 5.0 above Low Index within 12 months.</p>
                        </div>
                    </div>

                    <div className="bg-black text-white p-6 rounded-xl border border-green-500/30 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="font-black text-xl text-green-400">ESR (EXCEPTIONAL SCORE)</p>
                            <span className="bg-green-500 text-black px-1 py-1 rounded-lg text-xs font-black uppercase tracking-tighter">-1.0 REDUCTION</span>
                        </div>
                        <p className="text-lg text-gray-400 italic">Trigger: Round is 7.0+ strokes better than Index.</p>
                    </div>
                </div>
            </section>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-10">
            <header className="bg-white sticky top-0 z-50 py-4 shadow-md px-1 border-b border-gray-100">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <h1 className="text-[18pt] font-black text-[#22c55e] tracking-tighter uppercase text-left ml-3">FAQ</h1>
                    <Link href="/" className="px-4 py-2 bg-black text-white rounded-full text-[15pt] font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95">Home</Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-1 py-3">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 px-1">
                    <button onClick={() => openModal('App Instructions', appInstructions)} className="bg-blue-600 text-white py-2 px-1 rounded-full font-black text-[14pt] shadow-lg hover:bg-blue-700 transition-all active:scale-95 border-b-2 border-blue-800">📱 App Instructions</button>
                    <button onClick={() => openModal('Club Rules', clubRules)} className="bg-gray-900 text-white py-2 px-1 rounded-full font-black text-[14pt] shadow-lg hover:bg-black transition-all active:scale-95 border-b-2 border-gray-700">Club Rules</button>
                    <button onClick={() => openModal('Handicap Rules', handicapRules)} className="bg-gray-900 text-white py-2 px-1 rounded-full font-black text-[14pt] shadow-lg hover:bg-black transition-all active:scale-95 border-b-2 border-gray-700">Handicap Rules</button>
                    <Link href="#" className="bg-gray-900 text-white py-2 px-1 rounded-full font-black text-center text-[14pt] shadow-lg hover:bg-black transition-all active:scale-95 flex items-center justify-center border-b-2 border-gray-700">Download Member App</Link>
                </div>

                <div className="border-t border-gray-200"></div>

                <CourseCalculator players={players} />

                <RulesModal
                    isOpen={modalData.open}
                    onClose={() => setModalData({ ...modalData, open: false })}
                    title={modalData.title}
                    content={modalData.content}
                />
            </main>
        </div>
    );
}
