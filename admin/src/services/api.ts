import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getCategories = async () => {
  const response = await api.get('/categories');
  return response.data;
};

export const createCategory = async (data: { name: string; slug: string; description?: string }) => {
  const response = await api.post('/categories', data);
  return response.data;
};

export const getBuyBoxAudit = async (productId: string) => {
  const response = await api.get(`/admin/catalog/master-products/${productId}/buy-box-audit`);
  return response.data;
};

export const getVendorDeliveryPincodes = async (sellerId?: string) => {
  const response = await api.get('/vendor/delivery-pincodes', { params: { sellerId }, withCredentials: true });
  return response.data;
};

export const addVendorDeliveryPincode = async (pincode: string, sellerId?: string) => {
  const response = await api.post('/vendor/delivery-pincodes', { pincode, sellerId }, { withCredentials: true });
  return response.data;
};

export const toggleVendorDeliveryPincode = async (id: string, isActive: boolean) => {
  const response = await api.put(`/vendor/delivery-pincodes/${id}`, { isActive }, { withCredentials: true });
  return response.data;
};

export const deleteVendorDeliveryPincode = async (id: string) => {
  const response = await api.delete(`/vendor/delivery-pincodes/${id}`, { withCredentials: true });
  return response.data;
};
