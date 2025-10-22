import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Use admin client for creating users (requires service role key)
    const adminClient = createServerSupabaseAdminClient()
    const body = await request.json()
    
    console.log('📝 Received request body:', { 
      email: body.email,
      nationalId: body.nationalId
    })
    
    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        { 
          error: 'Email and password are required',
          details: { email: !!body.email, password: !!body.password }
        },
        { status: 400 }
      )
    }
    
    // Create auth user with metadata
    // The trigger will automatically create the users record
    console.log('🔐 Creating auth user for client...')
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        signup_type: 'client', // This tells trigger to create in users table
        national_id: body.nationalId || null
      }
    })
    
    if (authError) {
      console.error('❌ Error creating auth user:', {
        message: authError.message,
        status: authError.status,
        name: authError.name,
        code: (authError as any).code,
        details: (authError as any).details
      })
      
      return NextResponse.json(
        { 
          error: authError.message || 'Failed to create client',
          errorCode: (authError as any).code,
          errorStatus: authError.status,
          errorDetails: (authError as any).details,
          fullError: JSON.stringify(authError, null, 2)
        },
        { status: authError.status || 500 }
      )
    }
    
    console.log('✅ Auth user created:', authData.user.id)
    
    // Wait a moment for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Fetch the complete client record created by the trigger
    console.log('📊 Fetching client record...')
    const { data: clientData, error: fetchError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()
    
    if (fetchError) {
      console.error('⚠️ Error fetching created client:', {
        message: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
        hint: fetchError.hint
      })
      
      // Still return success with basic data
      return NextResponse.json({
        id: authData.user.id,
        email: authData.user.email,
        kyc_status: 'pending',
        national_id: body.nationalId || null,
        warning: 'Client record not found in database - check trigger',
        fetchError: {
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details
        }
      }, { status: 201 })
    }
    
    console.log('✅ Client created successfully:', clientData)
    return NextResponse.json(clientData, { status: 201 })
    
  } catch (error: any) {
    console.error('💥 Unexpected error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message,
        details: error.toString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

