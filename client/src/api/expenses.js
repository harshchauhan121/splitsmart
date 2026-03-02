import client from './client';

export const getExpenses = (groupId) =>
    client.get(`/groups/${groupId}/expenses`);

export const createExpense = (groupId, data) =>
    client.post(`/groups/${groupId}/expenses`, data);

export const deleteExpense = (id) =>
    client.delete(`/expenses/${id}`);
