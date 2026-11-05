/**
 * Everything is stored locally on the device, inside the app's private documents folder:
 *
 *   <documents>/prep-planner/data.json      ← all subjects, tasks, sessions, resources, settings
 *   <documents>/prep-planner/data.bak.json  ← previous good copy (used if data.json gets corrupted)
 *   <documents>/prep-planner/files/…        ← PDFs / images / notes attached to resources
 *
 * No server, no account — data never leaves the phone unless the user exports it.
 */
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const root = new Directory(Paths.document, 'prep-planner');
const filesDir = new Directory(root, 'files');
const dataFile = new File(root, 'data.json');
const backupFile = new File(root, 'data.bak.json');

function ensureDirs() {
  if (!root.exists) root.create({ intermediates: true, idempotent: true });
  if (!filesDir.exists) filesDir.create({ intermediates: true, idempotent: true });
}

/* ---------------- App data (JSON file) ---------------- */

export async function loadData<T>(): Promise<T | null> {
  ensureDirs();
  for (const f of [dataFile, backupFile]) {
    if (!f.exists) continue;
    try {
      return JSON.parse(await f.text()) as T;
    } catch (e) {
      console.warn(`Could not read ${f.name}, trying backup`, e);
    }
  }
  return null;
}

let writing: Promise<void> = Promise.resolve();

/** Writes are serialized so two quick saves never interleave. */
export function saveData(data: unknown): Promise<void> {
  const json = JSON.stringify(data);
  writing = writing.then(async () => {
    try {
      ensureDirs();
      if (dataFile.exists) {
        if (backupFile.exists) backupFile.delete();
        dataFile.copySync(backupFile);
      }
      await dataFile.write(json);
    } catch (e) {
      console.warn('Saving data failed', e);
    }
  });
  return writing;
}

/** Share the whole data file (e.g. to WhatsApp / Drive) as a backup. */
export async function exportData() {
  await writing;
  if (!dataFile.exists) return false;
  const copy = new File(Paths.cache, `prep-planner-backup-${Date.now()}.json`);
  dataFile.copySync(copy);
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(copy.uri, { mimeType: 'application/json', dialogTitle: 'Save your planner backup' });
  return true;
}

/** Let the user pick a previously exported backup file. Returns parsed data or null. */
export async function pickBackup<T>(): Promise<T | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return null;
  const text = await new File(res.assets[0].uri).text();
  return JSON.parse(text) as T;
}

/* ---------------- Attachments ---------------- */

export interface StoredFile {
  fileName: string; // name inside files/ (unique)
  originalName: string;
  mimeType?: string;
  size?: number;
}

/** Opens the system picker and copies the chosen file into the app's own storage. */
export async function pickAndStoreFile(): Promise<StoredFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  ensureDirs();
  const safe = asset.name.replace(/[^\w.\-]+/g, '_');
  const fileName = `${Date.now().toString(36)}_${safe}`;
  const src = new File(asset.uri);
  const dest = new File(filesDir, fileName);
  src.copySync(dest);
  try {
    src.delete(); // remove the temporary cache copy
  } catch {}
  return { fileName, originalName: asset.name, mimeType: asset.mimeType ?? undefined, size: asset.size ?? dest.size ?? undefined };
}

export const storedFile = (fileName: string) => new File(filesDir, fileName);

export function deleteStoredFile(fileName?: string) {
  if (!fileName) return;
  try {
    const f = storedFile(fileName);
    if (f.exists) f.delete();
  } catch (e) {
    console.warn('delete file failed', e);
  }
}

/** Opens a stored file with the system viewer (Quick Look on iOS / share sheet on Android). */
export async function openStoredFile(fileName: string, mimeType?: string) {
  const f = storedFile(fileName);
  if (!f.exists) throw new Error('This file is missing from the device.');
  try {
    if (await f.canPreview()) {
      await f.preview();
      return;
    }
  } catch {}
  await Sharing.shareAsync(f.uri, { mimeType, dialogTitle: 'Open with…' });
}

export function storageUsage() {
  ensureDirs();
  let bytes = 0;
  let count = 0;
  for (const item of filesDir.list()) {
    if (item instanceof File) {
      bytes += item.size ?? 0;
      count++;
    }
  }
  return { bytes, count, dataBytes: dataFile.exists ? dataFile.size ?? 0 : 0 };
}

export const formatBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
