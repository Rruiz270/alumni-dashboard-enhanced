import type { NextApiRequest, NextApiResponse } from 'next';
import { database } from '../../../src/lib/database';

interface UpdateResponse {
  success: boolean;
  data?: {
    action: 'full_refresh' | 'clear_cache' | 'cache_status';
    message: string;
    cacheInfo?: {
      lastUpdate: string | null;
      cacheAge: number;
      cacheSize: number;
      isFresh: boolean;
    };
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse>
) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST for actions or GET for status.'
    });
  }

  try {
    // GET request - return cache status
    if (req.method === 'GET') {
      const cachedData = database.loadData();
      const cacheAge = database.getCacheAge();
      const cacheSize = database.getCacheSize();
      const isFresh = database.isCacheFresh(2); // 2 hours
      
      return res.status(200).json({
        success: true,
        data: {
          action: 'cache_status',
          message: `Cache status: ${isFresh ? 'Fresh' : 'Stale'}, Age: ${cacheAge.toFixed(1)}h, Size: ${cacheSize}MB`,
          cacheInfo: {
            lastUpdate: cachedData?.lastUpdate || null,
            cacheAge,
            cacheSize,
            isFresh
          }
        }
      });
    }

    // POST request - perform action
    const { action } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action parameter is required. Valid actions: full_refresh, clear_cache'
      });
    }

    switch (action) {
      case 'full_refresh':
        console.log('🔄 Admin triggered full data refresh');
        
        // Trigger a full refresh by making a request to the main API with refresh=true
        const refreshUrl = `${req.headers.host}/api/dashboard-data-v3?refresh=true`;
        
        // Since we can't make HTTP requests from the same server easily,
        // we'll clear cache and let the next request do the refresh
        database.clearCache();
        
        return res.status(200).json({
          success: true,
          data: {
            action: 'full_refresh',
            message: 'Cache cleared. Next dashboard request will trigger full data refresh.',
            cacheInfo: {
              lastUpdate: null,
              cacheAge: 0,
              cacheSize: 0,
              isFresh: false
            }
          }
        });

      case 'clear_cache':
        console.log('🗑️ Admin triggered cache clear');
        
        database.clearCache();
        
        return res.status(200).json({
          success: true,
          data: {
            action: 'clear_cache',
            message: 'Cache cleared successfully. Next request will fetch fresh data.',
            cacheInfo: {
              lastUpdate: null,
              cacheAge: 0,
              cacheSize: 0,
              isFresh: false
            }
          }
        });

      default:
        return res.status(400).json({
          success: false,
          error: `Invalid action: ${action}. Valid actions: full_refresh, clear_cache`
        });
    }

  } catch (error) {
    console.error('❌ Admin API Error:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}