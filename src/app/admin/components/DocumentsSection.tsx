'use client'

import { useEffect, useState } from 'react'

interface DocumentItem {
	name: string
	path: string
	size: number | null
	last_modified: string | null
	document_name?: string | null
	mime_type?: string | null
	signed_url?: string | null
}

interface DocumentsResponse {
	client_id: string
	application_id?: string | null
	client_files: DocumentItem[]
	application_files: DocumentItem[]
}

export default function DocumentsSection({ clientId, applicationId }: { clientId: string, applicationId?: string }) {
	const [data, setData] = useState<DocumentsResponse | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)
	const [previewMime, setPreviewMime] = useState<string | null>(null)
	const [requestModalOpen, setRequestModalOpen] = useState(false)
	// Forward-compatible with future non-file (form) requests
	const [requestTypes, setRequestTypes] = useState<Array<{ id: string, name: string, slug: string, kind?: 'document' | 'form', requires_upload?: boolean }>>([])
	const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>({})
	const [note, setNote] = useState('')
	const [sending, setSending] = useState(false)
	const [requests, setRequests] = useState<Array<{ id: string, status: string, document_type: { id: string, name: string, slug: string }, magic_link_sent_at?: string | null, uploaded_file_key?: string | null, request_link?: string | null }>>([])
	const [loadingRequests, setLoadingRequests] = useState(false)
	const [submittingRequest, setSubmittingRequest] = useState<Record<string, boolean>>({})

	const fetchDocs = async () => {
		try {
			setLoading(true)
			const params = new URLSearchParams({ client_id: clientId })
			if (applicationId) params.set('application_id', applicationId)
			const res = await fetch(`/api/admin/documents?${params.toString()}`)
			if (!res.ok) {
				const e = await res.json()
				throw new Error(e.error || 'Failed to load documents')
			}
			const json = await res.json()
			setData(json)
			setError(null)
		} catch (e: any) {
			setError(e.message || 'Failed to load documents')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		if (clientId) fetchDocs()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [clientId, applicationId])

	useEffect(() => {
		if (applicationId) {
			loadDocTypes()
			loadRequests()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [applicationId])

	const loadDocTypes = async () => {
		try {
			const res = await fetch('/api/admin/document-types')
			if (!res.ok) throw new Error('Failed to load document types')
			const json = await res.json()
			// Accept additional fields if backend later adds them (kind/requires_upload)
			setRequestTypes((json.document_types || []).map((d: any) => ({ id: d.id, name: d.name, slug: d.slug, kind: d.kind, requires_upload: d.requires_upload })))
		} catch {}
	}

	const loadRequests = async () => {
		if (!applicationId) return
		try {
			setLoadingRequests(true)
			const res = await fetch(`/api/admin/loan-apps/${applicationId}/document-requests`)
			if (!res.ok) throw new Error('Failed to load requests')
			const json = await res.json()
			setRequests(json.requests || [])
		} catch {
			setRequests([])
		} finally {
			setLoadingRequests(false)
		}
	}

	const toggleType = (id: string) => {
		setSelectedTypes(prev => ({ ...prev, [id]: !prev[id] }))
	}

	const submitRequestDocs = async () => {
		if (!applicationId) return
		const ids = Object.keys(selectedTypes).filter(id => selectedTypes[id])
		if (ids.length === 0) return
		try {
			setSending(true)
			const res = await fetch(`/api/admin/loan-apps/${applicationId}/request-docs`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ document_type_ids: ids, note })
			})
			if (!res.ok) {
				const e = await res.json().catch(() => ({}))
				throw new Error(e.error || 'Failed to request documents')
			}
			setRequestModalOpen(false)
			setSelectedTypes({})
			setNote('')
			await loadRequests()
		} catch (e) {
			// noop; could display toast
		} finally {
			setSending(false)
		}
	}

	const formatSize = (size: number | null) => {
		if (!size || size <= 0) return '—'
		const units = ['B', 'KB', 'MB', 'GB']
		let s = size
		let i = 0
		while (s >= 1024 && i < units.length - 1) {
			s /= 1024
			i++
		}
		return `${s.toFixed(1)} ${units[i]}`
	}

	const formatDateTime = (dateString: string | null) => {
		if (!dateString) return '—'
		try {
			return new Date(dateString).toLocaleString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
		} catch {
			return dateString
		}
	}

	const openPreview = (file: DocumentItem) => {
		if (!file.signed_url) return
		setPreviewUrl(file.signed_url)
		setPreviewMime(file.mime_type || null)
	}

	const closePreview = () => {
		setPreviewUrl(null)
		setPreviewMime(null)
	}

	const handleVerify = async (reqId: string) => {
		try {
			setSubmittingRequest(prev => ({ ...prev, [reqId]: true }))
			const res = await fetch(`/api/admin/document-requests/${reqId}/verify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'verified' })
			})
			if (!res.ok) {
				const j = await res.json().catch(() => ({}))
				throw new Error(j.error || 'Failed to verify')
			}
			await loadRequests()
		} catch (e) {
			console.error(e)
		} finally {
			setSubmittingRequest(prev => ({ ...prev, [reqId]: false }))
		}
	}

	const handleReject = async (reqId: string) => {
		try {
			setSubmittingRequest(prev => ({ ...prev, [reqId]: true }))
			const res = await fetch(`/api/admin/document-requests/${reqId}/verify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'rejected' })
			})
			if (!res.ok) {
				const j = await res.json().catch(() => ({}))
				throw new Error(j.error || 'Failed to reject')
			}
			await loadRequests()
		} catch (e) {
			console.error(e)
		} finally {
			setSubmittingRequest(prev => ({ ...prev, [reqId]: false }))
		}
	}

	const handleRequestAgain = async (reqId: string) => {
		try {
			setSubmittingRequest(prev => ({ ...prev, [reqId]: true }))
			const res = await fetch(`/api/admin/document-requests/${reqId}/resend`, {
				method: 'POST'
			})
			if (!res.ok) {
				const j = await res.json().catch(() => ({}))
				throw new Error(j.error || 'Failed to send magic link')
			}
			await loadRequests()
		} catch (e) {
			console.error(e)
		} finally {
			setSubmittingRequest(prev => ({ ...prev, [reqId]: false }))
		}
	}

	const handleDeleteRequest = async (reqId: string) => {
		if (!confirm('Are you sure you want to delete this document request?')) return
		try {
			setSubmittingRequest(prev => ({ ...prev, [reqId]: true }))
			const res = await fetch(`/api/admin/document-requests/${reqId}`, {
				method: 'DELETE'
			})
			if (!res.ok) {
				const j = await res.json().catch(() => ({}))
				throw new Error(j.error || 'Failed to delete request')
			}
			await loadRequests()
		} catch (e) {
			console.error(e)
		} finally {
			setSubmittingRequest(prev => ({ ...prev, [reqId]: false }))
		}
	}

	return (
		<>
		<div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
			<div className='bg-slate-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between'>
				<div>
					<h3 className='text-lg font-semibold text-gray-900'>Uploaded Documents</h3>
					<p className='text-sm text-gray-500 mt-0.5'>Files stored in Supabase</p>
				</div>
				<div className='flex items-center gap-2'>
				{typeof applicationId !== 'undefined' && (
					<button
						onClick={() => setRequestModalOpen(true)}
						className='flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all hover:shadow-lg'
					>
						<svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
							<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
						</svg>
						Request Items
					</button>
				)}
				<button
					onClick={fetchDocs}
					disabled={loading}
					className='rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50'
				>
					{loading ? 'Refreshing…' : 'Refresh'}
				</button>
				</div>
			</div>

			<div className='p-6 space-y-6'>
				{error && (
					<div className='rounded bg-red-50 text-red-700 text-sm p-3'>{error}</div>
				)}

				{loading && !data && (
					<div className='text-sm text-gray-600'>Loading documents…</div>
				)}

				{data && (
					<div className='space-y-6'>
						{/* Client Files */}
						<div>
							<h4 className='text-sm font-medium text-gray-900'>Client Files</h4>
							<div className='mt-3'>
								{data.client_files.length === 0 ? (
									<p className='text-sm text-gray-600'>No files</p>
								) : (
									<div className='overflow-x-auto rounded border border-gray-200'>
										<table className='min-w-full divide-y divide-gray-200'>
											<thead className='bg-gray-50'>
												<tr>
													<th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Name</th>
													<th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Document Name</th>
													<th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Size</th>
													<th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Last Modified</th>
													<th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Actions</th>
												</tr>
											</thead>
											<tbody className='divide-y divide-gray-200 bg-white'>
												{data.client_files.map((f) => (
													<tr key={f.path}>
														<td className='px-4 py-2 text-sm text-gray-900 font-mono'>{f.name}</td>
														<td className='px-4 py-2 text-sm text-gray-900'>{f.document_name || '—'}</td>
														<td className='px-4 py-2 text-sm text-gray-700'>{formatSize(f.size)}</td>
														<td className='px-4 py-2 text-xs text-gray-500'>{formatDateTime(f.last_modified)}</td>
														<td className='px-4 py-2 text-sm'>
															<button
																className='rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50'
																disabled={!f.signed_url}
																onClick={() => openPreview(f)}
															>
																View
															</button>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>
						</div>

						{/* Application Files */}
						{typeof applicationId !== 'undefined' && (
							<div>
								<h4 className='text-sm font-medium text-gray-900'>Application Files</h4>
								<div className='mt-3'>
									{data.application_files.length === 0 ? (
										<p className='text-sm text-gray-600'>No files</p>
									) : (
										<div className='overflow-x-auto rounded border border-gray-200'>
											<table className='min-w-full divide-y divide-gray-200'>
											<thead className='bg-gray-50'>
													<tr>
														<th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Name</th>
														<th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Document Name</th>
														<th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Size</th>
														<th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Last Modified</th>
														<th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Actions</th>
													</tr>
												</thead>
												<tbody className='divide-y divide-gray-200 bg-white'>
													{data.application_files.map((f) => (
														<tr key={f.path}>
															<td className='px-4 py-2 text-sm text-gray-900 font-mono'>{f.name}</td>
															<td className='px-4 py-2 text-sm text-gray-900'>{f.document_name || '—'}</td>
															<td className='px-4 py-2 text-sm text-gray-700'>{formatSize(f.size)}</td>
															<td className='px-4 py-2 text-xs text-gray-500'>{formatDateTime(f.last_modified)}</td>
															<td className='px-4 py-2 text-sm'>
																<button
																	className='rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50'
																	disabled={!f.signed_url}
																	onClick={() => openPreview(f)}
																>
																	View
																</button>
															</td>
                                                    </tr>
                                                ))}
												</tbody>
											</table>
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>

		{/* Requested Items Status - Modern Design */}
		{typeof applicationId !== 'undefined' && (
			<div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mt-6'>
				<div className='bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<svg className='h-5 w-5 text-indigo-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
							<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
						</svg>
						<h3 className='text-base font-bold text-gray-900'>Requested Items</h3>
					</div>
				</div>
				<div className='p-6'>
					{loadingRequests ? (
						<div className='flex items-center justify-center py-8'>
							<div className='text-center'>
								<div className='mx-auto h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600'></div>
								<p className='mt-2 text-sm text-gray-600'>Loading requests…</p>
							</div>
						</div>
					) : requests.length === 0 ? (
						<div className='text-center py-8'>
							<svg className='mx-auto h-12 w-12 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
							</svg>
							<p className='mt-3 text-sm font-medium text-gray-900'>No requests yet</p>
							<p className='mt-1 text-xs text-gray-500'>Request items to begin the workflow</p>
						</div>
					) : (
						<div className='space-y-4'>
							{Object.entries(requests.reduce((acc: Record<string, any[]>, r: any) => {
								const key = r.group_id || 'ungrouped'
								if (!acc[key]) acc[key] = []
								acc[key].push(r)
								return acc
							}, {})).map(([groupId, groupRequests]) => {
								const anyWithGroupLink = (groupRequests as any[]).find((gr: any) => gr.group_link)
								return (
									<div key={groupId} className='rounded-xl border border-gray-200 bg-white overflow-hidden'>
										<div className='flex items-center justify-between bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-5 py-3'>
											<div className='flex items-center gap-2'>
												<svg className='h-4 w-4 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
													<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' />
												</svg>
												<span className='text-sm font-semibold text-gray-900'>
													{groupId === 'ungrouped' ? 'Ungrouped Items' : `Group: ${groupId}`}
												</span>
											</div>
											{anyWithGroupLink?.group_link && (
												<button
													onClick={async () => { 
														try { 
															await navigator.clipboard.writeText(anyWithGroupLink.group_link!)
															alert('Group link copied to clipboard!')
														} catch {} 
													}}
													className='flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors'
													title={anyWithGroupLink.group_link}
												>
													<svg className='h-3.5 w-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
														<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z' />
													</svg>
													Copy Link
												</button>
											)}
										</div>
										<div className='divide-y divide-gray-100'>
											{(groupRequests as any[]).map((r: any) => {
												const getStatusStyles = (status: string) => {
													switch (status) {
														case 'verified':
															return 'bg-emerald-100 text-emerald-700 border-emerald-200'
														case 'rejected':
															return 'bg-red-100 text-red-700 border-red-200'
														case 'uploaded':
															return 'bg-blue-100 text-blue-700 border-blue-200'
														case 'requested':
															return 'bg-amber-100 text-amber-700 border-amber-200'
														default:
															return 'bg-gray-100 text-gray-700 border-gray-200'
													}
												}
												
												return (
													<div key={r.id} className='px-5 py-4 hover:bg-gray-50 transition-colors'>
														<div className='flex items-start justify-between gap-4'>
															<div className='flex-1 min-w-0'>
																<div className='flex items-center gap-3 mb-2'>
																	<h4 className='text-sm font-semibold text-gray-900'>
																		{r.document_type?.name || 'Unknown Document'}
																	</h4>
																	<span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusStyles(r.status)}`}>
																		{r.status}
																	</span>
																</div>
																<div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500'>
																	{r.magic_link_sent_at && (
																		<div className='flex items-center gap-1'>
																			<svg className='h-3.5 w-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
																				<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
																			</svg>
																			<span>Sent: {new Date(r.magic_link_sent_at).toLocaleDateString()}</span>
																		</div>
																	)}
																	{r.uploaded_file_key && (
																		<div className='flex items-center gap-1'>
																			<svg className='h-3.5 w-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
																				<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' />
																			</svg>
																			<span className='font-mono text-xs'>File uploaded</span>
																		</div>
																	)}
																</div>
															</div>
															<div className='flex items-center gap-2 flex-shrink-0'>
																{r.status === 'uploaded' && (
																	<>
																		<button
																			onClick={() => handleVerify(r.id)}
																			disabled={!!submittingRequest[r.id]}
																			className='flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors'
																		>
																			<svg className='h-3.5 w-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
																				<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
																			</svg>
																			Verify
																		</button>
																		<button
																			onClick={() => handleReject(r.id)}
																			disabled={!!submittingRequest[r.id]}
																			className='flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors'
																		>
																			<svg className='h-3.5 w-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
																				<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
																			</svg>
																			Reject
																		</button>
																	</>
																)}
																{(r.status === 'verified' || r.status === 'rejected') && (
																	<button
																		onClick={() => handleRequestAgain(r.id)}
																		disabled={!!submittingRequest[r.id]}
																		className='flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors'
																	>
																		<svg className='h-3.5 w-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
																			<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
																		</svg>
																		Request Again
																	</button>
																)}
																<button
																	onClick={() => handleDeleteRequest(r.id)}
																	disabled={!!submittingRequest[r.id]}
																	className='rounded-lg border border-gray-300 bg-white p-1.5 text-gray-400 hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-colors'
																	title='Delete request'
																>
																	<svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
																		<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
																	</svg>
																</button>
															</div>
														</div>
													</div>
												)
											})}
										</div>
									</div>
								)
							})}
						</div>
					)}
				</div>
			</div>
		)}

		{/* Preview Modal */}
		{previewUrl && (
			<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50' onClick={closePreview}>
				<div className='mx-4 w-full max-w-3xl h-[80vh] rounded-lg bg-white border border-gray-200 overflow-hidden flex flex-col' onClick={(e) => e.stopPropagation()}>
					<div className='border-b border-gray-200 px-4 py-2 flex items-center justify-between'>
						<h4 className='text-sm font-medium text-gray-900'>Document Preview</h4>
						<button onClick={closePreview} className='rounded hover:bg-gray-100 p-1'>
							<svg className='h-5 w-5 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
							</svg>
						</button>
					</div>
					<div className='flex-1 overflow-auto bg-gray-50'>
						{previewMime?.includes('pdf') ? (
							<iframe src={previewUrl} className='w-full h-full' />
						) : previewMime?.startsWith('image/') ? (
							<div className='w-full h-full flex items-center justify-center p-4'>
								<img src={previewUrl} alt='Document' className='max-w-full max-h-full object-contain' />
							</div>
						) : (
							<div className='p-6 text-center'>
								<p className='text-sm text-gray-700'>Preview not available. </p>
								<a href={previewUrl} target='_blank' rel='noreferrer' className='mt-3 inline-block rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50'>Open in new tab</a>
							</div>
						)}
					</div>
				</div>
			</div>
		)}

		{/* Request Items Modal - Modern Design */}
		{requestModalOpen && typeof applicationId !== 'undefined' && (
			<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm' onClick={() => setRequestModalOpen(false)}>
				<div className='mx-4 w-full max-w-2xl rounded-xl bg-white border border-gray-200 shadow-2xl overflow-hidden' onClick={(e) => e.stopPropagation()}>
					<div className='bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between'>
						<div className='flex items-center gap-3'>
							<div className='flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm'>
								<svg className='h-6 w-6 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
									<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
								</svg>
							</div>
							<h4 className='text-lg font-bold text-white'>Request Items</h4>
						</div>
						<button onClick={() => setRequestModalOpen(false)} className='rounded-lg hover:bg-white/20 p-2 transition-colors'>
							<svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
							</svg>
						</button>
					</div>
					<div className='p-6 space-y-5'>
						<div>
							<p className='text-sm font-semibold text-gray-900 mb-3'>Select items to request:</p>
							<div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
								{requestTypes.map((dt) => {
									const isRequested = requests.some(r => r.document_type?.id === dt.id && (r.status === 'requested' || r.status === 'uploaded'))
									return (
										<label 
											key={dt.id} 
											className={`flex items-start gap-3 rounded-lg border-2 p-3 cursor-pointer transition-all ${
												isRequested 
													? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' 
													: selectedTypes[dt.id]
														? 'border-indigo-500 bg-indigo-50'
														: 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
											}`}
										>
											<input 
												type='checkbox' 
												className='mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500' 
												checked={!!selectedTypes[dt.id]} 
												onChange={() => toggleType(dt.id)} 
												disabled={isRequested} 
											/>
											<div className='flex-1 min-w-0'>
												<span className={`block text-sm font-medium ${isRequested ? 'text-gray-400' : 'text-gray-900'}`}>
													{dt.name}
												</span>
												{dt.kind && (
													<span className='mt-0.5 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600'>
														{dt.kind}
													</span>
												)}
												{isRequested && (
													<span className='mt-1 block text-xs text-amber-600 font-medium'>
														✓ Already requested
													</span>
												)}
											</div>
										</label>
									)
								})}
							</div>
						</div>
						<div>
							<label className='block text-sm font-semibold text-gray-700 mb-2'>Optional Note</label>
							<textarea 
								className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-colors' 
								rows={3} 
								value={note} 
								onChange={(e) => setNote(e.target.value)} 
								placeholder='Add instructions for the applicant (optional)'
							></textarea>
						</div>
					</div>
					<div className='border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3'>
						<button 
							onClick={() => setRequestModalOpen(false)} 
							className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
						>
							Cancel
						</button>
						<button 
							onClick={submitRequestDocs} 
							disabled={sending || Object.keys(selectedTypes).filter(id => selectedTypes[id]).length === 0} 
							className='flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg'
						>
							{sending ? (
								<>
									<svg className='h-4 w-4 animate-spin' fill='none' viewBox='0 0 24 24'>
										<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
										<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
									</svg>
									Sending…
								</>
							) : (
								<>
									<svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
										<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8' />
									</svg>
									Send Requests
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		)}
		</>
	)
}


