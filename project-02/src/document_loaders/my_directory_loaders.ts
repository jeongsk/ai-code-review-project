import { minimatch } from "minimatch";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "langchain/dist/document_loaders/base";
import {
  DirectoryLoader,
  UnknownHandling,
} from "langchain/document_loaders/fs/directory";

interface LoadersMapping {
  [extension: string]: (filePath: string) => BaseDocumentLoader;
}

export class MyDirectoryLoader extends DirectoryLoader {
  constructor(
    public directoryPath: string,
    public loaders: LoadersMapping,
    public excludePaths: Array<string> = [],
    public recursive: boolean = true,
    public unknown: UnknownHandling = UnknownHandling.Warn,
  ) {
    super(directoryPath, loaders, recursive, unknown);
  }

  public async load(): Promise<Document[]> {
    const { readdir, extname, resolve } = await MyDirectoryLoader.imports();
    const files = await readdir(this.directoryPath, { withFileTypes: true });

    const documents: Document[] = [];

    for (const file of files) {
      const fullPath = resolve(this.directoryPath, file.name);

      // 경로가 excludePaths의 정규식과 일치하는지 확인
      const shouldExclude = this.excludePaths.some((pattern) =>
        minimatch(fullPath, pattern),
      );

      if (shouldExclude) continue; // 일치하는 경우 이 파일/디렉토리를 건너뜁니다.

      console.log(fullPath);
      if (file.isDirectory()) {
        if (this.recursive) {
          const loader = new MyDirectoryLoader(
            fullPath,
            this.loaders,
            this.excludePaths,
            this.recursive,
            this.unknown,
          );
          documents.push(...(await loader.load()));
        }
      } else {
        // I'm aware some things won't be files,
        // but they will be caught by the "unknown" handling below.
        const loaderFactory = this.loaders[extname(file.name)];
        if (loaderFactory) {
          const loader = loaderFactory(fullPath);
          documents.push(...(await loader.load()));
        } else {
          switch (this.unknown) {
            case UnknownHandling.Ignore:
              break;
            case UnknownHandling.Warn:
              console.warn(`Unknown file type: ${file.name}`);
              break;
            case UnknownHandling.Error:
              throw new Error(`Unknown file type: ${file.name}`);
            default:
              throw new Error(`Unknown unknown handling: ${this.unknown}`);
          }
        }
      }
    }

    return documents;
  }
}
