export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const cache = global.vindiCache;
    
    if (!cache) {
      return res.json({
        success: false,
        message: 'No VINDI cache found. Run sync first.',
        hasCache: false
      });
    }

    res.json({
      success: true,
      hasCache: true,
      cacheInfo: {
        timestamp: cache.timestamp,
        stats: cache.stats,
        sampleData: cache.data?.slice(0, 3).map(item => ({
          cpfCnpj: item.cpfCnpj,
          vindiStatus: item.vindiStatus,
          totalPaid: item.totalPaid,
          vindiCustomerId: item.vindiCustomerId
        })),
        totalCached: cache.data?.length || 0
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}