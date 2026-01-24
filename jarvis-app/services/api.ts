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
                const isFormData = data instanceof FormData;
                log(`PATCH ${url}`, isFormData ? 'FormData' : data);
                const response = await fetch(url, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Token ${token}`,
                        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
                    },
                    body: isFormData ? data : JSON.stringify(data),
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
        getMessages: async (token: string, conversationId: string, limit: number = 20, offset: number = 0) => {
            const url = `${API_URL}/chat/messages/${conversationId}/?limit=${limit}&offset=${offset}`;
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

                // Keep backward compatibility if backend returns dict with 'results'
                const results = Array.isArray(json) ? json : (json.results || []);

                log(`Messages fetched from ${url}`, { count: results.length });
                if (!response.ok) throw new Error('Failed to fetch messages');
                return results;
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
        },
        deleteConversation: async (token: string, conversationId: string) => {
            const url = `${API_URL}/chat/conversations/${conversationId}/`;
            try {
                log(`DELETE ${url}`);
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.status === 204) {
                    log(`Conversation deleted`, { id: conversationId });
                    return true;
                }

                const text = await response.text();
                try {
                    const json = JSON.parse(text);
                    log(`Delete conversation response`, { status: response.status, json });
                    if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to delete conversation');
                    return json;
                } catch (e) {
                    log(`Delete conversation non-JSON response`, { status: response.status, text });
                    throw new Error(`Server returned non-JSON response: ${response.status}`);
                }
            } catch (error) {
                log(`Delete conversation error`, error);
                throw error;
            }
        },
        uploadFile: async (token: string, conversationId: string | null, recipientUsername: string | null, file: any, text: string = '', replyToId?: string) => {
            const url = `${API_URL}/chat/messages/upload/`;
            const formData = new FormData();

            if (conversationId) formData.append('conversation_id', conversationId);
            if (recipientUsername) formData.append('recipient_username', recipientUsername);
            formData.append('text', text);
            if (replyToId) formData.append('reply_to_id', replyToId);

            if (file) {
                // Expo Document Picker result structure
                formData.append('file', {
                    uri: file.uri,
                    name: file.name || 'file',
                    type: file.mimeType || 'application/octet-stream'
                } as any);

                // Send file_type and file_name separately for backend
                if (file.mimeType) {
                    formData.append('file_type', file.mimeType);
                }
                if (file.name) {
                    formData.append('file_name', file.name);
                }

                log('File being uploaded', { name: file.name, type: file.mimeType, uri: file.uri });
            }

            try {
                log(`POST ${url} (Multipart)`, { conversationId, hasFile: !!file });
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        // Do NOT set Content-Type for multipart/form-data - let fetch set it with boundary
                    },
                    body: formData,
                });

                const json = await response.json();
                log('Upload response', { status: response.status, json });
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Upload failed');
                return json;
            } catch (error) {
                log('Upload error', error);
                throw error;
            }
        }
    }
};
