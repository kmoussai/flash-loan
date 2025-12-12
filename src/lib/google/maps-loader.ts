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
  params.set('loading', 'async')
    // "https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&loading=async&libraries=places&callback=initMap"

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
        // Script already exists - check if it's already loaded
        if (window.google?.maps?.places) {
          resolve(window.google)
          return
        }

        // Script exists but not loaded yet - poll for it
        let pollCount = 0
        const maxPolls = 50 // Poll for up to 5 seconds
        
        const checkLoaded = () => {
          if (window.google?.maps?.places) {
            resolve(window.google)
          } else if (pollCount < maxPolls) {
            pollCount++
            setTimeout(checkLoaded, 100)
          } else {
            googleMapsPromise = null
            reject(new Error('Google Maps failed to load within timeout'))
          }
        }

        // Start polling immediately
        checkLoaded()
        
        // Also listen for load/error events as backup
        existingScript.addEventListener('load', checkLoaded)
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
      
      // Google Maps API loads asynchronously and may not fire 'load' event reliably
      // We need to poll for window.google to be available
      let pollCount = 0
      const maxPolls = 100 // Poll for up to 10 seconds (100 * 100ms)
      let pollingStarted = false
      
      const checkGoogleMaps = () => {
        if (window.google?.maps?.places) {
          googleMapsPromise = null // Reset so it can be loaded again if needed
          resolve(window.google)
        } else if (pollCount < maxPolls) {
          pollCount++
          setTimeout(checkGoogleMaps, 100)
        } else {
          googleMapsPromise = null
          reject(new Error('Google Maps failed to load within timeout. Check your API key and network connection.'))
        }
      }
      
      script.addEventListener('load', () => {
        // Script loaded, start polling if not already started
        if (!pollingStarted) {
          pollingStarted = true
          checkGoogleMaps()
        }
      })
      
      script.addEventListener('error', () => {
        googleMapsPromise = null
        reject(new Error('Failed to load Google Maps script. Check your API key and network connection.'))
      })

      document.head.appendChild(script)
      
      // Start polling immediately (script might load very quickly or load event might not fire)
      if (!pollingStarted) {
        pollingStarted = true
        checkGoogleMaps()
      }
    })
  }

  return googleMapsPromise
}

export const isGoogleMapsLoaded = () =>
  typeof window !== 'undefined' && Boolean(window.google?.maps?.places)

