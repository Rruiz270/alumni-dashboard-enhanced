import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const apiKey = process.env.VINDI_API_KEY;
  const baseURL = process.env.VINDI_API_URL || 'https://app.vindi.com.br/api/v1';

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Debug info (remove in production)
  const debugInfo = {
    apiKeyLength: apiKey.length,
    apiKeyPrefix: apiKey.substring(0, 5) + '...',
    baseURL: baseURL,
    authHeader: `Basic ${Buffer.from(`${apiKey}:`).toString('base64').substring(0, 20)}...`
  };

  try {
    // Test with merchant endpoint (usually requires authentication)
    const response = await axios.get(`${baseURL}/merchant`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    res.status(200).json({ 
      success: true, 
      merchant: response.data.merchant,
      message: 'API connection successful',
      debug: debugInfo
    });
  } catch (error: any) {
    const errorData = {
      error: 'Connection failed',
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.errors?.[0]?.message || error.message,
      details: error.response?.data,
      debug: debugInfo
    };

    res.status(error.response?.status || 500).json(errorData);
  }
}