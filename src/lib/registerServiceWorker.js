export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return

  window.addEventListener('load', () => {
    const baseUrl = import.meta.env.BASE_URL
    navigator.serviceWorker
      .register(`${baseUrl}sw.js`, { scope: baseUrl })
      .catch((error) => {
        console.error('Service worker registration failed:', error)
      })
  })
}
