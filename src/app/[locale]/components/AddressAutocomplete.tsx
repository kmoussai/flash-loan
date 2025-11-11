'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { loadGoogleMapsPlaces } from '@/src/lib/google/maps-loader'

interface AddressComponent {
  long_name: string
  short_name: string
  types: string[]
}

interface PlaceDetailsResult {
  address_components?: AddressComponent[]
  formatted_address?: string
  place_id?: string
}

export interface ParsedAddress {
  streetNumber: string
  streetName: string
  city: string
  province: string
  postalCode: string
  country: string
  raw?: PlaceDetailsResult
}

interface AddressAutocompleteProps {
  onSelect: (address: ParsedAddress) => void
  placeholder?: string
  initialValue?: string
  className?: string
  countryRestrictions?: string[]
  apiKey?: string
  onError?: (message: string) => void
}

const DEFAULT_COUNTRY = ['ca']

const resolveApiKey = (providedKey?: string) => {
  if (providedKey) return providedKey
  if (process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY) {
    return process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  }
  if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  }
  return ''
}

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[AddressAutocomplete]', ...args)
  }
}

const parseAddressComponents = (components: AddressComponent[]) => {
  const findComponent = (types: string[]) =>
    components.find(component => types.some(type => component.types.includes(type)))

  const streetNumber = findComponent(['street_number'])?.long_name ?? ''
  const streetName = findComponent(['route'])?.long_name ?? ''
  const locality =
    findComponent(['locality'])?.long_name ??
    findComponent(['postal_town'])?.long_name ??
    findComponent(['sublocality'])?.long_name ??
    ''
  const province =
    findComponent(['administrative_area_level_1'])?.long_name ??
    findComponent(['administrative_area_level_1'])?.short_name ??
    ''
  const postalCode = findComponent(['postal_code'])?.long_name ?? ''
  const country = findComponent(['country'])?.long_name ?? ''

  return {
    streetNumber,
    streetName,
    city: locality,
    province,
    postalCode: postalCode.toUpperCase(),
    country
  }
}

export default function AddressAutocomplete({
  onSelect,
  placeholder,
  initialValue,
  className,
  countryRestrictions,
  apiKey,
  onError
}: AddressAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const placesServiceRef = useRef<any>(null)
  const placeListenerRef = useRef<any>(null)
  const onSelectRef = useRef(onSelect)
  const onErrorRef = useRef(onError)
  const [query, setQuery] = useState(initialValue ?? '')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const countries = useMemo(
    () => (countryRestrictions?.length ? countryRestrictions : DEFAULT_COUNTRY),
    [countryRestrictions]
  )

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    if (!initialValue) return
    setQuery(initialValue)
  }, [initialValue])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (status === 'ready' || status === 'loading') return

    const resolvedKey = resolveApiKey(apiKey)
    debugLog('Initializing', { hasApiKey: Boolean(resolvedKey), countries })

    if (!resolvedKey) {
      setStatus('error')
      const message = 'Google Places API key is missing'
      setErrorMessage(message)
      onErrorRef.current?.(message)
      return
    }

    let cancelled = false
    setStatus('loading')
    debugLog('Loading Google Maps Places library')

    const primaryCountry = countries[0] ?? 'ca'

    loadGoogleMapsPlaces(resolvedKey, { language: 'en', region: primaryCountry.toUpperCase() })
      .then(googleInstance => {
        if (cancelled) return
        debugLog('Google Maps Places library loaded successfully')
        placesServiceRef.current = new googleInstance.maps.places.PlacesService(document.createElement('div'))
        setStatus('ready')
        setErrorMessage(null)
      })
      .catch(error => {
        if (cancelled) return
        console.error('[AddressAutocomplete] Failed to load Google Maps:', error)
        debugLog('Google Maps Places library failed to load', error)
        setStatus('error')
        const message = 'Unable to load Google Places right now.'
        setErrorMessage(message)
        onErrorRef.current?.(message)
      })

    return () => {
      cancelled = true
    }
  }, [apiKey, countries, status])

  useEffect(() => {
    if (status !== 'ready') return
    if (!inputRef.current) return

    const googleInstance = window.google
    if (!googleInstance?.maps?.places) return

    const restrictions = countries.length ? { country: countries } : undefined

    if (!autocompleteRef.current) {
      const autocomplete = new googleInstance.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        fields: ['address_components', 'formatted_address', 'place_id'],
        componentRestrictions: restrictions
      })

      autocompleteRef.current = autocomplete

      placeListenerRef.current = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace() as PlaceDetailsResult
        debugLog('Autocomplete place changed', {
          hasAddressComponents: Boolean(place?.address_components?.length),
          placeId: place?.place_id
        })

        if (place?.formatted_address) {
          setQuery(place.formatted_address)
        }

        if (place?.address_components?.length) {
          const parsed = parseAddressComponents(place.address_components)
          debugLog('Parsed address details', parsed)
          setErrorMessage(null)
          onSelectRef.current?.({
            ...parsed,
            raw: place
          })
          return
        }

        const placeId = place?.place_id
        const service = placesServiceRef.current

        if (!placeId || !service) {
          const message = 'Unable to retrieve full address details.'
          setErrorMessage(message)
          onErrorRef.current?.(message)
          debugLog('No place_id or places service available for fallback')
          return
        }

        service.getDetails(
          {
            placeId,
            fields: ['address_components', 'formatted_address']
          },
          (details: PlaceDetailsResult | null, statusResult: string) => {
            if (statusResult !== 'OK' || !details?.address_components) {
              const message = 'Unable to retrieve full address details.'
              setErrorMessage(message)
              onErrorRef.current?.(message)
              debugLog('Failed to fetch place details', { statusResult })
              return
            }

            const parsed = parseAddressComponents(details.address_components ?? [])
            debugLog('Parsed address details from fallback lookup', parsed)
            setErrorMessage(null)
            onSelectRef.current?.({
              ...parsed,
              raw: details
            })
          }
        )
      })
    } else if (restrictions) {
      autocompleteRef.current.setComponentRestrictions(restrictions)
    }

    return () => {
      placeListenerRef.current?.remove()
      placeListenerRef.current = null
      autocompleteRef.current = null
    }
  }, [countries, status])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setErrorMessage(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const inputClasses =
    'focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2'

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <input
        ref={inputRef}
        type='text'
        value={query}
        onChange={event => {
          setQuery(event.target.value)
          setErrorMessage(null)
        }}
        onFocus={() => {
          debugLog('Input focused')
        }}
        placeholder={placeholder}
        className={inputClasses}
        autoComplete='off'
      />

      {status === 'error' && errorMessage && (
        <p className='mt-2 text-sm text-red-600'>{errorMessage}</p>
      )}
    </div>
  )
}

