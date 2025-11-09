declare global {
  interface Window {
    google?: any
  }
}

let googleMapsPromise: Promise<any> | null = null

const GOOGLE_SCRIPT_ID = 'google-maps-places-script'

interface LoadOptions {
  language?: string
  region?: string
}

const buildScriptSrc = (apiKey: string, { language, region }: LoadOptions) => {
  const params = new URLSearchParams({
    key: apiKey,
    libraries: 'places'
  })

  if (language) {
    params.set('language', language)
  }

  if (region) {
    params.set('region', region)
  }

  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`
}

export const loadGoogleMapsPlaces = (
  apiKey: string,
  options: LoadOptions = {}
): Promise<any> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only be loaded in the browser'))
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google)
  }

  if (!apiKey) {
    return Promise.reject(new Error('Missing Google Maps API key'))
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null

      if (existingScript) {
        existingScript.addEventListener('load', () => {
          if (window.google?.maps?.places) {
            resolve(window.google)
          } else {
            reject(new Error('Google Maps loaded without Places library'))
          }
        })

        existingScript.addEventListener('error', () => {
          googleMapsPromise = null
          reject(new Error('Failed to load Google Maps script'))
        })

        return
      }

      const script = document.createElement('script')
      script.id = GOOGLE_SCRIPT_ID
      script.src = buildScriptSrc(apiKey, options)
      script.async = true
      script.defer = true
      script.addEventListener('load', () => {
        if (window.google?.maps?.places) {
          resolve(window.google)
        } else {
          googleMapsPromise = null
          reject(new Error('Google Maps loaded without Places library'))
        }
      })
      script.addEventListener('error', () => {
        googleMapsPromise = null
        reject(new Error('Failed to load Google Maps script'))
      })

      document.head.appendChild(script)
    })
  }

  return googleMapsPromise
}

export const isGoogleMapsLoaded = () =>
  typeof window !== 'undefined' && Boolean(window.google?.maps?.places)

