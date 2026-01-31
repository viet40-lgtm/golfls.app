'use server';

import { getSiteConfig, updateSiteConfig, SiteConfig } from '@/lib/site-config';
import { revalidatePath } from 'next/cache';

export async function fetchSiteConfig() {
    return await getSiteConfig();
}

export async function saveSiteConfig(config: SiteConfig) {
    await updateSiteConfig(config);
    revalidatePath('/', 'layout'); // Revalidate everything really
}
