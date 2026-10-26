export function completedLabSourcePaths(rows) {
  if (!rows.length || rows.some(row => !['saved', 'deleted'].includes(row.review_status))) return [];
  return [...new Set(rows.map(row => row.duplicate_summary_json?.sourceDocument?.sharedFile?.path).filter(Boolean))];
}
