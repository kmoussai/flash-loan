'use client'

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { loadGoogleMapsPlaces } from '@/src/lib/google/maps-loader'

interface AddressComponent {
  long_name: string
  short_name: string
  types: string[]
}

interface AutocompletePrediction {
  description: string
  place_id: string
  structured_formatting?: {
    main_text?: string
    secondary_text?: string
  }
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
  minLength?: number
  countryRestrictions?: string[]
  apiKey?: string
  onError?: (message: string) => void
}

const DEFAULT_MIN_LENGTH = 3

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

const formatDisplayText = (prediction: AutocompletePrediction) => {
  const main = prediction.structured_formatting?.main_text || prediction.description
  const secondary = prediction.structured_formatting?.secondary_text

  if (secondary) {
    return `${main}, ${secondary}`
  }

  return main
}

const parseAddressComponents = (
  components: AddressComponent[]
) => {
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
  minLength = DEFAULT_MIN_LENGTH,
  countryRestrictions,
  apiKey,
  onError
}: AddressAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState(initialValue ?? '')
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<AutocompletePrediction[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const countries = useMemo(
    () => countryRestrictions?.length ? countryRestrictions : DEFAULT_COUNTRY,
    [countryRestrictions]
  )

  useEffect(() => {
    if (!initialValue) return
    setQuery(initialValue)
  }, [initialValue])

  const [autocompleteService, setAutocompleteService] = useState<any>(null)
  const [placesService, setPlacesService] = useState<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (status === 'ready' || status === 'loading') return

    const resolvedKey = resolveApiKey(apiKey)

    if (!resolvedKey) {
      setStatus('error')
      setErrorMessage('Google Places API key is missing')
      onError?.('Google Places API key is missing')
      return
    }

    let cancelled = false

    setStatus('loading')

    const primaryCountry = countries[0] ?? 'ca'

    loadGoogleMapsPlaces(resolvedKey, { language: 'en', region: primaryCountry.toUpperCase() })
      .then(googleInstance => {
        if (cancelled) return
        const autocomplete = new googleInstance.maps.places.AutocompleteService()
        const places = new googleInstance.maps.places.PlacesService(document.createElement('div'))
        setAutocompleteService(autocomplete)
        setPlacesService(places)
        setStatus('ready')
        setErrorMessage(null)
      })
      .catch(error => {
        if (cancelled) return
        console.error('[AddressAutocomplete] Failed to load Google Maps:', error)
        setStatus('error')
        const message = 'Unable to load Google Places right now.'
        setErrorMessage(message)
        onError?.(message)
      })

    return () => {
      cancelled = true
    }
  }, [apiKey, countries, onError, status])

  useEffect(() => {
    if (!isFocused || !autocompleteService) {
      setSuggestions([])
      return
    }

    if (query.trim().length < minLength) {
      setSuggestions([])
      return
    }

    let cancelled = false
    const debounceHandle = window.setTimeout(() => {
      autocompleteService.getPlacePredictions(
        {
          input: query,
          types: ['address'],
          componentRestrictions: { country: countries }
        },
        (predictions: AutocompletePrediction[] | null, statusResult: string) => {
          if (cancelled) return
          if (statusResult !== 'OK' || !predictions || !Array.isArray(predictions)) {
            setSuggestions([])
            return
          }

          setSuggestions(predictions)
          setActiveIndex(-1)
        }
      )
    }, 200)

    return () => {
      cancelled = true
      window.clearTimeout(debounceHandle)
    }
  }, [autocompleteService, countries, isFocused, minLength, query])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setIsFocused(false)
        setSuggestions([])
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handlePredictionSelect = (prediction: AutocompletePrediction) => {
    if (!placesService) return

    setQuery(prediction.description)
    setSuggestions([])

    placesService.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['address_components', 'formatted_address']
      },
      (place: PlaceDetailsResult | null, statusResult: string) => {
        if (statusResult !== 'OK' || !place?.address_components) {
          const message = 'Unable to retrieve full address details.'
          setErrorMessage(message)
          onError?.(message)
          return
        }

        const parsed = parseAddressComponents(place.address_components ?? [])

        onSelect({
          ...parsed,
          raw: place
        })
      }
    )
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(prev => (prev + 1) % suggestions.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const selection =
        activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0]

      if (selection) {
        handlePredictionSelect(selection)
      }
      return
    }

    if (event.key === 'Escape') {
      setSuggestions([])
      return
    }
  }

  const inputClasses =
    'focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2'

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <input
        type='text'
        value={query}
        onChange={event => {
          setQuery(event.target.value)
          setErrorMessage(null)
        }}
        onFocus={() => {
          setIsFocused(true)
          if (query.trim().length >= minLength && suggestions.length === 0) {
            setActiveIndex(-1)
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClasses}
        aria-expanded={suggestions.length > 0}
        aria-autocomplete='list'
        aria-controls='address-autocomplete-listbox'
      />

      {status === 'error' && errorMessage && (
        <p className='mt-2 text-sm text-red-600'>{errorMessage}</p>
      )}

      {suggestions.length > 0 && (
        <ul
          id='address-autocomplete-listbox'
          role='listbox'
          className='absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg'
        >
          {suggestions.map((prediction, index) => (
            <li
              key={prediction.place_id}
              role='option'
              aria-selected={index === activeIndex}
              className={`cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-primary/10 ${
                index === activeIndex ? 'bg-primary/10 text-primary' : ''
              }`}
              onMouseDown={event => {
                event.preventDefault()
                handlePredictionSelect(prediction)
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {formatDisplayText(prediction)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

