// Supabase 데이터베이스 타입 정의

export interface Customer {
  customer_id: string;
  name: string;
  phone: string;
  email?: string;
  registration_date: string;
  status: 'active' | 'inactive' | 'suspended';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  vehicle_id: string;
  customer_id: string;
  license_plate: string;
  vehicle_type?: string;
  vehicle_color?: string;
  registered_date: string;
  is_primary: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  payment_id: string;
  customer_id: string;
  payment_type: 'card' | 'cash' | 'transfer' | 'other';
  card_last4?: string;
  card_type?: string;
  description?: string;
  is_default: boolean;
  registered_date: string;
  status: 'active' | 'inactive' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface ParkingCurrentStatus {
  spot_id: string;
  is_occupied: boolean;
  confidence?: number;
  zone?: string;
  floor?: string;
  last_updated: string;
  notes?: string;
}

export interface ParkingEvent {
  event_id: string;
  vehicle_id?: string;
  license_plate: string;
  event_type: 'entry' | 'exit';
  gate_id?: string;
  event_time: string;
  confidence?: number;
  is_registered: boolean;
  image_url?: string;
  notes?: string;
  created_at: string;
}

export interface ParkingSession {
  session_id: string;
  vehicle_id?: string;
  customer_id?: string;
  license_plate: string;
  parking_spot_id?: string;
  entry_time: string;
  exit_time?: string;
  duration_minutes?: number;
  status: 'parked' | 'exited' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ParkingFee {
  fee_id: string;
  session_id: string;
  base_fee: number;
  additional_fee: number;
  total_fee: number;
  payment_status: 'unpaid' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  payment_method?: string;
  payment_method_id?: string;
  payment_time?: string;
  payment_note?: string;
  paid_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentLog {
  log_id: string;
  fee_id: string;
  attempt_time: string;
  status?: string;
  payment_method?: string;
  amount?: number;
  error_message?: string;
  processed_by?: string;
  notes?: string;
  created_at: string;
}

export interface ParkingFeePolicy {
  policy_id: string;
  policy_name: string;
  base_time_minutes: number;
  base_fee: number;
  additional_unit_minutes: number;
  additional_fee: number;
  free_minutes: number;
  daily_max_fee: number;
  is_active: boolean;
  valid_from: string;
  valid_to?: string;
  created_at: string;
  updated_at: string;
}

export interface TodayStatistics {
  total_entries: number;
  total_exits: number;
  currently_parked: number;
  total_revenue: number;
  total_spaces: number;
  occupied_spaces: number;
  available_spaces: number;
}

export interface Task {
  task_id: string;
  task_type: 'ENTER' | 'EXIT' | 'MOVE' | 'PARK' | string;
  vehicle_plate: string;
  vehicle_type?: string;
  blocking_vehicle?: string;
  assigned_robot?: string;
  helper_robot?: string;
  start_location?: string;
  target_location?: string;
  blocking_location?: string;
  temp_location?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | string;
  done: boolean;
  priority: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

// Join 타입 (고객 + 차량 정보)
export interface CustomerWithVehicles extends Customer {
  vehicles?: Vehicle[];
}

// Join 타입 (주차 세션 + 차량 + 고객 + 요금)
export interface ParkingSessionDetail extends ParkingSession {
  vehicle?: Vehicle;
  customer?: Customer;
  fee?: ParkingFee;
}
