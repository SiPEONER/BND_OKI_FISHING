import { useNavigate } from 'react-router'

/** Go back within the app, or home if this page was opened directly. */
export function useBack() {
  const navigate = useNavigate()
  return () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))
}
