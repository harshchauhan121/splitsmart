import client from './client';

export const register = (name, email, password) =>
    client.post('/auth/register', { name, email, password });

export const login = (email, password) =>
    client.post('/auth/login', { email, password });
