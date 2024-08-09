import axios from "axios";
import ollama from "ollama";
import { OllamaEmbeddings } from "@langchain/ollama";

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
    const embeddings = new OllamaEmbeddings({
      model: modelName,
      baseUrl: baseUrl,
    });

    console.log(
      "Ollama 서버가 실행 중이고, 'nomic-embed-text' 모델이 준비되었습니다.",
    );
    return embeddings;
  } catch (error: any) {
    console.error("오류 발생:", error.message);
    return null;
  }
}
