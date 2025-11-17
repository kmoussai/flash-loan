'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AdminDashboardLayout from '../../components/AdminDashboardLayout'
import DocumentsSection from '../../components/DocumentsSection'
import ClientDocumentsSection from '../../components/ClientDocumentsSection'

interface ClientDetails {
	user: {
		id: string
		first_name: string | null
		last_name: string | null
		email: string | null
		phone: string | null
		preferred_language: string | null
		kyc_status: string
		date_of_birth: string | null
		residence_status: string | null
		gross_salary: number | null
		rent_or_mortgage_cost: number | null
		heating_electricity_cost: number | null
		car_loan: number | null
		furniture_loan: number | null
		created_at: string
	}
	addresses: Array<{
		id: string
		address_type: string | null
		street_number: string | null
		street_name: string | null
		apartment_number: string | null
		city: string
		province: string
		postal_code: string
		moving_date: string | null
		is_current: boolean | null
		created_at: string
	}>
	applications: Array<{
		id: string
		loan_amount: number
		income_source: string | null
		application_status: string
		created_at: string
		submitted_at: string | null
	}>
}

export default function ClientDetailsPage() {
	const router = useRouter()
	const params = useParams()
	const clientId = params.id as string

	const [data, setData] = useState<ClientDetails | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [activeTab, setActiveTab] = useState<'addresses' | 'documents'>('addresses')

	useEffect(() => {
		if (clientId) {
			fetchDetails()
		}
	}, [clientId])

	const fetchDetails = async () => {
		try {
			setLoading(true)
			// Add cache-busting timestamp to ensure fresh data
			const res = await fetch(`/api/admin/clients/${clientId}?t=${Date.now()}`, {
				cache: 'no-store'
			})
			if (!res.ok) {
				const err = await res.json()
				throw new Error(err.error || 'Failed to fetch client details')
			}
			const json = await res.json()
			setData(json)
			setError(null)
		} catch (e: any) {
			setError(e.message || 'Failed to load client details')
		} finally {
			setLoading(false)
		}
	}

	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'N/A'
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
	}

	const getKycBadgeColor = (status: string) => {
		switch (status) {
			case 'verified':
				return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
			case 'pending':
				return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
			case 'rejected':
				return 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
			default:
				return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
		}
	}

	const getStatusBadgeColor = (status: string) => {
		const colors: Record<string, string> = {
			pending: 'bg-yellow-100 text-yellow-800',
			processing: 'bg-blue-100 text-blue-800',
			pre_approved: 'bg-purple-100 text-purple-800',
			contract_pending: 'bg-indigo-100 text-indigo-800',
			contract_signed: 'bg-cyan-100 text-cyan-800',
			approved: 'bg-green-100 text-green-800',
			rejected: 'bg-red-100 text-red-800',
			cancelled: 'bg-gray-100 text-gray-800',
		}
		return colors[status] || 'bg-gray-100 text-gray-800'
	}

	if (loading) {
		return (
			<AdminDashboardLayout>
				<div className='flex h-96 items-center justify-center'>
					<div className='text-center'>
						<div className='mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600'></div>
						<p className='mt-4 text-sm font-medium text-gray-600'>Loading client details…</p>
					</div>
				</div>
			</AdminDashboardLayout>
		)
	}

	if (error || !data) {
		return (
			<AdminDashboardLayout>
				<div className='flex h-96 items-center justify-center'>
					<div className='text-center'>
						<div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100'>
							<svg className='h-8 w-8 text-red-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
							</svg>
						</div>
						<p className='text-lg font-semibold text-gray-900'>{error || 'Client not found'}</p>
						<button
							onClick={() => router.push('/admin/clients')}
							className='mt-6 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:scale-105'
						>
							Back to Clients
						</button>
					</div>
				</div>
			</AdminDashboardLayout>
		)
	}

	const { user, addresses, applications } = data

	return (
		<AdminDashboardLayout>
			<div className='space-y-6'>
				{/* Header */}
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-4'>
						<button
							onClick={() => router.push('/admin/clients')}
							className='flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md'
						>
							<svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
							</svg>
						</button>
						<div>
							<h1 className='text-3xl font-bold text-gray-900'>
								{user.first_name && user.last_name 
									? `${user.first_name} ${user.last_name}`
									: user.first_name || user.last_name || 'Client Details'}
							</h1>
							<p className='text-sm text-gray-500 mt-1 font-mono'>ID: {user.id.slice(0, 8)}…</p>
						</div>
					</div>
					<div className='flex items-center gap-3'>
						<button
							onClick={fetchDetails}
							disabled={loading}
							className='flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md disabled:opacity-50'
						>
							<svg 
								className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} 
								fill='none' 
								viewBox='0 0 24 24' 
								stroke='currentColor'
							>
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
							</svg>
							Refresh
						</button>
						<span className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide shadow-md ${getKycBadgeColor(user.kyc_status)}`}>
						{user.kyc_status}
					</span>
					</div>
				</div>

				{/* Profile Card */}
				<div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
					<div className='absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 blur-2xl transition-transform duration-300 group-hover:scale-150'></div>
					<div className='relative'>
						<div className='mb-6 flex items-center gap-3'>
							<div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg'>
								<svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
									<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
								</svg>
					</div>
							<h3 className='text-xl font-bold text-gray-900'>Profile Information</h3>
						</div>
						<div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
							<div className='rounded-xl border border-gray-200 bg-gray-50/50 p-4'>
								<label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Full Name</label>
								<p className='mt-2 text-lg font-semibold text-gray-900'>
									{[user.first_name, user.last_name].filter(Boolean).join(' ') || 'N/A'}
								</p>
							</div>
							<div className='rounded-xl border border-gray-200 bg-gray-50/50 p-4'>
								<label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Email</label>
								<p className='mt-2 text-lg font-semibold text-gray-900'>{user.email || 'N/A'}</p>
							</div>
							<div className='rounded-xl border border-gray-200 bg-gray-50/50 p-4'>
								<label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Phone</label>
								<p className='mt-2 text-lg font-semibold text-gray-900'>{user.phone || 'N/A'}</p>
						</div>
							<div className='rounded-xl border border-gray-200 bg-gray-50/50 p-4'>
								<label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Preferred Language</label>
								<p className='mt-2 text-lg font-semibold text-gray-900'>
									{user.preferred_language?.toUpperCase() || 'N/A'}
								</p>
						</div>
							<div className='rounded-xl border border-gray-200 bg-gray-50/50 p-4'>
								<label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Date of Birth</label>
								<p className='mt-2 text-lg font-semibold text-gray-900'>{formatDate(user.date_of_birth)}</p>
						</div>
							<div className='rounded-xl border border-gray-200 bg-gray-50/50 p-4'>
								<label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Joined</label>
								<p className='mt-2 text-lg font-semibold text-gray-900'>{formatDate(user.created_at)}</p>
						</div>
						</div>
					</div>
				</div>

				{/* Financial Information Card */}
				{(user.residence_status || user.gross_salary || user.rent_or_mortgage_cost) && (
					<div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
						<div className='absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 blur-2xl transition-transform duration-300 group-hover:scale-150'></div>
						<div className='relative'>
							<div className='mb-6 flex items-center gap-3'>
								<div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg'>
									<svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
										<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
									</svg>
								</div>
								<h3 className='text-xl font-bold text-gray-900'>Financial Information</h3>
						</div>
							<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
							{user.residence_status && (
									<div className='rounded-xl border border-gray-200 bg-emerald-50/50 p-4'>
										<label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>Residence Status</label>
										<p className='mt-2 text-lg font-semibold text-gray-900 capitalize'>{user.residence_status}</p>
									</div>
							)}
							{user.gross_salary && (
									<div className='rounded-xl border border-gray-200 bg-emerald-50/50 p-4'>
										<label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>Gross Salary</label>
										<p className='mt-2 text-lg font-semibold text-gray-900'>{formatCurrency(user.gross_salary)}</p>
									</div>
							)}
							{user.rent_or_mortgage_cost && (
									<div className='rounded-xl border border-gray-200 bg-emerald-50/50 p-4'>
										<label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>Rent/Mortgage</label>
										<p className='mt-2 text-lg font-semibold text-gray-900'>{formatCurrency(user.rent_or_mortgage_cost)}</p>
									</div>
							)}
							{user.heating_electricity_cost && (
									<div className='rounded-xl border border-gray-200 bg-emerald-50/50 p-4'>
										<label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>Heating/Electricity</label>
										<p className='mt-2 text-lg font-semibold text-gray-900'>{formatCurrency(user.heating_electricity_cost)}</p>
									</div>
							)}
							{user.car_loan && (
									<div className='rounded-xl border border-gray-200 bg-emerald-50/50 p-4'>
										<label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>Car Loan</label>
										<p className='mt-2 text-lg font-semibold text-gray-900'>{formatCurrency(user.car_loan)}</p>
									</div>
							)}
							{user.furniture_loan && (
									<div className='rounded-xl border border-gray-200 bg-emerald-50/50 p-4'>
										<label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>Furniture Loan</label>
										<p className='mt-2 text-lg font-semibold text-gray-900'>{formatCurrency(user.furniture_loan)}</p>
									</div>
							)}
							</div>
						</div>
					</div>
				)}


				{/* Addresses / Documents Tabs */}
				<div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
					<div className='absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-2xl transition-transform duration-300 group-hover:scale-150'></div>
					<div className='relative'>
						<div className='mb-6 flex items-center gap-3'>
							<div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg'>
								<svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
									<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
								</svg>
							</div>
							<h3 className='text-xl font-bold text-gray-900'>Addresses & Documents</h3>
						</div>
						<div className='mb-6 flex items-center gap-2 border-b border-gray-200'>
							<button
								onClick={() => setActiveTab('addresses')}
								className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
									activeTab === 'addresses'
										? 'border-b-2 border-purple-500 bg-purple-50/50 text-purple-700'
										: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
								}`}
							>
								Addresses
							</button>
							<button
								onClick={() => setActiveTab('documents')}
								className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
									activeTab === 'documents'
										? 'border-b-2 border-purple-500 bg-purple-50/50 text-purple-700'
										: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
								}`}
							>
								Documents
							</button>
						</div>
						<div>
						{activeTab === 'addresses' && (
							<div>
								{addresses.length === 0 ? (
										<div className='rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center'>
											<svg className='mx-auto h-12 w-12 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
												<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
												<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
											</svg>
											<p className='mt-4 text-sm font-medium text-gray-900'>No addresses found</p>
											<p className='mt-1 text-xs text-gray-500'>This client has not provided any address information</p>
										</div>
								) : (
									<div className='grid gap-4 md:grid-cols-2'>
										{addresses.map(addr => (
												<div key={addr.id} className='group/item relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-purple-300 hover:shadow-md'>
													<div className='flex items-start justify-between'>
														<div className='flex items-center gap-3'>
															<div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-100 to-pink-100'>
																<svg className='h-5 w-5 text-purple-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
																	<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
																	<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
																</svg>
															</div>
															<div>
																<h4 className='font-semibold text-gray-900'>
																	{addr.is_current ? (
																		<span className='inline-flex items-center gap-1.5'>
																			Current Address
																			<span className='inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800'>
																				Active
																			</span>
																		</span>
																	) : (
																		addr.address_type || 'Address'
																	)}
													</h4>
																<p className='mt-1 text-sm text-gray-600'>
																	{`${addr.street_number || ''} ${addr.street_name || ''}${addr.apartment_number ? `, Apt ${addr.apartment_number}` : ''}`}
																</p>
																<p className='text-sm text-gray-600'>
																	{`${addr.city}, ${addr.province} ${addr.postal_code}`}
																</p>
															</div>
														</div>
												</div>
												{addr.moving_date && (
														<div className='mt-4 flex items-center gap-2 text-xs text-gray-500'>
															<svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
																<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
															</svg>
															<span>Moved in: {formatDate(addr.moving_date)}</span>
														</div>
													)}
													<div className='mt-3 text-xs text-gray-400'>
														Added: {formatDate(addr.created_at)}
													</div>
											</div>
										))}
									</div>
								)}
							</div>
						)}

						{activeTab === 'documents' && (
							<div className='space-y-6'>
								<ClientDocumentsSection clientId={user.id} active={activeTab === 'documents'} />
							</div>
						)}
						</div>
					</div>
				</div>

				{/* Loan Applications Card */}
				<div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
					<div className='absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/20 blur-2xl transition-transform duration-300 group-hover:scale-150'></div>
					<div className='relative'>
						<div className='mb-6 flex items-center justify-between'>
							<div className='flex items-center gap-3'>
								<div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg'>
									<svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
										<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
									</svg>
								</div>
								<div>
									<h3 className='text-xl font-bold text-gray-900'>Loan Applications</h3>
									<p className='text-sm text-gray-500 mt-0.5'>{applications.length} {applications.length === 1 ? 'application' : 'applications'}</p>
								</div>
							</div>
							<button
								onClick={() => router.push('/admin/applications')}
								className='flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105'
							>
								<svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
									<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
								</svg>
								View All
							</button>
						</div>
						{applications.length === 0 ? (
							<div className='rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center'>
								<svg className='mx-auto h-12 w-12 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
									<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
								</svg>
								<p className='mt-4 text-sm font-medium text-gray-900'>No applications found</p>
								<p className='mt-1 text-xs text-gray-500'>This client has not submitted any loan applications yet</p>
							</div>
						) : (
							<div className='space-y-3'>
								{applications.map(app => (
									<div key={app.id} className='group/item relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md'>
										<div className='flex items-center justify-between'>
											<div className='flex-1'>
												<div className='flex items-center gap-3'>
													<div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100'>
														<svg className='h-5 w-5 text-indigo-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
															<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
														</svg>
													</div>
													<div className='flex-1'>
														<div className='flex items-center gap-3'>
															<p className='text-lg font-bold text-gray-900'>{formatCurrency(app.loan_amount)}</p>
															<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeColor(app.application_status)}`}>
																{app.application_status.replace('_', ' ').toUpperCase()}
															</span>
														</div>
														<div className='mt-2 flex items-center gap-4 text-xs text-gray-500'>
															<span className='flex items-center gap-1'>
																<svg className='h-3.5 w-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
																	<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
																</svg>
																Created: {formatDate(app.created_at)}
															</span>
															{app.submitted_at && (
																<span className='flex items-center gap-1'>
																	<svg className='h-3.5 w-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
																		<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
																	</svg>
																	Submitted: {formatDate(app.submitted_at)}
																</span>
															)}
														</div>
														{app.income_source && (
															<p className='mt-2 text-xs text-gray-500'>
																Income: <span className='font-medium capitalize'>{app.income_source.replace('-', ' ')}</span>
															</p>
														)}
													</div>
												</div>
										</div>
										<button
											onClick={() => router.push(`/admin/applications/${app.id}`)}
												className='ml-4 flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition-all hover:bg-indigo-100 hover:shadow-sm'
											>
												<svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
													<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
													<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
												</svg>
												View
										</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Documents moved into tabs */}
			</div>
		</AdminDashboardLayout>
	)
}


