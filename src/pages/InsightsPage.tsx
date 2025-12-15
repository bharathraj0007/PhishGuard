import { useNavigate } from 'react-router-dom'
import { Insights } from '../components/Insights'

export function InsightsPage() {
  const navigate = useNavigate()

  const handleScanClick = () => {
    navigate('/dashboard')
  }

  return <Insights onScanClick={handleScanClick} />
}
