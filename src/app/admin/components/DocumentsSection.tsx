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
	const [docTypes, setDocTypes] = useState<Array<{ id: string, name: string, slug: string }>>([])
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
			setDocTypes((json.document_types || []).map((d: any) => ({ id: d.id, name: d.name, slug: d.slug })))
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
						className='rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700'
					>
						Request documents
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

		{/* Requested Documents Status */}
		{typeof applicationId !== 'undefined' && (
			<div className='rounded-lg bg-white border border-gray-200 overflow-hidden mt-6'>
				<div className='bg-slate-50 border-b border-gray-200 px-6 py-3'>
					<h3 className='text-sm font-semibold text-gray-900'>Requested Documents</h3>
				</div>
				<div className='p-6'>
					{loadingRequests ? (
						<p className='text-sm text-gray-600'>Loading requests…</p>
					) : requests.length === 0 ? (
						<p className='text-sm text-gray-600'>No requests yet</p>
					) : (
						<div className='overflow-x-auto rounded border border-gray-200'>
							<table className='min-w-full divide-y divide-gray-200'>
								<thead className='bg-gray-50'>
									<tr>
										<th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Type</th>
										<th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Status</th>
										<th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Last Sent</th>
										<th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Link</th>
										<th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>File</th>
										<th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Actions</th>
									</tr>
								</thead>
								<tbody className='divide-y divide-gray-200 bg-white'>
									{requests.map((r) => (
										<tr key={r.id}>
											<td className='px-4 py-2 text-sm text-gray-900'>{r.document_type?.name || '—'}</td>
											<td className='px-4 py-2 text-sm'>
												<span className='inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border' data-status={r.status}>
													{r.status}
												</span>
											</td>
											<td className='px-4 py-2 text-xs text-gray-500'>{r.magic_link_sent_at ? new Date(r.magic_link_sent_at).toLocaleString() : '—'}</td>
										<td className='px-4 py-2 text-xs text-gray-500 max-w-[280px] truncate'>
											{r.request_link ? (
												<button
													onClick={async () => { try { await navigator.clipboard.writeText(r.request_link!) } catch {} }}
													className='rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50'
													title={r.request_link}
												>
													Copy Link
												</button>
											) : (
												<span className='text-gray-400'>Expired/Not generated</span>
											)}
										</td>
											<td className='px-4 py-2 text-xs text-gray-500 font-mono'>{r.uploaded_file_key || '—'}</td>
											<td className='px-4 py-2 text-sm whitespace-nowrap'>
												<div className='flex items-center gap-2'>
													{r.status === 'uploaded' && (
														<>
															<button
																onClick={() => handleVerify(r.id)}
																disabled={!!submittingRequest[r.id]}
																className='rounded border border-emerald-300 bg-white px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50'
															>
																Verify
															</button>
															<button
																onClick={() => handleReject(r.id)}
																disabled={!!submittingRequest[r.id]}
																className='rounded border border-red-300 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50'
															>
																Reject
															</button>
														</>
													)}
													{(r.status === 'verified' || r.status === 'rejected') && (
														<button
															onClick={() => handleRequestAgain(r.id)}
															disabled={!!submittingRequest[r.id]}
															className='rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50'
														>
															Request again
														</button>
													)}
													<button
														onClick={() => handleDeleteRequest(r.id)}
														disabled={!!submittingRequest[r.id]}
														className='rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 disabled:opacity-50'
														title='Delete request'
													>
														Delete
													</button>
												</div>
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

		{/* Request Documents Modal */}
		{requestModalOpen && typeof applicationId !== 'undefined' && (
			<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50' onClick={() => setRequestModalOpen(false)}>
				<div className='mx-4 w-full max-w-lg rounded-lg bg-white border border-gray-200 overflow-hidden' onClick={(e) => e.stopPropagation()}>
					<div className='border-b border-gray-200 px-4 py-3 flex items-center justify-between'>
						<h4 className='text-sm font-semibold text-gray-900'>Request Documents</h4>
						<button onClick={() => setRequestModalOpen(false)} className='rounded hover:bg-gray-100 p-1'>
							<svg className='h-5 w-5 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
							</svg>
						</button>
					</div>
					<div className='p-4 space-y-4'>
						<div>
							<p className='text-sm text-gray-700 mb-2'>Select document types to request:</p>
							<div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
								{docTypes.map((dt) => {
									const isRequested = requests.some(r => r.document_type?.id === dt.id && (r.status === 'requested' || r.status === 'uploaded'))
									return (
										<label key={dt.id} className={`flex items-center gap-2 text-sm ${isRequested ? 'text-gray-400' : 'text-gray-800'}`}>
											<input type='checkbox' className='h-4 w-4' checked={!!selectedTypes[dt.id]} onChange={() => toggleType(dt.id)} disabled={isRequested} />
											<span>{dt.name}{isRequested && <span className='ml-1 text-xs text-orange-600'> (already requested)</span>}</span>
										</label>
									)
								})}
							</div>
						</div>
						<div>
							<label className='block text-xs font-medium text-gray-600 mb-1'>Optional Note</label>
							<textarea className='w-full rounded border border-gray-300 px-2 py-1 text-sm' rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder='Add instructions for the applicant (optional)'></textarea>
						</div>
					</div>
					<div className='border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-2'>
						<button onClick={() => setRequestModalOpen(false)} className='rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50'>Cancel</button>
						<button onClick={submitRequestDocs} disabled={sending} className='rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50'>
							{sending ? 'Sending…' : 'Send requests'}
						</button>
					</div>
				</div>
			</div>
		)}
		</>
	)
}


