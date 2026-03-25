import client from './client';

export const getExpenses = (groupId) =>
    client.get(`/groups/${groupId}/expenses`);

export const getExpense = (id) =>
    client.get(`/expenses/${id}`);

export const createExpense = (groupId, data) =>
    client.post(`/groups/${groupId}/expenses`, data);

export const updateExpense = (id, data) =>
    client.put(`/expenses/${id}`, data);

export const deleteExpense = (id) =>
    client.delete(`/expenses/${id}`);
