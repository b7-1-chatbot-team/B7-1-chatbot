/** 챗 화면의 말풍선 하나. 챗 화면에서만 쓰므로 이 폴더에 둔다 */
export type ChatMessage =
  | { id: string; kind: 'user'; text: string; createdAt: string }
  | { id: string; kind: 'bot'; text: string; createdAt: string }
  /** 응답을 기다리는 자리. 응답이 오면 같은 자리가 봇·오류 말풍선으로 바뀐다 */
  | { id: string; kind: 'pending'; question: string }
  | {
      id: string
      kind: 'error'
      code: number
      message: string
      /** [다시 시도] 할 때 보낼 질문 */
      question: string
      createdAt: string
    }
