import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import '@fontsource-variable/inter'
import './index.css'
import { routeTree } from './routeTree.gen'

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
