export interface User {
	id: number;
	username: string;
	email: string;
	role: 'user' | 'admin' | 'moderator';
	profile_image?: string;
	bio?: string;
	created_at: string;
	is_active: boolean;
}

export interface Category {
	id: number;
	name: string;
	description?: string;
	created_at: string;
	is_active: boolean;
}

export interface Post {
	id: number;
	title: string;
	content: string;
	user_id: number;
	category_id: number;
    image_url?: string | null;
	view_count: number;
	like_count: number;
	created_at: string;
	updated_at: string;
	is_published: boolean;
	author: User;
	category: Category;
}

export interface Comment {
	id: number;
	content: string;
	post_id: number;
	user_id: number;
	parent_id?: number;
	like_count: number;
	created_at: string;
	author: User;
}

export interface AuthToken {
	access_token: string;
	token_type: string;
}

export interface LoginRequest {
	username: string;
	password: string;
}

export interface RegisterRequest {
	username: string;
	email: string;
	password: string;
	bio?: string;
}

export interface PostFormData {
    title: string;
    content: string;
    category_id: number;
    image?: File | null;
}

export interface CommentCreateRequest {
	content: string;
	post_id: number;
	parent_id?: number;
}

export interface ApiResponse<T> {
	data?: T;
	error?: string;
	status: number;
}

export interface PaginatedResponse<T> {
	items: T[];
	total: number;
	page: number;
	per_page: number;
	pages: number;
}

export interface WafLogEntry {
	id: string;
	log_unique_id: string;
	timestamp: string;
	source_ip: string;
	source_port: number | null;
	dest_ip: string | null;
	dest_port: number | null;
	target_website: string | null;
	method: string;
	uri: string;
	status_code: number;
	is_blocked: boolean;
	is_attack: boolean;
	attack_types: string[] | null;
	rule_ids: string[] | null;
	rule_files: string[] | null;
	severity_score: number;
	anomaly_score: number;
	raw_log: any;
	created_at?: string;
}

export interface AttackDetail {
	message: string;
	data: string;
	rule_id: string;
	file: string;
}

export interface WafLogsResponse {
	logs: WafLogEntry[];
	total: number;
	page: number;
	pages: number;
	has_next: boolean;
}

export type WafLog = WafLogEntry;

export interface WafStats {
	total_requests: number;
	blocked_requests: number;
	block_rate: number;
	attack_types: Record<string, number>;
	top_source_ips: Record<string, number>;
	recent_attacks: WafLogEntry[];
}