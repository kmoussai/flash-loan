'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AdminDashboardLayout from '../../components/AdminDashboardLayout'
import DocumentsSection from '../../components/DocumentsSection'

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
			const res = await fetch(`/api/admin/clients/${clientId}`)
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

	if (loading) {
		return (
			<AdminDashboardLayout>
				<div className='flex h-96 items-center justify-center'>
					<div className='text-center'>
						<div className='mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900'></div>
						<p className='mt-4 text-sm text-gray-600'>Loading client…</p>
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
						<p className='text-gray-600'>{error || 'Client not found'}</p>
						<button
							onClick={() => router.push('/admin/clients')}
							className='mt-4 rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50'
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
				<div className='flex items-center justify-between border-b border-gray-200 pb-6'>
					<div className='flex items-center gap-4'>
						<button
							onClick={() => router.push('/admin/clients')}
							className='flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors'
						>
							<svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
							</svg>
						</button>
						<div>
							<h1 className='text-2xl font-semibold text-gray-900'>Client Details</h1>
							<p className='text-sm text-gray-500 mt-1'>ID: {user.id.slice(0, 8)}…</p>
						</div>
					</div>
					<span className='inline-flex rounded px-3 py-1 text-xs font-medium uppercase tracking-wide bg-gray-50 text-gray-700 border border-gray-200'>
						{user.kyc_status}
					</span>
				</div>

				{/* Profile */}
				<div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
					<div className='bg-blue-50 border-b border-gray-200 px-6 py-4'>
						<h3 className='text-lg font-semibold text-gray-900'>Profile</h3>
					</div>
					<div className='p-6 grid grid-cols-1 md:grid-cols-3 gap-6'>
						<div>
							<label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Full Name</label>
							<p className='text-lg font-medium text-gray-900 mt-1'>
								{user.first_name || 'N/A'} {user.last_name || ''}
							</p>
						</div>
						<div>
							<label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Email</label>
							<p className='text-lg font-medium text-gray-900 mt-1'>{user.email || 'N/A'}</p>
						</div>
						<div>
							<label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Phone</label>
							<p className='text-lg font-medium text-gray-900 mt-1'>{user.phone || 'N/A'}</p>
						</div>
						<div>
							<label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Preferred Language</label>
							<p className='text-lg font-medium text-gray-900 mt-1'>{user.preferred_language || 'N/A'}</p>
						</div>
						<div>
							<label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Date of Birth</label>
							<p className='text-lg font-medium text-gray-900 mt-1'>{formatDate(user.date_of_birth)}</p>
						</div>
						<div>
							<label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Joined</label>
							<p className='text-lg font-medium text-gray-900 mt-1'>{formatDate(user.created_at)}</p>
						</div>
					</div>
				</div>

				{/* Financial */}
				{(user.residence_status || user.gross_salary || user.rent_or_mortgage_cost) && (
					<div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
						<div className='bg-emerald-50 border-b border-gray-200 px-6 py-4'>
							<h3 className='text-lg font-semibold text-gray-900'>Financial Information</h3>
						</div>
						<div className='p-6 grid md:grid-cols-3 gap-4 text-sm'>
							{user.residence_status && (
								<p className='text-gray-700'>Residence: <span className='font-medium'>{user.residence_status}</span></p>
							)}
							{user.gross_salary && (
								<p className='text-gray-700'>Gross Salary: <span className='font-medium'>{formatCurrency(user.gross_salary)}</span></p>
							)}
							{user.rent_or_mortgage_cost && (
								<p className='text-gray-700'>Rent/Mortgage: <span className='font-medium'>{formatCurrency(user.rent_or_mortgage_cost)}</span></p>
							)}
							{user.heating_electricity_cost && (
								<p className='text-gray-700'>Heating/Electricity: <span className='font-medium'>{formatCurrency(user.heating_electricity_cost)}</span></p>
							)}
							{user.car_loan && (
								<p className='text-gray-700'>Car Loan: <span className='font-medium'>{formatCurrency(user.car_loan)}</span></p>
							)}
							{user.furniture_loan && (
								<p className='text-gray-700'>Furniture Loan: <span className='font-medium'>{formatCurrency(user.furniture_loan)}</span></p>
							)}
						</div>
					</div>
				)}


				{/* Addresses / Documents Tabs */}
				<div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
					<div className='border-b border-gray-200 px-6 pt-4'>
						<div className='flex items-center gap-2'>
							<button
								onClick={() => setActiveTab('addresses')}
								className={`px-3 py-2 text-sm rounded-t ${activeTab === 'addresses' ? 'border border-b-white border-gray-200 bg-white text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
							>
								Addresses
							</button>
							<button
								onClick={() => setActiveTab('documents')}
								className={`px-3 py-2 text-sm rounded-t ${activeTab === 'documents' ? 'border border-b-white border-gray-200 bg-white text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
							>
								Documents
							</button>
						</div>
					</div>
					<div className='p-6'>
						{activeTab === 'addresses' && (
							<div>
								{addresses.length === 0 ? (
									<p className='text-sm text-gray-600'>No addresses found</p>
								) : (
									<div className='grid gap-4 md:grid-cols-2'>
										{addresses.map(addr => (
											<div key={addr.id} className='rounded border border-gray-200 p-4 bg-white'>
												<div className='flex items-center justify-between'>
													<h4 className='font-medium text-gray-900'>
														{addr.is_current ? 'Current Address' : (addr.address_type || 'Address')}
													</h4>
													<span className='text-xs text-gray-500'>{formatDate(addr.created_at)}</span>
												</div>
												<p className='mt-2 text-sm text-gray-700'>
													{`${addr.street_number || ''} ${addr.street_name || ''}${addr.apartment_number ? `, Apt ${addr.apartment_number}` : ''}, ${addr.city}, ${addr.province} ${addr.postal_code}`}
												</p>
												{addr.moving_date && (
													<p className='mt-1 text-xs text-gray-500'>Moved in: {formatDate(addr.moving_date)}</p>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						)}

						{activeTab === 'documents' && (
							<div>
								<DocumentsSection clientId={user.id} />
							</div>
						)}
					</div>
				</div>

				{/* Applications */}
				<div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
					<div className='bg-indigo-50 border-b border-gray-200 px-6 py-4'>
						<div className='flex items-center justify-between'>
							<h3 className='text-lg font-semibold text-gray-900'>Loan Applications</h3>
							<button
								onClick={() => router.push('/admin/applications')}
								className='rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50'
							>
								View All Applications
							</button>
						</div>
					</div>
					<div className='p-6'>
						{applications.length === 0 ? (
							<p className='text-sm text-gray-600'>No applications found</p>
						) : (
							<div className='space-y-3'>
								{applications.map(app => (
									<div key={app.id} className='rounded border border-gray-200 p-4 bg-white flex items-center justify-between'>
										<div>
											<p className='font-medium text-gray-900'>Amount: {formatCurrency(app.loan_amount)}</p>
											<p className='text-xs text-gray-600 mt-1'>Status: {app.application_status}</p>
											<p className='text-xs text-gray-500 mt-1'>Created: {formatDate(app.created_at)}{app.submitted_at ? ` • Submitted: ${formatDate(app.submitted_at)}` : ''}</p>
										</div>
										<button
											onClick={() => router.push(`/admin/applications/${app.id}`)}
											className='rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50'
										>
											Open
										</button>
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


