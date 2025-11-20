// Backup service utilities

/**
 * Trigger backend to create a backup and return the resulting Blob so the caller
 * can save it (e.g. download).
 */
export async function createBackup() {
  const res = await fetch('/api/backup');
  if (!res.ok) throw new Error('Failed to create backup');
  return res.blob(); // caller can download
}

/**
 * Restore a backup by uploading the provided file (FormData multipart).
 * If `file` is undefined, the backend should interpret it as a no-op or latest restore.
 */
export async function restoreBackup(file?: File) {
  const formData = new FormData();
  if (file) formData.append('file', file);

  const res = await fetch('/api/backup/restore', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to restore backup');
  return res.json();
}


// Permanently delete all data from the database
export async function deleteAllData() {
  const res = await fetch('/api/backup', { method: 'DELETE' });
  if (!res.ok) {
    const message = (await res.json()).message || 'Failed to delete data';
    throw new Error(message);
  }
  return res.json();
}

/**
 * Automatically trigger backups every `intervalMs` milliseconds.
 * Returns the interval ID so caller can clear it when needed.
 */
export function scheduleAutoBackup(intervalMs = 24 * 60 * 60 * 1000) {
  return setInterval(() => {
    createBackup().catch(err => console.error('Auto-backup failed:', err));
  }, intervalMs);
}