
import fs from 'fs/promises';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'site-config.json');

export interface SiteConfig {
    title: string;
    description: string;
    keywords?: string;
}

const DEFAULT_CONFIG: SiteConfig = {
    title: "Golf Live Scores - GolfLS.app",
    description: "Real-time golf scoring, handicap tracking, and live leaderboards for your golf group.",
    keywords: "golf, live scores, handicap, leaderboard, golf app"
};

export async function getSiteConfig(): Promise<SiteConfig> {
    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return DEFAULT_CONFIG;
    }
}

export async function updateSiteConfig(config: SiteConfig) {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}
