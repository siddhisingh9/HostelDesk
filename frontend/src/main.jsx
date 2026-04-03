import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#17171f',
            color: '#e8e8f0',
            border: '1px solid #2a2a3a',
            borderRadius: '10px',
            fontSize: '14px',
          },
        }}
      />
    </AuthProvider>
  </React.StrictMode>,
)
