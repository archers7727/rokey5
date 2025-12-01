import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ParkingService } from '../../lib/parking.service';

/**
 * GET /api/customer/session?customer_id=xxx
 * 고객 세션 조회 API
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { customer_id } = req.query;

    if (!customer_id || typeof customer_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: customer_id',
      });
    }

    const result = await ParkingService.getCustomerSession(customer_id);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Customer session API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
