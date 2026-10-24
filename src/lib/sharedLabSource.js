import { completedLabSourcePaths } from "./labSourceLifecycle.js";
import { supabase } from './supabase';
export const LAB_SOURCE_BUCKET = 'lab-import-sources';
export async function uploadSharedLabSource(batchId, file) {
  const path = `${batchId}/original`;
  const { error } = await supabase.storage.from(LAB_SOURCE_BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
  if (error) throw new Error(`Could not share the original report: ${error.message}`);
  return { bucket: LAB_SOURCE_BUCKET, path, type: file.type };
}
export async function downloadSharedLabSource(source) {
  if (!source?.sharedFile?.path) return null;
  const { data, error } = await supabase.storage.from(LAB_SOURCE_BUCKET).download(source.sharedFile.path);
  if (error) throw error;
  return new File([data], source.name || 'report.pdf', { type: source.sharedFile.type || data.type });
}
export async function cleanupCompletedLabSources(batchId) {
  if (!batchId) return;
  const { data, error } = await supabase.from('lab_import_packets').select('review_status, duplicate_summary_json').eq('batch_id', batchId);
  if (error) throw error;
  const paths = completedLabSourcePaths(data || []);
  if (!(data || []).length || data.some(row => row.review_status !== 'saved')) return;
  if (paths.length) {
    const { error: removeError } = await supabase.storage.from(LAB_SOURCE_BUCKET).remove(paths);
    if (removeError) throw removeError;
  }
  const { error: cleanupError } = await supabase.rpc('clear_completed_lab_batch', { target_batch_id: batchId });
  if (cleanupError) throw cleanupError;
}
