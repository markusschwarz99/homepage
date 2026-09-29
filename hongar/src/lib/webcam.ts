// Eine URL pro Zeile (Einstellung "webcam_urls").
export function webcamUrls(raw: string): string[] {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

// Verhindert, dass Browser/Proxies ein altes Webcam-Bild aus dem Cache zeigen.
export function withCacheBuster(url: string, tick: number): string {
  return `${url}${url.includes('?') ? '&' : '?'}t=${tick}`
}
