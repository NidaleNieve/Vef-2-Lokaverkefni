import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
	return NextResponse.json({ ok: true, message: 'placeholder' })
}

export async function OPTIONS() {
	return new NextResponse(null, { status: 204 })
}

