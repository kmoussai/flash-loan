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

	return (
		<>
		<div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
			<div className='bg-slate-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between'>
				<div>
					<h3 className='text-lg font-semibold text-gray-900'>Uploaded Documents</h3>
					<p className='text-sm text-gray-500 mt-0.5'>Files stored in Supabase</p>
				</div>
				<button
					onClick={fetchDocs}
					disabled={loading}
					className='rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50'
				>
					{loading ? 'Refreshing…' : 'Refresh'}
				</button>
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
		</>
	)
}


