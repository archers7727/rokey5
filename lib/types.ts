// 데이터베이스 타입 정의

export interface ParkingSession {
  session_id: string;
  vehicle_id: string | null;
  customer_id: string | null;
  license_plate: string;
  parking_spot_id: string | null;
  entry_time: string;
  exit_time: string | null;
  status: 'parked' | 'exited';
  created_at?: string;
  updated_at?: string;
}

export interface ParkingEvent {
  event_id?: string;
  vehicle_id?: string | null;
  license_plate: string;
  event_type: 'entry' | 'exit';
  gate_id: string;
  event_time?: string;
  is_registered: boolean;
  confidence?: number;
}

export interface ParkingFee {
  fee_id?: string;
  session_id: string;
  base_fee: number;
  additional_fee: number;
  total_fee: number;
  payment_status: 'unpaid' | 'paid' | 'refunded';
  payment_method?: string | null;
  payment_time?: string | null;
  paid_by?: string | null;
}

export interface ParkingCurrentStatus {
  spot_id: string;
  is_occupied: boolean;
  zone: string;
  floor: string;
  last_updated?: string;
}

export interface Vehicle {
  vehicle_id: string;
  customer_id: string;
  license_plate: string;
  vehicle_type?: string;
  vehicle_color?: string;
}

export interface Customer {
  customer_id: string;
  name: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
}

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API 요청 타입
export interface EntryRequest {
  license_plate: string;
  gate_id: string;
  is_registered?: boolean;
  vehicle_id?: string;
  customer_id?: string;
}

export interface ExitRequest {
  session_id: string;
  gate_id?: string;
}

export interface CustomerSessionRequest {
  customer_id: string;
}
