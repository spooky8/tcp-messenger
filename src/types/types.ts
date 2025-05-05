export interface Message {
  id: string;
  content: string;
  sender: 'me' | 'other';
  timestamp: string; // ISO string
}

export interface ServerResponse {
  type: 'ok' | 'error' | 'create';
  status?: string;
  addr?: string;
}