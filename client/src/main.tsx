import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Review from './Review.tsx'
import AuditView from './AuditView.tsx'

// #/review shows the Manager screen, #/audit shows the Auditor screen, anything else shows the report form.
const hash = window.location.hash;
const Page = hash === "#/review" ? Review : hash === "#/audit" ? AuditView : App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)