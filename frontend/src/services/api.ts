/**
 * Backend API 클라이언트
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request error:', error);
      return {
        success: false,
        error: 'Network error or server is unavailable',
      };
    }
  }

  /**
   * 입차 처리
   */
  async processEntry(data: {
    license_plate: string;
    gate_id: string;
    is_registered?: boolean;
    vehicle_id?: string;
    customer_id?: string;
  }) {
    return this.request('/parking/entry', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 출차 처리
   */
  async processExit(session_id: string, gate_id?: string) {
    return this.request('/parking/exit', {
      method: 'POST',
      body: JSON.stringify({ session_id, gate_id }),
    });
  }

  /**
   * 고객 세션 조회
   */
  async getCustomerSession(customer_id: string) {
    return this.request(`/customer/session?customer_id=${customer_id}`, {
      method: 'GET',
    });
  }

  /**
   * 주차 현황 조회
   */
  async getParkingStatus() {
    return this.request('/parking/status', {
      method: 'GET',
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
