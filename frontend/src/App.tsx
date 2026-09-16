import AppRoutes from './routes'

// 앱 껍데기. 라우트 정의는 src/routes 에서 관리한다.
// 공통 레이아웃(헤더·푸터)은 레이아웃 이슈에서 이 안에 추가한다.
export default function App() {
  return <AppRoutes />
}
