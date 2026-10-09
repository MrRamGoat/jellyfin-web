import type { ApiClient } from 'jellyfin-apiclient';

/** Authenticate feature services with the current Jellyfin session; never persist a second token. */
export async function serviceRequest<T>(
    service: 'rfstats' | 'rfvoice',
    path: string,
    client: ApiClient,
    options?: RequestInit
): Promise<T> {
    const base = `/${service}`;
    const auth = await fetch(`${base}/api/sso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: client.accessToken() })
    });
    if (!auth.ok || !(await auth.json()).auth) throw new Error('Please sign in again to use this service.');
    const response = await fetch(`${base}${path}`, options);
    if (!response.ok) throw new Error('The service is unavailable. Please try again.');
    return response.json();
}
