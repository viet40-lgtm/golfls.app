
interface Player {
    name: string;
    totalGross: number;
    strokesReceivedSoFar: number;
    totalNet: number;
    toPar: number;
    courseHcp: number;
    id: string; // Needed for getSavedScore
}

interface Course {
    holes: Array<{
        holeNumber: number;
        par: number;
    }>;
    teeBoxes: Array<{
        name: string;
    }>;
}

// Helper to get score from map
const getSavedScore = (scores: Map<string, Map<number, number>>, playerId: string, holeNumber: number): number | null => {
    return scores.get(playerId)?.get(holeNumber) ?? null;
};

// Helper to split name
const splitName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return { first: parts[0], last: '' };
    const last = parts[parts.length - 1];
    const first = parts.slice(0, -1).join(' ');
    return { first, last };
};

const getPlayerTee = (player: any) => {
    // This logic relies on properties not fully typed here, assuming similarity to main component
    // If complex, pass the tee info in. For now, simplifying or mocking.
    // In the main component, getPlayerTee uses defaultCourse and player preferences.
    // We should probably pass the derived 'teeLetter' to this function instead of the whole object logic.
    return null;
};

export const generateScorecardHtml = (
    roundName: string,
    rankedPlayers: any[], // Type as any for flexibility during migration, can tighten later
    defaultCourse: Course,
    scores: Map<string, Map<number, number>>
): string => {

    let html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff">
        <tr>
            <td align="center" style="padding: 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border-collapse:collapse;">
                    <tr>
                        <td style="padding:1px;background:#000000;color:#ffffff;font-size:18px;font-weight:bold;text-align:center;">
                            ${roundName.replace('New Orleans', '')}<br/>
                            Leaderboard
                        </td>
                    </tr>
    `;

    rankedPlayers.forEach((p) => {
        const { first: firstName, last: lastName } = splitName(p.name);

        // Calculate Front/Back Gross
        let frontGross = 0;
        for (let h = 1; h <= 9; h++) { const s = getSavedScore(scores, p.id, h); if (s) frontGross += s; }
        let backGross = 0;
        for (let h = 10; h <= 18; h++) { const s = getSavedScore(scores, p.id, h); if (s) backGross += s; }

        const ch = p.courseHcp;

        // Tee Letter logic (simplified for helper)
        let teeLetter = '';
        if (p.teeBoxName) { // Assuming we pass this or derive it before
            const t = p.teeBoxName.toLowerCase();
            teeLetter = t.includes('white') ? 'W' : t.includes('gold') ? 'G' : t.charAt(0).toUpperCase();
        } else if (p.preferred_tee_box) {
            const t = p.preferred_tee_box.toLowerCase();
            teeLetter = t.includes('white') ? 'W' : t.includes('gold') ? 'G' : t.charAt(0).toUpperCase();
        }


        // Calculate To Par String
        let toParStr = "E";
        if (p.toPar > 0) toParStr = `+${p.toPar}`;
        else if (p.toPar < 0) toParStr = `${p.toPar}`;

        html += `
        <tr><td height="1"></td></tr>
        <tr>
            <td style="border:1px solid #CCCCCC;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                    <tr>
                        <td style="padding:1px;background:#1F4FD8;background-image:linear-gradient(#1F4FD8,#1F4FD8);color:#ffffff;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="color:#ffffff;font-size:16px;font-weight:bold;line-height:1.2;">
                                        ${firstName}<br/>
                                        ${lastName}
                                        ${teeLetter ? `<span style="background:#ffffff;color:#000;padding:1px 1px;border-radius:3px;font-size:10px;margin-left:1px;vertical-align:middle;">${teeLetter}</span>` : ''}
                                    </td>
                                    <td align="right" style="vertical-align:bottom;">
                                        <table cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td valign="bottom" style="padding-right:1px;padding-bottom:1px;">
                                                    <span style="background:#ffffff;color:#000000;padding:1px 1px;border-radius:4px;font-weight:bold;font-size:14px;display:inline-block;">${toParStr}</span>
                                                </td>
                                                <td>
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td align="center" style="padding:0 1px;color:#cbd5e1;font-size:9px;font-weight:bold;text-transform:uppercase;">GRS</td>
                                                            <td align="center" style="padding:0 1px;color:#cbd5e1;font-size:9px;font-weight:bold;text-transform:uppercase;">HCP</td>
                                                            <td align="center" style="padding:0 1px;color:#cbd5e1;font-size:9px;font-weight:bold;text-transform:uppercase;">NET</td>
                                                        </tr>
                                                        <tr>
                                                            <td align="center" style="padding:0 1px;color:#ffffff;font-size:14px;font-weight:bold;">${frontGross}+${backGross}=${p.totalGross}</td>
                                                            <td align="center" style="padding:0 1px;color:#ffffff;font-size:14px;font-weight:bold;">${ch}/${ch}</td>
                                                            <td align="center" style="padding:0 1px;color:#ffffff;font-size:14px;font-weight:bold;">${p.totalNet}</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed;">
        `;

        // Scores Rows (Front/Back)
        const renderNine = (start: number, end: number) => {
            let rowHtml = '<tr>';
            for (let h = start; h <= end; h++) {
                const score = getSavedScore(scores, p.id, h);
                const holePar = defaultCourse?.holes.find(hole => hole.holeNumber === h)?.par || 4;
                let bg = "#F2F2F2";
                let color = "#000000";

                if (score !== null) {
                    const diff = score - holePar;
                    if (diff <= -2) bg = "#fde047"; // Eagle
                    else if (diff === -1) bg = "#86efac"; // Birdie
                    else if (diff === 0) bg = "#ffffff";
                    else if (diff === 1) bg = "#fed7aa";
                    else if (diff >= 2) bg = "#fca5a5";
                }
                rowHtml += `
                <td style="border:1px solid #CCCCCC;background:${bg};background-image:linear-gradient(${bg},${bg});text-align:center;padding:1px 0;width:11.11%;">
                    <div style="font-size:11px;color:${color};opacity:0.8;">${h}/${holePar}</div>
                    <div style="font-size:14px;font-weight:bold;color:${color};">${score || '-'}</div>
                </td>`;
            }
            rowHtml += '</tr>';
            return rowHtml;
        };

        html += renderNine(1, 9);
        html += renderNine(10, 18);

        html += `
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>`;
    });

    html += `
                </table>
            </td>
        </tr>
    </table>
    </body>
    </html>`;

    return html;
};

// Clipboard HTML Generator (Slightly different format as per original code)
export const generateClipboardHtml = (
    roundName: string,
    rankedPlayers: any[],
    defaultCourse: Course,
    scores: Map<string, Map<number, number>>
): { html: string, text: string } => {

    let text = `${roundName}\n\nLeaderboard\n\n`;
    let html = `
    <div style="font-family: sans-serif; background-image: linear-gradient(#ffffff, #ffffff) !important; background-color: #ffffff !important; color: #000000 !important; margin: 0; padding: 0;">
        <meta name="color-scheme" content="light only">
        <meta name="supported-color-schemes" content="light only">
        <table width="100%" height="100%" bgcolor="#ffffff" cellpadding="0" cellspacing="0" border="0" style="background-image: linear-gradient(#ffffff, #ffffff) !important; background-color: #ffffff !important;">
            <tr>
                <td align="center" valign="top" style="padding: 1px; background-image: linear-gradient(#ffffff, #ffffff) !important; background-color: #ffffff !important;">
                    <div style="max-width: 600px; text-align: center; margin: 0 auto; background-image: linear-gradient(#ffffff, #ffffff) !important; background-color: #ffffff !important;">
                        <h2 style="margin: 0; font-size: 11pt; font-weight: bold; color: #000000 !important;">${roundName.replace('New Orleans', '')}</h2>
                        <br>
                        <h2 style="margin: 0; font-size: 11pt; font-weight: bold; color: #000000 !important;">Leaderboard</h2>
                    </div>
    `;

    rankedPlayers.forEach((p) => {
        const { first: firstName, last: lastName } = splitName(p.name);

        let toParStr = "E";
        let toParColor = "#16a34a";
        if (p.toPar > 0) { toParStr = `+${p.toPar}`; toParColor = "#000000"; }
        else if (p.toPar < 0) { toParStr = `${p.toPar}`; toParColor = "#dc2626"; }

        // Determine tee letter for display
        let teeLetter = '';
        if (p.teeBoxName) {
            const t = p.teeBoxName.toLowerCase();
            teeLetter = t.includes('white') ? 'W' : t.includes('gold') ? 'G' : t.charAt(0).toUpperCase();
        } else if (p.preferred_tee_box) {
            const t = p.preferred_tee_box.toLowerCase();
            teeLetter = t.includes('white') ? 'W' : t.includes('gold') ? 'G' : t.charAt(0).toUpperCase();
        }

        html += `
        <table width="100%" bgcolor="#ffffff" cellpadding="0" cellspacing="0" border="0" style="box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; margin-bottom: 1px; border: 2px solid #d1d5db;">
            <tr>
                <td>
                    <div style="background: #1d4ed8; padding: 1px; color: white;">
                        <table width="100%" cellpadding="1" cellspacing="0" border="0" style="color: white;">
                            <tr>
                                <td align="left" style="vertical-align: middle; padding: 1px;">
                                    <table cellpadding="1" cellspacing="0" border="0" style="color: white;">
                                        <tr>
                                            <td style="font-weight: bold; font-size: 13pt; line-height: 1.1; color: white;">${firstName}</td>
                                            <td style="padding-left: 1px;">
                                                ${teeLetter ? `<span style="font-size: 11pt; font-weight: 900; padding: 1px 1px; border-radius: 2px; background: ${teeLetter === 'W' ? '#e5e7eb; color: #1f2937' : '#fef3c7; color: #92400e'}; border: 1px solid #000;">${teeLetter}</span>` : ''}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colspan="2" style="font-size: 11pt; line-height: 1.1; opacity: 0.9; color: white;">${lastName}</td>
                                        </tr>
                                    </table>
                                </td>
                                <td align="right" style="vertical-align: middle; padding: 1px;">
                                    <table cellpadding="1" cellspacing="0" border="0" style="color: white;">
                                        <tr>
                                            <td style="background-image: linear-gradient(#ffffff, #ffffff) !important; background-color: #ffffff !important; color: ${toParColor} !important; font-weight: bold; border-radius: 4px; padding: 1px 1px; font-size: 11pt; text-align: center; min-width: 40px; border: 1px solid #000;">
                                                ${toParStr}
                                            </td>
                                            <td style="text-align: center; padding-left: 1px;">
                                                <div style="font-size: 11pt; font-weight: bold; opacity: 0.8; color: white;">GRS</div>
                                                <div style="font-size: 11pt; font-weight: bold; color: white;">${p.totalGross}</div>
                                            </td>
                                            <td style="text-align: center; padding-left: 1px;">
                                                <div style="font-size: 11pt; font-weight: bold; opacity: 0.8; color: white;">HCP</div>
                                                <div style="font-size: 11pt; font-weight: bold; color: white;">${p.strokesReceivedSoFar}</div>
                                            </td>
                                            <td style="text-align: center; padding-left: 1px;">
                                                <div style="font-size: 11pt; font-weight: bold; opacity: 0.8; color: white;">NET</div>
                                                <div style="font-size: 11pt; font-weight: bold; color: white;">${p.totalNet}</div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </div>
                    <div style="padding: 1px; border-top: 1px solid #000;">
                        <table width="100%" cellpadding="1" cellspacing="0" border="0" style="border-collapse: collapse;" bgcolor="#ffffff">
                            <tr style="border-bottom: 1px solid #000;">
        `;

        const renderClipNine = (start: number, end: number) => {
            let chunk = '';
            for (let h = start; h <= end; h++) {
                const score = getSavedScore(scores, p.id, h);
                const holePar = defaultCourse?.holes.find(hole => hole.holeNumber === h)?.par || 4;
                let bgColor = "#ffffff";

                if (score !== null) {
                    const diff = score - holePar;
                    if (diff <= -2) bgColor = "#fde047";
                    else if (diff === -1) bgColor = "#86efac";
                    else if (diff === 0) bgColor = "#ffffff";
                    else if (diff === 1) bgColor = "#fed7aa";
                    else if (diff >= 2) bgColor = "#fca5a5";
                }
                chunk += `
                <td style="border-right: 1px solid #000; text-align: center; padding: 1px; background-image: linear-gradient(${bgColor}, ${bgColor}) !important; background-color: ${bgColor} !important;" bgcolor="${bgColor}">
                    <div style="font-size: 11pt; color: #000000 !important; line-height: 1.1;">${h}/${holePar}</div>
                    <div style="font-size: 11pt; font-weight: bold; color: #000000 !important; line-height: 1.1;">${score || '-'}</div>
                </td>`;
            }
            return chunk;
        };

        html += renderClipNine(1, 9);
        html += `</tr><tr>`;
        html += renderClipNine(10, 18);

        html += `</tr></table></div></td></tr></table>`;
    });

    html += `
                </td>
            </tr>
        </table>
    </div>
    `;

    return { html, text };
}
