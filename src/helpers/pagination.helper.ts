import { PaginationResult } from 'src/common/dto/pagination.dto';

export function buildPagination<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginationResult<T> {
  const lastPage = Math.ceil(total / limit);
  return {
    data,
    meta: {
      total,
      page,
      lastPage,
      limit,
    },
  };
}
