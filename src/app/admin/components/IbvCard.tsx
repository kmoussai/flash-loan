'use client'

import { useEffect, useState } from 'react'
import { IbvApiResponse, IbvRequestHistory } from './ibv-card/types'
import IbvCardHeader from './ibv-card/IbvCardHeader'
import IbvCardInfoMessage from './ibv-card/IbvCardInfoMessage'
import IbvCardLoading from './ibv-card/IbvCardLoading'
import IbvCardError from './ibv-card/IbvCardError'
import IbvCardEmpty from './ibv-card/IbvCardEmpty'
import IbvCardStatistics from './ibv-card/IbvCardStatistics'
import IbvCardStatusCards from './ibv-card/IbvCardStatusCards'
import IbvCardAccounts from './ibv-card/IbvCardAccounts'
import IbvCardDocument from './ibv-card/IbvCardDocument'
import IbvCardHistory from './ibv-card/IbvCardHistory'

const PENDING_MESSAGE =
  'Inverite is still processing this bank verification request. Try again in a few minutes.'

interface IbvCardProps {
  applicationId: string
  onViewTransactions?: (accountIndex?: number) => void
}

export default function IbvCard({
  applicationId,
  onViewTransactions
}: IbvCardProps) {
  const [data, setData] = useState<IbvApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [reRequesting, setReRequesting] = useState(false)
  const [history, setHistory] = useState<IbvRequestHistory[]>([])
  const [notifyingId, setNotifyingId] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const [summaryResponse, historyResponse] = await Promise.all([
        fetch(`/api/admin/applications/${applicationId}/ibv/summary`),
        fetch(`/api/admin/applications/${applicationId}/ibv/requests`)
      ])

      if (!summaryResponse.ok) {
        const err = await summaryResponse.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to load IBV summary')
      }

      if (!historyResponse.ok) {
        const err = await historyResponse.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to load IBV history')
      }

      const summaryJson = (await summaryResponse.json()) as IbvApiResponse
      ;(summaryJson as any).request_guid =
        (summaryJson as any)?.ibv_results?.request_guid || null

      const historyJson = (await historyResponse.json()) as {
        requests: IbvRequestHistory[]
      }

      setData(summaryJson)
      setHistory(historyJson.requests || [])
      setInfoMessage(prev => {
        const accounts = Array.isArray(summaryJson?.ibv_results?.accounts)
          ? summaryJson.ibv_results.accounts
          : []

        if (accounts.length > 0) {
          return null
        }

        const normalizedStatus =
          typeof summaryJson?.ibv_status === 'string'
            ? summaryJson.ibv_status.toLowerCase()
            : null

        if (
          normalizedStatus &&
          (normalizedStatus === 'pending' || normalizedStatus === 'processing')
        ) {
          return prev && prev.length > 0 ? prev : PENDING_MESSAGE
        }

        return normalizedStatus ? null : prev
      })
    } catch (e: any) {
      console.error('[IbvCard] Error loading data:', e)
      setError(e.message || 'Failed to load IBV data')
      setData(null)
      setHistory([])
      setInfoMessage(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId])

  const summary = data?.ibv_results


  const sendNotification = async (requestId: string) => {
    try {
      setNotifyingId(requestId)
      setError(null)

      const res = await fetch(
        `/api/admin/applications/${applicationId}/ibv/requests/${requestId}/notify`,
        { method: 'POST' }
      )

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(
          json.error || json.message || 'Failed to send notification'
        )
      }

      await load()
      setInfoMessage(prev => prev || json.message || null)
    } catch (e: any) {
      console.error('[IbvCard] Error sending notification:', e)
      setError(e.message || 'Failed to send notification')
    } finally {
      setNotifyingId(null)
    }
  }
  const initiateNewRequest = async () => {
    try {
      setReRequesting(true)
      setError(null)
      const res = await fetch(
        `/api/admin/applications/${applicationId}/ibv/requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create new IBV request')
      }

      await load()
      alert('New bank verification request generated successfully.')
    } catch (e: any) {
      console.error('[IbvCard] Error creating IBV request:', e)
      setError(e.message || 'Failed to create IBV request')
    } finally {
      setReRequesting(false)
    }
  }


  return (
    <div className='flex h-full flex-col rounded-lg border border-gray-200 bg-white shadow-sm'>
      <IbvCardHeader
        reRequesting={reRequesting}
        ibvStatus={data?.ibv_status || null}
        onReRequest={async () => {
          if (reRequesting) return
          await initiateNewRequest()
        }}
      />

      {infoMessage && !error && <IbvCardInfoMessage message={infoMessage} />}

      <div className=''>
        {loading ? (
          <IbvCardLoading />
        ) : error ? (
          <IbvCardError error={error} />
        ) : summary && summary.accounts && summary.accounts.length > 0 ? (
          <div className='p-3'>
            <div className='space-y-2.5'>
              <IbvCardStatistics accounts={summary.accounts} />
              {/* <IbvCardStatusCards
                ibvProvider={data?.ibv_provider || null}
                requestGuid={summary.request_guid}
              /> */}
              <IbvCardAccounts
                accounts={summary.accounts}
                onViewTransactions={onViewTransactions}
              />
            </div>
          </div>
        ) : (
          <IbvCardEmpty summary={summary || null} />
        )}

        {summary?.ibvDocUrl && <IbvCardDocument ibvDocUrl={summary.ibvDocUrl} />}
      </div>

      <IbvCardHistory
        history={history}
        notifyingId={notifyingId}
        onSendNotification={sendNotification}
      />
    </div>
  )
}
