export async function saveImportedLabs(client, { encounterId, patientId, expectedLabs, labs }) {
  const { data, error } = await client.rpc(encounterId ? 'save_imported_labs_if_unchanged' : 'save_patient_imported_labs_if_unchanged', {
    ...(encounterId ? { target_encounter_id: encounterId } : {}), target_patient_id: patientId,
    expected_labs: expectedLabs, proposed_labs: labs,
  });
  if (error) {
    if (error.code === 'PGRST202') throw new Error('The lab-save database update has not been installed yet. Apply the atomic imported-lab save migration before retrying.');
    throw new Error([error.message, error.details, error.hint, error.code ? `Code: ${error.code}` : ''].filter(Boolean).join(' · '));
  }
  if (!data) throw new Error("This patient's labs changed during review or the destination is no longer accessible. Reload the chart and retry saving to preserve the latest results.");
  return data;
}
