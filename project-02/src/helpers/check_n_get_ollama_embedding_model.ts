import os from "os";
import path from "path";
import axios from "axios";
import ollama from "ollama";
import { OllamaEmbeddings } from "@langchain/ollama";
import { CacheBackedEmbeddings } from "langchain/embeddings/cache_backed";
import { LocalFileStore } from "@/storage/local-file-store";

// 캐시 디렉토리 경로 설정
const cacheDir = path.join(os.homedir(), ".cache", "embeddings");
const localFileStore = new LocalFileStore(cacheDir);

export default async function checkAndGetOllamaEmbeddingModel() {
  const baseUrl = "http://localhost:11434";
  const modelName = "nomic-embed-text:latest";

  try {
    // Ollama 서버가 실행 중인지 확인
    const modelsResponse = await axios.get(`${baseUrl}/api/tags`);

    if (modelsResponse.status !== 200) {
      throw new Error("Ollama 서버가 실행 중이지 않습니다.");
    }

    // 'nomic-embed-text' 모델이 있는지 확인
    const models: any[] = modelsResponse.data.models;
    if (models.findIndex(({ model }) => model === modelName) === -1) {
      console.log(`'${modelName}' 모델을 다운로드 합니다.`);
      await ollama.pull({ model: modelName, stream: true });
    }

    // 모든 조건이 충족되면 embeddings 객체 생성
    const underlyingEmbeddings = new OllamaEmbeddings({
      model: modelName,
      baseUrl: baseUrl,
    });

    const cacheBackedEmbeddings = CacheBackedEmbeddings.fromBytesStore(
      underlyingEmbeddings,
      localFileStore,
      {
        namespace: underlyingEmbeddings.model,
      }
    );

    console.log(
      "Ollama 서버가 실행 중이고, 'nomic-embed-text' 모델이 준비되었습니다."
    );
    return cacheBackedEmbeddings;
  } catch (error: any) {
    console.error("오류 발생:", error.message);
    throw error;
  }
}
