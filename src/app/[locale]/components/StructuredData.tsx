'use client'
import { useEffect, useState } from 'react'

interface StructuredDataProps {
  structuredData: object
}

export const StructuredData: React.FC<StructuredDataProps> = ({ structuredData }) => {
  const [siteUrl, setSiteUrl] = useState('')

  useEffect(() => {
    setSiteUrl(window.location.origin)
  }, [])

  const dataWithUrl = {
    ...structuredData,
    ...(siteUrl && { url: siteUrl })
  }

  if (!siteUrl) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(dataWithUrl)
      }}
    />
  )
}

