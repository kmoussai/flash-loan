'use client'

import { useEffect, useState } from 'react'

interface DocumentType {
	id: string
	name: string
	slug: string
	description: string | null
}

interface Application {
	id: string
	loanAmount: number
	status: string
	createdAt: string
}

interface ClientDocument {
	id: string
	status: string
	documentType: DocumentType | null
	application: Application | null
	fileName: string
	fileSize: number | null
	mimeType: string | null
	uploadedAt: string
	signedUrl: string | null
}

interface ClientDocumentsResponse {
	clientId: string
	documents: ClientDocument[]
	total: number
}

interface ClientDocumentsSectionProps {
	clientId: string
	active?: boolean
}

export default function ClientDocumentsSection({
	clientId,
	active = false
}: ClientDocumentsSectionProps) {
	const [data, setData] = useState<ClientDocumentsResponse | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)
	const [previewMime, setPreviewMime] = useState<string | null>(null)
	const [previewFileName, setPreviewFileName] = useState<string | null>(null)

	useEffect(() => {
		if (active && clientId && !data && !loading) {
			fetchDocuments()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active, clientId])

	const fetchDocuments = async () => {
		if (!clientId) return
		try {
			setLoading(true)
			setError(null)
			const res = await fetch(`/api/admin/clients/${clientId}/documents?t=${Date.now()}`, {
				cache: 'no-store'
			})
			if (!res.ok) {
				const err = await res.json()
				throw new Error(err.error || 'Failed to fetch documents')
			}
			const json = await res.json()
			setData(json)
		} catch (e: any) {
			setError(e.message || 'Failed to load documents')
		} finally {
			setLoading(false)
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
			return new Date(dateString).toLocaleString('en-CA', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			})
		} catch {
			return dateString
		}
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
	}

	const getStatusBadgeColor = (status: string) => {
		switch (status) {
			case 'verified':
				return 'bg-emerald-100 text-emerald-700 border-emerald-200'
			case 'rejected':
				return 'bg-red-100 text-red-700 border-red-200'
			case 'uploaded':
				return 'bg-blue-100 text-blue-700 border-blue-200'
			default:
				return 'bg-gray-100 text-gray-700 border-gray-200'
		}
	}

	const getApplicationStatusBadgeColor = (status: string) => {
		const colors: Record<string, string> = {
			pending: 'bg-yellow-100 text-yellow-800',
			processing: 'bg-blue-100 text-blue-800',
			pre_approved: 'bg-purple-100 text-purple-800',
			contract_pending: 'bg-indigo-100 text-indigo-800',
			contract_signed: 'bg-cyan-100 text-cyan-800',
			approved: 'bg-green-100 text-green-800',
			rejected: 'bg-red-100 text-red-800',
			cancelled: 'bg-gray-100 text-gray-800'
		}
		return colors[status] || 'bg-gray-100 text-gray-800'
	}

	const openPreview = (doc: ClientDocument) => {
		if (!doc.signedUrl) return
		setPreviewUrl(doc.signedUrl)
		setPreviewMime(doc.mimeType)
		setPreviewFileName(doc.fileName)
	}

	const closePreview = () => {
		setPreviewUrl(null)
		setPreviewMime(null)
		setPreviewFileName(null)
	}

	if (!active) {
		return null
	}

	return (
		<>
			<div className='space-y-4'>
				<div className='flex items-center justify-between'>
					<div>
						<h4 className='text-base font-bold text-gray-900'>All Uploaded Documents</h4>
						<p className='mt-1 text-sm text-gray-500'>
							Documents uploaded across all loan applications
						</p>
					</div>
					<button
						onClick={fetchDocuments}
						disabled={loading}
						className='flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md disabled:opacity-50'
					>
						<svg
							className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
							fill='none'
							viewBox='0 0 24 24'
							stroke='currentColor'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
							/>
						</svg>
						Refresh
					</button>
				</div>

				{loading && (
					<div className='flex items-center justify-center py-12'>
						<div className='text-center'>
							<div className='mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600'></div>
							<p className='mt-4 text-sm text-gray-600'>Loading documents…</p>
						</div>
					</div>
				)}

				{error && (
					<div className='rounded-lg border border-red-200 bg-red-50 p-4'>
						<p className='text-sm font-medium text-red-800'>{error}</p>
						<button
							onClick={fetchDocuments}
							className='mt-2 text-sm text-red-600 hover:text-red-800 underline'
						>
							Try again
						</button>
					</div>
				)}

				{!loading && !error && data && (
					<>
						{data.documents.length === 0 ? (
							<div className='rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center'>
								<svg
									className='mx-auto h-12 w-12 text-gray-400'
									fill='none'
									viewBox='0 0 24 24'
									stroke='currentColor'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
									/>
								</svg>
								<p className='mt-4 text-sm font-medium text-gray-900'>No documents found</p>
								<p className='mt-1 text-xs text-gray-500'>
									This client has not uploaded any documents yet
								</p>
							</div>
						) : (
							<div className='space-y-3'>
								{data.documents.map(doc => (
									<div
										key={doc.id}
										className='group/item relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md'
									>
										<div className='flex items-start justify-between gap-4'>
											<div className='min-w-0 flex-1'>
												<div className='mb-2 flex flex-wrap items-center gap-3'>
													<div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100'>
														<svg
															className='h-5 w-5 text-indigo-600'
															fill='none'
															viewBox='0 0 24 24'
															stroke='currentColor'
														>
															<path
																strokeLinecap='round'
																strokeLinejoin='round'
																strokeWidth={2}
																d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
															/>
														</svg>
													</div>
													<div className='flex-1'>
														<h5 className='text-sm font-semibold text-gray-900'>
															{doc.documentType?.name || 'Unknown Document'}
														</h5>
														<p className='mt-0.5 text-xs text-gray-500'>{doc.fileName}</p>
													</div>
													<span
														className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeColor(doc.status)}`}
													>
														{doc.status}
													</span>
												</div>

												{doc.application && (
													<div className='mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3'>
														<div className='flex items-center justify-between'>
															<div className='flex items-center gap-2'>
																<svg
																	className='h-4 w-4 text-gray-400'
																	fill='none'
																	viewBox='0 0 24 24'
																	stroke='currentColor'
																>
																	<path
																		strokeLinecap='round'
																		strokeLinejoin='round'
																		strokeWidth={2}
																		d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
																	/>
																</svg>
																<span className='text-xs font-medium text-gray-600'>
																	Application: {formatCurrency(doc.application.loanAmount)}
																</span>
																<span
																	className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getApplicationStatusBadgeColor(doc.application.status)}`}
																>
																	{doc.application.status.replace('_', ' ').toUpperCase()}
																</span>
															</div>
														</div>
													</div>
												)}

												<div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500'>
													<div className='flex items-center gap-1'>
														<svg
															className='h-3.5 w-3.5'
															fill='none'
															stroke='currentColor'
															viewBox='0 0 24 24'
														>
															<path
																strokeLinecap='round'
																strokeLinejoin='round'
																strokeWidth={2}
																d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
															/>
														</svg>
														<span>Uploaded: {formatDateTime(doc.uploadedAt)}</span>
													</div>
													{doc.fileSize && (
														<div className='flex items-center gap-1'>
															<svg
																className='h-3.5 w-3.5'
																fill='none'
																stroke='currentColor'
																viewBox='0 0 24 24'
															>
																<path
																	strokeLinecap='round'
																	strokeLinejoin='round'
																	strokeWidth={2}
																	d='M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4'
																/>
															</svg>
															<span>{formatSize(doc.fileSize)}</span>
														</div>
													)}
												</div>
											</div>
											<div className='flex flex-shrink-0 items-center gap-2'>
												{doc.signedUrl && (
													<button
														onClick={() => openPreview(doc)}
														className='flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 hover:shadow-sm'
													>
														<svg
															className='h-3.5 w-3.5'
															fill='none'
															stroke='currentColor'
															viewBox='0 0 24 24'
														>
															<path
																strokeLinecap='round'
																strokeLinejoin='round'
																strokeWidth={2}
																d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
															/>
															<path
																strokeLinecap='round'
																strokeLinejoin='round'
																strokeWidth={2}
																d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
															/>
														</svg>
														View
													</button>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</>
				)}
			</div>

			{/* Preview Modal */}
			{previewUrl && (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
					onClick={closePreview}
				>
					<div
						className='mx-4 flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white'
						onClick={e => e.stopPropagation()}
					>
						<div className='flex items-center justify-between border-b border-gray-200 px-4 py-2'>
							<h4 className='text-sm font-medium text-gray-900'>
								{previewFileName || 'Document Preview'}
							</h4>
							<button onClick={closePreview} className='rounded p-1 hover:bg-gray-100'>
								<svg
									className='h-5 w-5 text-gray-500'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M6 18L18 6M6 6l12 12'
									/>
								</svg>
							</button>
						</div>
						<div className='flex-1 overflow-auto bg-gray-50'>
							{previewMime?.includes('pdf') ? (
								<iframe
									src={previewUrl}
									className='h-full w-full'
									title={previewFileName || 'PDF Document'}
								/>
							) : previewMime?.startsWith('image/') ? (
								<div className='flex h-full w-full items-center justify-center p-4'>
									<img
										src={previewUrl}
										alt={previewFileName || 'Document'}
										className='max-h-full max-w-full object-contain'
									/>
								</div>
							) : (
								<div className='p-6 text-center'>
									<p className='text-sm text-gray-700'>
										Preview not available for this file type.
									</p>
									<a
										href={previewUrl}
										target='_blank'
										rel='noreferrer'
										className='mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50'
									>
										<svg
											className='h-4 w-4'
											fill='none'
											stroke='currentColor'
											viewBox='0 0 24 24'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth={2}
												d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
											/>
										</svg>
										Download
									</a>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	)
}

