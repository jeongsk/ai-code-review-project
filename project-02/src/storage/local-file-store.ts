import * as fs from "fs/promises";
import * as path from "path";
import { BaseStore } from "@langchain/core/stores";

export class LocalFileStore extends BaseStore<string, Uint8Array> {
  lc_namespace = ["langchain", "storage"];

  constructor(public basePath: string) {
    super({});
  }

  private getFilePath(key: string): string {
    return path.join(this.basePath, key);
  }

  async mget(keys: string[]): Promise<(Uint8Array | undefined)[]> {
    return Promise.all(
      keys.map(async (key) => {
        try {
          return await fs.readFile(this.getFilePath(key));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return undefined;
          }
          throw error;
        }
      })
    );
  }

  async mset(keyValuePairs: [string, Uint8Array][]): Promise<void> {
    await Promise.all(
      keyValuePairs.map(async ([key, value]) => {
        await fs.mkdir(path.dirname(this.getFilePath(key)), { recursive: true });
        await fs.writeFile(this.getFilePath(key), value);
      })
    );
  }

  async mdelete(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        try {
          await fs.unlink(this.getFilePath(key));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
          }
        }
      })
    );
  }

  async *yieldKeys(prefix?: string): AsyncGenerator<string, void, unknown> {
    const files = await fs.readdir(this.basePath, { withFileTypes: true });
    for (const file of files) {
      if (file.isFile()) {
        const fileName = file.name;
        if (!prefix || fileName.startsWith(prefix)) {
          yield fileName;
        }
      }
    }
  }
}
