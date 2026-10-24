export function completedLabSourcePaths(rows) {
  if (!rows.length || rows.some(row => row.review_status !== 'saved')) return [];
  return [...new Set(rows.map(row => row.duplicate_summary_json?.sourceDocument?.sharedFile?.path).filter(Boolean))];
}
