export function completedLabSourcePaths(rows) {
  if (!rows.length || rows.some(row => !['saved', 'skipped'].includes(row.review_status))) return [];
  return [...new Set(rows.map(row => row.duplicate_summary_json?.sourceDocument?.sharedFile?.path).filter(Boolean))];
}
