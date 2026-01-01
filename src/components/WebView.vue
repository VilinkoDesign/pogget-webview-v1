<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import allowedSites from '../data/allowedSites.json'

const router = useRouter()
const iframeSrc = ref('')
const currentKey = ref('')
const showMask = ref(false)
const maskVisible = ref(false)
const initialSrc = ref('')
const isInitialLoad = ref(true)

let maskTimer = null

onMounted(() => {
  // 解析URL参数
  const hash = window.location.hash
  const queryStart = hash.indexOf('?')
  if (queryStart === -1) {
    router.push('/error')
    return
  }
  const paramsString = hash.substring(queryStart + 1)
  const params = new URLSearchParams(paramsString)
  const key = params.get('key')
  const link = params.get('link')

  // 安全校验
  if (!key || !link) {
    router.push('/error')
    return
  }

  // 检查key是否存在
  if (!allowedSites[key]) {
    router.push('/error')
    return
  }

  // 检查key对应的网站是否与link完全一致
  if (allowedSites[key] !== link) {
    router.push('/error')
    return
  }

  // 校验通过，设置iframe src和当前key
  iframeSrc.value = link
  initialSrc.value = link
  currentKey.value = key
  
  // 监听iframe的加载事件
  const iframe = document.querySelector('.webview-iframe')
  if (iframe) {
    iframe.addEventListener('load', handleIframeLoad)
  }
})

const handleIframeLoad = () => {
  const iframe = document.querySelector('.webview-iframe')
  if (!iframe) return
  
  // 全局禁止打开新窗口
  try {
    const iframeWindow = iframe.contentWindow
    if (iframeWindow) {
      // 重写window.open方法，阻止打开新窗口
      iframeWindow.open = function(url, name, features) {
        showJumpMask()
        return null
      }
      
      // 重写document.open方法，增强安全性
      iframeWindow.document.open = function() {
        showJumpMask()
        return {}
      }
      
      // 重写location方法，阻止所有location跳转
      Object.defineProperty(iframeWindow.location, 'href', {
        get: function() {
          return initialSrc.value
        },
        set: function(newUrl) {
          if (newUrl !== initialSrc.value) {
            showJumpMask()
          }
        }
      })
      
      // 重写location.replace和assign方法
      iframeWindow.location.replace = function(url) {
        if (url !== initialSrc.value) {
          showJumpMask()
        }
      }
      
      iframeWindow.location.assign = function(url) {
        if (url !== initialSrc.value) {
          showJumpMask()
        }
      }
      
      // 监听hashchange和popstate事件
      iframeWindow.addEventListener('hashchange', function() {
        showJumpMask()
        // 重置URL到初始状态
        iframeSrc.value = initialSrc.value
      })
      
      iframeWindow.addEventListener('popstate', function() {
        showJumpMask()
        // 重置URL到初始状态
        iframeSrc.value = initialSrc.value
      })
    }
  } catch (error) {
    // 跨域访问可能会报错，忽略
  }
  
  // 首次加载处理
  if (isInitialLoad.value) {
    // 首次加载，设置标志为false
    isInitialLoad.value = false
    return
  }
  
  // 所有白名单网站都不允许打开其他页面
  showJumpMask()
  
  // 重置iframe到初始URL，阻止跳转
  setTimeout(() => {
    iframeSrc.value = initialSrc.value
  }, 0)
}

// 添加定期检查机制，每100毫秒检查一次URL
setInterval(() => {
  const iframe = document.querySelector('.webview-iframe')
  if (!iframe || isInitialLoad.value) return
  
  try {
    const iframeWindow = iframe.contentWindow
    if (iframeWindow) {
      const currentUrl = iframeWindow.location.href
      if (currentUrl !== initialSrc.value) {
        showJumpMask()
        iframeSrc.value = initialSrc.value
      }
    }
  } catch (error) {
    // 跨域访问可能会报错，忽略
  }
}, 100)

// 更精确地检测和阻止链接点击
// 1. 在捕获阶段拦截所有点击事件，专门检测链接
window.addEventListener('click', (e) => {
  let target = e.target
  
  // 检测是否点击了链接
  while (target && target !== document) {
    if (target.tagName === 'A') {
      // 检查是否是链接
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      showJumpMask()
      return
    }
    target = target.parentElement
  }
}, true)

