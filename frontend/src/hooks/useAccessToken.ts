import { useSyncExternalStore } from 'react'

import { getAccessToken, subscribe } from '@/utils/tokenStorage'

/**
 * 현재 access token 을 읽고, 값이 바뀌면 컴포넌트를 다시 렌더한다.
 *
 * useSyncExternalStore 는 React 밖에 있는 값(localStorage)을 React 안으로 가져오는 훅이다.
 * subscribe 로 변화를 듣고, 알림이 오면 getAccessToken 을 다시 호출해 이전 값과 비교한다.
 *
 * getAccessToken 은 문자열이나 null 을 반환한다. 여기서 매번 새 객체를 반환하면
 * Object.is 비교가 항상 거짓이 되어 무한 리렌더에 빠지므로, 토큰 두 개를 함께
 * 봐야 한다면 훅을 나눈다.
 */
export function useAccessToken(): string | null {
  return useSyncExternalStore(subscribe, getAccessToken)
}
