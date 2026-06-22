export interface DeviceInfo {
  deviceType: 'mobile' | 'tablet' | 'desktop'
  os: string
  browser: string
}

export function detectDevice(): DeviceInfo {
  const ua = navigator.userAgent

  let os = 'Unknown'
  if (/android/i.test(ua)) os = 'Android'
  else if (/iphone|ipod/i.test(ua)) os = 'iOS'
  else if (/ipad/i.test(ua)) os = 'iPadOS'
  else if (/windows phone/i.test(ua)) os = 'Windows Phone'
  else if (/windows/i.test(ua)) os = 'Windows'
  else if (/mac os x/i.test(ua)) os = 'macOS'
  else if (/linux/i.test(ua)) os = 'Linux'
  else if (/cros/i.test(ua)) os = 'ChromeOS'

  let browser = 'Unknown'
  if (/edg\//i.test(ua)) browser = 'Edge'
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera'
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet'
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox'
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome'
  else if (/safari/i.test(ua)) browser = 'Safari'

  const isMobileUA = /android.*mobile|iphone|ipod|blackberry|iemobile|opera mini|windows phone/i.test(ua)
  const isTabletUA = /ipad|android(?!.*mobile)/i.test(ua)
  const w = window.innerWidth

  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop'
  if (isTabletUA || (!isMobileUA && w >= 768 && w < 1024)) deviceType = 'tablet'
  if (isMobileUA || w < 768) deviceType = 'mobile'

  return { deviceType, os, browser }
}
