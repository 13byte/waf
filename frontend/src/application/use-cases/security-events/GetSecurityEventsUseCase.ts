// Get security events use case
import { ISecurityEventRepository, SecurityEventFilter, PaginationParams } from '../../../domain/repositories/ISecurityEventRepository';
import { SecurityEvent } from '../../../domain/entities/SecurityEvent';

export interface GetSecurityEventsParams {
  filter?: SecurityEventFilter;
  pagination?: PaginationParams;
}

export interface GetSecurityEventsResult {
  events: SecurityEvent[];
  total: number;
  page: number;
  totalPages: number;
}

export class GetSecurityEventsUseCase {
  constructor(
    private securityEventRepo: ISecurityEventRepository
  ) {}

  async execute(params: GetSecurityEventsParams): Promise<GetSecurityEventsResult> {
    const { filter, pagination = { page: 1, limit: 20 } } = params;
    
    const { events, total } = await this.securityEventRepo.getAll(filter, pagination);
    
    const totalPages = Math.ceil(total / pagination.limit);
    
    return {
      events,
      total,
      page: pagination.page,
      totalPages
    };
  }
}