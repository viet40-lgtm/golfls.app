'use client';

// Updated: 2026-01-03 - Fixed Total Payouts sorting
import { Copy } from 'lucide-react';
import { format } from 'date-fns';

interface PoolCopyButtonProps {
    date: string;
    roundName?: string | null;
    isTournament: boolean;
    flights: any[];
}

export function PoolCopyButton({ date, roundName, isTournament, flights }: PoolCopyButtonProps) {
    const handleCopy = async () => {
        const [y, m, d] = date.split('T')[0].split('-').map(Number);
        const dateStr = format(new Date(y, m - 1, d, 12, 0, 0), 'MMMM d, yyyy');

        let html = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 650px; background: white; padding: 20px; border: 1px solid #e5e7eb;">
                <div style="text-align: center; border-bottom: 2px solid #16a34a; padding-bottom: 15px; margin-bottom: 20px;">
                    <h1 style="margin: 0; font-size: 24px; color: #16a34a;">$5 POOL RESULTS</h1>
                    <div style="margin-top: 5px; font-size: 18px; color: #4b5563;">
                        ${dateStr} ${roundName ? ` - ${roundName}` : ''}
                    </div>
                    ${isTournament ? '<div style="color: #b45309; font-weight: bold; margin-top: 5px;">🏆 TOURNAMENT RESULTS</div>' : ''}
                </div>
        `;

        flights.forEach(flight => {
            const playerCount = flight.players?.length || 0;
            const totalCollected = playerCount * 5;
            html += `
                <div style="margin-bottom: 25px;">
                    <h2 style="background: #f1f5f9; padding: 8px; font-size: 18px; border-left: 4px solid #16a34a; margin-bottom: 15px;">${flight.name} (${playerCount} players, $${totalCollected.toFixed(2)} collected)</h2>
            `;

            if (!isTournament) {
                // Front 9
                html += `<h3>Front Nine ($${flight.pots.front.toFixed(2)})</h3>`;
                html += renderWinnerTable(flight.frontWinners, 'front');

                // Seperator
                html += `<hr style="border: 0; border-top: 2px dashed #9ca3af; margin: 20px 0;">`;

                // Back 9
                html += `<h3>Back Nine ($${flight.pots.back.toFixed(2)})</h3>`;
                html += renderWinnerTable(flight.backWinners, 'back');

                // Seperator
                html += `<hr style="border: 0; border-top: 2px dashed #9ca3af; margin: 20px 0;">`;

                // Total
                html += `<h3>Total ($${flight.pots.total.toFixed(2)})</h3>`;
                html += renderWinnerTable(flight.totalWinners, 'total');
            } else {
                // Tournament Placement
                html += `<h3>Tournament Placement</h3>`;
                html += renderWinnerTable(flight.totalWinners, 'total');
            }

            html += `</div>`;
        });

        // Summary separator
        html += `<hr style="border: 0; border-top: 3px double #16a34a; margin: 20px 0;">`;

        // Summary of Winnings
        const winningsMap = new Map<string, number>();
        flights.forEach(f => {
            [...f.frontWinners, ...f.backWinners, ...f.totalWinners].forEach(w => {
                const current = winningsMap.get(w.name) || 0;
                winningsMap.set(w.name, current + w.amount);
            });
        });

        html += `
            <div style="padding: 20px 0;">
                <h3 style="margin-top: 0; margin-bottom: 15px; color: #111; font-size: 11pt; font-weight: bold;">Total by Winners:</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
        `;

        Array.from(winningsMap.entries())
            .sort((a, b) => b[1] - a[1]) // Sort by amount descending (highest first)
            .forEach(([name, amount]) => {
                const [firstName, ...lastNameParts] = name.split(' ');
                const lastName = lastNameParts.join(' ');
                html += `
                    <div style="background: #f4fbf7; border: 1px solid #d1fae5; border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; flex-direction: column; overflow: hidden;">
                            <span style="font-size: 11pt; font-weight: 900; color: #000; line-height: 1.2; margin-bottom: 2px;">${firstName}</span>
                            <span style="font-size: 11pt; color: #6b7280; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lastName}</span>
                        </div>
                        <span style="font-size: 11pt; font-weight: 900; color: #16a34a; margin-left: 8px; white-space: nowrap;">$${amount.toFixed(2)}</span>
                    </div>
                `;
            });

        html += `</div></div></div>`;

        function renderWinnerTable(winners: any[], category: 'front' | 'back' | 'total' = 'total') {
            if (winners.length === 0) return '<p style="color: #9ca3af; font-style: italic;">No entries</p>';
            let table = `
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 14px;">
                    <thead>
                        <tr style="border-bottom: 1px solid #e5e7eb; text-align: left; color: #6b7280;">
                            <th style="padding: 6px 0;">Pos</th>
                            <th style="padding: 6px 0;">Player</th>
                            <th style="padding: 6px 0; text-align: center;">Gross</th>
                            <th style="padding: 6px 0; text-align: center;">Hcp</th>
                            <th style="padding: 6px 0; text-align: center;">Net</th>
                            <th style="padding: 6px 0; text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            winners.forEach((w, idx) => {
                const hcp = category === 'front' ? (w.frontHcp || 0) : category === 'back' ? (w.backHcp || 0) : (w.courseHcp || 0);
                table += `
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 8px 0;">${w.position || idx + 1}</td>
                        <td style="padding: 8px 0;"><b>${w.name}</b></td>
                        <td style="padding: 8px 0; text-align: center;">${w.gross}</td>
                        <td style="padding: 8px 0; text-align: center; color: #9ca3af;">${hcp}</td>
                        <td style="padding: 8px 0; text-align: center; color: #16a34a; font-weight: bold;">(${Math.round(w.score)})</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: bold;">$${w.amount.toFixed(2)}</td>
                    </tr>
                `;
            });

            table += `</tbody></table>`;
            return table;
        }

        const blobHtml = new Blob([html], { type: 'text/html' });
        const blobText = new Blob([html.replace(/<[^>]*>?/gm, "")], { type: 'text/plain' });

        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': blobHtml,
                    'text/plain': blobText
                })
            ]);
            alert('Pool results copied to clipboard!');
        } catch (e) {
            console.error(e);
            alert('Failed to copy');
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="p-2.5 bg-black rounded-lg hover:bg-gray-800 transition-colors shadow-sm text-white cursor-pointer"
            title="Copy Results"
        >
            <Copy className="w-5 h-5" />
        </button>
    );
}
