import { env } from "~/env";

export type WebSearchResult = {
    title: string;
    url: string;
    snippet: string;
    relevanceScore?: number; // Optional relevance score (1-10) from agent synthesis
};

/**
 * Performs a web search using the Tavily API
 * @param query - The search query
 * @param maxResults - Maximum number of results to return (default: 5)
 * @returns Array of web search results
 */
export async function performTavilySearch(
    query: string,
    maxResults = 5
): Promise<WebSearchResult[]> {
    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: env.server.TAVILY_API_KEY,
                query,
                max_results: maxResults,
                search_depth: "basic",
            }),
        });

        if (!response.ok) {
            throw new Error(`Tavily API error: ${response.statusText}`);
        }

        const data = (await response.json()) as {
            results?: Array<{
                title?: string;
                url?: string;
                content?: string;
            }>;
        };

        if (!data.results || !Array.isArray(data.results)) {
            return [];
        }

        return data.results
            .map((item) => ({
                title: item.title ?? 'Untitled',
                url: item.url ?? '',
                snippet: item.content ?? '',
            }))
            .filter((item) => item.url && item.title);
    } catch (error) {
        console.error('Tavily search error:', error);
        return [];
    }
}