// 2. 在冒泡阶段再次检查，确保万无一失
window.addEventListener('click', (e) => {
  let target = e.target
  
  // 再次检测是否点击了链接
  while (target && target !== document) {
    if (target.tagName === 'A') {
      // 检查是否是链接
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      showJumpMask()
      return
    }
    target = target.parentElement
  }
})

// 3. 专门检测链接的mousedown和mouseup事件，防止拖拽等操作
window.addEventListener('mousedown', (e) => {
  let target = e.target
  while (target && target !== document) {
    if (target.tagName === 'A') {
      e.preventDefault()
      e.stopPropagation()
      showJumpMask()
      return
    }
    target = target.parentElement
  }
}, true)

window.addEventListener('mouseup', (e) => {
  let target = e.target
  while (target && target !== document) {
    if (target.tagName === 'A') {
      e.preventDefault()
      e.stopPropagation()
      showJumpMask()
      return
    }
    target = target.parentElement
  }
}, true)

// 4. 检测链接的键盘事件，如Enter键
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const activeElement = document.activeElement
    if (activeElement && activeElement.tagName === 'A') {
      e.preventDefault()
      e.stopPropagation()
      showJumpMask()
    }
  }
})

// 拦截所有表单提交
document.addEventListener('submit', (e) => {
  e.preventDefault()
  e.stopPropagation()
  e.stopImmediatePropagation()
  showJumpMask()
}, true)

// 拦截所有鼠标事件，防止右键菜单等
document.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  e.stopPropagation()
}, true)

// 拦截键盘事件，防止快捷键操作
document.addEventListener('keydown', (e) => {
  // 阻止Ctrl+N, Ctrl+T, Ctrl+Shift+N等新窗口快捷键
  if ((e.ctrlKey || e.metaKey) && ['n', 't', 'N', 'T'].includes(e.key)) {
    e.preventDefault()
    e.stopPropagation()
    showJumpMask()
  }
  // 阻止F12等开发工具快捷键
  if (e.key === 'F12') {
    e.preventDefault()
    e.stopPropagation()
  }
})

// 容器点击事件处理
const handleContainerClick = (e) => {
  e.stopPropagation()
}

// iframe点击事件处理
const handleIframeClick = (e) => {
  e.preventDefault()
  e.stopPropagation()
  showJumpMask()
}

const showJumpMask = () => {
  // 显示遮罩
  showMask.value = true
  maskVisible.value = true
  
  // 5秒后隐藏遮罩，并在弹窗动画结束后触发浏览器刷新
  if (maskTimer) {
    clearTimeout(maskTimer)
  }
  maskTimer = setTimeout(() => {
    maskVisible.value = false
    setTimeout(() => {
      showMask.value = false
      // 在弹窗完全隐藏后触发浏览器刷新
      window.location.reload()
    }, 300)
  }, 5000)
}

onUnmounted(() => {
  if (maskTimer) {
    clearTimeout(maskTimer)
  }
  if (iframeReloadTimer) {
    clearTimeout(iframeReloadTimer)
  }
})
</script>

<template>
  <div class="webview-container" @click="handleContainerClick">
    <!-- 添加meta标签，设置Content-Security-Policy -->
    <meta http-equiv="Content-Security-Policy" content="frame-src 'self' {{ initialSrc }}; object-src 'none'; script-src 'self'; connect-src 'self' {{ initialSrc }};" />
    
    <iframe 
      v-if="iframeSrc" 
      :src="iframeSrc" 
      class="webview-iframe"
      frameborder="0"
      scrolling="no"
      allow="fullscreen"
      sandbox="allow-scripts allow-same-origin"
      referrerpolicy="strict-origin"
      @load="handleIframeLoad"
      @click="handleIframeClick"
    ></iframe>
    
    <!-- 跳转拦截遮罩 -->
    <div 
      v-if="showMask" 
      class="jump-mask" 
      :class="{ 'visible': maskVisible }"
    >
      <div class="jump-message">
        <p>不允许跳转至其他页面</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.webview-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.webview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
  transition: none;
}

/* 跳转拦截遮罩 */
.jump-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: auto;
}

.jump-mask.visible {
  opacity: 1;
}

.jump-message {
  background-color: #ffffff;
  padding: 30px 50px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  /* 移除动画效果 */
}

.jump-message p {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #e64c4f;
}
</style>