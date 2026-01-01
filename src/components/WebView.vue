<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import allowedSites from '../data/allowedSites.json'

const router = useRouter()
const iframeSrc = ref('')

onMounted(() => {
  // 解析URL参数
  // 从URL中获取完整的hash部分，包括可能的路径前缀
  const hash = window.location.hash
  // 找到第一个?的位置，获取查询参数部分
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
    // key或link不存在，跳转到错误页面
    router.push('/error')
    return
  }

  // 检查key是否存在
  if (!allowedSites[key]) {
    // key不存在，跳转到错误页面
    router.push('/error')
    return
  }

  // 检查key对应的网站是否与link完全一致
  if (allowedSites[key] !== link) {
    // key与link不匹配，跳转到错误页面
    router.push('/error')
    return
  }

  // 校验通过，设置iframe src
  iframeSrc.value = link
})
</script>

<template>
  <div class="webview-container">
    <iframe 
      v-if="iframeSrc" 
      :src="iframeSrc" 
      class="webview-iframe"
      frameborder="0"
      scrolling="no"
      allow="fullscreen"
    ></iframe>
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
}
</style>