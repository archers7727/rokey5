import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ParkingService } from '../../lib/parking.service';
import type { EntryRequest } from '../../lib/types';

/**
 * POST /api/parking/entry
 * 입차 처리 API
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const requestData: EntryRequest = req.body;

    // 필수 필드 검증
    if (!requestData.license_plate || !requestData.gate_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: license_plate, gate_id',
      });
    }

    // 입차 처리
    const result = await ParkingService.processEntry(requestData);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Entry API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
