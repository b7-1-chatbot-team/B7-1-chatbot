import { setupServer } from 'msw/node'

/**
 * 테스트용 가짜 서버.
 *
 * 네트워크 계층에서 요청을 가로채므로 axios 인스턴스와 인터셉터가 실제로 동작한 뒤
 * 응답을 받는다. axios 어댑터를 바꿔치기하는 방식(axios-mock-adapter)은
 * 인터셉터를 건너뛸 수 있어 검증 대상을 놓친다.
 *
 * 기본 핸들러는 두지 않는다. 각 테스트가 server.use(...) 로 필요한 응답만 등록한다.
 */
export const server = setupServer()
