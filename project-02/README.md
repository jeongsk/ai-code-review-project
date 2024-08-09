# AI 코드 리뷰 CLI 도구

안녕하세요! AI 코드 리뷰 CLI 도구를 사용해주셔서 감사합니다. 이 가이드는 도구를 설치하고 사용하는 방법을 안내해드립니다.

## 설치 방법

먼저, GitHub에서 리포지토리를 클론한 후 npm을 사용하여 도구를 설치해주세요.

1. 터미널을 열고 아래 명령어를 입력하여 리포지토리를 클론합니다:

    ```sh
    git clone git@github.com:jeongsk/ai-code-review-project.git
    ```

2. 클론한 디렉토리로 이동합니다:

    ```sh
    cd ai-code-review-project/project-01
    ```

3. npm을 사용하여 글로벌 설치를 진행합니다:

    ```sh
    npm install -g .
    ```

4. LAAS_API_KEY 설정:
   - `.env` 또는 `.env.local` 파일을 프로젝트 루트 디렉토리에 생성합니다.
   - 파일에 다음 내용을 추가합니다:

     ```
     LAAS_API_KEY=your_api_key_here
     ```

   - `your_api_key_here`를 실제 LAAS API 키로 교체하세요.

## 사용 방법

이제 코드 리뷰를 받고 싶은 파일을 준비해봅시다.

1. 리뷰 받고 싶은 파일을 Git에 추가합니다:

    ```sh
    git add .
    ```

2. `code-review` 명령어를 실행하여 리뷰를 요청합니다:

    ```sh
    code-review
    ```

이제 AI가 코드를 분석하고 리뷰를 제공할 것입니다. 즐거운 코드 리뷰 경험이 되시길 바랍니다! 추가적인 질문이 있다면 언제든지 문의해주세요. 😊
