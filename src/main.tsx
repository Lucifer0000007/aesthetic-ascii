import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Vercel Web Analytics — free tier: 2500 events/month, page views, referrers, geo */}
    <Analytics />
    {/* Vercel Speed Insights — free tier: Core Web Vitals (LCP, FID, CLS, TTFB) tracking */}
    <SpeedInsights />
  </StrictMode>,
)
