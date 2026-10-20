import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Review from './Review.tsx'

// The address ending in #/review shows the reviewer page. Anything else shows the form.
const Page = window.location.hash === "#/review" ? Review : App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
