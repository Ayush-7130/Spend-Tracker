/**
 * Web Vitals Analytics API Endpoint
 * 
 * Collects Web Vitals metrics from the client for analysis.
 */

import { NextRequest, NextResponse } from 'next/server';

interface WebVitalMetric {
  metric: string;
  value: number;
  rating: string;
  page: string;
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: WebVitalMetric = await request.json();
    
    // Validate the metric data
    if (!body.metric || typeof body.value !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid metric data' },
        { status: 400 }
      );
    }

    // Log metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Web Vital:', {
        metric: body.metric,
        value: body.value,
        rating: body.rating,
        page: body.page,
      });
    }

    // In production, you would:
    // 1. Store in database for analysis
    // 2. Send to analytics service (e.g., Google Analytics, Datadog, New Relic)
    // 3. Aggregate for dashboards
    
    // Example: Store in MongoDB (commented out)
    /*
    const client = await clientPromise;
    const db = client.db('spend-tracker');
    
    await db.collection('web_vitals').insertOne({
      ...body,
      userAgent: request.headers.get('user-agent'),
      createdAt: new Date(),
    });
    */

    return NextResponse.json(
      { success: true, message: 'Metric recorded' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to record metric' },
      { status: 500 }
    );
  }
}
