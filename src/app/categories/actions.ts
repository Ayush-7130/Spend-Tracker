/**
 * Optimized Server Actions for Categories
 *
 * Server Actions allow form submissions and mutations to run on the server,
 * reducing client-side JavaScript and improving performance.
 */

"use server";

import { revalidatePath } from "next/cache";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { invalidateCache } from "@/lib/cache";

export interface Subcategory {
  name: string;
  description: string;
}

export interface CategoryFormData {
  name: string;
  description: string;
  subcategories: Subcategory[];
}

/**
 * Get all categories (Server-side data fetching)
 */
export async function getCategories() {
  try {
    const client = await clientPromise;
    const db = client.db("spend-tracker");

    const categories = await db
      .collection("categories")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return {
      success: true,
      data: categories.map((cat) => ({
        ...cat,
        _id: cat._id.toString(),
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to fetch categories",
    };
  }
}

/**
 * Create a new category (Server Action)
 */
export async function createCategory(formData: CategoryFormData) {
  try {
    const client = await clientPromise;
    const db = client.db("spend-tracker");

    // Validate input
    if (!formData.name || formData.name.trim() === "") {
      return {
        success: false,
        error: "Category name is required",
      };
    }

    // Check if category already exists
    const existing = await db.collection("categories").findOne({
      name: formData.name.trim(),
    });

    if (existing) {
      return {
        success: false,
        error: "A category with this name already exists",
      };
    }

    const category = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      subcategories: formData.subcategories.filter(
        (sub) => sub.name.trim() !== ""
      ),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("categories").insertOne(category);

    // Invalidate cache and revalidate the page
    invalidateCache.category();
    revalidatePath("/categories");
    revalidatePath("/expenses");
    revalidatePath("/");

    return {
      success: true,
      data: {
        ...category,
        _id: result.insertedId.toString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to create category",
    };
  }
}

/**
 * Update an existing category (Server Action)
 */
export async function updateCategory(id: string, formData: CategoryFormData) {
  try {
    const client = await clientPromise;
    const db = client.db("spend-tracker");

    // Validate input
    if (!formData.name || formData.name.trim() === "") {
      return {
        success: false,
        error: "Category name is required",
      };
    }

    if (!ObjectId.isValid(id)) {
      return {
        success: false,
        error: "Invalid category ID",
      };
    }

    // Check if another category with this name exists
    const existing = await db.collection("categories").findOne({
      name: formData.name.trim(),
      _id: { $ne: new ObjectId(id) },
    });

    if (existing) {
      return {
        success: false,
        error: "A category with this name already exists",
      };
    }

    const updateData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      subcategories: formData.subcategories.filter(
        (sub) => sub.name.trim() !== ""
      ),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("categories")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return {
        success: false,
        error: "Category not found",
      };
    }

    // Invalidate cache and revalidate pages
    invalidateCache.category();
    revalidatePath("/categories");
    revalidatePath("/expenses");
    revalidatePath("/");

    return {
      success: true,
      data: {
        _id: id,
        ...updateData,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to update category",
    };
  }
}

/**
 * Delete a category (Server Action)
 */
export async function deleteCategory(id: string) {
  try {
    const client = await clientPromise;
    const db = client.db("spend-tracker");

    if (!ObjectId.isValid(id)) {
      return {
        success: false,
        error: "Invalid category ID",
      };
    }

    // Check if category is in use
    const expensesUsingCategory = await db
      .collection("expenses")
      .countDocuments({
        category: id,
      });

    if (expensesUsingCategory > 0) {
      return {
        success: false,
        error: `Cannot delete category. It is used by ${expensesUsingCategory} expense(s)`,
      };
    }

    const result = await db.collection("categories").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return {
        success: false,
        error: "Category not found",
      };
    }

    // Invalidate cache and revalidate pages
    invalidateCache.category();
    revalidatePath("/categories");
    revalidatePath("/expenses");
    revalidatePath("/");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to delete category",
    };
  }
}
