const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
    throw new Error('Missing environment variable: EXPO_PUBLIC_API_URL');
}

const log = (message: string, data?: any) => {
    if (__DEV__) {
        console.log(`[API] ${message}`, data || '');
    }
};

export const api = {
    auth: {
        signup: async (data: any) => {
            const url = `${API_URL}/auth/signup/`;
            try {
                log(`POST ${url}`, data);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const json = await response.json();
                log('Signup response', { status: response.status, json });
                if (!response.ok) throw new Error(JSON.stringify(json));
                return json;
            } catch (error) {
                log('Signup error', error);
                throw error;
            }
        },
        login: async (data: any) => {
            const url = `${API_URL}/auth/login/`;
            try {
                log(`POST ${url}`, data);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const json = await response.json();
                log('Login response', { status: response.status, json });
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Login failed');
                return json;
            } catch (error) {
                log('Login error', error);
                throw error;
                throw error;
            }
        },
        updateProfile: async (token: string, data: any) => {
            const url = `${API_URL}/auth/profile/`;
            try {
                log(`PATCH ${url}`, data);
                const response = await fetch(url, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });
                const json = await response.json();
                log('Profile update response', { status: response.status, json });
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Update failed');
                return json;
            } catch (error) {
                log('Profile update error', error);
                throw error;
            }
        },
    },
    chat: {
        getConversations: async (token: string) => {
            const url = `${API_URL}/chat/conversations/`;
            try {
                log(`GET ${url}`);
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                const json = await response.json();
                log(`Conversations fetched from ${url}`, { count: json.length });
                if (!response.ok) throw new Error('Failed to fetch conversations');
                return json;
            } catch (error) {
                log(`Fetch conversations error from ${url}`, error);
                console.error(error);
                return [];
            }
        },
        getMessages: async (token: string, conversationId: string) => {
            const url = `${API_URL}/chat/messages/${conversationId}/`;
            try {
                log(`GET ${url}`);
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                const json = await response.json();
                log(`Messages fetched from ${url}`, { count: json.length });
                if (!response.ok) throw new Error('Failed to fetch messages');
                return json;
            } catch (error) {
                log(`Fetch messages error from ${url}`, error);
                console.error(error);
                return [];
            }
        },
        checkContacts: async (token: string, phoneNumbers: string[]) => {
            const url = `${API_URL}/auth/check-contacts/`;
            try {
                log(`POST ${url}`, { count: phoneNumbers.length });
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ phone_numbers: phoneNumbers }),
                });
                const json = await response.json();
                log(`Contacts checked from ${url}`, { matches: json.length });
                if (!response.ok) throw new Error('Failed to check contacts');
                return json;
            } catch (error) {
                log(`Check contacts error from ${url}`, error);
                console.error(error);
                return [];
            }
        },
        createConversation: async (token: string, recipientUsername: string) => {
            const url = `${API_URL}/chat/conversations/`;
            try {
                log(`POST ${url}`, { recipient: recipientUsername });
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ recipient: recipientUsername }),
                });
                const json = await response.json();
                log(`Conversation created`, { id: json.id });
                if (!response.ok) throw new Error('Failed to create conversation');
                return json;
            } catch (error) {
                log(`Create conversation error`, error);
                throw error;
            }
        }
    }
};
