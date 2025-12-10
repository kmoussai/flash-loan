import { headers } from 'next/headers'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export default async function InveriteCallbackPage({
  searchParams,
  params
}: {
  searchParams: { [key: string]: string | string[] | undefined }
  params: { locale: string }
}) {
  const locale = params.locale
  setRequestLocale(locale)
  const t = await getTranslations('')
  const headersList = await headers()

  // Extract query parameters
  const applicationId =
    typeof searchParams.application_id === 'string'
      ? searchParams.application_id
      : null
  const token =
    typeof searchParams.token === 'string' ? searchParams.token : null
  const requestGuid =
    typeof searchParams.request_guid === 'string'
      ? searchParams.request_guid
      : null

  // Collect all relevant header information
  const referer = headersList.get('referer') || 'Not provided'
  const origin = headersList.get('origin') || 'Not provided'
  const userAgent = headersList.get('user-agent') || 'Not provided'
  const host = headersList.get('host') || 'Not provided'
  const accept = headersList.get('accept') || 'Not provided'
  const acceptLanguage = headersList.get('accept-language') || 'Not provided'

  // Get all headers for display
  const allHeaders: Record<string, string> = {}
  headersList.forEach((value, key) => {
    allHeaders[key] = value
  })

  // Check if we have query parameters that need processing
  const hasQueryParams = Boolean(
    applicationId || token || requestGuid
  )

  // Try to fetch request_guid from database if application_id is provided
  let fetchedRequestGuid: string | null = null
  let fetchError: string | null = null
  let inveriteData: any = null

  if (applicationId && !requestGuid) {
    try {
      const supabase = createServerSupabaseAdminClient()
      const { data: application, error } = await supabase
        .from('loan_applications')
        .select('id, ibv_provider_data')
        .eq('id', applicationId)
        .eq('ibv_provider', 'inverite')
        .single()

      if (!error && application) {
        const providerData = (application as any)?.ibv_provider_data as any
        fetchedRequestGuid = providerData?.request_guid || null

        // If we have request_guid, fetch Inverite data
        if (fetchedRequestGuid) {
          try {
            // Construct absolute URL for internal API call
            const protocol =
              process.env.NODE_ENV === 'production' ? 'https' : 'http'
            const host = headersList.get('host') || 'localhost:3000'
            const baseUrl = `${protocol}://${host}`
            const fetchUrl = `${baseUrl}/api/inverite/fetch/${encodeURIComponent(fetchedRequestGuid)}?application_id=${encodeURIComponent(applicationId)}`

            const fetchResponse = await fetch(fetchUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              },
              // Important: Don't cache this request
              cache: 'no-store'
            })

            if (fetchResponse.ok) {
              inveriteData = await fetchResponse.json()
              
              // Server-side cleanup: Redirect to clean URL after successful fetch
              // This removes sensitive query parameters from the URL
              // redirect() throws internally, so this stops execution here
              const cleanUrl = `/${locale}/quick-apply/inverite/callback`
              redirect(cleanUrl)
            } else {
              const errorText = await fetchResponse.text().catch(() => '')
              fetchError = `Failed to fetch Inverite data: ${fetchResponse.status} ${errorText}`
            }
          } catch (fetchErr: any) {
            // Check if it's a redirect (Next.js redirect throws)
            if (fetchErr?.digest?.startsWith('NEXT_REDIRECT')) {
              throw fetchErr // Re-throw redirect
            }
            fetchError = `Error calling fetch API: ${fetchErr?.message || 'Unknown error'}`
          }
        }
      } else {
        fetchError = `Application not found: ${error?.message || 'Unknown error'}`
      }
    } catch (err: any) {
      // Check if it's a redirect (Next.js redirect throws)
      if (err?.digest?.startsWith('NEXT_REDIRECT')) {
        throw err // Re-throw redirect
      }
      fetchError = `Database error: ${err?.message || 'Unknown error'}`
    }
  }

  const headerInfo = {
    referer,
    origin,
    userAgent,
    host,
    accept,
    acceptLanguage,
    allHeaders,
    queryParams: {
      application_id: applicationId,
      token,
      request_guid: requestGuid || fetchedRequestGuid
    },
    fetchError,
    inveriteData: inveriteData
      ? {
          success: inveriteData.success,
          application_id: inveriteData.application_id,
          request_guid: inveriteData.request_guid,
          data: inveriteData.data,
          ibv_results: inveriteData.ibv_results
            ? {
                accounts_count: inveriteData.ibv_results.accounts?.length || 0,
                accounts:
                  inveriteData.ibv_results.accounts?.map((acc: any) => ({
                    bank_name: acc.bank_name,
                    type: acc.type,
                    number: acc.number ? '***' + acc.number.slice(-4) : null // Mask account number
                  })) || []
              }
            : null
        }
      : null
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-6 py-8'>
      <div className='w-full max-w-4xl rounded-lg bg-background-secondary p-8 shadow-lg'>
        <div className='mb-6 text-center'>
          <div className='mb-4 flex justify-center'>
            <svg
              className='h-12 w-12 text-green-600'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M5 13l4 4L19 7'
              />
            </svg>
          </div>
          <h1 className='mb-4 text-2xl font-bold text-green-600'>
            {t('Bank_Verification_Complete') || 'Bank Verification Complete'}
          </h1>
          <p className='text-sm text-green-800'>
            {t('Message_Sent') ||
              'Success message sent. This window will close automatically.'}
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className='mt-8 space-y-4'>
            <h2 className='text-lg font-semibold text-primary'>
              Callback Information
            </h2>

            {/* Query Parameters */}
            <div className='rounded-lg border border-gray-200 bg-white p-4'>
              <h3 className='mb-2 text-sm font-semibold text-gray-700'>
                Query Parameters
              </h3>
              <pre className='overflow-auto text-xs text-gray-800'>
                {JSON.stringify(headerInfo.queryParams, null, 2)}
              </pre>
            </div>

            {/* Inverite Data */}
            {headerInfo.inveriteData && (
              <div className='rounded-lg border border-green-200 bg-green-50 p-4'>
                <h3 className='mb-2 text-sm font-semibold text-green-700'>
                  Inverite Data (Fetched)
                </h3>
                <pre className='overflow-auto text-xs text-green-800'>
                  {JSON.stringify(headerInfo.inveriteData, null, 2)}
                </pre>
              </div>
            )}

            {/* Fetch Error */}
            {headerInfo.fetchError && (
              <div className='rounded-lg border border-red-200 bg-red-50 p-4'>
                <h3 className='mb-2 text-sm font-semibold text-red-700'>
                  Fetch Error
                </h3>
                <p className='text-xs text-red-800'>{headerInfo.fetchError}</p>
              </div>
            )}

            {/* Request Headers */}
            <div className='rounded-lg border border-gray-200 bg-white p-4'>
              <h3 className='mb-2 text-sm font-semibold text-gray-700'>
                Request Headers
              </h3>
              <pre className='overflow-auto text-xs text-gray-800'>
                {JSON.stringify(
                  {
                    referer: headerInfo.referer,
                    origin: headerInfo.origin,
                    userAgent: headerInfo.userAgent,
                    host: headerInfo.host,
                    accept: headerInfo.accept,
                    acceptLanguage: headerInfo.acceptLanguage,
                    allHeaders: headerInfo.allHeaders
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}

        {/* Client-side script to handle postMessage */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // If we still have query params (error case), remove sensitive ones client-side
                const hasQueryParams = window.location.search && window.location.search.length > 0;
                if (hasQueryParams) {
                  try {
                    const url = new URL(window.location.href);
                    // Remove sensitive parameters
                    url.searchParams.delete('application_id');
                    url.searchParams.delete('token');
                    url.searchParams.delete('request_guid');
                    // Keep timestamp for debugging if needed
                    const cleanUrl = url.pathname + (url.search || '');
                    if (cleanUrl !== window.location.pathname + window.location.search) {
                      window.history.replaceState({}, document.title, cleanUrl);
                      console.log('[Inverite Callback] Removed sensitive query parameters');
                    }
                  } catch (e) {
                    console.warn('[Inverite Callback] Could not clean sensitive URL params:', e);
                  }
                }

                const message = {
                  success: true,
                  data: {
                    task_status: 'success',
                    status: 'success'
                  }
                };

                const origin = window.location.origin;

                const sendMessage = () => {
                  // Try to send to parent window
                  if (window.opener) {
                    window.opener.postMessage(message, origin);
                    console.log('[Inverite Callback] Sent message to opener');
                    setTimeout(() => {
                      try {
                        window.close();
                      } catch (e) {
                        console.warn('[Inverite Callback] Could not close window');
                      }
                    }, 1000);
                  } else if (window.parent && window.parent !== window) {
                    window.parent.postMessage(message, origin);
                    console.log('[Inverite Callback] Sent message to parent');
                  } else {
                    window.postMessage(message, origin);
                    console.log('[Inverite Callback] Sent broadcast message', message);
                  }
                };

                // Small delay to ensure page is loaded
                setTimeout(sendMessage, 100);
              })();
            `
          }}
        />
      </div>
    </div>
  )
}
