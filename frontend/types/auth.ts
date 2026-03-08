
export interface User {
    id: number;
    email: string;
    full_name: string;
    role: string;
    profile_pic_url?: string;
}

export interface Token {
    access_token: string;
    token_type: string;
}
