/**
 * Settlements Export API Route
 * 
 * GET: Export settlements to CSV format
 * - Respects all filter parameters (date range, user)
 * - Returns CSV file for download
 * - Requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { createApiRoute } from '@/lib/api-middleware';
import { 
  exportSettlementsToCSV, 
  getSettlementExportFilename,
} from '@/lib/utils/export';

// GET: Export settlements to CSV
const handleExportSettlements = createApiRoute({
  methods: ['GET'],
  requireAuth: true,
  handler: async (request: NextRequest, context) => {
    try {
      const user = context.user!;
      const searchParams = request.nextUrl.searchParams;
      
      // Get filter parameters
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const userFilter = searchParams.get('user');
      
      // Build query
      const db = await dbManager.getDatabase();
      const query: any = {};
      
      // Date range filter
      if (startDate || endDate) {
        query.date = {};
        if (startDate) {
          query.date.$gte = new Date(startDate);
        }
        if (endDate) {
          query.date.$lte = new Date(endDate);
        }
      }
      
      // User filter (fromUser or toUser)
      if (userFilter && userFilter !== 'all') {
        query.$or = [
          { fromUser: userFilter },
          { toUser: userFilter },
        ];
      }
      
      // Fetch settlements
      const settlements = await db.collection('settlements')
        .find(query)
        .sort({ date: -1 })
        .toArray();
      
      // Transform data for export
      const exportData = settlements.map(settlement => ({
        _id: settlement._id.toString(),
        fromUser: settlement.fromUser,
        toUser: settlement.toUser,
        amount: settlement.amount,
        description: settlement.description,
        date: settlement.date,
        status: settlement.status || 'completed',
      }));
      
      // Generate CSV
      const csvContent = exportSettlementsToCSV(exportData);
      
      // Generate filename
      const filename = getSettlementExportFilename();
      
      // Return CSV response (using NextResponse for compatibility)
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache',
        },
      }) as any;
    } catch (error: any) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Failed to export settlements' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      ) as any;
    }
  },
});

// Export route handler
export const GET = handleExportSettlements;
