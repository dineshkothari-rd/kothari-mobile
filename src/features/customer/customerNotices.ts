import type { NoticeRecord } from '../../shared/types/records';

export function mergeCustomerNotices(...groups: NoticeRecord[][]) {
  const notices = new Map<string, NoticeRecord>();

  groups.flat().forEach((notice) => notices.set(notice.id, notice));

  return [...notices.values()].sort(
    (first, second) => Number(second.createdAt?.seconds || 0) - Number(first.createdAt?.seconds || 0),
  );
}
