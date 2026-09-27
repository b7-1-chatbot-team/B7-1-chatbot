import AppRoutes from './routes'

// 앱 껍데기. 라우트 정의는 src/routes 에서 관리한다.
// 공통 레이아웃(헤더)은 src/layouts 에 있고, 라우트 정의에서 레이아웃 라우트로 감싼다.
export default function App() {
  return <AppRoutes />
}
