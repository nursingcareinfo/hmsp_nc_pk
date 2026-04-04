/**
 * Firecrawl Service for web scraping and market analysis
 */

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v2';

export interface ScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    metadata?: any;
    content?: string;
  };
  error?: string;
}

export interface SearchResponse {
  success: boolean;
  data?: any[];
  error?: string;
}

export const firecrawlService = {
  /**
   * Scrapes a single URL
   */
  scrapeUrl: async (url: string): Promise<ScrapeResponse> => {
    const apiKey = import.meta.env.VITE_FIRECRAWL_API_KEY;
    
    if (!apiKey) {
      return {
        success: false,
        error: 'Firecrawl API Key is missing. Please add VITE_FIRECRAWL_API_KEY to your Secrets.'
      };
    }

    try {
      const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          formats: ['markdown']
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result.data
      };
    } catch (error: any) {
      console.error('Firecrawl Scrape Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to scrape URL'
      };
    }
  },

  /**
   * Searches for a query and returns results
   */
  search: async (query: string, limit: number = 5): Promise<SearchResponse> => {
    const apiKey = import.meta.env.VITE_FIRECRAWL_API_KEY;
    
    if (!apiKey) {
      return {
        success: false,
        error: 'Firecrawl API Key is missing. Please add VITE_FIRECRAWL_API_KEY to your Secrets.'
      };
    }

    try {
      const response = await fetch(`${FIRECRAWL_API_URL}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          limit,
          scrapeOptions: {
            formats: ['markdown']
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result.data
      };
    } catch (error: any) {
      console.error('Firecrawl Search Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to search'
      };
    }
  }
};
