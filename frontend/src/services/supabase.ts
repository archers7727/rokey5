import { createClient } from '@supabase/supabase-js';

// Supabase 환경 변수 (나중에 .env 파일에서 가져오기)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Realtime 구독 헬퍼 함수
export const subscribeToParkingStatus = (callback: (payload: any) => void) => {
  return supabase
    .channel('parking-status-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'parking_current_status',
      },
      callback
    )
    .subscribe();
};

export const subscribeToParkingEvents = (callback: (payload: any) => void) => {
  return supabase
    .channel('parking-events-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'parking_events',
      },
      callback
    )
    .subscribe();
};

export const subscribeToParkingSessions = (callback: (payload: any) => void) => {
  return supabase
    .channel('parking-sessions-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'parking_sessions',
      },
      callback
    )
    .subscribe();
};
