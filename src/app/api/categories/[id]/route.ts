import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { invalidateCache } from "@/lib/cache";

interface Category {
  _id: string;
  name: string;
  description: string;
  subcategories: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, subcategories = [] } = body;

    if (!name || !description) {
      return NextResponse.json(
        { success: false, error: "Name and description are required" },
        { status: 400 }
      );
    }

    // Validate ID format
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid category ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("spend-tracker");

    const result = await db.collection<Category>("categories").updateOne(
      { _id: id },
      {
        $set: {
          name,
          description,
          subcategories,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Invalidate category cache
    invalidateCache.category();

    return NextResponse.json({
      success: true,
      message: "Category updated successfully",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("spend-tracker");

    // Categories use string IDs, not ObjectIds
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid category ID" },
        { status: 400 }
      );
    }

    // Check if category is in use
    const expensesUsingCategory = await db
      .collection("expenses")
      .countDocuments({
        category: id,
      });

    if (expensesUsingCategory > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete category. It is used in ${expensesUsingCategory} expense(s).`,
        },
        { status: 400 }
      );
    }

    const result = await db
      .collection<Category>("categories")
      .deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Invalidate category cache
    invalidateCache.category();

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
