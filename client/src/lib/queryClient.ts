import { QueryClient } from '@tanstack/react-query';

// Create the query client instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

// Base API request function for data fetching
export const apiRequest = async (
  method: string, 
  endpoint: string, 
  data?: any, 
  customHeaders: Record<string, string> = {}
): Promise<Response> => {
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${window.location.origin}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  
  // Get authentication token from localStorage if available
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options: RequestInit = {
    method,
    headers,
    credentials: 'include'
  };
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }
  
  return fetch(url, options);
};