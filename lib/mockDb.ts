import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch (e) {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

export async function readCollection<T = any>(name: string): Promise<T[]> {
  await ensureDataDir()
  const file = path.join(DATA_DIR, `${name}.json`)
  try {
    const raw = await fs.readFile(file, "utf8")
    return JSON.parse(raw) as T[]
  } catch (e) {
    return []
  }
}

export async function writeCollection<T = any>(name: string, items: T[]): Promise<void> {
  await ensureDataDir()
  const file = path.join(DATA_DIR, `${name}.json`)
  await fs.writeFile(file, JSON.stringify(items, null, 2), "utf8")
}
