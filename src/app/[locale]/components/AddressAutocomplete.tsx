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
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const countriesRef = useRef<string[]>(DEFAULT_COUNTRY)
  const onSelectRef = useRef(onSelect)
  const onErrorRef = useRef(onError)

  const [query, setQuery] = useState(initialValue ?? '')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const countries = useMemo(() => {
    if (!countryRestrictions?.length) return DEFAULT_COUNTRY
    return countryRestrictions
  }, [countryRestrictions])

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    countriesRef.current = countries

    if (autocompleteRef.current) {
      debugLog('Updating component restrictions', { countries })
      try {
        autocompleteRef.current.setComponentRestrictions({ country: countries })
      } catch (error) {
        debugLog('Failed to update component restrictions', error)
      }
    }
  }, [countries])

  useEffect(() => {
    if (initialValue === undefined) return
    setQuery(initialValue)
    if (inputRef.current) {
      inputRef.current.value = initialValue
    }
  }, [initialValue])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (status === 'ready' || status === 'loading') return

    const resolvedKey = resolveApiKey(apiKey)
    debugLog('Initializing', { hasApiKey: Boolean(resolvedKey), countries: countriesRef.current })

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

    const primaryCountry = countriesRef.current[0] ?? 'ca'

    loadGoogleMapsPlaces(resolvedKey, { language: 'en', region: primaryCountry.toUpperCase() })
      .then(() => {
        if (cancelled) return
        debugLog('Google Maps Places library loaded successfully')
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
  }, [apiKey, status])

  useEffect(() => {
    if (status !== 'ready') {
      debugLog('Autocomplete not ready', { status })
      return
    }

    if (typeof window === 'undefined' || !window.google?.maps?.places) {
      debugLog('Google Maps Places not available when initializing autocomplete')
      return
    }

    if (!inputRef.current) {
      debugLog('Input ref not available when initializing autocomplete')
      return
    }

    debugLog('Attaching Google Places Autocomplete to input', { countries: countriesRef.current })

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: countriesRef.current },
      fields: ['address_components', 'formatted_address']
    })

    autocompleteRef.current = autocomplete

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace() as PlaceDetailsResult

      debugLog('Place changed event', {
        hasAddressComponents: Boolean(place.address_components),
        formattedAddress: place.formatted_address
      })

      if (!place.address_components) {
        const message = 'Unable to retrieve full address details.'
        setErrorMessage(message)
        onErrorRef.current?.(message)
        return
      }

      const parsed = parseAddressComponents(place.address_components)
      const formattedValue = place.formatted_address ?? inputRef.current?.value ?? ''

      setQuery(formattedValue)
      if (inputRef.current) {
        inputRef.current.value = formattedValue
      }
      setErrorMessage(null)

      onSelectRef.current?.({
        ...parsed,
        raw: place
      })
    })

    return () => {
      debugLog('Cleaning up autocomplete listener')
      listener.remove()
      autocompleteRef.current = null
    }
  }, [status])

  const inputClasses =
    'focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2'

  return (
    <div className={`relative ${className ?? ''}`}>
      <input
        ref={inputRef}
        type='text'
        value={query}
        onChange={event => {
          const value = event.target.value
          debugLog('Input change', { value })
          setQuery(value)
          setErrorMessage(null)
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

