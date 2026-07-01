import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(__filename), '../../..');
const backupScript = resolve(projectRoot, 'scripts/backup-db.sh');

function runBackup() {
  execFile('/bin/bash', [backupScript], (err, stdout, stderr) => {
    if (err) console.error('[scheduler] Backup failed:', err.message);
    else {
      if (stdout) console.log('[scheduler]', stdout.trim());
      if (stderr) console.error('[scheduler]', stderr.trim());
    }
  });
}

export function startDailyBackup() {
  cron.schedule('0 3 * * *', runBackup);
  console.log('[scheduler] Daily backup scheduled at 3:00 AM');
}
