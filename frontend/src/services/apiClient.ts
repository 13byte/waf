import { ApiClient } from '../infrastructure/api/ApiClient';

// Create singleton instance
export const apiClient = new ApiClient('/api');

// Export class for type references if needed
export { ApiClient };