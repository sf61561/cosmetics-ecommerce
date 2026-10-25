import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      "SELECT NOW() AS current_time"
    );

    return NextResponse.json({
      success: true,
      message: "Database connected successfully!",
      time: result.rows[0].current_time,
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
      },
      { status: 500 }
    );
  }
}