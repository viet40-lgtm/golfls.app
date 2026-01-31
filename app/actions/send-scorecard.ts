'use server'

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendScorecardEmail(to: string, subject: string, html: string, fromName: string = 'Golf Scorecard') {
    if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is missing');
        return { success: false, error: 'Email service configuration missing' };
    }

    try {
        // 'to' can be a comma-separated string or an array of strings
        // Emails should be trimmed and filtered for validity if possible, but Resend handles basic string/array
        const recipients = to.split(';').map(e => e.trim()).filter(e => e.length > 0);

        if (recipients.length === 0) {
            return { success: false, error: 'No recipients provided' };
        }

        console.log(`Sending individual emails to ${recipients.length} recipients...`);

        // Send as a single group email so "Reply All" works
        const { data, error } = await resend.emails.send({
            from: `${fromName} <scorecard@score.cpgc.app>`,
            to: recipients,
            replyTo: 'viet53@gmail.com',
            subject: subject,
            html: html,
        });

        if (error) {
            console.error('Failed to send group email:', error);
            return { success: false, error: error };
        }

        return { success: true, data };


    } catch (error) {
        console.error('Failed to send email:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
