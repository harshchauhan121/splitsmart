import client from './client';

export const getGroups = () =>
    client.get('/groups');

export const createGroup = (name, description) =>
    client.post('/groups', { name, description });

export const getGroup = (id) =>
    client.get(`/groups/${id}`);

export const addMember = (groupId, email) =>
    client.post(`/groups/${groupId}/members`, { email });

export const getBalances = (groupId) =>
    client.get(`/groups/${groupId}/balances`);

export const leaveGroup = (groupId) =>
    client.delete(`/groups/${groupId}/leave`);

export const deleteGroup = (groupId) =>
    client.delete(`/groups/${groupId}`);

export const settleUp = (groupId, payerId, payeeId, amount) =>
    client.post(`/groups/${groupId}/settle`, { payer_id: payerId, payee_id: payeeId, amount });
