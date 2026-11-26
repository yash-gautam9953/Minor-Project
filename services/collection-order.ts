export interface CreatedDocument {
  $createdAt: string;
}

export function sortNewestFirst<T extends CreatedDocument>(documents: T[]) {
  return [...documents].sort((left, right) => {
    const leftCreatedAt = Date.parse(left.$createdAt);
    const rightCreatedAt = Date.parse(right.$createdAt);
    const leftTimestamp = Number.isNaN(leftCreatedAt) ? 0 : leftCreatedAt;
    const rightTimestamp = Number.isNaN(rightCreatedAt) ? 0 : rightCreatedAt;
    return rightTimestamp - leftTimestamp;
  });
}
