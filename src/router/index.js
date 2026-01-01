import { createRouter, createWebHashHistory } from 'vue-router'
import WebView from '../components/WebView.vue'
import ErrorPage from '../components/ErrorPage.vue'

const routes = [
  {
    path: '/',
    redirect: '/webview'
  },
  {
    path: '/webview',
    name: 'WebView',
    component: WebView
  },
  {
    path: '/error',
    name: 'ErrorPage',
    component: ErrorPage
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router