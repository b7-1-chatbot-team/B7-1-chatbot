import 'axios'

/**
 * 재발급 후 재시도한 요청인지 표시하는 플래그.
 * 재시도한 요청이 다시 401 을 받아도 또 재발급하지 않도록 막는 무한 루프 방지 장치다.
 *
 * 두 인터페이스 모두에 선언한다.
 * - InternalAxiosRequestConfig: 인터셉터가 받는 설정 타입
 * - AxiosRequestConfig: client.request() 에 넘기는 설정 타입
 */
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retried?: boolean
  }

  interface AxiosRequestConfig {
    _retried?: boolean
  }
}
